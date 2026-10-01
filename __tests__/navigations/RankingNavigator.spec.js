import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('react-native-gesture-handler', () => ({}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    openDrawer: jest.fn(),
  }),
}));

jest.mock('@react-navigation/stack', () => {
  const React = require('react');
  const Screen = ({ name, children }) =>
    React.createElement('Screen', { name }, children);
  const Navigator = ({ children }) =>
    React.createElement('Navigator', null, children);

  return {
    createStackNavigator: () => ({ Navigator, Screen }),
  };
});

jest.mock('react-native-paper', () => ({
  useTheme: () => ({ colors: { headerBackground: '#000' } }),
}));

jest.mock('../../src/components/Localization', () => ({
  useLocalization: () => ({ i18n: { ranking: 'Ranking' } }),
}));

jest.mock('../../src/components/DrawerMenuButton', () => 'DrawerMenuButton');
jest.mock('../../src/screens/Ranking/RankingPreview', () => 'RankingPreview');
jest.mock('../../src/screens/Ranking/Ranking', () => 'Ranking');
jest.mock('../../src/screens/Ranking/NovelRanking', () => 'NovelRanking');

// Load after the native navigation dependencies have been mocked.
// eslint-disable-next-line global-require
const RankingNavigator = require('../../src/navigations/RankingNavigator')
  .default;

describe('RankingNavigator', () => {
  test('exposes preview, illustration, and novel ranking routes', () => {
    let instance;
    act(() => {
      instance = renderer.create(<RankingNavigator />);
    });
    const screenNames = instance.root
      .findAllByType('Screen')
      .map((screen) => screen.props.name);

    expect(screenNames).toEqual(['RankingPreview', 'Ranking', 'NovelRanking']);
  });
});
