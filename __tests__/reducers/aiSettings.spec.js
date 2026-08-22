import aiSettings from '../../src/common/reducers/aiSettings';
import { setAiSettings } from '../../src/common/actions/aiSettings';

describe('aiSettings reducer', () => {
  test('defaults', () => {
    expect(aiSettings(undefined, {})).toEqual({
      baseUrl: '',
      model: 'gpt-4o-mini',
      apiKey: '',
      maxBatchSize: 40,
    });
  });

  test('set keeps unspecified fields', () => {
    let state = aiSettings(undefined, setAiSettings({ baseUrl: 'https://x' }));
    expect(state.baseUrl).toBe('https://x');
    expect(state.model).toBe('gpt-4o-mini');
    state = aiSettings(state, setAiSettings({ model: 'm2' }));
    expect(state.model).toBe('m2');
    expect(state.baseUrl).toBe('https://x');
  });
});
