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

const slimItem = (id, restrict = 'public') => ({
  id,
  type: 'novel',
  restrict,
  title: `t-${id}`,
  tags: [],
  userId: '1',
  userName: 'u',
  seriesId: null,
  seriesTitle: null,
  createDate: null,
  totalBookmarks: 0,
  totalView: 0,
  textLength: 0,
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
    expect(state.items).toEqual({ 1: slimItem('1') });
  });

  test('progress accumulates', () => {
    let state = bookmarkLibrary(undefined, syncBookmarkLibraryProgress(1, 30));
    state = bookmarkLibrary(state, syncBookmarkLibraryProgress(1, 20));
    expect(state.progress).toEqual({ pagesDone: 2, itemsSynced: 50 });
  });

  test('batch merges and later batches overwrite same id', () => {
    let state = bookmarkLibrary(
      undefined,
      syncBookmarkLibraryBatch([slimItem('1'), slimItem('2')]),
    );
    state = bookmarkLibrary(
      state,
      syncBookmarkLibraryBatch([slimItem('1', 'private')]),
    );
    expect(Object.keys(state.items).sort()).toEqual(['1', '2']);
    expect(state.items['1'].restrict).toBe('private');
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
    expect(state.items).toEqual({ 1: slimItem('1') });
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

  test('clear resets everything', () => {
    let state = bookmarkLibrary(
      undefined,
      syncBookmarkLibraryBatch([slimItem('1')]),
    );
    state = bookmarkLibrary(state, syncBookmarkLibrarySuccess());
    state = bookmarkLibrary(state, clearBookmarkLibrary());
    expect(state.items).toEqual({});
    expect(state.lastSyncedAt).toBeNull();
  });
});
