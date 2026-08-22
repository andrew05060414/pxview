import { apply, put, select, delay } from 'redux-saga/effects';
import pixiv from '../../src/common/helpers/apiClient';
import { getAuthUser } from '../../src/common/selectors';
import {
  handleSyncBookmarkLibrary,
  getCancelRequested,
} from '../../src/common/sagas/bookmarkLibrary';

jest.mock('../../src/common/helpers/apiClient', () => ({
  __esModule: true,
  default: {
    userBookmarksIllust: jest.fn(),
    userBookmarksNovel: jest.fn(),
    requestUrl: jest.fn(),
  },
}));

const apiItem = (id) => ({
  id,
  visible: true,
  title: `t-${id}`,
  tags: [{ name: 'tag' }],
  user: { id: 1, name: 'u' },
  create_date: '2024-01-01T00:00:00+09:00',
  total_bookmarks: 5,
  total_view: 10,
  page_count: 1,
});

const singlePageStream = (items) => ({
  illusts: items,
  novels: items,
  next_url: null,
});

// saga-level select resolver: first select is getAuthUser, the rest are
// cancelRequested probes
const makeState = (cancelRequested) => ({
  auth: { user: { id: 99, is_premium: false } },
  bookmarkLibrary: { cancelRequested },
});

describe('handleSyncBookmarkLibrary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('syncs four streams with throttle, batching and paging', () => {
    const generator = handleSyncBookmarkLibrary();
    // stream 1: illust public, 2 pages
    expect(generator.next().value).toEqual(select(getAuthUser));
    expect(generator.next(makeState(false).auth.user).value).toEqual(
      select(getCancelRequested),
    );
    expect(generator.next(false).value).toEqual(
      apply(pixiv, pixiv.userBookmarksIllust, [99, { restrict: 'public' }]),
    );
    expect(
      generator.next({ illusts: [apiItem(1)], next_url: 'url-2' }).value,
    ).toEqual(
      put({
        type: 'PIXIV/BOOKMARK_LIBRARY_SYNC_BATCH',
        payload: {
          items: [expect.objectContaining({ id: '1', type: 'illust' })],
        },
      }),
    );
    expect(generator.next().value).toEqual(
      put({
        type: 'PIXIV/BOOKMARK_LIBRARY_SYNC_PROGRESS',
        payload: { pagesDone: 1, itemsSynced: 1 },
      }),
    );
    // second page: cancel probe then throttle delay
    expect(generator.next().value).toEqual(select(getCancelRequested));
    expect(generator.next(false).value).toEqual(delay(700));
    expect(generator.next().value).toEqual(
      apply(pixiv, pixiv.requestUrl, ['url-2']),
    );
    expect(generator.next(singlePageStream([])).value).toEqual(
      put({
        type: 'PIXIV/BOOKMARK_LIBRARY_SYNC_PROGRESS',
        payload: { pagesDone: 1, itemsSynced: 0 },
      }),
    );
    // stream 2: illust private (single page)
    expect(generator.next().value).toEqual(select(getCancelRequested));
    expect(generator.next(false).value).toEqual(
      apply(pixiv, pixiv.userBookmarksIllust, [99, { restrict: 'private' }]),
    );
    expect(generator.next(singlePageStream([apiItem(2)])).value).toEqual(
      put({
        type: 'PIXIV/BOOKMARK_LIBRARY_SYNC_BATCH',
        payload: {
          items: [expect.objectContaining({ id: '2', restrict: 'private' })],
        },
      }),
    );
    expect(generator.next().value).toEqual(
      put({
        type: 'PIXIV/BOOKMARK_LIBRARY_SYNC_PROGRESS',
        payload: { pagesDone: 1, itemsSynced: 1 },
      }),
    );
    // stream 3: novel public
    expect(generator.next().value).toEqual(select(getCancelRequested));
    expect(generator.next(false).value).toEqual(
      apply(pixiv, pixiv.userBookmarksNovel, [99, { restrict: 'public' }]),
    );
    expect(
      generator.next({ novels: [apiItem(3)], next_url: null }).value,
    ).toEqual(
      put({
        type: 'PIXIV/BOOKMARK_LIBRARY_SYNC_BATCH',
        payload: {
          items: [expect.objectContaining({ id: '3', type: 'novel' })],
        },
      }),
    );
    expect(generator.next().value).toEqual(
      put({
        type: 'PIXIV/BOOKMARK_LIBRARY_SYNC_PROGRESS',
        payload: { pagesDone: 1, itemsSynced: 1 },
      }),
    );
    // stream 4: novel private
    expect(generator.next().value).toEqual(select(getCancelRequested));
    expect(generator.next(false).value).toEqual(
      apply(pixiv, pixiv.userBookmarksNovel, [99, { restrict: 'private' }]),
    );
    expect(generator.next(singlePageStream([])).value).toEqual(
      put({
        type: 'PIXIV/BOOKMARK_LIBRARY_SYNC_PROGRESS',
        payload: { pagesDone: 1, itemsSynced: 0 },
      }),
    );
    expect(generator.next().value).toEqual(
      put({
        type: 'PIXIV/BOOKMARK_LIBRARY_SYNC_SUCCESS',
        payload: { timestamp: expect.any(Number) },
      }),
    );
    expect(generator.next().done).toBe(true);
  });

  test('stops early when cancel is requested', () => {
    const generator = handleSyncBookmarkLibrary();
    expect(generator.next().value).toEqual(select(getAuthUser));
    expect(generator.next({ id: 99 }).value).toEqual(
      select(getCancelRequested),
    );
    expect(generator.next(false).value).toEqual(
      apply(pixiv, pixiv.userBookmarksIllust, [99, { restrict: 'public' }]),
    );
    expect(generator.next(singlePageStream([])).value).toEqual(
      put({
        type: 'PIXIV/BOOKMARK_LIBRARY_SYNC_PROGRESS',
        payload: { pagesDone: 1, itemsSynced: 0 },
      }),
    );
    expect(generator.next().value).toEqual(select(getCancelRequested));
    expect(generator.next(true).value).toEqual(
      put({ type: 'PIXIV/BOOKMARK_LIBRARY_SYNC_STOP' }),
    );
    expect(generator.next().done).toBe(true);
  });

  test('retries failed pages with exponential backoff then gives up', () => {
    const generator = handleSyncBookmarkLibrary();
    expect(generator.next().value).toEqual(select(getAuthUser));
    expect(generator.next({ id: 99 }).value).toEqual(
      select(getCancelRequested),
    );
    let call = generator.next(false);
    expect(call.value).toEqual(
      apply(pixiv, pixiv.userBookmarksIllust, [99, { restrict: 'public' }]),
    );
    call = generator.throw(new Error('418'));
    expect(call.value).toEqual(delay(700));
    call = generator.next();
    expect(call.value).toEqual(
      apply(pixiv, pixiv.userBookmarksIllust, [99, { restrict: 'public' }]),
    );
    call = generator.throw(new Error('418'));
    expect(call.value).toEqual(delay(1400));
    call = generator.next();
    expect(call.value).toEqual(
      apply(pixiv, pixiv.userBookmarksIllust, [99, { restrict: 'public' }]),
    );
    call = generator.throw(new Error('418'));
    expect(call.value).toEqual(delay(2800));
    call = generator.next();
    expect(call.value).toEqual(
      apply(pixiv, pixiv.userBookmarksIllust, [99, { restrict: 'public' }]),
    );
    // 4th failure exceeds MAX_RETRIES -> FAILURE
    call = generator.throw(new Error('418'));
    expect(call.value).toEqual(
      put({
        type: 'PIXIV/BOOKMARK_LIBRARY_SYNC_FAILURE',
        payload: { error: 'Error: 418' },
      }),
    );
    expect(generator.next().done).toBe(true);
  });

  test('fails fast when not logged in', () => {
    const generator = handleSyncBookmarkLibrary();
    expect(generator.next().value).toEqual(select(getAuthUser));
    expect(generator.next(null).value).toEqual(
      put({
        type: 'PIXIV/BOOKMARK_LIBRARY_SYNC_FAILURE',
        payload: { error: 'user is not logged in' },
      }),
    );
    expect(generator.next().done).toBe(true);
  });
});
