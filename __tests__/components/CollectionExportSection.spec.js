import React from 'react';
import renderer, { act } from 'react-test-renderer';
import {
  DeviceEventEmitter,
  PermissionsAndroid,
  Platform,
} from 'react-native';

const mockIsDir = jest.fn(() => Promise.resolve(true));
const mockMkdir = jest.fn(() => Promise.resolve());
const mockWriteFile = jest.fn(() => Promise.resolve());
const mockShareOpen = jest.fn(() => Promise.resolve({ success: true }));

const mockItems = {
  'illust:101': {
    id: '101',
    type: 'illust',
    restrict: 'public',
    title: 'Sunset',
    tags: ['landscape'],
    userId: '7',
    userName: 'ArtistA',
    seriesTitle: null,
    createDate: '2025-05-01T00:00:00+09:00',
    totalBookmarks: 500,
    totalView: 2000,
    textLength: null,
    pageCount: 1,
    xRestrict: 0,
  },
};

jest.mock('react-redux', () => ({
  useSelector: (selector) => selector({ bookmarkLibrary: { items: mockItems } }),
}));

jest.mock('react-native-paper', () => {
  const ReactLib = require('react');
  return {
    useTheme: () => ({ colors: { disabled: '#888' } }),
    Button: (props) => ReactLib.createElement('PaperButton', props, props.children),
  };
});

jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fs: {
      dirs: {
        SDCardDir: '/storage/emulated/0/Android/data/com.utopia.pxviewr/files',
        CacheDir: '/data/user/0/com.utopia.pxviewr/cache',
        DocumentDir: '/var/mobile/Documents',
      },
      isDir: (...args) => mockIsDir(...args),
      mkdir: (...args) => mockMkdir(...args),
      writeFile: (...args) => mockWriteFile(...args),
    },
  },
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: (...args) => mockShareOpen(...args),
  },
}));

jest.mock('../../src/components/Localization', () => {
  const ReactLib = require('react');
  return {
    connectLocalization: (Comp) => (props) =>
      ReactLib.createElement(Comp, {
        ...props,
        i18n: {
          formatString: (s, ...args) => `${s}:${args.join(',')}`,
          collectionExportCsv: 'Export CSV',
          collectionExportJson: 'Export JSON',
          collectionExportEmpty: 'Empty',
          collectionExportSuccess: 'Exported',
          collectionExportError: 'Export failed',
          permissionPromptStorageToBackup: 'prompt',
          permissionPromptMessage: 'msg',
          permissionStorage: 'storage',
          permissionPromptLater: 'later',
          permissionGrantAppSettings: 'settings',
        },
      }),
  };
});

const CollectionExportSection = require('../../src/components/CollectionExportSection')
  .default;

describe('CollectionExportSection (Android 10+ permission-free export & share)', () => {
  const originalOS = Platform.OS;
  const originalVersion = Platform.Version;

  const renderButtons = () => {
    let tree;
    act(() => {
      tree = renderer.create(<CollectionExportSection />);
    });
    return tree.root.findAllByType('PaperButton');
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    Object.defineProperty(Platform, 'Version', { value: 32, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    Object.defineProperty(Platform, 'Version', { value: originalVersion, configurable: true });
    jest.restoreAllMocks();
  });

  it('exports CSV and JSON on Android API 32 without requesting WRITE_EXTERNAL_STORAGE and shares from CacheDir', async () => {
    const permSpy = jest.spyOn(PermissionsAndroid, 'request');
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
    const buttons = renderButtons();

    await act(async () => {
      await buttons[0].props.onPress();
    });
    await act(async () => {
      await buttons[1].props.onPress();
    });

    expect(permSpy).not.toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalledTimes(4);
    expect(mockShareOpen).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: expect.stringMatching(/^file:\/\/\/data\/user\/0\/com\.utopia\.pxviewr\/cache\/pxviewr_export\/.*\.csv$/),
        type: 'text/csv',
      }),
    );
    expect(mockShareOpen).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: expect.stringMatching(/^file:\/\/\/data\/user\/0\/com\.utopia\.pxviewr\/cache\/pxviewr_export\/.*\.json$/),
        type: 'application/json',
      }),
    );
    expect(emitSpy).toHaveBeenCalledWith(
      'showToast',
      expect.stringMatching(/^Exported:/),
    );
  });

  it('requests WRITE_EXTERNAL_STORAGE on Android API 28 and aborts if denied', async () => {
    Object.defineProperty(Platform, 'Version', { value: 28, configurable: true });
    const permSpy = jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValueOnce(PermissionsAndroid.RESULTS.DENIED);

    const buttons = renderButtons();
    await act(async () => {
      await buttons[0].props.onPress();
    });

    expect(permSpy).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    );
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(mockShareOpen).not.toHaveBeenCalled();
  });

  it('emits visible error toast when writing export file fails', async () => {
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
    mockWriteFile.mockRejectedValueOnce(new Error('disk full'));

    const buttons = renderButtons();
    await act(async () => {
      await buttons[0].props.onPress();
    });

    expect(emitSpy).toHaveBeenCalledWith('showToast', 'Export failed');
    expect(mockShareOpen).not.toHaveBeenCalled();
  });
});
