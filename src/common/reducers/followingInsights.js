import { FOLLOWING_INSIGHTS } from '../constants/actionTypes';

const initState = {
  syncing: false,
  cancelRequested: false,
  progress: {
    pagesDone: 0,
    authorsSynced: 0,
  },
  lastSyncedAt: null,
  error: null,
  authors: {},
};

const mergeAuthors = (authors, batch) => {
  const nextAuthors = { ...authors };
  (batch || []).forEach((author) => {
    nextAuthors[author.id] = author;
  });
  return nextAuthors;
};

export default function followingInsights(state = initState, action) {
  switch (action.type) {
    case FOLLOWING_INSIGHTS.SYNC_START:
      return {
        ...state,
        syncing: true,
        cancelRequested: false,
        progress: {
          pagesDone: 0,
          authorsSynced: 0,
        },
        error: null,
      };
    case FOLLOWING_INSIGHTS.SYNC_CANCEL:
      return {
        ...state,
        cancelRequested: true,
      };
    case FOLLOWING_INSIGHTS.SYNC_STOP:
      return {
        ...state,
        syncing: false,
        cancelRequested: false,
      };
    case FOLLOWING_INSIGHTS.SYNC_PROGRESS: {
      const { pagesDone, authorsSynced } = action.payload;
      return {
        ...state,
        progress: {
          pagesDone: state.progress.pagesDone + pagesDone,
          authorsSynced: state.progress.authorsSynced + authorsSynced,
        },
      };
    }
    case FOLLOWING_INSIGHTS.SYNC_BATCH:
      return {
        ...state,
        authors: mergeAuthors(state.authors, action.payload.authors),
      };
    case FOLLOWING_INSIGHTS.SYNC_SUCCESS:
      return {
        ...state,
        syncing: false,
        cancelRequested: false,
        lastSyncedAt: action.payload.timestamp,
      };
    case FOLLOWING_INSIGHTS.SYNC_FAILURE:
      return {
        ...state,
        syncing: false,
        cancelRequested: false,
        error: action.payload.error,
      };
    case FOLLOWING_INSIGHTS.CLEAR:
      return initState;
    default:
      return state;
  }
}
