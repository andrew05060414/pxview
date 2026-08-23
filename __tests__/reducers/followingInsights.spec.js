import reducer from '../../src/common/reducers/followingInsights';
import {
  syncFollowingInsightsStart,
  syncFollowingInsightsCancel,
  syncFollowingInsightsStop,
  syncFollowingInsightsProgress,
  syncFollowingInsightsBatch,
  syncFollowingInsightsSuccess,
  syncFollowingInsightsFailure,
  clearFollowingInsights,
} from '../../src/common/actions/followingInsights';

describe('followingInsights reducer', () => {
  const initial = reducer(undefined, { type: 'INIT' });

  test('initial state structure', () => {
    expect(initial).toEqual({
      syncing: false,
      cancelRequested: false,
      progress: { pagesDone: 0, authorsSynced: 0 },
      lastSyncedAt: null,
      error: null,
      authors: {},
    });
  });

  test('sync lifecycle: start -> progress -> batch -> success', () => {
    let state = reducer(initial, syncFollowingInsightsStart());
    expect(state.syncing).toBe(true);
    expect(state.progress.pagesDone).toBe(0);

    state = reducer(state, syncFollowingInsightsProgress(1, 10));
    expect(state.progress.pagesDone).toBe(1);
    expect(state.progress.authorsSynced).toBe(10);

    state = reducer(
      state,
      syncFollowingInsightsBatch([{ id: 'u1', name: 'User 1' }]),
    );
    expect(state.authors.u1).toEqual({ id: 'u1', name: 'User 1' });

    state = reducer(state, syncFollowingInsightsSuccess());
    expect(state.syncing).toBe(false);
    expect(typeof state.lastSyncedAt).toBe('number');
  });

  test('handles cancel, stop, failure, and clear', () => {
    let state = reducer(initial, syncFollowingInsightsCancel());
    expect(state.cancelRequested).toBe(true);

    state = reducer(state, syncFollowingInsightsStop());
    expect(state.syncing).toBe(false);
    expect(state.cancelRequested).toBe(false);

    state = reducer(state, syncFollowingInsightsFailure('Network Error'));
    expect(state.syncing).toBe(false);
    expect(state.error).toBe('Network Error');

    state = reducer(state, clearFollowingInsights());
    expect(state).toEqual(initial);
  });
});
