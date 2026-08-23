import { apply, put, select } from 'redux-saga/effects';
import pixiv from '../../src/common/helpers/apiClient';
import {
  handleSyncFollowingInsights,
  getCancelRequested,
} from '../../src/common/sagas/followingInsights';
import {
  syncFollowingInsightsProgress,
  syncFollowingInsightsBatch,
  syncFollowingInsightsSuccess,
  syncFollowingInsightsFailure,
  syncFollowingInsightsStop,
} from '../../src/common/actions/followingInsights';
import { getAuthUser } from '../../src/common/selectors';

describe('followingInsights saga', () => {
  test('fails if user is not logged in', () => {
    const gen = handleSyncFollowingInsights();
    expect(gen.next().value).toEqual(select(getAuthUser));
    expect(gen.next(null).value).toEqual(
      put(syncFollowingInsightsFailure('user is not logged in')),
    );
    expect(gen.next().done).toBe(true);
  });

  test('syncs public and private following streams and finishes successfully', () => {
    const gen = handleSyncFollowingInsights();
    expect(gen.next().value).toEqual(select(getAuthUser));

    const user = { id: 100 };
    // Start stream 0 ('public')
    expect(gen.next(user).value).toEqual(select(getCancelRequested));

    // Page 1 (public)
    expect(gen.next(false).value).toEqual(
      apply(pixiv, pixiv.userFollowing, [100, { restrict: 'public' }]),
    );

    const publicResp = {
      user_previews: [
        {
          user: { id: 1, name: 'A' },
          profile: { total_illusts: 5 },
          illusts: [{ create_date: '2025-01-01' }],
        },
      ],
      next_url: null,
    };

    expect(gen.next(publicResp).value).toEqual(
      put(
        syncFollowingInsightsBatch([
          {
            id: '1',
            name: 'A',
            restrict: 'public',
            lastActiveAt: '2025-01-01',
            illustCount: 5,
            novelCount: 0,
          },
        ]),
      ),
    );
    expect(gen.next().value).toEqual(put(syncFollowingInsightsProgress(1, 1)));

    // Stream 1 ('private')
    expect(gen.next().value).toEqual(select(getCancelRequested));
    expect(gen.next(false).value).toEqual(
      apply(pixiv, pixiv.userFollowing, [100, { restrict: 'private' }]),
    );

    const privateResp = {
      user_previews: [],
      next_url: null,
    };
    expect(gen.next(privateResp).value).toEqual(
      put(syncFollowingInsightsProgress(1, 0)),
    );

    // End of all streams
    expect(gen.next().value).toEqual(
      put({
        type: 'PIXIV/FOLLOWING_INSIGHTS_SYNC_SUCCESS',
        payload: { timestamp: expect.any(Number) },
      }),
    );
    expect(gen.next().done).toBe(true);
  });

  test('stops gracefully when cancel is requested', () => {
    const gen = handleSyncFollowingInsights();
    expect(gen.next().value).toEqual(select(getAuthUser));
    expect(gen.next({ id: 100 }).value).toEqual(select(getCancelRequested));
    expect(gen.next(true).value).toEqual(put(syncFollowingInsightsStop()));
    expect(gen.next().done).toBe(true);
  });
});
