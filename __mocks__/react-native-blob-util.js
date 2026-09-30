export default {
  fetch: jest.fn(),
  base64: {
    encode: jest.fn(),
    decode: jest.fn(),
  },
  fs: {
    dirs: {
      MainBundleDir: '',
      CacheDir: '',
      DocumentDir: '',
      DownloadDir: '',
      SDCardDir: '',
    },
    writeFile: jest.fn(() => Promise.resolve()),
    readFile: jest.fn(() => Promise.resolve('')),
    exists: jest.fn(() => Promise.resolve(true)),
    unlink: jest.fn(() => Promise.resolve()),
    mkdir: jest.fn(() => Promise.resolve()),
  },
  wrap: jest.fn((path) => path),
};
