import { createStore, applyMiddleware, compose } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { createNetworkMiddleware } from 'react-native-offline';
import invariant from 'redux-immutable-state-invariant';
import {
  persistStore,
  persistReducer,
  createTransform,
  createMigrate,
} from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import getStoredStateMigrateV4 from 'redux-persist/lib/integration/getStoredStateMigrateV4';
import applyAppStateListener from './appStateEnhancer';
import FileSystemStorage from 'redux-persist-filesystem-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import rootReducer from '../reducers';
import rootSaga from '../sagas';
import getStoredStateMigrateToFileSystemStorage from './getStoredStateMigrateToFileSystemStorage';
import { SCREENS } from '../constants';

const myTransform = createTransform(
  (inboundState, key, fullState) => {
    switch (key) {
      case 'entities': {
        const {
          entities,
          browsingHistoryIllusts,
          browsingHistoryNovels,
          muteUsers,
        } = fullState;
        const selectedUsersEntities = {};
        const selectedIllustsEntities = browsingHistoryIllusts.items
          .filter((id) => entities.illusts[id])
          .reduce((prev, id) => {
            prev[id] = entities.illusts[id];
            const userId = entities.illusts[id].user;
            selectedUsersEntities[userId] = entities.users[userId];
            return prev;
          }, {});
        const selectedNovelsEntities = browsingHistoryNovels.items
          .filter((id) => entities.novels[id])
          .reduce((prev, id) => {
            prev[id] = entities.novels[id];
            const userId = entities.novels[id].user;
            selectedUsersEntities[userId] = entities.users[userId];
            return prev;
          }, {});
        const selectedUsersEntities2 = muteUsers.items
          .filter((m) => entities.users[m.id])
          .reduce((prev, m) => {
            prev[m.id] = entities.users[m.id];
            return prev;
          }, {});
        const finalSelectedUsersEntities = {
          ...selectedUsersEntities,
          ...selectedUsersEntities2,
        };
        return {
          ...inboundState,
          illusts: selectedIllustsEntities,
          novels: selectedNovelsEntities,
          users: finalSelectedUsersEntities,
        };
      }
      case 'browsingHistoryIllusts': {
        const { entities, browsingHistoryIllusts } = fullState;
        return {
          ...inboundState,
          items: browsingHistoryIllusts.items.filter(
            (id) =>
              entities.illusts[id] &&
              entities.illusts[id].user &&
              entities.users[entities.illusts[id].user],
          ),
        };
      }
      case 'browsingHistoryNovels': {
        const { entities, browsingHistoryNovels } = fullState;
        return {
          ...inboundState,
          items: browsingHistoryNovels.items.filter(
            (id) =>
              entities.novels[id] &&
              entities.novels[id].user &&
              entities.users[entities.novels[id].user],
          ),
        };
      }
      default:
        return inboundState;
    }
  },
  (outboundState, key, fullState) => {
    switch (key) {
      case 'browsingHistoryIllusts': {
        try {
          const entities = JSON.parse(fullState.entities);
          const browsingHistoryIllusts = outboundState;
          return {
            ...outboundState,
            items: browsingHistoryIllusts.items.filter(
              (id) =>
                entities.illusts[id]?.user &&
                entities.users[entities.illusts[id]?.user],
            ),
          };
        } catch (err) {
          return outboundState;
        }
      }
      case 'browsingHistoryNovels': {
        try {
          const entities = JSON.parse(fullState.entities);
          const browsingHistoryNovels = outboundState;
          return {
            ...outboundState,
            items: browsingHistoryNovels.items.filter(
              (id) =>
                entities.novels[id]?.user &&
                entities.users[entities.novels[id]?.user],
            ),
          };
        } catch (err) {
          return outboundState;
        }
      }
      default:
        return outboundState;
    }
  },
  {
    whitelist: [
      'entities',
      'browsingHistoryIllusts',
      'browsingHistoryNovels',
      'muteUsers',
      'initialScreenSettings',
      'readingSettings',
      'trendingSearchSettings',
    ],
  },
);

const removeAsyncStorageKeys = async (keys) => {
  if (!keys || !keys.length) {
    return;
  }
  if (typeof AsyncStorage.removeMany === 'function') {
    await AsyncStorage.removeMany(keys);
    return;
  }
  if (typeof AsyncStorage.multiRemove === 'function') {
    await AsyncStorage.multiRemove(keys);
    return;
  }
  if (typeof AsyncStorage.removeItem === 'function') {
    await Promise.all(keys.map((key) => AsyncStorage.removeItem(key)));
  }
};

const clearV4PersistedContents = async () => {
  try {
    if (typeof AsyncStorage.getAllKeys !== 'function') {
      return;
    }
    const keys = await new Promise((resolve, reject) => {
      let settled = false;
      const done = (err, result) => {
        if (settled) return;
        settled = true;
        if (err) reject(err);
        else resolve(result || []);
      };
      const maybePromise =
        AsyncStorage.getAllKeys.length > 0
          ? AsyncStorage.getAllKeys(done)
          : AsyncStorage.getAllKeys();
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then((res) => done(null, res), (err) => done(err));
      } else if (AsyncStorage.getAllKeys.length === 0) {
        done(null, maybePromise);
      }
    });
    if (!keys || !keys.length) {
      return;
    }
    const keyPrefix = 'persist:root';
    const v5PersistKeys = keys.filter((key) => key.indexOf(keyPrefix) === 0);
    if (v5PersistKeys.length) {
      await removeAsyncStorageKeys(v5PersistKeys);
    } else {
      const v4KeyPrefix = 'reduxPersist:';
      const v4PersistKeys = keys.filter(
        (key) => key.indexOf(v4KeyPrefix) === 0,
      );
      if (v4PersistKeys.length) {
        await removeAsyncStorageKeys(v4PersistKeys);
      }
    }
  } catch (_e) {}
};

export default function configureStore() {
  let enhancer;
  const sagaMiddleware = createSagaMiddleware();
  const networkMiddleware = createNetworkMiddleware();
  if (process.env.NODE_ENV !== 'production') {
    const composeEnhancers =
      // eslint-disable-next-line no-underscore-dangle
      window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
    enhancer = composeEnhancers(
      applyAppStateListener(),
      applyMiddleware(invariant(), networkMiddleware, sagaMiddleware),
      // devTools(),
    );
  } else {
    enhancer = compose(
      applyAppStateListener(),
      applyMiddleware(networkMiddleware, sagaMiddleware),
    );
  }

  const v4Config = {
    whitelist: [
      'searchHistory',
      'browsingHistoryIllusts',
      'browsingHistoryNovels',
      'highlightTags',
      'muteTags',
      'muteUsers',
      'saveImageSettings',
      'novelSettings',
      'novelRankingSettings',
      'entities',
      'auth',
      'i18n',
    ],
    storage: AsyncStorage,
    transforms: [myTransform],
  };

  const v5Config = {
    key: 'root',
    stateReconciler: autoMergeLevel2,
    whitelist: [
      'searchHistory',
      'browsingHistoryIllusts',
      'browsingHistoryNovels',
      'highlightTags',
      'muteTags',
      'muteUsers',
      'saveImageSettings',
      'initialScreenSettings',
      'novelSettings',
      'novelRankingSettings',
      'entities',
      'auth',
      'i18n',
      'theme',
      'readingSettings',
      'trendingSearchSettings',
    ],
    storage: AsyncStorage,
    transforms: [myTransform],
    getStoredState: getStoredStateMigrateV4(v4Config),
  };

  const migirationToAppV4 = {
    0: (state) => {
      return state;
    },
    1: (state) => {
      const { entities, muteUsers, initialScreenSettings } = state;
      // migrate from array of id to array of object
      const items = muteUsers.items
        .map((id) => {
          const user = entities.users[id];
          if (user) {
            return {
              id: user.id,
              name: user.name,
              profile_image_urls: user.profile_image_urls,
            };
          }
          return null;
        })
        .filter((item) => item);
      return {
        ...state,
        muteUsers: {
          items,
        },
        initialScreenSettings: {
          routeName:
            initialScreenSettings.routeName === SCREENS.Ranking
              ? SCREENS.RankingPreview
              : initialScreenSettings.routeName,
        },
      };
    },
  };

  const persistConfig = {
    key: 'root',
    timeout: 15000, // https://github.com/rt2zz/redux-persist/issues/717
    stateReconciler: autoMergeLevel2,
    version: 1,
    whitelist: [
      'searchHistory',
      'browsingHistoryIllusts',
      'browsingHistoryNovels',
      'highlightTags',
      'muteSettings',
      'muteTags',
      'muteUsers',
      'saveImageSettings',
      'initialScreenSettings',
      'novelSettings',
      'novelRankingSettings',
      'likeButtonSettings',
      'readingSettings',
      'trendingSearchSettings',
      'readingProgress',
      'bookmarkLibrary',
      'followingInsights',
      'aiSettings',
      'classifications',
      'bookmarkRules',
      'entities',
      'auth',
      'i18n',
      'theme',
    ],
    storage: FileSystemStorage,
    transforms: [myTransform],
    getStoredState: getStoredStateMigrateToFileSystemStorage(
      v5Config,
      v4Config,
    ),
    migrate: createMigrate(migirationToAppV4, {
      debug: process.env.NODE_ENV !== 'production',
    }),
    debug: process.env.NODE_ENV !== 'production',
  };
  const persistedReducer = persistReducer(persistConfig, rootReducer);
  const store = createStore(persistedReducer, undefined, enhancer);
  sagaMiddleware.run(rootSaga);

  const persistor = persistStore(store, undefined, clearV4PersistedContents);
  if (module.hot) {
    // eslint-disable-next-line global-require
    const nextRootReducer = require('../reducers');
    module.hot.accept(() => {
      store.replaceReducer(persistReducer(persistConfig, nextRootReducer));
    });
  }

  return { store, persistor };
}

