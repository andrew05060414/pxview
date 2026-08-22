import {
  buildChatRequest,
  extractJsonContent,
  sendChatRequest,
  buildClassificationMessages,
} from '../../src/common/helpers/llmClient';

const config = {
  baseUrl: 'https://api.example.com',
  model: 'gpt-4o-mini',
  apiKey: 'sk-test',
};

describe('llmClient', () => {
  test('builds chat request url with /v1 appended once', () => {
    const request = buildChatRequest(config, []);
    expect(request.url).toBe('https://api.example.com/v1/chat/completions');
    expect(request.headers.Authorization).toBe('Bearer sk-test');
    const withV1 = buildChatRequest(
      { ...config, baseUrl: 'https://api.example.com/v1/' },
      [],
    );
    expect(withV1.url).toBe('https://api.example.com/v1/chat/completions');
  });

  test('request body includes model, messages and defaults', () => {
    const messages = [{ role: 'user', content: 'hi' }];
    const { body } = buildChatRequest(config, messages);
    const parsed = JSON.parse(body);
    expect(parsed.model).toBe('gpt-4o-mini');
    expect(parsed.messages).toEqual(messages);
    expect(parsed.temperature).toBe(0.2);
  });

  test('extracts plain and fenced json content', () => {
    expect(
      extractJsonContent({
        choices: [{ message: { content: '[{"id":"1","category":"a"}]' } }],
      }),
    ).toEqual([{ id: '1', category: 'a' }]);
    expect(
      extractJsonContent({
        choices: [{ message: { content: '```json\n[{"id":"2"}]\n```' } }],
      }),
    ).toEqual([{ id: '2' }]);
  });

  test('extractJsonContent throws on garbage', () => {
    expect(() =>
      extractJsonContent({ choices: [{ message: { content: 'not json' } }] }),
    ).toThrow(/invalid JSON/);
    expect(() => extractJsonContent({})).toThrow(/empty completion/);
  });

  test('sendChatRequest parses success and throws on http error', async () => {
    const fetcher = jest.fn(() =>
      Promise.resolve({
        info: () => ({ status: 200 }),
        text: () =>
          JSON.stringify({ choices: [{ message: { content: 'ok' } }] }),
      }),
    );
    const response = await sendChatRequest(config, [], {}, { fetcher });
    expect(response.choices[0].message.content).toBe('ok');
    expect(fetcher).toHaveBeenCalledWith(
      'POST',
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({ 'Content-Type': 'application/json' }),
      expect.any(String),
      60000,
    );

    const failing = jest.fn(() =>
      Promise.resolve({
        info: () => ({ status: 401 }),
        text: () => '{}',
      }),
    );
    await expect(
      sendChatRequest(config, [], {}, { fetcher: failing }),
    ).rejects.toThrow(/status 401/);
  });

  test('buildClassificationMessages caps batches and lists fields', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      title: `t${i}`,
      tags: ['x'],
      userName: 'u',
    }));
    const messages = buildClassificationMessages(items, ['a', 'b']);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('a, b');
    expect(messages[1].content.split('\n')).toHaveLength(40);
    expect(messages[1].content).toContain('0 | t0 | x | u');
  });
});
