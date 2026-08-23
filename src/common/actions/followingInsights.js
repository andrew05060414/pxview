import { FOLLOWING_INSIGHTS } from '../constants/actionTypes';

export function syncFollowingInsightsStart() {
  return {
    type: FOLLOWING_INSIGHTS.SYNC_START,
  };
}

export function syncFollowingInsightsCancel() {
  return {
    type: FOLLOWING_INSIGHTS.SYNC_CANCEL,
  };
}

export function syncFollowingInsightsStop() {
  return {
    type: FOLLOWING_INSIGHTS.SYNC_STOP,
  };
}

export function syncFollowingInsightsProgress(pagesDone, authorsSynced) {
  return {
    type: FOLLOWING_INSIGHTS.SYNC_PROGRESS,
    payload: {
      pagesDone,
      authorsSynced,
    },
  };
}

export function syncFollowingInsightsBatch(authors) {
  return {
    type: FOLLOWING_INSIGHTS.SYNC_BATCH,
    payload: {
      authors,
    },
  };
}

export function syncFollowingInsightsSuccess() {
  return {
    type: FOLLOWING_INSIGHTS.SYNC_SUCCESS,
    payload: {
      timestamp: Date.now(),
    },
  };
}

export function syncFollowingInsightsFailure(error) {
  return {
    type: FOLLOWING_INSIGHTS.SYNC_FAILURE,
    payload: {
      error: String(error),
    },
  };
}

export function clearFollowingInsights() {
  return {
    type: FOLLOWING_INSIGHTS.CLEAR,
  };
}
