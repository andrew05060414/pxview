import { BOOKMARK_LIBRARY } from '../constants/actionTypes';

const initState = {
  syncing: false,
  cancelRequested: false,
  progress: {
    pagesDone: 0,
    itemsSynced: 0,
  },
  lastSyncedAt: null,
  error: null,
  items: {},
};

const mergeItems = (items, batch) => {
  const nextItems = { ...items };
  (batch || []).forEach((item) => {
    nextItems[item.id] = item;
  });
  return nextItems;
};

export default function bookmarkLibrary(state = initState, action) {
  switch (action.type) {
    case BOOKMARK_LIBRARY.SYNC_START:
      return {
        ...state,
        syncing: true,
        cancelRequested: false,
        progress: {
          pagesDone: 0,
          itemsSynced: 0,
        },
        error: null,
      };
    case BOOKMARK_LIBRARY.SYNC_CANCEL:
      return {
        ...state,
        cancelRequested: true,
      };
    case BOOKMARK_LIBRARY.SYNC_STOP:
      return {
        ...state,
        syncing: false,
        cancelRequested: false,
      };
    case BOOKMARK_LIBRARY.SYNC_PROGRESS: {
      const { pagesDone, itemsSynced } = action.payload;
      return {
        ...state,
        progress: {
          pagesDone: state.progress.pagesDone + pagesDone,
          itemsSynced: state.progress.itemsSynced + itemsSynced,
        },
      };
    }
    case BOOKMARK_LIBRARY.SYNC_BATCH:
      return {
        ...state,
        items: mergeItems(state.items, action.payload.items),
      };
    case BOOKMARK_LIBRARY.SYNC_SUCCESS:
      return {
        ...state,
        syncing: false,
        cancelRequested: false,
        lastSyncedAt: action.payload.timestamp,
      };
    case BOOKMARK_LIBRARY.SYNC_FAILURE:
      return {
        ...state,
        syncing: false,
        cancelRequested: false,
        error: action.payload.error,
      };
    case BOOKMARK_LIBRARY.CLEAR:
      return initState;
    default:
      return state;
  }
}
