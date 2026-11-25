import { BOOKMARK_LIBRARY } from '../constants/actionTypes';

export function syncBookmarkLibraryStart(userId) {
  return {
    type: BOOKMARK_LIBRARY.SYNC_START,
    ...(userId != null ? { meta: { userId: String(userId) } } : {}),
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

export function syncBookmarkLibraryProgress(pagesDone, itemsSynced, userId) {
  return {
    type: BOOKMARK_LIBRARY.SYNC_PROGRESS,
    payload: {
      pagesDone,
      itemsSynced,
    },
    ...(userId != null ? { meta: { userId: String(userId) } } : {}),
  };
}

export function syncBookmarkLibraryBatch(items, userId) {
  return {
    type: BOOKMARK_LIBRARY.SYNC_BATCH,
    payload: {
      items,
    },
    ...(userId != null ? { meta: { userId: String(userId) } } : {}),
  };
}

export function syncBookmarkLibrarySuccess(userId) {
  return {
    type: BOOKMARK_LIBRARY.SYNC_SUCCESS,
    payload: {
      timestamp: Date.now(),
    },
    ...(userId != null ? { meta: { userId: String(userId) } } : {}),
  };
}

export function syncBookmarkLibraryFailure(error, userId) {
  return {
    type: BOOKMARK_LIBRARY.SYNC_FAILURE,
    payload: {
      error: String(error),
    },
    ...(userId != null ? { meta: { userId: String(userId) } } : {}),
  };
}

export function clearBookmarkLibrary() {
  return {
    type: BOOKMARK_LIBRARY.CLEAR,
  };
}
