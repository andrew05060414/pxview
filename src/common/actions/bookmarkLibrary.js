import { BOOKMARK_LIBRARY } from '../constants/actionTypes';

export function syncBookmarkLibraryStart() {
  return {
    type: BOOKMARK_LIBRARY.SYNC_START,
  };
}

export function syncBookmarkLibraryCancel() {
  return {
    type: BOOKMARK_LIBRARY.SYNC_CANCEL,
  };
}

export function syncBookmarkLibraryStop() {
  return {
    type: BOOKMARK_LIBRARY.SYNC_STOP,
  };
}

export function syncBookmarkLibraryProgress(pagesDone, itemsSynced) {
  return {
    type: BOOKMARK_LIBRARY.SYNC_PROGRESS,
    payload: {
      pagesDone,
      itemsSynced,
    },
  };
}

export function syncBookmarkLibraryBatch(items) {
  return {
    type: BOOKMARK_LIBRARY.SYNC_BATCH,
    payload: {
      items,
    },
  };
}

export function syncBookmarkLibrarySuccess() {
  return {
    type: BOOKMARK_LIBRARY.SYNC_SUCCESS,
    payload: {
      timestamp: Date.now(),
    },
  };
}

export function syncBookmarkLibraryFailure(error) {
  return {
    type: BOOKMARK_LIBRARY.SYNC_FAILURE,
    payload: {
      error: String(error),
    },
  };
}

export function clearBookmarkLibrary() {
  return {
    type: BOOKMARK_LIBRARY.CLEAR,
  };
}
