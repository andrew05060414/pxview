/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */
let createExclusionList;
try {
  createExclusionList = require('metro-config/src/defaults/exclusionList');
} catch (error) {
  createExclusionList = require('metro-config/src/defaults/blacklist');
}

module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
      },
    }),
  },
  resolver: {
    blacklistRE: createExclusionList([
      /.*\/\.worktrees\/.*/,
    ]),
  },
};
