import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { RANKING_TYPES, SCREENS } from '../../src/common/constants';

const mockNavigate = jest.fn();

jest.mock('react-native-gesture-handler', () => ({}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    openDrawer: jest.fn(),
    navigate: mockNavigate,
  }),
  useScrollToTop: jest.fn(),
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
  Button: 'Button',
  useTheme: () => ({ colors: { headerBackground: '#000' } }),
}));

jest.mock('../../src/components/Localization', () => ({
  useLocalization: () => ({ i18n: { novel: 'Novel', ranking: 'Ranking' } }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));
jest.mock('../../src/components/DrawerMenuButton', () => 'DrawerMenuButton');
jest.mock('../../src/screens/Ranking/RankingPreview', () => 'RankingPreview');
jest.mock('../../src/screens/Ranking/Ranking', () => 'Ranking');
jest.mock('../../src/screens/Ranking/NovelRanking', () => 'NovelRanking');
jest.mock(
  '../../src/screens/Ranking/RankingHorizontalList',
  () => 'RankingHorizontalList',
);
jest.mock(
  '../../src/screens/Ranking/NovelRankingPreview',
  () => 'NovelRankingPreview',
);

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

  test('opens the novel ranking from the labeled button in the ranking preview', () => {
    const RankingPreview = jest.requireActual(
      '../../src/screens/Ranking/RankingPreview',
    ).default;
    let preview;
    act(() => {
      preview = renderer.create(<RankingPreview />);
    });
    const button = preview.root.findByType('Button');

    expect(button.props.children).toBe('Novel Ranking');
    expect(button.props.accessibilityRole).toBe('button');
    button.props.onPress();

    expect(mockNavigate).toHaveBeenCalledWith(SCREENS.NovelRanking, {
      rankingType: RANKING_TYPES.NOVEL,
    });
  });
});
