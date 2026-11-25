import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { READING_DIRECTION_TYPES } from '../../src/common/constants';

jest.mock('react-redux', () => {
  const ReactLib = require('react');
  return {
    connect: () => (Comp) => (props) => ReactLib.createElement(Comp, props),
  };
});
jest.mock('react-native-paper', () => {
  const ReactLib = require('react');
  return {
    withTheme: (Comp) => (props) =>
      ReactLib.createElement(Comp, {
        ...props,
        theme: { colors: { background: '#000' } },
      }),
    Button: () => null,
  };
});
jest.mock('../../src/components/Localization', () => ({
  connectLocalization: (Comp) => Comp,
}));
jest.mock('../../src/components/withWindowWidth', () => (Comp) => Comp);
jest.mock('../../src/components/NovelViewer', () => {
  const ReactLib = require('react');
  return (props) => ReactLib.createElement('NovelViewer', props);
});
jest.mock('../../src/components/PXHeader', () => () => null);
jest.mock('../../src/components/HeaderTextTitle', () => () => null);
jest.mock('../../src/components/HeaderSettingsButton', () => () => null);
jest.mock('../../src/components/BookmarkNovelButton', () => () => null);
jest.mock('../../src/components/Loader', () => () => null);
jest.mock('../../src/components/EmptyStateView', () => () => null);
jest.mock('../../src/common/helpers/i18n', () => ({
  getLanguage: () => 'en',
  loadingFailed: 'Failed',
  retry: 'Retry',
}));

const NovelReaderModule = require('../../src/screens/Shared/NovelReader');
const NovelReader = NovelReaderModule.default;
const { resolveInitialNovelPageIndex } = NovelReaderModule;

describe('NovelReader initial and async page restoration (LTR & RTL)', () => {
  const threePages = [['p0'], ['p1'], ['p2']];

  const renderReader = (props) => {
    let tree;
    act(() => {
      tree = renderer.create(
        <NovelReader
          novelId={101}
          item={{ id: 101, title: 'Novel' }}
          novelText={{ text: 'abc', loading: false, loaded: true }}
          parsedNovelText={threePages}
          novelSettings={{ fontSize: 16, lineHeight: 1.5 }}
          fetchNovelText={jest.fn()}
          clearNovelText={jest.fn()}
          openModal={jest.fn()}
          dispatch={jest.fn()}
          i18n={{ retry: 'Retry', loadingFailed: 'Failed' }}
          {...props}
        />,
      );
    });
    return tree;
  };

  test.each([
    [READING_DIRECTION_TYPES.RIGHT_TO_LEFT, undefined, 2],
    [READING_DIRECTION_TYPES.RIGHT_TO_LEFT, null, 2],
    [READING_DIRECTION_TYPES.RIGHT_TO_LEFT, 2, 2],
    [READING_DIRECTION_TYPES.RIGHT_TO_LEFT, 1, 1],
    [READING_DIRECTION_TYPES.RIGHT_TO_LEFT, 0, 0],
    [READING_DIRECTION_TYPES.LEFT_TO_RIGHT, undefined, 0],
    [READING_DIRECTION_TYPES.LEFT_TO_RIGHT, 0, 0],
    [READING_DIRECTION_TYPES.LEFT_TO_RIGHT, 1, 1],
    [READING_DIRECTION_TYPES.LEFT_TO_RIGHT, 2, 2],
    [READING_DIRECTION_TYPES.RIGHT_TO_LEFT, 99, 2],
    [READING_DIRECTION_TYPES.RIGHT_TO_LEFT, -4, 0],
  ])(
    'restores %s savedPageIndex=%p to index %i in both cached constructor and async componentDidUpdate',
    (direction, savedPageIndex, expectedIndex) => {
      expect(
        resolveInitialNovelPageIndex({
          parsedNovelText: threePages,
          savedPageIndex,
          novelReadingDirection: direction,
        }),
      ).toBe(expectedIndex);

      const cachedTree = renderReader({
        novelReadingDirection: direction,
        savedPageIndex,
        parsedNovelText: threePages,
      });
      expect(cachedTree.root.findByType('NovelViewer').props.index).toBe(
        expectedIndex,
      );

      const asyncTree = renderReader({
        novelReadingDirection: direction,
        savedPageIndex,
        novelText: { loading: true },
        parsedNovelText: null,
      });
      act(() => {
        asyncTree.update(
          <NovelReader
            novelId={101}
            item={{ id: 101, title: 'Novel' }}
            novelText={{ text: 'abc', loading: false, loaded: true }}
            parsedNovelText={threePages}
            novelSettings={{ fontSize: 16, lineHeight: 1.5 }}
            novelReadingDirection={direction}
            savedPageIndex={savedPageIndex}
            fetchNovelText={jest.fn()}
            clearNovelText={jest.fn()}
            openModal={jest.fn()}
            dispatch={jest.fn()}
            i18n={{ retry: 'Retry', loadingFailed: 'Failed' }}
          />,
        );
      });
      expect(asyncTree.root.findByType('NovelViewer').props.index).toBe(
        expectedIndex,
      );
    },
  );
});
