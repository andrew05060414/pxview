import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Dimensions, Image, StyleSheet, View } from 'react-native';

jest.mock('react-native-paper', () => {
  const ReactLib = require('react');
  return {
    withTheme: (Comp) => (props) =>
      ReactLib.createElement(Comp, {
        ...props,
        theme: {
          colors: {
            background: '#111',
            surface: '#222',
            text: '#fff',
          },
        },
      }),
    Text: (props) => ReactLib.createElement('Text', props, props.children),
    MD2DarkTheme: { colors: { surface: '#121212' } },
  };
});

jest.mock('../../src/components/Localization', () => ({
  connectLocalization: (Comp) => Comp,
}));

jest.mock('../../src/screens/Shared/RelatedIllusts', () => () => null);
jest.mock('../../src/screens/Shared/IllustComments', () => () => null);
jest.mock('../../src/screens/Shared/NovelComments', () => () => null);
jest.mock('../../src/screens/Shared/NovelSeries', () => () => null);
jest.mock('../../src/containers/FollowButtonContainer', () => () => null);
jest.mock('../../src/components/Tags', () => () => null);
jest.mock('../../src/components/PXThumbnail', () => () => null);
jest.mock('../../src/components/Loader', () => () => null);
jest.mock('react-native-htmlview', () => () => null);
jest.mock('react-native-vector-icons/FontAwesome', () => () => null);
jest.mock('../../src/components/OverlayImagePages', () => () => null);
jest.mock('../../src/components/OverlayUgoiraIndicator', () => () => null);
jest.mock('../../src/components/OverlayBookmarkIllustButton', () => () => null);
jest.mock('../../src/components/OverlayMutedIndicator', () => () => null);

jest.mock('../../src/components/PXImage', () => {
  const ReactLib = require('react');
  return (props) => ReactLib.createElement('MockPXImage', props);
});

jest.mock('react-redux', () => {
  const ReactLib = require('react');
  return {
    connect: (mapStateToPropsFactory) => (Comp) => (props) => {
      const mapState =
        typeof mapStateToPropsFactory === 'function'
          ? mapStateToPropsFactory()
          : () => ({});
      const mockState = {
        entities: {
          illusts: {
            1: {
              id: 1,
              title: 'Sample',
              type: 'illust',
              is_bookmarked: false,
              image_urls: { square_medium: 'https://example.com/1.jpg' },
              tags: [],
              user: { id: 10, is_followed: false },
            },
          },
        },
        highlightTags: { items: [] },
        muteTags: { items: [] },
        muteUsers: { items: [] },
        likeButtonSettings: { isShowLikeCount: true },
      };
      const mapped = mapState(mockState, props);
      return ReactLib.createElement(Comp, { ...props, ...mapped });
    },
  };
});

describe('foldable unfold -> fold resize behavior', () => {
  let changeHandlers = [];
  let currentWindow = { width: 666, height: 739 };

  beforeEach(() => {
    changeHandlers = [];
    currentWindow = { width: 666, height: 739 };
    jest.spyOn(Dimensions, 'get').mockImplementation(() => currentWindow);
    jest
      .spyOn(Dimensions, 'addEventListener')
      .mockImplementation((eventType, handler) => {
        if (eventType === 'change') {
          changeHandlers.push(handler);
        }
        return {
          remove: () => {
            changeHandlers = changeHandlers.filter((h) => h !== handler);
          },
        };
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const emitResize = (nextWindow) => {
    currentWindow = nextWindow;
    act(() => {
      changeHandlers.forEach((handler) => handler({ window: nextWindow }));
    });
  };

  test('withWindowWidth updates both windowWidth and windowHeight when folding', () => {
    const withWindowWidth = require('../../src/components/withWindowWidth').default;
    const Probe = (props) => <View testID="probe" {...props} />;
    const Wrapped = withWindowWidth(Probe);
    let tree;
    act(() => {
      tree = renderer.create(<Wrapped />);
    });
    expect(tree.root.findByType(Probe).props.windowWidth).toBe(666);
    expect(tree.root.findByType(Probe).props.windowHeight).toBe(739);

    emitResize({ width: 365, height: 852 });
    expect(tree.root.findByType(Probe).props.windowWidth).toBe(365);
    expect(tree.root.findByType(Probe).props.windowHeight).toBe(852);
  });

  test('DetailFooter stretches to 100% instead of freezing module-load windowWidth', () => {
    const DetailFooter = require('../../src/components/DetailFooter').default;
    let tree;
    act(() => {
      tree = renderer.create(
        <DetailFooter
          item={{
            id: 100,
            title: 'Test Novel',
            caption: '',
            create_date: '2026-11-25T00:00:00+00:00',
            total_view: 10,
            total_bookmarks: 5,
            text_length: 500,
            user: {
              id: 20,
              name: 'Author',
              account: 'author_acc',
              profile_image_urls: { medium: 'https://example.com/u.jpg' },
            },
          }}
          tags={[]}
          navigation={{ push: jest.fn() }}
          route={{ key: 'route-1' }}
          authUser={null}
          i18n={{ comments: 'Comments', relatedWorks: 'Related' }}
          onPressAvatar={jest.fn()}
          onPressTag={jest.fn()}
          onLongPressTag={jest.fn()}
        />,
      );
    });

    const containerView = tree.root
      .findAllByType(View)
      .find((node) => {
        const flat = StyleSheet.flatten(node.props.style);
        return flat && flat.width === '100%';
      });
    expect(containerView).toBeTruthy();
  });

  test('PXCacheImageTouchable recalculates width and proportional height after unfold -> fold', () => {
    jest
      .spyOn(Image, 'getSizeWithHeaders')
      .mockImplementation((uri, headers, success) => {
        success(1000, 2000);
      });

    const PXCacheImageTouchable = require('../../src/components/PXCacheImageTouchable').default;
    const PXTouchable = require('../../src/components/PXTouchable').default;

    let tree;
    act(() => {
      tree = renderer.create(
        <PXCacheImageTouchable
          uri="https://example.com/art.jpg"
          initWidth={666}
          initHeight={200}
          index={0}
          onPress={jest.fn()}
          onLongPress={jest.fn()}
        />,
      );
    });

    const initialStyle = StyleSheet.flatten(
      tree.root.findByType(PXTouchable).props.style,
    );
    expect(initialStyle.width).toBe(666);
    expect(initialStyle.height).toBe(1332);

    emitResize({ width: 365, height: 852 });

    const foldedStyle = StyleSheet.flatten(
      tree.root.findByType(PXTouchable).props.style,
    );
    expect(foldedStyle.width).toBe(365);
    expect(foldedStyle.height).toBe(730);
  });

  test('IllustItem re-renders when windowWidth changes even when numColumns stays constant', () => {
    const IllustItem = require('../../src/components/IllustItem').default;
    let tree;
    act(() => {
      tree = renderer.create(
        <IllustItem
          illustId={1}
          index={0}
          numColumns={3}
          windowWidth={399}
          onPressItem={jest.fn()}
        />,
      );
    });

    const beforeImage = StyleSheet.flatten(
      tree.root.findByType('MockPXImage').props.style,
    );
    expect(beforeImage.width).toBeCloseTo(399 / 3 - 1, 4);

    act(() => {
      tree.update(
        <IllustItem
          illustId={1}
          index={0}
          numColumns={3}
          windowWidth={365}
          onPressItem={jest.fn()}
        />,
      );
    });

    const afterImage = StyleSheet.flatten(
      tree.root.findByType('MockPXImage').props.style,
    );
    expect(afterImage.width).toBeCloseTo(365 / 3 - 1, 4);
  });
});
