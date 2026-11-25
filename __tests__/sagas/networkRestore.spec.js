import { put, select, take } from 'redux-saga/effects';
import { refreshAccessToken } from '../../src/common/actions/auth';
import {
  AUTH_LOGOUT,
  AUTH_REFRESH_ACCESS_TOKEN,
} from '../../src/common/constants/actionTypes';
import { fetchRecommendedIllusts } from '../../src/common/actions/recommendedIllusts';
import { fetchRecommendedUsers } from '../../src/common/actions/recommendedUsers';
import { fetchNewNovels } from '../../src/common/actions/newNovels';
import { fetchRanking } from '../../src/common/actions/ranking';
import {
  NETWORK_SAGA_OPTIONS,
  watchNetworkRestore,
} from '../../src/common/sagas/networkRestore';

const CONNECTION_CHANGE = '@@network-connectivity/CONNECTION_CHANGE';

const nextConnectionChange = (generator, payload) => {
  expect(generator.next().value).toEqual(take(CONNECTION_CHANGE));
  return generator.next({ payload });
};

describe('watchNetworkRestore', () => {
  it('refreshes failed lists when connectivity changes from offline to online', () => {
    const generator = watchNetworkRestore();

    nextConnectionChange(generator, false);
    expect(generator.next({ payload: true }).value).toEqual(select());

    const state = {
      recommendedIllusts: { error: true },
      recommendedUsers: { error: true },
      newNovels: { error: true },
      ranking: {
        day: { error: true },
        DAILY_MALE_NOVEL: { error: true, options: { language: 'zh-CN' } },
        week: { error: false },
      },
    };

    expect(generator.next(state).value).toEqual(
      put(fetchRecommendedIllusts(undefined, undefined, true)),
    );
    expect(generator.next().value).toEqual(
      put(fetchRecommendedUsers(undefined, undefined, true)),
    );
    expect(generator.next().value).toEqual(
      put(fetchNewNovels(undefined, true)),
    );
    expect(generator.next().value).toEqual(
      put(fetchRanking('day', undefined, undefined, true)),
    );
    expect(generator.next().value).toEqual(
      put(
        fetchRanking(
          'DAILY_MALE_NOVEL',
          { language: 'zh-CN' },
          undefined,
          true,
        ),
      ),
    );
    expect(generator.next().value).toEqual(take(CONNECTION_CHANGE));
  });

  it('does not refresh when the connection remains online', () => {
    const generator = watchNetworkRestore();

    expect(generator.next().value).toEqual(take(CONNECTION_CHANGE));
    expect(generator.next({ payload: true }).value).toEqual(
      take(CONNECTION_CHANGE),
    );
  });

  it('periodically probes the Pixiv API even when Wi-Fi remains connected', () => {
    expect(NETWORK_SAGA_OPTIONS).toEqual({
      pingInterval: 10000,
      pingOnlyIfOffline: false,
      pingServerUrl: 'https://app-api.pixiv.net',
      pingTimeout: 5000,
    });
  });

  it('re-authenticates before refreshing errored lists when needsTokenRefresh is true', () => {
    const generator = watchNetworkRestore();

    nextConnectionChange(generator, false);
    expect(generator.next({ payload: true }).value).toEqual(select());

    const preRefreshState = {
      auth: {
        user: { id: 123, refreshToken: 'rt-1' },
        needsTokenRefresh: true,
      },
      recommendedIllusts: { error: true },
    };

    expect(generator.next(preRefreshState).value).toEqual(
      put(refreshAccessToken('rt-1')),
    );
    expect(generator.next().value).toEqual(
      take([
        AUTH_REFRESH_ACCESS_TOKEN.SUCCESS,
        AUTH_REFRESH_ACCESS_TOKEN.FAILURE,
        AUTH_LOGOUT.SUCCESS,
      ]),
    );
    expect(
      generator.next({ type: AUTH_REFRESH_ACCESS_TOKEN.SUCCESS }).value,
    ).toEqual(select());
    expect(
      generator.next({
        ...preRefreshState,
        auth: { user: { id: 123, refreshToken: 'rt-2' }, needsTokenRefresh: false },
      }).value,
    ).toEqual(put(fetchRecommendedIllusts(undefined, undefined, true)));
  });

  it('does not refresh lists if re-authentication fails or user logged out before reconnect', () => {
    const generator = watchNetworkRestore();

    nextConnectionChange(generator, false);
    expect(generator.next({ payload: true }).value).toEqual(select());
    expect(
      generator.next({
        auth: { user: { id: 123, refreshToken: 'rt-1' }, needsTokenRefresh: true },
        recommendedIllusts: { error: true },
      }).value,
    ).toEqual(put(refreshAccessToken('rt-1')));
    expect(generator.next().value).toEqual(
      take([
        AUTH_REFRESH_ACCESS_TOKEN.SUCCESS,
        AUTH_REFRESH_ACCESS_TOKEN.FAILURE,
        AUTH_LOGOUT.SUCCESS,
      ]),
    );
    expect(generator.next({ type: AUTH_LOGOUT.SUCCESS }).value).toEqual(
      take(CONNECTION_CHANGE),
    );
  });
});
