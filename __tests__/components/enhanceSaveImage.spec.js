import React from 'react';
import renderer, { act } from 'react-test-renderer';
import {
  Platform,
  PermissionsAndroid,
  DeviceEventEmitter,
  NativeModules,
} from 'react-native';
import {
  SAVE_FILE_NAME_FORMAT as FILE,
  SAVE_FILE_NAME_USER_FOLDER_FORMAT as FOLDER,
} from '../../src/common/constants';

const mockSaveAsset = jest.fn(() =>
  Promise.resolve({ node: { image: { uri: 'content://media/1' } } }),
);
const mockFetch = jest.fn();
const mockConfig = jest.fn((config) => ({
  fetch: (...args) => mockFetch(config, ...args),
}));
const mockIsDir = jest.fn(() => Promise.resolve(true));
const mockMkdir = jest.fn(() => Promise.resolve());
const mockUnlink = jest.fn(() => Promise.resolve());
const mockMv = jest.fn(() => Promise.resolve());

jest.mock('react-redux', () => {
  const ReactLib = require('react');
  return {
    connect: (mapState) => (Comp) => (props) =>
      ReactLib.createElement(Comp, {
        ...props,
        ...(mapState
          ? mapState({ saveImageSettings: props.saveImageSettings || {} })
          : {}),
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
    mv: (...args) => mockMv(...args),
  },
}));

const enhanceSaveImageModule = require('../../src/components/HOC/enhanceSaveImage');
const enhanceSaveImage = enhanceSaveImageModule.default;
const { toFileUri } = enhanceSaveImageModule;

describe('enhanceSaveImage (CameraRoll v7 MediaStore & sanitize-filename contracts)', () => {
  const originalOS = Platform.OS;
  const originalVersion = Platform.Version;

  const createHocInstance = (saveImageSettings = {}) => {
    const Dummy = () => null;
    const Wrapped = enhanceSaveImage(Dummy);
    let tree;
    act(() => {
      tree = renderer.create(<Wrapped saveImageSettings={saveImageSettings} />);
    });
    return tree.root.find((node) => node.instance && typeof node.instance.getImageFileName === 'function').instance;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    Object.defineProperty(Platform, 'Version', {
      value: 36,
      configurable: true,
    });
    mockFetch.mockImplementation((cfg) =>
      Promise.resolve({
        path: () => cfg.path,
        info: () => ({ status: 200, headers: { 'Content-Type': 'image/png' } }),
      }),
    );
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: originalOS,
      configurable: true,
    });
    Object.defineProperty(Platform, 'Version', {
      value: originalVersion,
      configurable: true,
    });
    jest.restoreAllMocks();
  });

  it('saves via CameraRoll.saveAsset without WRITE_EXTERNAL_STORAGE on Android API 36 and uses HTTPS Referer', async () => {
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
      expect.objectContaining({
        path: expect.stringMatching(
          /^\/data\/user\/0\/com\.utopia\.pxviewr\/cache\/pxviewr_save\/[^/]+\/12345_p0\.png$/,
        ),
      }),
      'GET',
      'https://i.pximg.net/img-original/img/12345_p0.png',
      { referer: 'https://www.pixiv.net' },
    );
    expect(mockSaveAsset).toHaveBeenCalledWith(
      expect.stringMatching(
        /^file:\/\/\/data\/user\/0\/com\.utopia\.pxviewr\/cache\/pxviewr_save\/[^/]+\/12345_p0\.png$/,
      ),
      { type: 'photo', album: 'pxviewr' },
    );
    expect(mockUnlink).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\/data\/user\/0\/com\.utopia\.pxviewr\/cache\/pxviewr_save\/[^/]+\/12345_p0\.png$/,
      ),
    );
    expect(emitSpy).toHaveBeenCalledWith(
      'showToast',
      'saveImageSuccess:12345_p0.png',
    );
  });

  it('rejects 403/404 or HTML error responses without calling CameraRoll and cleans up temp file', async () => {
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
    mockFetch.mockImplementationOnce((cfg) =>
      Promise.resolve({
        path: () => cfg.path,
        info: () => ({
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }),
      }),
    );

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
      imageUrls: ['https://i.pximg.net/img-original/img/999_p0.jpg'],
      imageIndex: 0,
      workId: 999,
      workTitle: 'Blocked',
      workType: 'illust',
      userId: 1,
      userName: 'A',
    });

    expect(mockSaveAsset).not.toHaveBeenCalled();
    expect(mockUnlink).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith('showToast', 'saveImageError:999_p0.jpg');
  });

  it('uses real image extension from URL and Content-Type instead of hardcoding .png', async () => {
    mockFetch
      .mockImplementationOnce((cfg) =>
        Promise.resolve({
          path: () => cfg.path,
          info: () => ({ status: 200, headers: { 'Content-Type': 'image/jpeg' } }),
        }),
      )
      .mockImplementationOnce((cfg) =>
        Promise.resolve({
          path: () => cfg.path,
          info: () => ({ status: 200, headers: { 'Content-Type': 'image/jpeg' } }),
        }),
      );

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
      imageUrls: [
        'https://i.pximg.net/img-original/img/12345_p0.jpg',
        'https://i.pximg.net/img-original/img/12345_p1.png',
      ],
      workId: 12345,
      workTitle: 'Test',
      workType: 'illust',
      userId: 99,
      userName: 'Artist',
    });

    expect(mockMv).toHaveBeenCalledWith(
      expect.stringMatching(/12345_p1\.png$/),
      expect.stringMatching(/12345_p1\.jpg$/),
    );
    expect(mockSaveAsset).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/12345_p0\.jpg$/),
      { type: 'photo', album: 'pxviewr' },
    );
    expect(mockSaveAsset).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/12345_p1\.jpg$/),
      { type: 'photo', album: 'pxviewr' },
    );
  });

  it('percent-encodes #, spaces, and non-ASCII characters in file:// URIs and isolates concurrent temp files', async () => {
    const encoded = toFileUri('/tmp/pxviewr_save/Chapter#2 春日 テスト_p0.jpg');
    expect(encoded).toBe(
      'file:///tmp/pxviewr_save/Chapter%232%20%E6%98%A5%E6%97%A5%20%E3%83%86%E3%82%B9%E3%83%88_p0.jpg',
    );
    expect(encoded.includes('#')).toBe(false);

    mockFetch.mockImplementation((cfg) =>
      Promise.resolve({
        path: () => cfg.path,
        info: () => ({ status: 200, headers: { 'Content-Type': 'image/jpeg' } }),
      }),
    );

    let capturedSaveImage;
    const Dummy = ({ saveImage }) => {
      capturedSaveImage = saveImage;
      return null;
    };
    const Wrapped = enhanceSaveImage(Dummy);
    act(() => {
      renderer.create(
        <Wrapped saveImageSettings={{ fileName: FILE.WORK_TITLE }} />,
      );
    });

    await Promise.all([
      capturedSaveImage({
        imageUrls: ['https://i.pximg.net/img-original/img/1_p0.jpg'],
        imageIndex: 0,
        workId: 1,
        workTitle: 'Chapter#2 春日',
        workType: 'illust',
        userId: 1,
        userName: 'U',
      }),
      capturedSaveImage({
        imageUrls: ['https://i.pximg.net/img-original/img/1_p0.jpg'],
        imageIndex: 0,
        workId: 1,
        workTitle: 'Chapter#2 春日',
        workType: 'illust',
        userId: 1,
        userName: 'U',
      }),
    ]);

    const tempPaths = mockFetch.mock.calls.map((c) => c[0].path);
    expect(tempPaths).toHaveLength(2);
    expect(tempPaths[0]).not.toBe(tempPaths[1]);
    expect(mockSaveAsset.mock.calls[0][0]).toContain('Chapter%232%20%E6%98%A5%E6%97%A5_p0.jpg');
  });

  it('requests WRITE_EXTERNAL_STORAGE only on legacy Android API < 29', async () => {
    Object.defineProperty(Platform, 'Version', {
      value: 28,
      configurable: true,
    });
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

  it('uses add-only native PXPhotoSaver on iOS without querying albums', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const mockNativeSave = jest.fn(() => Promise.resolve(true));
    NativeModules.PXPhotoSaver = { saveImage: mockNativeSave };
    try {
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

      expect(mockNativeSave).toHaveBeenCalledWith(
        expect.stringMatching(
          /^file:\/\/\/data\/user\/0\/com\.utopia\.pxviewr\/cache\/pxviewr_save\/[^/]+\/12345_p0\.png$/,
        ),
      );
      expect(mockSaveAsset).not.toHaveBeenCalled();
    } finally {
      delete NativeModules.PXPhotoSaver;
    }
  });

  describe('saved image filenames (real sanitize-filename)', () => {
    test.each([
      [FILE.WORK_ID, '春日🌸', '123_p2.png'],
      [FILE.WORK_TITLE, '春日🌸', '春日🌸_p2.png'],
      [FILE.WORK_ID_WORK_TITLE, '春日🌸', '123_春日🌸_p2.png'],
      [FILE.WORK_TITLE, 'a/b\\c:d*e?f"g<h>i|j', 'a_b_c_d_e_f_g_h_i_j_p2.png'],
      [FILE.WORK_TITLE, 'a\u0000b\u001fc', 'a_b_c_p2.png'],
      [FILE.WORK_TITLE, '', '_p2.png'],
      [FILE.WORK_TITLE, 'CON', 'CON_p2.png'],
    ])('%s with title %s', (fileName, title, expected) => {
      const saver = createHocInstance();
      expect(
        saver.getImageFileName('123', title, 'illust', { fileName }, 2),
      ).toBe(expected);
    });

    test('long Unicode filenames stay within 255 UTF-8 bytes without broken characters', () => {
      const saver = createHocInstance();
      const result = saver.getImageFileName(
        '123',
        '春🌸'.repeat(100),
        'illust',
        { fileName: FILE.WORK_TITLE },
        0,
      );
      expect(result.startsWith('春🌸'.repeat(30))).toBe(true);
      expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(255);
      expect(Buffer.from(result, 'utf8').toString('utf8')).toBe(result);
      expect(result).not.toContain('\ufffd');
    });
  });

  describe('saved image MediaStore album naming', () => {
    const albumFor = (
      userName,
      settings,
      workType = 'illust',
      title = '漫画/春🌸',
    ) => {
      const saver = createHocInstance();
      return saver.getAlbumName(
        '123',
        title,
        workType,
        '456',
        userName,
        settings,
      );
    };

    test.each([
      [undefined, '画师', 'pxviewr'],
      [FOLDER.USER_ID, '画师', 'pxviewr/456'],
      [FOLDER.USER_NAME, '画师/🌸', 'pxviewr/画师_🌸'],
      [FOLDER.USER_ID_USER_NAME, '画师/🌸', 'pxviewr/456_画师_🌸'],
      [FOLDER.USER_NAME, 'CON', 'pxviewr/_'],
      [FOLDER.USER_NAME, '..', 'pxviewr/_'],
      [FOLDER.USER_NAME, '画师.  ', 'pxviewr/画师_'],
    ])('album %s with author %s', (userFolderName, userName, expected) => {
      expect(albumFor(userName, { userFolderName })).toBe(expected);
    });

    test.each([
      [FILE.WORK_ID, 'pxviewr/456/123'],
      [FILE.WORK_TITLE, 'pxviewr/456/漫画_春🌸'],
      [FILE.WORK_ID_WORK_TITLE, 'pxviewr/456/123_漫画_春🌸'],
    ])('manga album naming %s', (fileName, expected) => {
      expect(
        albumFor(
          '画师',
          {
            userFolderName: FOLDER.USER_ID,
            isCreateMangaFolder: true,
            fileName,
          },
          'manga',
        ),
      ).toBe(expected);
    });

    test('iOS uses flat pxviewr album', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        configurable: true,
      });
      expect(albumFor('画师', { userFolderName: FOLDER.USER_NAME })).toBe(
        'pxviewr',
      );
    });

    test('long internal dots and spaces keep the author prefix after truncation', () => {
      const author = `画师${'. '.repeat(15000)}x`;
      expect(albumFor(author, { userFolderName: FOLDER.USER_NAME })).toBe(
        'pxviewr/画师',
      );
    });
  });
});
