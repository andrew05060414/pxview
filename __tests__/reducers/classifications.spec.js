import reducer, {
  DEFAULT_CATEGORIES,
} from '../../src/common/reducers/classifications';
import {
  setCategories,
  classifyStart,
  classifyStop,
  classifyProgress,
  classifyBatch,
  classifySuccess,
  classifyFailure,
  clearClassifications,
} from '../../src/common/actions/classifications';

describe('classifications reducer', () => {
  const initial = reducer(undefined, { type: 'INIT' });

  test('initial state structure', () => {
    expect(initial).toEqual({
      categories: DEFAULT_CATEGORIES,
      items: {},
      classifying: false,
      progress: { done: 0, total: 0 },
      lastClassifiedAt: null,
      error: null,
    });
  });

  test('setCategories updates category list', () => {
    const state = reducer(initial, setCategories(['cat1', 'cat2']));
    expect(state.categories).toEqual(['cat1', 'cat2']);
  });

  test('classify workflow: start -> progress -> batch -> success', () => {
    let state = reducer(initial, classifyStart());
    expect(state.classifying).toBe(true);
    expect(state.progress).toEqual({ done: 0, total: 0 });

    state = reducer(state, classifyProgress(10, 50));
    expect(state.progress).toEqual({ done: 10, total: 50 });

    state = reducer(
      state,
      classifyBatch([
        { id: '1', category: '日常/治愈' },
        { id: '2', category: '恋爱/纯爱' },
      ]),
    );
    expect(state.items).toEqual({
      1: '日常/治愈',
      2: '恋爱/纯爱',
    });

    state = reducer(state, classifySuccess());
    expect(state.classifying).toBe(false);
    expect(typeof state.lastClassifiedAt).toBe('number');
  });

  test('handles stop, failure, and clear', () => {
    let state = reducer(initial, classifyStop());
    expect(state.classifying).toBe(false);

    state = reducer(state, classifyFailure('LLM Error'));
    expect(state.classifying).toBe(false);
    expect(state.error).toBe('LLM Error');

    state = reducer(state, clearClassifications());
    expect(state.items).toEqual({});
    expect(state.categories).toEqual(DEFAULT_CATEGORIES);
  });
});
