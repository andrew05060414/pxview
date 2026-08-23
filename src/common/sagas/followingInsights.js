import { takeEvery, apply, put, select, delay } from 'redux-saga/effects';
import pixiv from '../helpers/apiClient';
import { FOLLOWING_INSIGHTS } from '../constants/actionTypes';
import {
  syncFollowingInsightsStop,
  syncFollowingInsightsProgress,
  syncFollowingInsightsBatch,
  syncFollowingInsightsSuccess,
  syncFollowingInsightsFailure,
} from '../actions/followingInsights';
import { getAuthUser } from '../selectors';
import { extractAuthor } from '../helpers/followingInsightsCompute';

const SYNC_STREAMS = ['public', 'private'];

const PAGE_DELAY_MS = 700;
const MAX_RETRIES = 3;

export const getCancelRequested = (state) =>
  state.followingInsights.cancelRequested;

function* fetchPageWithRetry(userId, restrict, nextUrl) {
  let retryDelay = PAGE_DELAY_MS;
  for (let attempt = 0; ; attempt += 1) {
    try {
      if (nextUrl) {
        return yield apply(pixiv, pixiv.requestUrl, [nextUrl]);
      }
      return yield apply(pixiv, pixiv.userFollowing, [userId, { restrict }]);
    } catch (err) {
      if (attempt >= MAX_RETRIES) {
        throw err;
      }
      yield delay(retryDelay);
      retryDelay *= 2;
    }
  }
}

export function* handleSyncFollowingInsights() {
  const user = yield select(getAuthUser);
  if (!user || !user.id) {
    yield put(syncFollowingInsightsFailure('user is not logged in'));
    return;
  }
  try {
    for (let i = 0; i < SYNC_STREAMS.length; i += 1) {
      const restrict = SYNC_STREAMS[i];
      let nextUrl = null;
      let isFirstPage = true;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (yield select(getCancelRequested)) {
          yield put(syncFollowingInsightsStop());
          return;
        }
        if (!isFirstPage) {
          yield delay(PAGE_DELAY_MS);
        }
        const response = yield* fetchPageWithRetry(user.id, restrict, nextUrl);
        const authors = (response.user_previews || [])
          .map((preview) => extractAuthor(preview, restrict))
          .filter((author) => author.id);
        if (authors.length) {
          yield put(syncFollowingInsightsBatch(authors));
        }
        yield put(syncFollowingInsightsProgress(1, authors.length));
        nextUrl = response.next_url;
        if (!nextUrl) {
          break;
        }
        isFirstPage = false;
      }
    }
    yield put(syncFollowingInsightsSuccess());
  } catch (err) {
    yield put(syncFollowingInsightsFailure(err));
  }
}

export function* watchFollowingInsightsSync() {
  yield takeEvery(FOLLOWING_INSIGHTS.SYNC_START, handleSyncFollowingInsights);
}
