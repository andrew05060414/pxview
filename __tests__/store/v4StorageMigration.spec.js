import RNFetchBlob from 'react-native-blob-util';
import getStoredStateMigrateToFileSystemStorage from '../../src/common/store/getStoredStateMigrateToFileSystemStorage';

jest.mock('redux-persist-filesystem-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getAllKeys: jest.fn(() => Promise.resolve([])),
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  removeMany: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../src/common/store/appStateEnhancer', () => () => (createStore) =>
  createStore);
jest.mock('react-native-offline', () => ({
  createNetworkMiddleware: () => () => (next) => next,
  reducer: (state = { isConnected: true }) => state,
}));
jest.mock('../../src/common/helpers/i18n', () => ({
  getLanguage: () => 'en',
  setLanguage: () => {},
}));

// eslint-disable-next-line global-require
const configureStore = require('../../src/common/store/configureStore')
  .default;

const createInMemoryKv = (initialEntries = [], events = [], label = 'kv', { failWrites = false, silentFailWrites = false } = {}) => {
  const map = new Map(initialEntries);
  return {
    map,
    getAllKeys: jest.fn(() => Promise.resolve(Array.from(map.keys()))),
    getItem: jest.fn((key) => {
      if (label === 'file') {
        events.push(`verify-read:${key}`);
      }
      return Promise.resolve(map.has(key) ? map.get(key) : null);
    }),
    setItem: jest.fn((key, val) => {
      if (label === 'file') {
        events.push(`write-new:${key}`);
      }
      if (failWrites) {
        return Promise.reject(new Error('disk full'));
      }
      if (silentFailWrites) {
        return Promise.resolve(undefined);
      }
      map.set(key, val);
      return Promise.resolve();
    }),
    removeMany: jest.fn((keys) => {
      events.push(`delete-old:${keys.join(',')}`);
      keys.forEach((k) => map.delete(k));
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      events.push(`delete-old:${key}`);
      map.delete(key);
      return Promise.resolve();
    }),
  };
};

const createFakeFs = (fileMap, dirExists = true) => ({
  dirs: { DocumentDir: '/mock/docs' },
  exists: jest.fn(async (target) => {
    if (target === '/mock/docs/persistStore') {
      return dirExists;
    }
    return fileMap.has('persist:root');
  }),
});

const bootRealStore = async ({ fileStorage, legacyStorage, fileSystem }) => {
  const app = configureStore({
    fileStorage,
    legacyStorage,
    fileSystem,
    runSagas: false,
  });
  await app.persistor.legacyCleanupPromise;
  app.persistor.pause();
  return app;
};

describe('v4 AsyncStorage 3.x Promise migration', () => {
  it('migrates reduxPersist:* keys from Promise-only AsyncStorage 3.x without timing out', async () => {
    const existsSpy = jest
      .spyOn(RNFetchBlob.fs, 'exists')
      .mockResolvedValueOnce(false);
    try {
      const backing = new Map([
        [
          'reduxPersist:browsingHistoryIllusts',
          JSON.stringify({ items: [101, 202] }),
        ],
        ['reduxPersist:unrelated', JSON.stringify({ ignored: true })],
      ]);

      // Pure Promise-only AsyncStorage v3 interface (never invokes callbacks).
      const promiseOnlyStorage = {
        getAllKeys: jest.fn(() => Promise.resolve(Array.from(backing.keys()))),
        getItem: jest.fn((key) => Promise.resolve(backing.get(key) ?? null)),
        removeMany: jest.fn((keys) => {
          keys.forEach((k) => backing.delete(k));
          return Promise.resolve();
        }),
      };

      const v5Config = {
        key: 'root',
        storage: promiseOnlyStorage,
      };
      const v4Config = {
        whitelist: ['browsingHistoryIllusts'],
        storage: promiseOnlyStorage,
        transforms: [],
      };

      const migrate = getStoredStateMigrateToFileSystemStorage(
        v5Config,
        v4Config,
      );
      const restored = await migrate({ key: 'root', storage: promiseOnlyStorage });

      expect(restored).toEqual({
        browsingHistoryIllusts: { items: [101, 202] },
      });
      expect(promiseOnlyStorage.getAllKeys).toHaveBeenCalledTimes(1);
      expect(promiseOnlyStorage.getItem).toHaveBeenCalledWith(
        'reduxPersist:browsingHistoryIllusts',
      );
    } finally {
      existsSpy.mockRestore();
    }
  });
});

describe('configureStore migration safety & write-before-delete contracts', () => {
  const darkV5Root = JSON.stringify({
    theme: JSON.stringify({ name: 'dark' }),
    searchHistory: JSON.stringify({ items: ['sakura'] }),
    _persist: JSON.stringify({ version: 1, rehydrated: true }),
  });

  test('1. empty persistStore directory falls back to AsyncStorage, restores DARK, writes new before deleting old', async () => {
    const events = [];
    const fileStorage = createInMemoryKv([], events, 'file');
    const legacyStorage = createInMemoryKv(
      [['persist:root', darkV5Root]],
      events,
      'legacy',
    );
    const fileSystem = createFakeFs(fileStorage.map, true);

    const { store } = await bootRealStore({
      fileStorage,
      legacyStorage,
      fileSystem,
    });

    expect(store.getState().theme).toEqual({ name: 'dark' });
    expect(store.getState().searchHistory).toEqual({ items: ['sakura'] });
    expect(legacyStorage.map.size).toBe(0);

    const writeIdx = events.findIndex((e) => e.startsWith('write-new:'));
    const verifyIdx = events.findIndex(
      (e, idx) => idx > writeIdx && e.startsWith('verify-read:'),
    );
    const deleteIdx = events.findIndex((e) => e.startsWith('delete-old:'));
    expect(writeIdx).toBeGreaterThanOrEqual(0);
    expect(verifyIdx).toBeGreaterThan(writeIdx);
    expect(deleteIdx).toBeGreaterThan(verifyIdx);
  });

  test('2. corrupt file storage falls back to AsyncStorage and recovers cleanly', async () => {
    const events = [];
    const fileStorage = createInMemoryKv(
      [['persist:root', '{corrupt-json']],
      events,
      'file',
    );
    const legacyStorage = createInMemoryKv(
      [['persist:root', darkV5Root]],
      events,
      'legacy',
    );
    const fileSystem = createFakeFs(fileStorage.map, true);

    const { store } = await bootRealStore({
      fileStorage,
      legacyStorage,
      fileSystem,
    });

    expect(store.getState().theme).toEqual({ name: 'dark' });
    expect(legacyStorage.map.size).toBe(0);
    expect(() => JSON.parse(fileStorage.map.get('persist:root'))).not.toThrow();
  });

  test.each([
    ['throwing setItem', { failWrites: true }],
    ['silent failing setItem (filesystem-storage behavior)', { silentFailWrites: true }],
  ])('3. %s preserves legacy AsyncStorage keys intact', async (_label, writeFlags) => {
    const events = [];
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    try {
      const fileStorage = createInMemoryKv([], events, 'file', writeFlags);
      const legacyStorage = createInMemoryKv(
        [['persist:root', darkV5Root]],
        events,
        'legacy',
      );
      const fileSystem = createFakeFs(fileStorage.map, true);

      const { store } = await bootRealStore({
        fileStorage,
        legacyStorage,
        fileSystem,
      });

      expect(store.getState().theme).toEqual({ name: 'dark' });
      expect(legacyStorage.map.has('persist:root')).toBe(true);
      expect(events.some((e) => e.startsWith('delete-old:'))).toBe(false);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  test('4. mid-flight exit before cleanup keeps legacy intact while new file store is already restorable on relaunch', async () => {
    const events = [];
    const fileStorage = createInMemoryKv([], events, 'file');
    const legacyStorage = createInMemoryKv(
      [
        ['persist:root', darkV5Root],
        ['reduxPersist:theme', JSON.stringify({ name: 'dark' })],
      ],
      events,
      'legacy',
    );
    // Simulate interruption before AsyncStorage deletion finishes.
    legacyStorage.removeMany = jest.fn(() => Promise.reject(new Error('app killed mid-cleanup')));
    const fileSystem = createFakeFs(fileStorage.map, true);

    const first = await bootRealStore({
      fileStorage,
      legacyStorage,
      fileSystem,
    });
    expect(first.store.getState().theme).toEqual({ name: 'dark' });
    expect(fileStorage.map.has('persist:root')).toBe(true);
    expect(legacyStorage.map.size).toBe(2);

    // 5. Second launch with restored removeMany boots from fileStorage & cleans leftover legacy keys.
    legacyStorage.removeMany = jest.fn((keys) => {
      keys.forEach((k) => legacyStorage.map.delete(k));
      return Promise.resolve();
    });
    const second = await bootRealStore({
      fileStorage,
      legacyStorage,
      fileSystem,
    });
    expect(second.store.getState().theme).toEqual({ name: 'dark' });
    expect(legacyStorage.map.size).toBe(0);
  });

  test('6. normal 5.3.5 FileSystemStorage upgrade preserves settings, history, and readingProgress across two launches', async () => {
    const v535Root = JSON.stringify({
      theme: JSON.stringify({ name: 'dark' }),
      novelRankingSettings: JSON.stringify({ language: 'ja' }),
      readingProgress: JSON.stringify({ 999: { pageIndex: 4 } }),
      browsingHistoryIllusts: JSON.stringify({ items: [101] }),
      entities: JSON.stringify({
        illusts: { 101: { id: 101, user: 7, title: 'Illust 101' } },
        novels: {},
        users: { 7: { id: 7, name: 'Artist 7' } },
      }),
      searchHistory: JSON.stringify({ items: ['miku', 'landscape'] }),
      _persist: JSON.stringify({ version: 1, rehydrated: true }),
    });
    const fileStorage = createInMemoryKv([['persist:root', v535Root]], [], 'file');
    const legacyStorage = createInMemoryKv([], [], 'legacy');
    const fileSystem = createFakeFs(fileStorage.map, true);

    const launch1 = await bootRealStore({ fileStorage, legacyStorage, fileSystem });
    expect(launch1.store.getState().theme).toEqual({ name: 'dark' });
    expect(launch1.store.getState().novelRankingSettings).toEqual({ language: 'ja' });
    expect(launch1.store.getState().readingProgress).toEqual({ 999: { pageIndex: 4 } });
    expect(launch1.store.getState().browsingHistoryIllusts.items).toEqual([101]);
    expect(launch1.store.getState().searchHistory.items).toEqual(['miku', 'landscape']);

    const launch2 = await bootRealStore({ fileStorage, legacyStorage, fileSystem });
    expect(launch2.store.getState().theme).toEqual({ name: 'dark' });
    expect(launch2.store.getState().readingProgress).toEqual({ 999: { pageIndex: 4 } });
    expect(launch2.store.getState().browsingHistoryIllusts.items).toEqual([101]);
  });

  test('7. v4 migration succeeds safely when initialScreenSettings or muteUsers are omitted', async () => {
    const fileStorage = createInMemoryKv([], [], 'file');
    const legacyStorage = createInMemoryKv(
      [
        ['reduxPersist:searchHistory', JSON.stringify({ items: ['v4tag'] })],
        [
          'reduxPersist:entities',
          JSON.stringify({ users: { 5: { id: 5, name: 'U5', profile_image_urls: {} } } }),
        ],
        ['reduxPersist:muteUsers', JSON.stringify({ items: [5] })],
      ],
      [],
      'legacy',
    );
    const fileSystem = createFakeFs(fileStorage.map, false);

    const { store } = await bootRealStore({ fileStorage, legacyStorage, fileSystem });
    expect(store.getState().searchHistory).toEqual({ items: ['v4tag'] });
    expect(store.getState().muteUsers.items).toEqual([
      { id: 5, name: 'U5', profile_image_urls: {} },
    ]);
    expect(store.getState().initialScreenSettings).toBeDefined();
    expect(legacyStorage.map.size).toBe(0);
  });
});
