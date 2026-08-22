import { takeEvery, apply, put, select, delay } from 'redux-saga/effects';
import pixiv from '../helpers/apiClient';
import { BOOKMARK_LIBRARY } from '../constants/actionTypes';
import {
  syncBookmarkLibraryStop,
  syncBookmarkLibraryProgress,
  syncBookmarkLibraryBatch,
  syncBookmarkLibrarySuccess,
  syncBookmarkLibraryFailure,
} from '../actions/bookmarkLibrary';
import { getAuthUser } from '../selectors';
import slimBookmarkItem from '../helpers/slimBookmarkItem';

// illust/novel x public/private, synced in order.
const SYNC_STREAMS = [
  { type: 'illust', restrict: 'public' },
  { type: 'illust', restrict: 'private' },
  { type: 'novel', restrict: 'public' },
  { type: 'novel', restrict: 'private' },
];

// app-api.pixiv.net rate limits (418/429) aggressive clients; throttle every
// page and back off exponentially on failure.
const PAGE_DELAY_MS = 700;
const MAX_RETRIES = 3;

export const getCancelRequested = (state) =>
  state.bookmarkLibrary.cancelRequested;

function* fetchFirstPage(stream, userId) {
  const options = { restrict: stream.restrict };
  if (stream.type === 'illust') {
    return yield apply(pixiv, pixiv.userBookmarksIllust, [userId, options]);
  }
  return yield apply(pixiv, pixiv.userBookmarksNovel, [userId, options]);
}

function* fetchPageWithRetry(stream, userId, nextUrl) {
  let retryDelay = PAGE_DELAY_MS;
  for (let attempt = 0; ; attempt += 1) {
    try {
      if (nextUrl) {
        return yield apply(pixiv, pixiv.requestUrl, [nextUrl]);
      }
      return yield* fetchFirstPage(stream, userId);
    } catch (err) {
      if (attempt >= MAX_RETRIES) {
        throw err;
      }
      yield delay(retryDelay);
      retryDelay *= 2;
    }
  }
}

export function* handleSyncBookmarkLibrary() {
  const user = yield select(getAuthUser);
  if (!user || !user.id) {
    yield put(syncBookmarkLibraryFailure('user is not logged in'));
    return;
  }
  try {
    for (let i = 0; i < SYNC_STREAMS.length; i += 1) {
      const stream = SYNC_STREAMS[i];
      let nextUrl = null;
      let isFirstPage = true;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (yield select(getCancelRequested)) {
          yield put(syncBookmarkLibraryStop());
          return;
        }
        if (!isFirstPage) {
          yield delay(PAGE_DELAY_MS);
        }
        const response = yield* fetchPageWithRetry(stream, user.id, nextUrl);
        const rawItems =
          stream.type === 'illust' ? response.illusts : response.novels;
        const slimItems = (rawItems || [])
          .filter((item) => item.visible && item.id)
          .map((item) => slimBookmarkItem(item, stream.type, stream.restrict));
        if (slimItems.length) {
          yield put(syncBookmarkLibraryBatch(slimItems));
        }
        yield put(syncBookmarkLibraryProgress(1, slimItems.length));
        nextUrl = response.next_url;
        if (!nextUrl) {
          break;
        }
        isFirstPage = false;
      }
    }
    yield put(syncBookmarkLibrarySuccess());
  } catch (err) {
    yield put(syncBookmarkLibraryFailure(err));
  }
}

export function* watchBookmarkLibrarySync() {
  yield takeEvery(BOOKMARK_LIBRARY.SYNC_START, handleSyncBookmarkLibrary);
}
