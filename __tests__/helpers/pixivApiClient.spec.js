import PixivApi from '../../src/common/helpers/pixivApiClient';

describe('PixivApi (native fetch client)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('sends GET requests with Pixiv headers and returns parsed JSON', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ illust: { id: 12345 } }),
    });

    const client = new PixivApi({
      headers: {
        'App-OS-Version': '16',
        'User-Agent': 'PixivAndroidApp/5.0.166 (Android 16; TestDevice)',
      },
    });
    const res = await client.illustDetail(12345);

    expect(res).toEqual({ illust: { id: 12345 } });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://app-api.pixiv.net/v1/illust/detail?illust_id=12345');
    expect(options.method).toBe('GET');
    expect(options.headers['X-Client-Time']).toBeTruthy();
    expect(options.headers['X-Client-Hash']).toMatch(/^[0-9a-f]{32}$/);
    expect(options.headers['App-OS-Version']).toBe('16');
  });

  it('exchanges OAuth code via form-urlencoded POST and stores auth token', async () => {
    const authPayload = {
      access_token: 'tok-123',
      refresh_token: 'ref-456',
      expires_in: 3600,
    };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ response: authPayload }),
    });

    const client = new PixivApi();
    const res = await client.tokenRequest('auth-code', 'pkce-verifier');

    expect(res).toEqual(authPayload);
    expect(client.authInfo()).toEqual(authPayload);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://oauth.secure.pixiv.net/auth/token');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
    expect(options.body).toContain('code=auth-code');
    expect(options.body).toContain('code_verifier=pkce-verifier');
  });

  it('throws response JSON payload on HTTP error and message on network failure', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ errors: { system: { message: 'denied' } } }),
    });

    const client = new PixivApi();
    await expect(client.illustDetail(999)).rejects.toEqual({
      errors: { system: { message: 'denied' } },
    });

    global.fetch.mockRejectedValueOnce(new Error('Network request failed'));
    await expect(client.illustDetail(999)).rejects.toBe('Network request failed');
  });
});
