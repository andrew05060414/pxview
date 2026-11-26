const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();
const mockPkceChallenge = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args) => mockGetItem(...args),
    setItem: (...args) => mockSetItem(...args),
    removeItem: (...args) => mockRemoveItem(...args),
  },
}));

jest.mock('react-native-pkce-challenge', () => ({
  __esModule: true,
  default: (...args) => mockPkceChallenge(...args),
}));

const PKCE = require('../../src/common/helpers/pkce').default;

describe('PKCE helper (react-native-pkce-challenge v6)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await PKCE.clearPKCE();
    jest.clearAllMocks();
  });

  it('generates and persists codeChallenge and codeVerifier via default export', async () => {
    mockPkceChallenge.mockReturnValueOnce({
      codeChallenge: 'chal-abc',
      codeVerifier: 'ver-xyz',
    });

    const result = await PKCE.generatePKCE();

    expect(result).toEqual({
      codeChallenge: 'chal-abc',
      codeVerifier: 'ver-xyz',
    });
    expect(mockPkceChallenge).toHaveBeenCalledTimes(1);
    expect(mockSetItem).toHaveBeenCalledWith(
      '@pxview/pkce',
      JSON.stringify({ codeChallenge: 'chal-abc', codeVerifier: 'ver-xyz' }),
    );
  });
});
