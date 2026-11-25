/* eslint-disable no-console */

// getStoredStateV4(v4Config) based from https://github.com/rt2zz/redux-persist/blob/master/src/integration/getStoredStateMigrateV4.js

import { getStoredState } from 'redux-persist';
import RNFetchBlob from 'react-native-blob-util';

const KEY_PREFIX = 'reduxPersist:';

function hasLocalStorage() {
  if (typeof window !== 'object' || !('localStorage' in window)) {
    return false;
  }

  try {
    const storage = window.localStorage;
    const testKey = `redux-persist localStorage test`;
    storage.setItem(testKey, 'test');
    storage.getItem(testKey);
    storage.removeItem(testKey);
  } catch (e) {
    if (process.env.NODE_ENV !== 'production')
      console.warn(
        `redux-persist localStorage test failed, persistence will be disabled.`,
      );
    return false;
  }
  return true;
}

const noop = () => /* noop */ null;
const noStorage = {
  getItem: noop,
  setItem: noop,
  removeItem: noop,
  getAllKeys: noop,
};
const createAsyncLocalStorage = () => {
  if (!hasLocalStorage()) return noStorage;
  const { localStorage } = window;
  return {
    getAllKeys(cb) {
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          keys.push(localStorage.key(i));
        }
        cb(null, keys);
      } catch (e) {
        cb(e);
      }
    },
    getItem(key, cb) {
      try {
        const s = localStorage.getItem(key);
        cb(null, s);
      } catch (e) {
        cb(e);
      }
    },
    setItem(key, string, cb) {
      try {
        localStorage.setItem(key, string);
        cb(null);
      } catch (e) {
        cb(e);
      }
    },
    removeItem(key, cb) {
      try {
        localStorage.removeItem(key);
        cb && cb(null); // eslint-disable-line no-unused-expressions
      } catch (e) {
        cb(e);
      }
    },
  };
};

function callStorageMethod(storage, methodName, ...args) {
  return new Promise((resolve, reject) => {
    const fn = storage && storage[methodName];
    if (typeof fn !== 'function') {
      resolve(undefined);
      return;
    }
    let settled = false;
    const done = (err, result) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve(result);
    };
    try {
      const maybePromise =
        fn.length > args.length
          ? fn.call(storage, ...args, done)
          : fn.call(storage, ...args);
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(
          (res) => done(null, res),
          (err) => done(err),
        );
      } else if (fn.length <= args.length) {
        done(null, maybePromise);
      }
    } catch (err) {
      done(err);
    }
  });
}

async function getStoredStateV4(v4Config) {
  let storage = v4Config.storage || createAsyncLocalStorage();
  const deserializer =
    v4Config.serialize === false
      ? (data) => data
      : (serial: string) => JSON.parse(serial);
  const blacklist = v4Config.blacklist || [];
  const whitelist = v4Config.whitelist || false;
  const transforms = v4Config.transforms || [];
  const keyPrefix =
    v4Config.keyPrefix !== undefined ? v4Config.keyPrefix : KEY_PREFIX;

  // fallback getAllKeys to `keys` if present (LocalForage compatability)
  if (storage.keys && !storage.getAllKeys) {
    storage = { ...storage, getAllKeys: storage.keys };
  }

  function rehydrate(key: string, serialized: ?string) {
    let state = null;

    try {
      const data = serialized ? deserializer(serialized) : undefined;
      state = transforms.reduceRight(
        (subState, transformer) => transformer.out(subState, key),
        data,
      );
    } catch (err) {
      if (process.env.NODE_ENV !== 'production')
        console.warn(
          'redux-persist/getStoredState: Error restoring data for key:',
          key,
          err,
        );
    }

    return state;
  }

  function passWhitelistBlacklist(key) {
    if (whitelist && whitelist.indexOf(key) === -1) return false;
    if (blacklist.indexOf(key) !== -1) return false;
    return true;
  }

  function createStorageKey(key) {
    return `${keyPrefix}${key}`;
  }

  let allKeys;
  try {
    allKeys = (await callStorageMethod(storage, 'getAllKeys')) || [];
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'redux-persist/getStoredState: Error in storage.getAllKeys',
      );
    }
    throw error;
  }

  const persistKeys = allKeys
    .filter((key) => typeof key === 'string' && key.indexOf(keyPrefix) === 0)
    .map((key) => key.slice(keyPrefix.length));
  const keysToRestore = persistKeys.filter(passWhitelistBlacklist);

  if (keysToRestore.length === 0) {
    return undefined;
  }

  const restoredState = {};
  await Promise.all(
    keysToRestore.map(async (key) => {
      try {
        const serialized = await callStorageMethod(
          storage,
          'getItem',
          createStorageKey(key),
        );
        restoredState[key] = rehydrate(key, serialized);
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            'redux-persist/getStoredState: Error restoring data for key:',
            key,
            err,
          );
        }
      }
    }),
  );
  return restoredState;
}

export default function getStoredStateMigrateToFileSystemStorage(
  v5Config,
  v4Config,
) {
  return async (currentConfig) => {
    const filePersistStorePath = `${RNFetchBlob.fs.dirs.DocumentDir}/persistStore`;
    const isFilePersistStoreExists = await RNFetchBlob.fs.exists(
      filePersistStorePath,
    );
    if (isFilePersistStoreExists) {
      const state = await getStoredState(currentConfig);
      return state;
    }
    return getStoredState(v5Config).then((v5State) => {
      if (v5State) {
        return v5State;
      }
      return getStoredStateV4(v4Config);
    });
  };
}
