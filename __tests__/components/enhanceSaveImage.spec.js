import { Platform } from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import {
  SAVE_FILE_NAME_FORMAT as FILE,
  SAVE_FILE_NAME_USER_FOLDER_FORMAT as FOLDER,
} from '../../src/common/constants';

jest.mock('react-redux', () => ({ connect: () => (Component) => Component }));
jest.mock('../../src/components/Localization', () => ({
  connectLocalization: (Component) => Component,
}));
jest.mock('@react-native-community/cameraroll', () => ({}));

const enhanceSaveImage =
  require('../../src/components/HOC/enhanceSaveImage').default;

// Keep the real sanitize-filename dependency: these are application contracts,
// not snapshots of the dependency's implementation or native storage tests.
const SaveImage = enhanceSaveImage(() => null);
const saver = new SaveImage({});
const originalOS = Platform.OS;
const originalDirs = { ...RNFetchBlob.fs.dirs };

beforeEach(() => {
  Platform.OS = 'android';
  RNFetchBlob.fs.dirs.PictureDir = '/pictures';
  RNFetchBlob.fs.dirs.DocumentDir = '/documents';
});

afterAll(() => {
  Platform.OS = originalOS;
  RNFetchBlob.fs.dirs = originalDirs;
});

describe('saved image filenames', () => {
  test.each([
    [FILE.WORK_ID, '春日🌸', '123_p2.png'],
    [FILE.WORK_TITLE, '春日🌸', '春日🌸_p2.png'],
    [FILE.WORK_ID_WORK_TITLE, '春日🌸', '123_春日🌸_p2.png'],
    [FILE.WORK_TITLE, 'a/b\\c:d*e?f"g<h>i|j', 'a_b_c_d_e_f_g_h_i_j_p2.png'],
    [FILE.WORK_TITLE, 'a\u0000b\u001fc', 'a_b_c_p2.png'],
    [FILE.WORK_TITLE, '', '_p2.png'],
    [FILE.WORK_TITLE, 'CON', 'CON_p2.png'],
  ])('%s with title %s', (fileName, title, expected) => {
    expect(
      saver.getImageFileName('123', title, 'illust', { fileName }, 2),
    ).toBe(expected);
  });

  test('long Unicode filenames stay within 255 UTF-8 bytes without broken characters', () => {
    const result = saver.getImageFileName(
      '123',
      '春🌸'.repeat(100),
      'illust',
      { fileName: FILE.WORK_TITLE },
      0,
    );
    expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(255);
    expect(Buffer.from(result, 'utf8').toString('utf8')).toBe(result);
    expect(result).not.toContain('\ufffd');
  });
});

describe('saved image directories', () => {
  const pathFor = (
    userName,
    settings,
    workType = 'illust',
    title = '漫画/春🌸',
  ) =>
    saver.getImageSavePath('123', title, workType, '456', userName, settings);

  test.each([
    [undefined, '画师', '/pictures/pxviewr/'],
    [FOLDER.USER_ID, '画师', '/pictures/pxviewr/456'],
    [FOLDER.USER_NAME, '画师/🌸', '/pictures/pxviewr/画师_🌸'],
    [FOLDER.USER_ID_USER_NAME, '画师/🌸', '/pictures/pxviewr/456_画师_🌸'],
    [FOLDER.USER_NAME, 'CON', '/pictures/pxviewr/_'],
    [FOLDER.USER_NAME, '..', '/pictures/pxviewr/_'],
    [FOLDER.USER_NAME, '画师.  ', '/pictures/pxviewr/画师_'],
  ])('folder %s with author %s', (userFolderName, userName, expected) => {
    expect(pathFor(userName, { userFolderName })).toBe(expected);
  });

  test.each([
    [FILE.WORK_ID, '/pictures/pxviewr/456/123'],
    [FILE.WORK_TITLE, '/pictures/pxviewr/456/漫画_春🌸'],
    [FILE.WORK_ID_WORK_TITLE, '/pictures/pxviewr/456/123_漫画_春🌸'],
  ])('manga folder naming %s', (fileName, expected) => {
    expect(
      pathFor(
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

  test('iOS keeps using its document directory', () => {
    Platform.OS = 'ios';
    expect(pathFor('画师', { userFolderName: FOLDER.USER_NAME })).toBe(
      '/documents/pxviewr/画师',
    );
  });

  test('long internal dots and spaces keep the author prefix after truncation', () => {
    const author = `画师${'. '.repeat(15000)}x`;
    expect(pathFor(author, { userFolderName: FOLDER.USER_NAME })).toBe(
      '/pictures/pxviewr/画师',
    );
  });
});
