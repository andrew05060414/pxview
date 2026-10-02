import { normalize } from 'normalizr';
import { takeEvery, all, apply, call, delay, put } from 'redux-saga/effects';
import { fetchRankingSuccess, fetchRankingFailure } from '../actions/ranking';
import { addError } from '../actions/error';
import pixiv from '../helpers/apiClient';
import { RANKING } from '../constants/actionTypes';
import {
  NOVEL_RANKING_LANGUAGES,
  RANKING_FOR_UI,
  RANKING_TYPES,
} from '../constants';
import Schemas from '../constants/schemas';
import {
  NOVEL_LANGUAGE_UNKNOWN,
  detectNovelTextLanguage,
  extractNovelData,
  extractNovelText,
  getNovelLanguageFromMetadata,
} from '../helpers/novelRankingLanguage';

function mapRankingMode(rankingMode) {
  switch (rankingMode) {
    // Illust
    case RANKING_FOR_UI.DAILY_ILLUST:
      return 'day';
    case RANKING_FOR_UI.DAILY_MALE_ILLUST:
      return 'day_male';
    case RANKING_FOR_UI.DAILY_FEMALE_ILLUST:
      return 'day_female';
    case RANKING_FOR_UI.WEEKLY_ORIGINAL_ILLUST:
      return 'week_original';
    case RANKING_FOR_UI.WEEKLY_ROOKIE_ILLUST:
      return 'week_rookie';
    case RANKING_FOR_UI.WEEKLY_ILLUST:
      return 'week';
    case RANKING_FOR_UI.MONTHLY_ILLUST:
      return 'month';
    // Manga
    case RANKING_FOR_UI.DAILY_MANGA:
      return 'day_manga';
    case RANKING_FOR_UI.WEEKLY_MANGA:
      return 'week_manga';
    case RANKING_FOR_UI.MONTHLY_MANGA:
      return 'month_manga';
    case RANKING_FOR_UI.WEEKLY_ROOKIE_MANGA:
      return 'week_rookie_manga';
    // Novel
    case RANKING_FOR_UI.DAILY_NOVEL:
      return 'day';
    case RANKING_FOR_UI.DAILY_MALE_NOVEL:
      return 'day_male';
    case RANKING_FOR_UI.DAILY_FEMALE_NOVEL:
      return 'day_female';
    case RANKING_FOR_UI.WEEKLY_ROOKIE_NOVEL:
      return 'week_rookie';
    case RANKING_FOR_UI.WEEKLY_NOVEL:
      return 'week';
    default:
      return null;
  }
}

function getRankingType(rankingMode) {
  switch (rankingMode) {
    // Illust
    case RANKING_FOR_UI.DAILY_ILLUST:
    case RANKING_FOR_UI.DAILY_MALE_ILLUST:
    case RANKING_FOR_UI.DAILY_FEMALE_ILLUST:
    case RANKING_FOR_UI.WEEKLY_ORIGINAL_ILLUST:
    case RANKING_FOR_UI.WEEKLY_ROOKIE_ILLUST:
    case RANKING_FOR_UI.WEEKLY_ILLUST:
    case RANKING_FOR_UI.MONTHLY_ILLUST:
    case RANKING_FOR_UI.PAST_ILLUST:
      return RANKING_TYPES.ILLUST;
    // Manga
    case RANKING_FOR_UI.DAILY_MANGA:
    case RANKING_FOR_UI.WEEKLY_MANGA:
    case RANKING_FOR_UI.MONTHLY_MANGA:
    case RANKING_FOR_UI.WEEKLY_ROOKIE_MANGA:
    case RANKING_FOR_UI.PAST_MANGA:
      return RANKING_TYPES.ILLUST;
    // Novel
    case RANKING_FOR_UI.DAILY_NOVEL:
    case RANKING_FOR_UI.DAILY_MALE_NOVEL:
    case RANKING_FOR_UI.DAILY_FEMALE_NOVEL:
    case RANKING_FOR_UI.WEEKLY_ROOKIE_NOVEL:
    case RANKING_FOR_UI.WEEKLY_NOVEL:
    case RANKING_FOR_UI.PAST_NOVEL:
      return RANKING_TYPES.NOVEL;
    default:
      return null;
  }
}

export function* handleFetchRanking(action) {
  const { rankingMode, options, nextUrl } = action.payload;
  const { language, ...apiOptions } = options || {};
  try {
    const mode = mapRankingMode(rankingMode);
    const rankingType = getRankingType(rankingMode);
    const finalOptions = { ...apiOptions };
    if (mode) {
      finalOptions.mode = mode;
    }
    let response;
    if (nextUrl) {
      response = yield apply(pixiv, pixiv.requestUrl, [nextUrl]);
    } else if (rankingType === RANKING_TYPES.NOVEL) {
      response = yield apply(pixiv, pixiv.novelRanking, [finalOptions]);
    } else {
      response = yield apply(pixiv, pixiv.illustRanking, [finalOptions]);
    }
    let normalized;
    if (rankingType === RANKING_TYPES.NOVEL) {
      let novels = response.novels.filter((novel) => novel.visible && novel.id);
      if (language === NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE) {
        // eslint-disable-next-line no-use-before-define
        novels = yield call(filterSimplifiedChineseNovels, novels);
      }
      normalized = normalize(novels, Schemas.NOVEL_ARRAY);
    } else {
      normalized = normalize(
        response.illusts.filter((illust) => illust.visible && illust.id),
        Schemas.ILLUST_ARRAY,
      );
    }
    yield put(
      fetchRankingSuccess(
        normalized.entities,
        normalized.result,
        rankingMode,
        response.next_url,
      ),
    );
  } catch (err) {
    yield put(fetchRankingFailure(rankingMode));
    yield put(addError(err));
  }
}

export function* getNovelRankingLanguage(novel) {
  const metadataLanguage = getNovelLanguageFromMetadata(novel);
  if (metadataLanguage) {
    return metadataLanguage;
  }

  try {
    const rawResponse = yield apply(pixiv, pixiv.novelWebview, [
      novel.id,
      true,
    ]);
    const webviewNovel = extractNovelData(rawResponse, novel.id);
    const webviewMetadataLanguage = getNovelLanguageFromMetadata(webviewNovel);
    if (webviewMetadataLanguage) {
      return webviewMetadataLanguage;
    }
    return detectNovelTextLanguage(extractNovelText(rawResponse, novel.id));
  } catch (err) {
    return NOVEL_LANGUAGE_UNKNOWN;
  }
}

const LANGUAGE_LOOKUP_BATCH_SIZE = 4;
const LANGUAGE_LOOKUP_BATCH_DELAY_MS = 700;

export function* filterSimplifiedChineseNovels(novels) {
  const languages = [];
  for (
    let offset = 0;
    offset < novels.length;
    offset += LANGUAGE_LOOKUP_BATCH_SIZE
  ) {
    const batch = novels.slice(offset, offset + LANGUAGE_LOOKUP_BATCH_SIZE);
    const batchLanguages = yield all(
      batch.map((novel) => call(getNovelRankingLanguage, novel)),
    );
    languages.push(...batchLanguages);
    if (offset + LANGUAGE_LOOKUP_BATCH_SIZE < novels.length) {
      yield delay(LANGUAGE_LOOKUP_BATCH_DELAY_MS);
    }
  }
  return novels.filter(
    (novel, index) =>
      languages[index] === NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE,
  );
}

export function* watchFetchRanking() {
  yield takeEvery(RANKING.REQUEST, handleFetchRanking);
}
