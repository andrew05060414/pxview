import ReactNative from 'react-native';

const _InteractionManager = {
  runAfterInteractions(task) {
    let handle;
    const promise = new Promise((resolve) => {
      handle = setTimeout(() => {
        resolve(task ? task() : undefined);
      }, 0);
    });
    return {
      then: promise.then.bind(promise),
      done: (...args) => promise.then(...args),
      cancel: () => clearTimeout(handle),
    };
  },
  createInteractionHandle() {
    return 1;
  },
  clearInteractionHandle() {},
  setDeadline() {},
  addListener() {
    return { remove() {} };
  },
};

if (!ReactNative.InteractionManager) {
  ReactNative.InteractionManager = _InteractionManager;
}

