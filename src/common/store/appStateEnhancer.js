import { AppState } from 'react-native';

export const FOREGROUND = 'APP_STATE.FOREGROUND';
export const BACKGROUND = 'APP_STATE.BACKGROUND';
export const INACTIVE = 'APP_STATE.INACTIVE';

export const applyAppStateListener = () => (createStore) => (...args) => {
  const store = createStore(...args);

  let currentState = '';

  const handleAppStateChange = (nextAppState) => {
    if (currentState !== nextAppState) {
      let type;
      if (nextAppState === 'active') {
        type = FOREGROUND;
      } else if (nextAppState === 'background') {
        type = BACKGROUND;
      } else if (nextAppState === 'inactive') {
        type = INACTIVE;
      }
      if (type) {
        store.dispatch({
          type,
        });
      }
    }
    currentState = nextAppState;
  };

  AppState.addEventListener('change', handleAppStateChange);

  // setTimeout to allow subscribers/sagas to catch the initial state
  setTimeout(() => handleAppStateChange(AppState.currentState));
  return store;
};

export default applyAppStateListener;

