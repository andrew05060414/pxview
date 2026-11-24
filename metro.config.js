/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */
const path = require('path');

let createExclusionList;
try {
  createExclusionList = require('metro-config/src/defaults/exclusionList');
} catch (error) {
  createExclusionList = require('metro-config/src/defaults/blacklist');
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nestedWorktreesDir = path
  .resolve(__dirname, '.worktrees')
  .replace(/\\/g, '/');
const nestedWorktreesPattern = new RegExp(
  `^${escapeRegExp(nestedWorktreesDir)}/.*`,
);

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
    blacklistRE: createExclusionList([nestedWorktreesPattern]),
  },
};
