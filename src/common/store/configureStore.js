import { createStore, applyMiddleware, compose } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { createNetworkMiddleware } from 'react-native-offline';
import invariant from 'redux-immutable-state-invariant';
import {
  persistStore,
  persistReducer,
  createTransform,
  createMigrate,
  getStoredState,
} from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import getStoredStateMigrateV4 from 'redux-persist/lib/integration/getStoredStateMigrateV4';
import applyAppStateListener from './appStateEnhancer';
import FileSystemStorage from 'redux-persist-filesystem-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFetchBlob from 'react-native-blob-util';
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

const removeAsyncStorageKeys = async (storage, keys) => {
  if (!keys || !keys.length) {
    return;
  }
  if (typeof storage.removeMany === 'function') {
    await storage.removeMany(keys);
    return;
  }
  if (typeof storage.multiRemove === 'function') {
    await storage.multiRemove(keys);
    return;
  }
  if (typeof storage.removeItem === 'function') {
    await Promise.all(keys.map((key) => storage.removeItem(key)));
  }
};

const getAllLegacyKeys = async (storage) => {
  if (!storage || typeof storage.getAllKeys !== 'function') {
    return [];
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
      storage.getAllKeys.length > 0
        ? storage.getAllKeys(done)
        : storage.getAllKeys();
    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise.then(
        (res) => done(null, res),
        (err) => done(err),
      );
    } else if (storage.getAllKeys.length === 0) {
      done(null, maybePromise);
    }
  });
  return Array.isArray(keys) ? keys : [];
};

const findLegacyPersistedKeys = (keys) =>
  keys.filter(
    (key) =>
      typeof key === 'string' &&
      (key.indexOf('persist:root') === 0 || key.indexOf('reduxPersist:') === 0),
  );

const verifyPersistedRoot = async (
  fileStorage,
  persistConfig,
  migrationResult,
  expectedState,
) => {
  if (
    !migrationResult ||
    (migrationResult.source !== 'filesystem' &&
      migrationResult.source !== 'asyncstorage_v5' &&
      migrationResult.source !== 'asyncstorage_v4')
  ) {
    return false;
  }

  const rawRoot = await fileStorage.getItem(`persist:${persistConfig.key}`);
  if (typeof rawRoot !== 'string' || !rawRoot) {
    return false;
  }
  const parsedRaw = JSON.parse(rawRoot);
  if (!parsedRaw || typeof parsedRaw !== 'object' || !parsedRaw._persist) {
    return false;
  }

  const readBackState = await getStoredState({
    key: persistConfig.key,
    storage: fileStorage,
    transforms: persistConfig.transforms,
    debug: persistConfig.debug,
  });
  if (!readBackState || typeof readBackState !== 'object' || !readBackState._persist) {
    return false;
  }

  const whitelistSet = new Set(persistConfig.whitelist || []);
  const sourceState = migrationResult.state || {};
  const keysToVerify = Object.keys(sourceState).filter(
    (k) => k !== '_persist' && whitelistSet.has(k) && sourceState[k] !== undefined,
  );
  if (keysToVerify.length === 0) {
    return false;
  }

  for (let i = 0; i < keysToVerify.length; i += 1) {
    const key = keysToVerify[i];
    if (expectedState && expectedState[key] === undefined) {
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(parsedRaw, key)) {
      return false;
    }
    if (readBackState[key] === undefined) {
      return false;
    }
    if (key === 'auth') {
      const expectedUid = expectedState?.auth?.user?.id ?? null;
      const readUid = readBackState.auth?.user?.id ?? null;
      if (expectedUid !== readUid) {
        return false;
      }
    } else if (
      expectedState &&
      JSON.stringify(readBackState[key]) !== JSON.stringify(expectedState[key])
    ) {
      return false;
    }
  }

  return true;
};

export default function configureStore(options = {}) {
  const fileStorage = options.fileStorage || FileSystemStorage;
  const legacyStorage = options.legacyStorage || AsyncStorage;
  const fileSystem = options.fileSystem || RNFetchBlob.fs;
  const runSagas = options.runSagas !== false;

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
      'initialScreenSettings',
      'novelSettings',
      'novelRankingSettings',
      'entities',
      'auth',
      'i18n',
    ],
    storage: legacyStorage,
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
    storage: legacyStorage,
    transforms: [myTransform],
    getStoredState: getStoredStateMigrateV4(v4Config),
  };

  const migirationToAppV4 = {
    0: (state) => {
      return state;
    },
    1: (state) => {
      if (!state || typeof state !== 'object') {
        return state;
      }
      const { entities, muteUsers, initialScreenSettings } = state;
      const usersMap = (entities && entities.users) || {};
      const muteItems = Array.isArray(muteUsers?.items) ? muteUsers.items : [];
      // migrate from array of id to array of object
      const items = muteItems
        .map((idOrUser) => {
          if (idOrUser && typeof idOrUser === 'object' && idOrUser.id != null) {
            return idOrUser;
          }
          const user = usersMap[idOrUser];
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
      const nextRouteName =
        initialScreenSettings?.routeName === SCREENS.Ranking
          ? SCREENS.RankingPreview
          : initialScreenSettings?.routeName;
      return {
        ...state,
        muteUsers: {
          items,
        },
        ...(initialScreenSettings
          ? {
              initialScreenSettings: {
                ...initialScreenSettings,
                routeName: nextRouteName,
              },
            }
          : {}),
      };
    },
  };

  let migrationResult = { source: 'empty', state: undefined };

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
    storage: fileStorage,
    transforms: [myTransform],
    getStoredState: getStoredStateMigrateToFileSystemStorage(
      v5Config,
      v4Config,
      {
        fileSystem,
        onResult: (result) => {
          migrationResult = result || { source: 'empty', state: undefined };
        },
      },
    ),
    migrate: createMigrate(migirationToAppV4, {
      debug: process.env.NODE_ENV !== 'production',
    }),
    debug: process.env.NODE_ENV !== 'production',
  };
  const persistedReducer = persistReducer(persistConfig, rootReducer);
  const store = createStore(persistedReducer, undefined, enhancer);
  if (runSagas) {
    sagaMiddleware.run(rootSaga);
  }

  let resolveLegacyCleanup;
  const legacyCleanupPromise = new Promise((resolve) => {
    resolveLegacyCleanup = resolve;
  });

  const verifyAndClearLegacyStorage = async () => {
    try {
      const allKeys = await getAllLegacyKeys(legacyStorage);
      const legacyKeys = findLegacyPersistedKeys(allKeys);
      if (!legacyKeys.length) {
        return false;
      }
      if (
        migrationResult.source !== 'filesystem' &&
        migrationResult.source !== 'asyncstorage_v5' &&
        migrationResult.source !== 'asyncstorage_v4'
      ) {
        return false;
      }
      const expectedState = store.getState();
      await persistor.flush();
      const verified = await verifyPersistedRoot(
        fileStorage,
        persistConfig,
        migrationResult,
        expectedState,
      );
      if (!verified) {
        return false;
      }
      await removeAsyncStorageKeys(legacyStorage, legacyKeys);
      return true;
    } catch (_e) {
      return false;
    } finally {
      resolveLegacyCleanup(true);
    }
  };

  const persistor = persistStore(store, undefined, verifyAndClearLegacyStorage);
  persistor.legacyCleanupPromise = legacyCleanupPromise;
  if (module.hot) {
    // eslint-disable-next-line global-require
    const nextRootReducer = require('../reducers');
    module.hot.accept(() => {
      store.replaceReducer(persistReducer(persistConfig, nextRootReducer));
    });
  }

  return { store, persistor };
}

