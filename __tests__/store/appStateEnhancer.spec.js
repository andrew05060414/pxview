import { createStore } from 'redux';

const mockState = {
  currentState: 'unknown',
  listener: null,
};

jest.mock('react-native', () => ({
  AppState: {
    get currentState() {
      return mockState.currentState;
    },
    addEventListener: jest.fn((event, handler) => {
      if (event === 'change') {
        mockState.listener = handler;
      }
      return { remove: jest.fn() };
    }),
  },
}));

import applyAppStateListener, {
  FOREGROUND,
  BACKGROUND,
  INACTIVE,
} from '../../src/common/store/appStateEnhancer';

describe('appStateEnhancer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockState.currentState = 'unknown';
    mockState.listener = null;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('exports expected action type constants matching original library', () => {
    expect(FOREGROUND).toBe('APP_STATE.FOREGROUND');
    expect(BACKGROUND).toBe('APP_STATE.BACKGROUND');
    expect(INACTIVE).toBe('APP_STATE.INACTIVE');
  });

  test('dispatches initial active state on next tick via setTimeout', () => {
    mockState.currentState = 'active';
    const dispatchedActions = [];
    const reducer = (state = {}, action) => {
      dispatchedActions.push(action);
      return state;
    };

    createStore(reducer, applyAppStateListener());

    expect(dispatchedActions).not.toContainEqual({ type: FOREGROUND });
    jest.runAllTimers();
    expect(dispatchedActions).toContainEqual({ type: FOREGROUND });
  });

  test('dispatches actions on foreground, background, and inactive transitions', () => {
    mockState.currentState = 'active';
    const dispatchedActions = [];
    const reducer = (state = {}, action) => {
      dispatchedActions.push(action);
      return state;
    };

    createStore(reducer, applyAppStateListener());
    jest.runAllTimers();

    expect(typeof mockState.listener).toBe('function');

    // Transition: active -> background
    mockState.listener('background');
    expect(dispatchedActions[dispatchedActions.length - 1]).toEqual({
      type: BACKGROUND,
    });

    // Duplicate transition: should not dispatch again
    const countBeforeDuplicate = dispatchedActions.length;
    mockState.listener('background');
    expect(dispatchedActions.length).toBe(countBeforeDuplicate);

    // Transition: background -> active (foreground)
    mockState.listener('active');
    expect(dispatchedActions[dispatchedActions.length - 1]).toEqual({
      type: FOREGROUND,
    });

    // Transition: active -> inactive
    mockState.listener('inactive');
    expect(dispatchedActions[dispatchedActions.length - 1]).toEqual({
      type: INACTIVE,
    });
  });
});

