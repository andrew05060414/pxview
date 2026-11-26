import React from 'react';
import renderer, { act } from 'react-test-renderer';
import {
  Alert,
  DeviceEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';

const mockDispatch = jest.fn();
const mockIsDir = jest.fn(() => Promise.resolve(true));
const mockMkdir = jest.fn(() => Promise.resolve());
const mockWriteFile = jest.fn(() => Promise.resolve());
const mockReadFile = jest.fn();
const mockExists = jest.fn();

const mockState = {
  readingSettings: { mode: 'scroll' },
  saveImageSettings: { fileName: 'WORK_ID' },
  initialScreenSettings: { routeName: 'Recommended' },
  likeButtonSettings: { actionType: 'public' },
  trendingSearchSettings: { isShowTrendingSearch: true },
  highlightTags: [],
  muteSettings: {},
  muteTags: [],
  muteUsers: [],
  novelSettings: { fontSize: 16 },
  novelRankingSettings: { language: 'zh-CN' },
  theme: { name: 'dark' },
  searchHistory: { items: ['miku'] },
};

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));

jest.mock('react-native-paper', () => ({
  useTheme: () => ({ colors: { background: '#000' } }),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: () => '6.0.0',
}));

jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fs: {
      dirs: {
        SDCardDir: '/storage/emulated/0/Android/data/com.utopia.pxviewr/files',
        LegacySDCardDir: '/storage/emulated/0',
        DocumentDir: '/var/mobile/Documents',
      },
      isDir: (...args) => mockIsDir(...args),
      mkdir: (...args) => mockMkdir(...args),
      writeFile: (...args) => mockWriteFile(...args),
      readFile: (...args) => mockReadFile(...args),
      exists: (...args) => mockExists(...args),
    },
  },
}));

jest.mock('../../src/components/Localization', () => ({
  useLocalization: () => ({
    i18n: {
      formatString: (s, ...args) => `${s}:${args.join(',')}`,
      backupData: 'backupData',
      backupDataDescription: 'backupDataDescription',
      backupRestoreData: 'backupRestoreData',
      backupRestoreFromFile: 'backupRestoreFromFile',
      backupRestoreFromFileDescription: 'backupRestoreFromFileDescription',
      backupConfirm: 'backupConfirm',
      backupRestoreConfirm: 'backupRestoreConfirm',
      backupSuccessfully: 'backupSuccessfully',
      backupRestoreSuccessfully: 'backupRestoreSuccessfully',
      backupFileNotFound: 'backupFileNotFound',
      backupChooseFile: 'backupChooseFile',
      backupError: 'backupError',
      backupInvalidFile: 'backupInvalidFile',
      cancel: 'cancel',
      ok: 'ok',
      permissionPromptStorageToBackup: 'permPrompt',
      permissionStorage: 'storage',
      permissionPromptMessage: 'permMsg',
      permissionPromptLater: 'later',
      permissionGrantAppSettings: 'settings',
    },
  }),
}));

jest.mock('../../src/components/PXListItem', () => {
  const ReactLib = require('react');
  return (props) => ReactLib.createElement('PXListItem', props);
});

const Backup = require('../../src/screens/MyPage/Backup').default;

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('Backup screen (legacy migration, SAF file picker & Android 10+ permissions)', () => {
  const originalOS = Platform.OS;
  const originalVersion = Platform.Version;

  const renderBackup = () => {
    let tree;
    act(() => {
      tree = renderer.create(<Backup />);
    });
    return tree.root.findAllByType('PXListItem');
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    Object.defineProperty(Platform, 'Version', { value: 36, configurable: true });
    delete NativeModules.PXFilePicker;
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    Object.defineProperty(Platform, 'Version', { value: originalVersion, configurable: true });
    jest.restoreAllMocks();
  });

  it('writes backup and restores on Android API 36 without requesting WRITE_EXTERNAL_STORAGE', async () => {
    const permSpy = jest.spyOn(PermissionsAndroid, 'request');
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_t, _m, buttons) => {
        const confirmBtn = buttons.find((b) => b.text === 'ok');
        if (confirmBtn && confirmBtn.onPress) {
          confirmBtn.onPress();
        }
      });

    const items = renderBackup();
    await act(async () => {
      items[0].props.onPress();
      await flushMicrotasks();
    });

    expect(permSpy).not.toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalledWith(
      '/storage/emulated/0/Android/data/com.utopia.pxviewr/files/pxviewr/backup/backup.json',
      expect.stringContaining('"theme":{"name":"dark"}'),
      'utf8',
    );
    expect(emitSpy).toHaveBeenCalledWith(
      'showToast',
      'backupSuccessfully:/storage/emulated/0/Android/data/com.utopia.pxviewr/files/pxviewr/backup/backup.json',
    );

    const writtenJson = mockWriteFile.mock.calls[0][1];
    mockExists.mockResolvedValueOnce(true);
    mockReadFile.mockResolvedValueOnce(writtenJson);

    await act(async () => {
      items[1].props.onPress();
      await flushMicrotasks();
    });

    expect(alertSpy).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'PIXIV/THEME_RESTORE',
      payload: { state: { name: 'dark' } },
    });
    expect(emitSpy).toHaveBeenCalledWith('showToast', 'backupRestoreSuccessfully');
  });

  it('falls back to LegacySDCardDir 5.3.5 backup when app-scoped path is absent', async () => {
    const legacyBackup = JSON.stringify({
      appVersion: '5.3.5',
      data: {
        theme: { name: 'dark' },
        novelRankingSettings: { language: 'ja' },
      },
    });
    mockExists.mockImplementation(async (p) => p === '/storage/emulated/0/pxviewr/backup/backup.json');
    mockReadFile.mockResolvedValueOnce(legacyBackup);
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      const okBtn = buttons.find((b) => b.text === 'ok');
      okBtn?.onPress?.();
    });

    const items = renderBackup();
    await act(async () => {
      items[1].props.onPress();
      await flushMicrotasks();
    });

    expect(mockExists).toHaveBeenCalledWith(
      '/storage/emulated/0/Android/data/com.utopia.pxviewr/files/pxviewr/backup/backup.json',
    );
    expect(mockExists).toHaveBeenCalledWith(
      '/storage/emulated/0/pxviewr/backup/backup.json',
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'PIXIV/THEME_RESTORE',
      payload: { state: { name: 'dark' } },
    });
  });

  it('offers and invokes system file picker when legacy backup cannot be read directly', async () => {
    const pickedBackup = JSON.stringify({
      appVersion: '5.3.5',
      data: { theme: { name: 'dark' } },
    });
    const mockPick = jest.fn(() =>
      Promise.resolve({ uri: 'content://doc/backup.json', content: pickedBackup }),
    );
    NativeModules.PXFilePicker = { pickJsonFile: mockPick };

    mockExists.mockResolvedValue(false);
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementationOnce((_t, _m, buttons) => {
        buttons.find((b) => b.text === 'ok')?.onPress?.();
      })
      .mockImplementationOnce((_t, _m, buttons) => {
        buttons.find((b) => b.text === 'backupChooseFile')?.onPress?.();
      });

    const items = renderBackup();
    await act(async () => {
      items[1].props.onPress();
      await flushMicrotasks();
    });

    expect(alertSpy).toHaveBeenCalledTimes(2);
    expect(mockPick).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'PIXIV/THEME_RESTORE',
      payload: { state: { name: 'dark' } },
    });
  });

  it('shows visible error toast when write fails or picked file is invalid JSON', async () => {
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
    mockWriteFile.mockRejectedValueOnce(new Error('EACCES'));
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons.find((b) => b.text === 'ok')?.onPress?.();
    });

    const items = renderBackup();
    await act(async () => {
      items[0].props.onPress();
      await flushMicrotasks();
    });
    expect(emitSpy).toHaveBeenCalledWith('showToast', 'backupError');

    NativeModules.PXFilePicker = {
      pickJsonFile: jest.fn(() => Promise.resolve({ uri: 'content://bad', content: '{not-json' })),
    };
    await act(async () => {
      items[2].props.onPress();
      await flushMicrotasks();
    });
    expect(emitSpy).toHaveBeenCalledWith('showToast', 'backupInvalidFile');
  });

  it('rejects malformed searchHistory in external backup without dispatching any restore actions', async () => {
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
    NativeModules.PXFilePicker = {
      pickJsonFile: jest.fn(() =>
        Promise.resolve({
          uri: 'content://malformed',
          content: JSON.stringify({
            appVersion: '6.0.0',
            data: {
              theme: { name: 'dark' },
              searchHistory: { items: [{ bad: true }] },
            },
          }),
        }),
      ),
    };

    const items = renderBackup();
    await act(async () => {
      items[2].props.onPress();
      await flushMicrotasks();
    });

    expect(emitSpy).toHaveBeenCalledWith('showToast', 'backupInvalidFile');
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('rejects muteUsers with null or id-less items without dispatching, while restoring valid muteUsers entries', async () => {
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

    for (const invalidMuteUsers of [
      [null],
      { items: [null, {}] },
      { items: [{ id: '' }] },
    ]) {
      jest.clearAllMocks();
      NativeModules.PXFilePicker = {
        pickJsonFile: jest.fn(() =>
          Promise.resolve({
            uri: 'content://bad-mute-users',
            content: JSON.stringify({
              appVersion: '6.0.0',
              data: {
                theme: { name: 'dark' },
                muteUsers: invalidMuteUsers,
              },
            }),
          }),
        ),
      };

      const items = renderBackup();
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        items[2].props.onPress();
        await flushMicrotasks();
      });

      expect(emitSpy).toHaveBeenCalledWith('showToast', 'backupInvalidFile');
      expect(mockDispatch).not.toHaveBeenCalled();
    }

    jest.clearAllMocks();
    NativeModules.PXFilePicker = {
      pickJsonFile: jest.fn(() =>
        Promise.resolve({
          uri: 'content://valid-mute-users',
          content: JSON.stringify({
            appVersion: '6.0.0',
            data: {
              muteUsers: { items: [{ id: 42, name: 'u' }] },
            },
          }),
        }),
      ),
    };
    const items = renderBackup();
    await act(async () => {
      items[2].props.onPress();
      await flushMicrotasks();
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'PIXIV/MUTE_USERS_RESTORE',
      payload: { state: { items: [{ id: 42, name: 'u' }] } },
    });
  });
});
