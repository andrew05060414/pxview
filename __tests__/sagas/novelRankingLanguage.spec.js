import { all, apply, call, put } from 'redux-saga/effects';
import pixiv from '../../src/common/helpers/apiClient';
import {
  RANKING_FOR_UI,
  NOVEL_RANKING_LANGUAGES,
} from '../../src/common/constants';
import {
  filterSimplifiedChineseNovels,
  getNovelRankingLanguage,
  handleFetchRanking,
} from '../../src/common/sagas/ranking';

const novel = (id, extra = {}) => ({
  id,
  visible: true,
  title: `novel-${id}`,
  user: { id: 10, name: 'author' },
  ...extra,
});

describe('novel ranking language filtering', () => {
  test('strips local language state from the upstream request and filters by body', () => {
    const action = {
      payload: {
        rankingMode: RANKING_FOR_UI.DAILY_MALE_NOVEL,
        options: { language: NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE },
      },
    };
    const generator = handleFetchRanking(action);
    const novels = [novel(1), novel(2)];

    expect(generator.next().value).toEqual(
      apply(pixiv, pixiv.novelRanking, [{ mode: 'day_male' }]),
    );
    expect(generator.next({ novels }).value).toEqual(
      call(filterSimplifiedChineseNovels, novels),
    );
    expect(generator.next([novels[0]]).value).toEqual(
      put(
        expect.objectContaining({
          type: 'PIXIV/RANKING_SUCCESS',
          payload: expect.objectContaining({
            items: [1],
            rankingMode: RANKING_FOR_UI.DAILY_MALE_NOVEL,
            nextUrl: undefined,
          }),
        }),
      ),
    );
  });

  test('keeps all languages without requesting novel bodies', () => {
    const action = {
      payload: {
        rankingMode: RANKING_FOR_UI.DAILY_MALE_NOVEL,
        options: { language: NOVEL_RANKING_LANGUAGES.ALL },
      },
    };
    const generator = handleFetchRanking(action);
    const novels = [novel(1)];

    generator.next();
    expect(generator.next({ novels }).value).toEqual(
      put(
        expect.objectContaining({
          type: 'PIXIV/RANKING_SUCCESS',
          payload: expect.objectContaining({
            items: [1],
            rankingMode: RANKING_FOR_UI.DAILY_MALE_NOVEL,
            nextUrl: undefined,
          }),
        }),
      ),
    );
  });

  test('excludes unknown bodies from Simplified Chinese results', () => {
    const novels = [novel(1), novel(2)];
    const generator = filterSimplifiedChineseNovels(novels);
    expect(generator.next().value).toEqual(
      all([
        call(getNovelRankingLanguage, novels[0]),
        call(getNovelRankingLanguage, novels[1]),
      ]),
    );
    expect(
      generator.next([NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE, 'unknown'])
        .value,
    ).toEqual([novels[0]]);
  });

  test('falls back to the existing novel webview body when metadata is absent', () => {
    const generator = getNovelRankingLanguage(novel(7));
    expect(generator.next().value).toEqual(
      apply(pixiv, pixiv.novelWebview, [7, true]),
    );
    const result = generator.next(
      'window.__state = { novel: {"7":{"id":"7","text":"这是一个简体中文故事内容。"}}, };',
    );
    expect(result.value).toBe(NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE);
    expect(result.done).toBe(true);
  });

  test('uses webview language metadata before body detection', () => {
    const generator = getNovelRankingLanguage(novel(8));
    expect(generator.next().value).toEqual(
      apply(pixiv, pixiv.novelWebview, [8, true]),
    );
    const result = generator.next({
      language: 'zh-CN',
      text: 'ambiguous body',
    });

    expect(result.value).toBe(NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE);
    expect(result.done).toBe(true);
  });
});
