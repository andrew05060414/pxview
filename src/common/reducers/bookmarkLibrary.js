import { REHYDRATE } from 'redux-persist';
import {
  AUTH_LOGIN,
  AUTH_LOGOUT,
  AUTH_REFRESH_ACCESS_TOKEN,
  BOOKMARK_LIBRARY,
} from '../constants/actionTypes';
import {
  getBookmarkItemKey,
  normalizeBookmarkItems,
} from '../helpers/bookmarkItemKey';

const initState = {
  ownerUserId: null,
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
    const key = getBookmarkItemKey(item);
    if (key) {
      nextItems[key] = item;
    }
  });
  return nextItems;
};

const isStaleUserAction = (state, action) => {
  const actionUserId = action?.meta?.userId;
  if (actionUserId == null) {
    return false;
  }
  const normalizedActionUid = String(actionUserId);
  if (state.ownerUserId != null && state.ownerUserId !== normalizedActionUid) {
    return true;
  }
  if (state.ownerUserId == null && !state.syncing) {
    return true;
  }
  return false;
};

export default function bookmarkLibrary(state = initState, action) {
  switch (action.type) {
    case AUTH_LOGOUT.SUCCESS:
      return initState;
    case AUTH_LOGIN.SUCCESS: {
      const nextUserId =
        action.payload?.user?.id != null ? String(action.payload.user.id) : null;
      if (state.ownerUserId !== nextUserId || !state.ownerUserId) {
        return {
          ...initState,
          ownerUserId: nextUserId,
        };
      }
      return state;
    }
    case AUTH_REFRESH_ACCESS_TOKEN.SUCCESS: {
      const nextUserId =
        action.payload?.user?.id != null ? String(action.payload.user.id) : null;
      if (!nextUserId) {
        return state;
      }
      if (state.ownerUserId && state.ownerUserId !== nextUserId) {
        return {
          ...initState,
          ownerUserId: nextUserId,
        };
      }
      if (!state.ownerUserId) {
        return {
          ...state,
          ownerUserId: nextUserId,
        };
      }
      return state;
    }
    case REHYDRATE: {
      const incoming = action.payload?.bookmarkLibrary;
      const hasAuthInPayload = Boolean(action.payload && 'auth' in action.payload);
      const authUserId =
        action.payload?.auth?.user?.id != null
          ? String(action.payload.auth.user.id)
          : null;
      if (hasAuthInPayload && !authUserId) {
        return initState;
      }
      if (!incoming) {
        return authUserId ? { ...state, ownerUserId: authUserId } : state;
      }
      if (
        authUserId &&
        incoming.ownerUserId &&
        String(incoming.ownerUserId) !== authUserId
      ) {
        return {
          ...initState,
          ownerUserId: authUserId,
        };
      }
      return {
        ...initState,
        ...incoming,
        ownerUserId:
          incoming.ownerUserId != null
            ? String(incoming.ownerUserId)
            : authUserId,
        syncing: false,
        cancelRequested: false,
        items: normalizeBookmarkItems(incoming.items),
      };
    }
    case BOOKMARK_LIBRARY.SYNC_START: {
      const actionUserId =
        action.meta?.userId != null ? String(action.meta.userId) : state.ownerUserId;
      const accountChanged =
        action.meta?.userId != null &&
        state.ownerUserId != null &&
        state.ownerUserId !== actionUserId;
      return {
        ...state,
        ownerUserId: actionUserId || null,
        items: accountChanged ? {} : state.items,
        lastSyncedAt: accountChanged ? null : state.lastSyncedAt,
        syncing: true,
        cancelRequested: false,
        progress: {
          pagesDone: 0,
          itemsSynced: 0,
        },
        error: null,
      };
    }
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
      if (isStaleUserAction(state, action)) {
        return state;
      }
      const { pagesDone, itemsSynced } = action.payload;
      return {
        ...state,
        ownerUserId:
          state.ownerUserId || (action.meta?.userId ? String(action.meta.userId) : null),
        progress: {
          pagesDone: state.progress.pagesDone + pagesDone,
          itemsSynced: state.progress.itemsSynced + itemsSynced,
        },
      };
    }
    case BOOKMARK_LIBRARY.SYNC_BATCH:
      if (isStaleUserAction(state, action)) {
        return state;
      }
      return {
        ...state,
        ownerUserId:
          state.ownerUserId || (action.meta?.userId ? String(action.meta.userId) : null),
        items: mergeItems(state.items, action.payload.items),
      };
    case BOOKMARK_LIBRARY.SYNC_SUCCESS:
      if (isStaleUserAction(state, action)) {
        return state;
      }
      return {
        ...state,
        syncing: false,
        cancelRequested: false,
        lastSyncedAt: action.payload.timestamp,
      };
    case BOOKMARK_LIBRARY.SYNC_FAILURE:
      if (isStaleUserAction(state, action)) {
        return state;
      }
      return {
        ...state,
        syncing: false,
        cancelRequested: false,
        error: action.payload.error,
      };
    case BOOKMARK_LIBRARY.CLEAR:
      return {
        ...initState,
        ownerUserId: state.ownerUserId,
      };
    default:
      return state;
  }
}
