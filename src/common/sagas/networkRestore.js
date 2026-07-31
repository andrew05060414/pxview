import { put, select, take } from 'redux-saga/effects';
import { fetchRecommendedIllusts } from '../actions/recommendedIllusts';
import { fetchRecommendedNovels } from '../actions/recommendedNovels';
import { fetchRecommendedMangas } from '../actions/recommendedMangas';
import { fetchRecommendedUsers } from '../actions/recommendedUsers';
import { fetchFollowingUserIllusts } from '../actions/followingUserIllusts';
import { fetchFollowingUserNovels } from '../actions/followingUserNovels';
import { fetchNewIllusts } from '../actions/newIllusts';
import { fetchNewMangas } from '../actions/newMangas';
import { fetchNewNovels } from '../actions/newNovels';
import { fetchRanking } from '../actions/ranking';

const CONNECTION_CHANGE = '@@network-connectivity/CONNECTION_CHANGE';

export const NETWORK_SAGA_OPTIONS = {
  pingInterval: 10000,
  pingOnlyIfOffline: false,
  pingServerUrl: 'https://app-api.pixiv.net',
  pingTimeout: 5000,
};

/**
 * Dispatches a refresh for each list that has error: true (failed to load
 * while offline) when connectivity restores. Mirrors what pull-to-refresh
 * does — dispatches the same REQUEST action with refreshing: true.
 *
 * Only refreshes lists that are in error state (error: true, loaded: false).
 * Lists that loaded successfully are not re-fetched.
 */
function* handleNetworkRestore() {
  const state = yield select();

  if (state.recommendedIllusts && state.recommendedIllusts.error) {
    yield put(fetchRecommendedIllusts(undefined, undefined, true));
  }
  if (state.recommendedNovels && state.recommendedNovels.error) {
    yield put(fetchRecommendedNovels(undefined, undefined, true));
  }
  if (state.recommendedMangas && state.recommendedMangas.error) {
    yield put(fetchRecommendedMangas(undefined, undefined, true));
  }
  if (state.recommendedUsers && state.recommendedUsers.error) {
    yield put(fetchRecommendedUsers(undefined, undefined, true));
  }
  if (state.followingUserIllusts && state.followingUserIllusts.error) {
    yield put(fetchFollowingUserIllusts(undefined, undefined, true));
  }
  if (state.followingUserNovels && state.followingUserNovels.error) {
    yield put(fetchFollowingUserNovels(undefined, undefined, true));
  }
  if (state.newIllusts && state.newIllusts.error) {
    yield put(fetchNewIllusts(undefined, true));
  }
  if (state.newMangas && state.newMangas.error) {
    yield put(fetchNewMangas(undefined, true));
  }
  if (state.newNovels && state.newNovels.error) {
    yield put(fetchNewNovels(undefined, true));
  }

  // ranking is keyed by rankingMode — only refresh modes that have error: true
  if (state.ranking) {
    const modes = Object.keys(state.ranking);
    for (let i = 0; i < modes.length; i += 1) {
      const mode = modes[i];
      if (state.ranking[mode] && state.ranking[mode].error) {
        yield put(fetchRanking(mode, undefined, undefined, true));
      }
    }
  }
}

export function* watchNetworkRestore() {
  let wasConnected = true; // assume connected on start
  while (true) {
    const action = yield take(CONNECTION_CHANGE);
    const isConnected = action.payload;
    if (isConnected && !wasConnected) {
      // Transitioned from offline -> online
      yield* handleNetworkRestore();
    }
    wasConnected = isConnected;
  }
}
