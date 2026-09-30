// PX-546 spike: disable autolinking for dead native libs that PR #22 plans to replace
const off = { platforms: { android: null, ios: null } };
module.exports = {
  dependencies: {
    'rn-fetch-blob': off,
    'react-native-photo-view-ex': off,
    'react-native-spinkit': off,
    'react-native-splash-screen': off,
  },
};
