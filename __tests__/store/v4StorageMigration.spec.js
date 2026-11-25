import RNFetchBlob from 'react-native-blob-util';
import getStoredStateMigrateToFileSystemStorage from '../../src/common/store/getStoredStateMigrateToFileSystemStorage';

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
