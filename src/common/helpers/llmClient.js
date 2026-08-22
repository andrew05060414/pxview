import RNFetchBlob from 'rn-fetch-blob';

const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_MAX_BATCH = 40;

// RN 0.63 has no streaming fetch; everything is a plain request/response.
export const buildChatRequest = (config, messages, options = {}) => {
  const trimmedBase = (config.baseUrl || '').replace(/\/+$/, '');
  const base = trimmedBase.endsWith('/v1') ? trimmedBase : `${trimmedBase}/v1`;
  return {
    url: `${base}/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.2,
      max_tokens: 2000,
      ...options,
    }),
  };
};

export const extractJsonContent = (response) => {
  const content =
    response && response.choices && response.choices[0]
      ? response.choices[0].message.content
      : null;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('empty completion content');
  }
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const raw = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`invalid JSON from model: ${raw.slice(0, 120)}`);
  }
};

const defaultFetcher = (method, url, headers, body, timeoutMs) => {
  const task = RNFetchBlob.fetch(method, url, headers, body);
  const timer = new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('LLM request timeout')), timeoutMs);
  });
  return Promise.race([task, timer]);
};

export const sendChatRequest = async (
  config,
  messages,
  options,
  { fetcher = defaultFetcher, timeoutMs = DEFAULT_TIMEOUT_MS } = {},
) => {
  const { url, headers, body } = buildChatRequest(config, messages, options);
  const res = await fetcher('POST', url, headers, body, timeoutMs);
  const { status } = res.info();
  if (!status || status < 200 || status >= 300) {
    throw new Error(`LLM request failed with status ${status}`);
  }
  return JSON.parse(res.text());
};

// Prompt contract for P5 auto-classification: the model must answer with a
// JSON array of {id, category}.
export const buildClassificationMessages = (items, categories) => {
  const lines = items
    .slice(0, DEFAULT_MAX_BATCH)
    .map(
      (item) =>
        `${item.id} | ${item.title} | ${(item.tags || []).join(',')} | ${
          item.userName
        }`,
    );
  return [
    {
      role: 'system',
      content: `You classify pixiv works. Assign each work exactly one category from this list: ${categories.join(
        ', ',
      )}. Respond ONLY with a JSON array like [{"id":"123","category":"category name"}].`,
    },
    {
      role: 'user',
      content: lines.join('\n'),
    },
  ];
};
