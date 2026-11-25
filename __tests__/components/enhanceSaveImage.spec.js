import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Platform, PermissionsAndroid, DeviceEventEmitter } from 'react-native';

const mockSaveAsset = jest.fn(() => Promise.resolve({ node: { image: { uri: 'content://media/1' } } }));
const mockFetch = jest.fn();
const mockConfig = jest.fn(() => ({ fetch: mockFetch }));
const mockIsDir = jest.fn(() => Promise.resolve(true));
const mockMkdir = jest.fn(() => Promise.resolve());
const mockUnlink = jest.fn(() => Promise.resolve());

jest.mock('react-redux', () => {
  const ReactLib = require('react');
  return {
    connect: (mapState) => (Comp) => (props) =>
      ReactLib.createElement(Comp, {
        ...props,
        ...(mapState ? mapState({ saveImageSettings: props.saveImageSettings || {} }) : {}),
      }),
  };
});

jest.mock('../../src/components/Localization', () => {
  const ReactLib = require('react');
  return {
    connectLocalization: (Comp) => (props) =>
      ReactLib.createElement(Comp, {
        ...props,
        i18n: {
          formatString: (s, ...args) => `${s}:${args.join(',')}`,
          saveImageStart: 'saveImageStart',
          saveImagesStart: 'saveImagesStart',
          saveImageSuccess: 'saveImageSuccess',
          saveImageError: 'saveImageError',
          permissionPromptStorageToSaveImage: 'prompt',
          permissionPromptMessage: 'msg',
          permissionStorage: 'storage',
          permissionPromptLater: 'later',
          permissionGrantAppSettings: 'settings',
        },
      }),
  };
});

jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: {
    saveAsset: (...args) => mockSaveAsset(...args),
  },
}));

jest.mock('react-native-blob-util', () => ({
  config: (...args) => mockConfig(...args),
  fs: {
    dirs: {
      CacheDir: '/data/user/0/com.utopia.pxviewr/cache',
      DocumentDir: '/var/mobile/Documents',
    },
    isDir: (...args) => mockIsDir(...args),
    mkdir: (...args) => mockMkdir(...args),
    unlink: (...args) => mockUnlink(...args),
  },
}));

const enhanceSaveImage = require('../../src/components/HOC/enhanceSaveImage').default;

describe('enhanceSaveImage (CameraRoll v7 MediaStore)', () => {
  const originalOS = Platform.OS;
  const originalVersion = Platform.Version;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      path: () => '/data/user/0/com.utopia.pxviewr/cache/pxviewr_save/12345_p0.png',
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    Object.defineProperty(Platform, 'Version', { value: originalVersion, configurable: true });
    jest.restoreAllMocks();
  });

  it('saves via CameraRoll.saveAsset without WRITE_EXTERNAL_STORAGE on Android API 36 and uses HTTPS Referer', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    Object.defineProperty(Platform, 'Version', { value: 36, configurable: true });
    const permSpy = jest.spyOn(PermissionsAndroid, 'request');
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

    let capturedSaveImage;
    const Dummy = ({ saveImage }) => {
      capturedSaveImage = saveImage;
      return null;
    };
    const Wrapped = enhanceSaveImage(Dummy);

    act(() => {
      renderer.create(<Wrapped saveImageSettings={{}} />);
    });

    await capturedSaveImage({
      imageUrls: ['https://i.pximg.net/img-original/img/12345_p0.png'],
      imageIndex: 0,
      workId: 12345,
      workTitle: 'Test',
      workType: 'illust',
      userId: 99,
      userName: 'Artist',
    });

    expect(permSpy).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      'GET',
      'https://i.pximg.net/img-original/img/12345_p0.png',
      { referer: 'https://www.pixiv.net' },
    );
    expect(mockSaveAsset).toHaveBeenCalledWith(
      'file:///data/user/0/com.utopia.pxviewr/cache/pxviewr_save/12345_p0.png',
      { type: 'photo', album: 'pxviewr' },
    );
    expect(mockUnlink).toHaveBeenCalledWith(
      '/data/user/0/com.utopia.pxviewr/cache/pxviewr_save/12345_p0.png',
    );
    expect(emitSpy).toHaveBeenCalledWith(
      'showToast',
      'saveImageSuccess:12345_p0.png',
    );
  });

  it('requests WRITE_EXTERNAL_STORAGE only on legacy Android API < 29', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    Object.defineProperty(Platform, 'Version', { value: 28, configurable: true });
    const permSpy = jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValueOnce(PermissionsAndroid.RESULTS.DENIED);

    let capturedSaveImage;
    const Dummy = ({ saveImage }) => {
      capturedSaveImage = saveImage;
      return null;
    };
    const Wrapped = enhanceSaveImage(Dummy);

    act(() => {
      renderer.create(<Wrapped saveImageSettings={{}} />);
    });

    await capturedSaveImage({
      imageUrls: ['https://i.pximg.net/img-original/img/12345_p0.png'],
      imageIndex: 0,
      workId: 12345,
      workTitle: 'Test',
      workType: 'illust',
      userId: 99,
      userName: 'Artist',
    });

    expect(permSpy).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    );
    expect(mockSaveAsset).not.toHaveBeenCalled();
  });
});
