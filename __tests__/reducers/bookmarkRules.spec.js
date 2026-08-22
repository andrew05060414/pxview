import reducer, { DEFAULT_RULES } from '../../src/common/reducers/bookmarkRules';
import {
  addBookmarkRule,
  editBookmarkRule,
  removeBookmarkRule,
  reorderBookmarkRules,
  restoreBookmarkRules,
  clearBookmarkRules,
} from '../../src/common/actions/bookmarkRules';

describe('bookmarkRules reducer', () => {
  const initial = reducer(undefined, { type: 'INIT' });

  test('initial state has default preset rules', () => {
    expect(initial.rules).toEqual(DEFAULT_RULES);
    expect(initial.rules.length).toBeGreaterThanOrEqual(3);
  });

  test('add, edit, remove rules', () => {
    const newRule = { id: 'custom_1', name: 'My Rule', type: 'novel' };
    let state = reducer(initial, addBookmarkRule(newRule));
    expect(state.rules).toHaveLength(DEFAULT_RULES.length + 1);
    expect(state.rules.find((r) => r.id === 'custom_1')).toEqual(
      expect.objectContaining({ id: 'custom_1', name: 'My Rule', type: 'novel' }),
    );

    state = reducer(
      state,
      editBookmarkRule({ id: 'custom_1', name: 'Updated Rule', minBookmarks: 500 }),
    );
    const edited = state.rules.find((r) => r.id === 'custom_1');
    expect(edited.name).toBe('Updated Rule');
    expect(edited.minBookmarks).toBe(500);

    state = reducer(state, removeBookmarkRule('custom_1'));
    expect(state.rules.find((r) => r.id === 'custom_1')).toBeUndefined();
  });

  test('reorder, restore, clear', () => {
    const reordered = [DEFAULT_RULES[1], DEFAULT_RULES[0]];
    let state = reducer(initial, reorderBookmarkRules(reordered));
    expect(state.rules).toEqual(reordered);

    state = reducer(state, restoreBookmarkRules([DEFAULT_RULES[0]]));
    expect(state.rules).toEqual([DEFAULT_RULES[0]]);

    state = reducer(state, clearBookmarkRules());
    expect(state.rules).toEqual(DEFAULT_RULES);
  });
});
