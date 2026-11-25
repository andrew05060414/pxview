import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { CommonActions, StackActions, StackRouter } from '@react-navigation/native';
import { SEARCH_TYPES, SCREENS } from '../../src/common/constants';

jest.mock('react-redux', () => {
  const ReactLib = require('react');
  return {
    connect: (mapState, mapDispatch) => (Comp) => (props) => {
      const stateProps = mapState
        ? mapState(
            {
              auth: { user: { id: 1 } },
              addIllustComment: props.result || { loading: false, success: false },
            },
            props,
          )
        : {};
      const dispatchProps =
        typeof mapDispatch === 'object' && mapDispatch ? mapDispatch : {};
      return ReactLib.createElement(Comp, {
        ...props,
        ...stateProps,
        ...dispatchProps,
      });
    },
  };
});

jest.mock('react-native-paper', () => {
  const ReactLib = require('react');
  return {
    withTheme: (Comp) => (props) =>
      ReactLib.createElement(Comp, {
        ...props,
        theme: { colors: { background: '#fff', surface: '#fff' } },
      }),
    Button: (props) => ReactLib.createElement('PaperButton', props, props.children),
    TextInput: (props) => ReactLib.createElement('TextInput', props),
  };
});

jest.mock('react-navigation-backhandler', () => ({
  AndroidBackHandler: ({ children }) => children,
}));

jest.mock('react-native-vector-icons/FontAwesome', () => () => null);
jest.mock('react-native-loading-spinner-overlay', () => () => null);
jest.mock('../../src/components/Localization', () => {
  const ReactLib = require('react');
  return {
    connectLocalization: (Comp) => (props) =>
      ReactLib.createElement(Comp, {
        ...props,
        i18n: {
          searchTarget: 'Target',
          searchPeriod: 'Period',
          searchSort: 'Sort',
          searchLikes: 'Likes',
          searchMinBookmarks: 'Min Bookmarks',
          searchExcludeKeywords: 'Exclude',
          searchExcludeKeywordsPlaceholder: 'Placeholder',
          searchAiType: 'AI',
          searchApplyFilter: 'Apply',
          searchTargetPartialMatchForTags: 'Partial',
          searchTargetExactMatchForTags: 'Exact',
          searchTargetTitleOrCaption: 'Title/Caption',
          searchTargetText: 'Text',
          searchTargetKeyword: 'Keyword',
          searchPeriodAll: 'All',
          searchPeriodLastDay: 'Day',
          searchPeriodLastWeek: 'Week',
          searchPeriodLastMonth: 'Month',
          searchPeriodHalfYear: 'HalfYear',
          searchPeriodYear: 'Year',
          searchPeriodCustomDate: 'Custom',
          searchSortDateDesc: 'Newest',
          searchSortDateAsc: 'Oldest',
          searchSortPopularDesc: 'Popular',
          searchAll: 'All',
          searchLikesAll: 'All',
          searchAiShow: 'Show',
          searchAiHide: 'Hide',
          commentInput: 'Comment',
        },
      }),
  };
});

jest.mock('../../src/containers/Search', () => () => null);
jest.mock('../../src/containers/SearchIllustsResult', () => {
  const ReactLib = require('react');
  return (props) => ReactLib.createElement('SearchIllustsResult', props);
});
jest.mock('../../src/containers/SearchNovelsResult', () => {
  const ReactLib = require('react');
  return (props) => ReactLib.createElement('SearchNovelsResult', props);
});
jest.mock('../../src/containers/SearchUsersResult', () => {
  const ReactLib = require('react');
  return (props) => ReactLib.createElement('SearchUsersResult', props);
});
jest.mock('../../src/components/PXSearchBar', () => () => null);
jest.mock('../../src/components/HeaderFilterButton', () => () => null);
jest.mock('../../src/components/HeaderEncyclopediaButton', () => () => null);
jest.mock('../../src/components/PXListItem', () => () => null);
jest.mock('../../src/components/SingleChoiceDialog', () => () => null);
jest.mock('../../src/components/TextInputDialog', () => () => null);
jest.mock('../../src/components/SearchIllustsBookmarkRangesPickerDialog', () => () => null);
jest.mock('../../src/components/SearchNovelsBookmarkRangesPickerDialog', () => () => null);
jest.mock('../../src/components/PXTouchable', () => () => null);

const SearchFilterModal = require('../../src/screens/Shared/SearchFilterModal').default;
const SearchResultTabs = require('../../src/screens/Shared/SearchResultTabs').default;
const AddIllustComment = require('../../src/screens/Shared/AddIllustComment').default;

const routerOptions = {
  routeNames: [
    SCREENS.Main,
    SCREENS.SearchResult,
    SCREENS.SearchFilterModal,
    SCREENS.IllustComments,
    SCREENS.AddIllustComment,
  ],
  routeParamList: {},
  routeGetIdList: {},
};

const createInitialStack = (router, routes) => {
  const base = router.getInitialState(routerOptions);
  return {
    ...base,
    index: routes.length - 1,
    routes,
  };
};

describe('React Navigation v7 merge+pop behavior for search filters and comments', () => {
  test.each([
    [SEARCH_TYPES.ILLUST, 'SearchIllustsResult', 'sakura'],
    [SEARCH_TYPES.NOVEL, 'SearchNovelsResult', 'fantasy'],
  ])(
    'applying filters twice on %s search preserves word & searchType, updates options, and pops cleanly',
    (searchType, expectedResultComponent, word) => {
      const router = StackRouter({});
      // Open SearchFilterModal first time
      let state = createInitialStack(router, [
        { key: 'main-1', name: SCREENS.Main },
        {
          key: 'search-1',
          name: SCREENS.SearchResult,
          params: { word, searchType },
        },
      ]);
      state = router.getStateForAction(
        state,
        StackActions.push(SCREENS.SearchFilterModal, {
          word,
          searchType,
          searchFilter: {},
        }),
        routerOptions,
      );
      expect(state.routes).toHaveLength(3);

      let filterRoute = state.routes[state.index];
      let appliedFromModal = null;
      const modalNav = {
        navigate: (name, params, opts) => {
          appliedFromModal = CommonActions.navigate(name, params, opts);
          state = router.getStateForAction(state, appliedFromModal, routerOptions);
        },
      };

      let modalTree;
      act(() => {
        modalTree = renderer.create(
          <SearchFilterModal navigation={modalNav} route={filterRoute} />,
        );
      });
      act(() => {
        modalTree.root.findByType('PaperButton').props.onPress();
      });

      expect(state.routes).toHaveLength(2);
      expect(state.routes[state.index].name).toBe(SCREENS.SearchResult);
      expect(state.routes[state.index].params).toMatchObject({
        word,
        searchType,
        sort: 'date_desc',
      });

      let resultTree;
      const searchRoute1 = state.routes[state.index];
      act(() => {
        resultTree = renderer.create(
          <SearchResultTabs navigation={{ setParams: jest.fn() }} route={searchRoute1} />,
        );
      });
      expect(resultTree.root.findAllByType(expectedResultComponent)).toHaveLength(1);
      expect(resultTree.root.findByType(expectedResultComponent).props.word).toBe(word);

      // Open SearchFilterModal second time and change sort filter
      state = router.getStateForAction(
        state,
        StackActions.push(SCREENS.SearchFilterModal, {
          word,
          searchType,
          searchFilter: { sort: 'date_desc' },
        }),
        routerOptions,
      );
      expect(state.routes).toHaveLength(3);
      filterRoute = state.routes[state.index];

      let modalTree2;
      act(() => {
        modalTree2 = renderer.create(
          <SearchFilterModal
            navigation={{
              navigate: (name, params, opts) => {
                state = router.getStateForAction(
                  state,
                  CommonActions.navigate(name, params, opts),
                  routerOptions,
                );
              },
            }}
            route={filterRoute}
          />,
        );
      });
      act(() => {
        const instance = modalTree2.root.find((n) => n.instance?.handleOnPressApplyFilter).instance;
        instance.setState({ sort: 'popularity', minBookmarks: '100' }, () => {
          instance.handleOnPressApplyFilter();
        });
      });

      expect(state.routes).toHaveLength(2);
      expect(state.routes[state.index].params).toMatchObject({
        word,
        searchType,
        sort: 'popularity',
        minBookmarks: '100',
      });

      act(() => {
        resultTree.update(
          <SearchResultTabs
            navigation={{ setParams: jest.fn() }}
            route={state.routes[state.index]}
          />,
        );
      });
      const resultNode = resultTree.root.findByType(expectedResultComponent);
      expect(resultNode.props.word).toBe(word);
      expect(resultNode.props.options).toMatchObject({
        sort: 'popularity',
        minBookmarks: 100,
      });

      // Pressing back once returns directly to Main with no stray SearchFilterModal
      const afterBack = router.getStateForAction(
        state,
        CommonActions.goBack(),
        routerOptions,
      );
      expect(afterBack.routes.map((r) => r.name)).toEqual([SCREENS.Main]);
    },
  );

  it('AddIllustComment pops and merges reload params into existing IllustComments route', () => {
    const router = StackRouter({});
    let state = createInitialStack(router, [
      { key: 'main-1', name: SCREENS.Main },
      {
        key: 'comments-1',
        name: SCREENS.IllustComments,
        params: { illustId: 888, authorId: 99 },
      },
      {
        key: 'add-comment-1',
        name: SCREENS.AddIllustComment,
        params: {
          illustId: 888,
          navigateFrom: { name: SCREENS.IllustComments, key: 'comments-1' },
        },
      },
    ]);

    const nav = {
      setOptions: jest.fn(),
      dispatch: (action) => {
        state = router.getStateForAction(state, action, routerOptions) || state;
      },
    };
    const route = state.routes[2];

    let tree;
    act(() => {
      tree = renderer.create(
        <AddIllustComment
          navigation={nav}
          route={route}
          result={{ loading: false, success: false }}
        />,
      );
    });
    act(() => {
      tree.update(
        <AddIllustComment
          navigation={nav}
          route={route}
          result={{ loading: false, success: true }}
        />,
      );
    });

    expect(state.routes.map((r) => r.name)).toEqual([
      SCREENS.Main,
      SCREENS.IllustComments,
    ]);
    expect(state.routes[1].params).toEqual({
      illustId: 888,
      authorId: 99,
      reload: true,
      fromId: 888,
    });
  });
});
