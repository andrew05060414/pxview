/** @jest-environment jsdom */
import { NOVEL_RANKING_LANGUAGES } from '../../src/common/constants';
import {
  clearLanguage,
  setLanguage,
} from '../../src/common/actions/novelRankingSettings';
import { getPreferredNovelRankingLanguage } from '../../src/common/reducers/novelRankingSettings';

jest.mock('../../src/common/sagas', () => function* rootSaga() {});
jest.mock('redux-enhancer-react-native-appstate', () => () => (createStore) =>
  createStore);
jest.mock('react-native-offline', () => ({
  createNetworkMiddleware: () => () => (next) => next,
}));
jest.mock('@react-native-community/async-storage', () => ({
  getAllKeys: (callback) => callback(null, []),
}));
jest.mock('redux-persist-filesystem-storage', () => {
  const values = new Map();
  return {
    getItem: (key) => Promise.resolve(values.get(key)),
    setItem: (key, value) => Promise.resolve(values.set(key, value)),
  };
});
jest.mock('../../src/common/reducers', () => {
  const { combineReducers } = jest.requireActual('redux');
  const novelRankingSettings = jest.requireActual(
    '../../src/common/reducers/novelRankingSettings',
  ).default;
  return combineReducers({ novelRankingSettings });
});

// eslint-disable-next-line global-require
const configureStore = require('../../src/common/store/configureStore')
  .default;

const launch = async () => {
  const app = configureStore();
  await new Promise((resolve) => {
    const unsubscribe = app.persistor.subscribe(() => {
      if (app.persistor.getState().bootstrapped) {
        unsubscribe();
        resolve();
      }
    });
  });
  return app;
};

const close = async ({ persistor }) => {
  await persistor.flush();
  persistor.pause();
};

test('defaults with no preference, reloads a saved choice, and persists clearing it', async () => {
  jest.useFakeTimers();
  try {
    const fresh = await launch();
    expect(getPreferredNovelRankingLanguage(fresh.store.getState())).toBe(
      NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE,
    );
    fresh.store.dispatch(setLanguage(NOVEL_RANKING_LANGUAGES.ALL));
    await close(fresh);

    const relaunched = await launch();
    expect(getPreferredNovelRankingLanguage(relaunched.store.getState())).toBe(
      NOVEL_RANKING_LANGUAGES.ALL,
    );
    relaunched.store.dispatch(clearLanguage());
    await close(relaunched);

    const reset = await launch();
    expect(reset.store.getState().novelRankingSettings.language).toBeNull();
    expect(getPreferredNovelRankingLanguage(reset.store.getState())).toBe(
      NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE,
    );
    await close(reset);
  } finally {
    jest.useRealTimers();
  }
});
