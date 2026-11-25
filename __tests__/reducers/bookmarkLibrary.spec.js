import { REHYDRATE } from 'redux-persist';
import bookmarkLibrary from '../../src/common/reducers/bookmarkLibrary';
import {
  syncBookmarkLibraryStart,
  syncBookmarkLibraryCancel,
  syncBookmarkLibraryStop,
  syncBookmarkLibraryProgress,
  syncBookmarkLibraryBatch,
  syncBookmarkLibrarySuccess,
  syncBookmarkLibraryFailure,
  clearBookmarkLibrary,
} from '../../src/common/actions/bookmarkLibrary';
import {
  loginSuccess,
  logout,
  refreshAccessTokenSuccess,
} from '../../src/common/actions/auth';
import { computeCounts } from '../../src/common/helpers/bookmarkLibraryStats';
import { searchBookmarksLocally } from '../../src/common/helpers/bookmarkSmartSearch';
import { toCsv, toJson } from '../../src/common/helpers/bookmarkExport';

const slimItem = (id, restrict = 'public', type = 'novel') => ({
  id: String(id),
  type,
  restrict,
  title: `${type}-${id}`,
  tags: ['tag'],
  userId: '1',
  userName: 'u',
  seriesId: null,
  seriesTitle: null,
  createDate: '2025-01-01T00:00:00+09:00',
  totalBookmarks: 10,
  totalView: 20,
  textLength: type === 'novel' ? 500 : null,
  pageCount: 1,
  xRestrict: 0,
});

describe('bookmarkLibrary reducer', () => {
  test('sync start resets progress and flags', () => {
    let state = bookmarkLibrary(
      undefined,
      syncBookmarkLibraryBatch([slimItem('1')]),
    );
    state = bookmarkLibrary(state, syncBookmarkLibraryFailure('x'));
    state = bookmarkLibrary(state, syncBookmarkLibraryStart());
    expect(state.syncing).toBe(true);
    expect(state.cancelRequested).toBe(false);
    expect(state.error).toBeNull();
    expect(state.progress).toEqual({ pagesDone: 0, itemsSynced: 0 });
    expect(state.items).toEqual({ 'novel:1': slimItem('1') });
  });

  test('progress accumulates', () => {
    let state = bookmarkLibrary(undefined, syncBookmarkLibraryProgress(1, 30));
    state = bookmarkLibrary(state, syncBookmarkLibraryProgress(1, 20));
    expect(state.progress).toEqual({ pagesDone: 2, itemsSynced: 50 });
  });

  test('batch merges by composite type:id so same-ID illust and novel both stay intact', () => {
    let state = bookmarkLibrary(
      undefined,
      syncBookmarkLibraryBatch([slimItem('100', 'public', 'illust')]),
    );
    state = bookmarkLibrary(
      state,
      syncBookmarkLibraryBatch([slimItem('100', 'private', 'novel')]),
    );
    expect(Object.keys(state.items).sort()).toEqual([
      'illust:100',
      'novel:100',
    ]);
    expect(computeCounts(state.items)).toEqual({
      total: 2,
      illusts: 1,
      novels: 1,
      public: 1,
      private: 1,
    });
    expect(searchBookmarksLocally(state.items, '100')).toHaveLength(2);
    expect(toCsv(state.items)).toContain('illust,public,illust-100');
    expect(toCsv(state.items)).toContain('novel,private,novel-100');
    expect(JSON.parse(toJson(state.items)).count).toBe(2);
  });

  test('cancel then stop keeps items and ends syncing', () => {
    let state = bookmarkLibrary(
      undefined,
      syncBookmarkLibraryBatch([slimItem('1')]),
    );
    state = bookmarkLibrary(state, syncBookmarkLibraryStart());
    state = bookmarkLibrary(state, syncBookmarkLibraryCancel());
    expect(state.cancelRequested).toBe(true);
    state = bookmarkLibrary(state, syncBookmarkLibraryStop());
    expect(state.syncing).toBe(false);
    expect(state.cancelRequested).toBe(false);
    expect(state.items).toEqual({ 'novel:1': slimItem('1') });
    expect(state.lastSyncedAt).toBeNull();
  });

  test('success stores timestamp, failure stores error', () => {
    let state = bookmarkLibrary(undefined, syncBookmarkLibraryStart());
    state = bookmarkLibrary(state, syncBookmarkLibrarySuccess());
    expect(state.syncing).toBe(false);
    expect(state.lastSyncedAt).toEqual(expect.any(Number));
    state = bookmarkLibrary(state, syncBookmarkLibraryStart());
    state = bookmarkLibrary(state, syncBookmarkLibraryFailure('boom'));
    expect(state.syncing).toBe(false);
    expect(state.error).toBe('boom');
  });

  test('clear resets items while keeping ownerUserId', () => {
    let state = bookmarkLibrary(
      undefined,
      loginSuccess({ user: { id: 10 }, access_token: 'a', refresh_token: 'r', expires_in: 3600 }),
    );
    state = bookmarkLibrary(
      state,
      syncBookmarkLibraryBatch([slimItem('1')], '10'),
    );
    state = bookmarkLibrary(state, syncBookmarkLibrarySuccess('10'));
    state = bookmarkLibrary(state, clearBookmarkLibrary());
    expect(state.items).toEqual({});
    expect(state.lastSyncedAt).toBeNull();
    expect(state.ownerUserId).toBe('10');
  });

  test('clears private bookmarks on logout and isolates late batches when switching accounts A -> B', () => {
    let state = bookmarkLibrary(
      undefined,
      loginSuccess({ user: { id: 1001 }, access_token: 'a1', refresh_token: 'r1', expires_in: 3600 }),
    );
    state = bookmarkLibrary(state, syncBookmarkLibraryStart('1001'));
    state = bookmarkLibrary(
      state,
      syncBookmarkLibraryBatch([slimItem('77', 'private', 'illust')], '1001'),
    );
    expect(Object.keys(state.items)).toEqual(['illust:77']);

    // Logout wipes account A bookmarks completely
    state = bookmarkLibrary(state, logout());
    expect(state.items).toEqual({});
    expect(state.ownerUserId).toBeNull();

    // Switching directly to account B isolates items and drops late batches from A
    state = bookmarkLibrary(
      state,
      loginSuccess({ user: { id: 2002 }, access_token: 'b1', refresh_token: 'rb1', expires_in: 3600 }),
    );
    expect(state.ownerUserId).toBe('2002');
    expect(state.items).toEqual({});

    state = bookmarkLibrary(
      state,
      syncBookmarkLibraryBatch([slimItem('77', 'private', 'illust')], '1001'),
    );
    expect(state.items).toEqual({});
    expect(computeCounts(state.items).total).toBe(0);
    expect(searchBookmarksLocally(state.items, '77')).toHaveLength(0);
    expect(JSON.parse(toJson(state.items)).count).toBe(0);
  });

  test('normalizes legacy numeric-keyed REHYDRATE items for logged-in user and drops logged-out legacy cache', () => {
    const loggedInRehydrate = bookmarkLibrary(undefined, {
      type: REHYDRATE,
      payload: {
        auth: { user: { id: 1001 } },
        bookmarkLibrary: {
          items: {
            100: slimItem('100', 'public', 'illust'),
          },
          lastSyncedAt: 12345,
        },
      },
    });
    expect(loggedInRehydrate.ownerUserId).toBe('1001');
    expect(loggedInRehydrate.items).toEqual({
      'illust:100': slimItem('100', 'public', 'illust'),
    });

    // Re-sync adds same-ID novel without colliding with migrated illust:100
    let updated = bookmarkLibrary(
      loggedInRehydrate,
      refreshAccessTokenSuccess({
        user: { id: 1001 },
        access_token: 'a2',
        refresh_token: 'r2',
        expires_in: 3600,
      }),
    );
    updated = bookmarkLibrary(
      updated,
      syncBookmarkLibraryBatch([slimItem('100', 'private', 'novel')], '1001'),
    );
    expect(Object.keys(updated.items).sort()).toEqual([
      'illust:100',
      'novel:100',
    ]);

    // Logged-out rehydrate clears unowned legacy cache
    const loggedOutRehydrate = bookmarkLibrary(undefined, {
      type: REHYDRATE,
      payload: {
        auth: { user: null },
        bookmarkLibrary: {
          items: { 100: slimItem('100', 'private', 'illust') },
        },
      },
    });
    expect(loggedOutRehydrate.items).toEqual({});
    expect(loggedOutRehydrate.ownerUserId).toBeNull();
  });
});
