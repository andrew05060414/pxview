import DeviceInfo from 'react-native-device-info';
import { SCREENS, SEARCH_TYPES } from '../constants';
import pixiv from './apiClient';
import { AUTH_LOGIN, AUTH_REHYDRATE, ILLUST_DETAIL } from '../constants/actionTypes';

export const isExpBuild = () => {
  try {
    return DeviceInfo.getBundleId() === 'com.utopia.pxviewr.exp';
  } catch (e) {
    return false;
  }
};

export const MOCK_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGeSURBVHhe7cExAQAAAMKg9U9tCy8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwJcBSvoAAV46WpUAAAAASUVORK5CYII=';

export const mockIllust = {
  id: 10001,
  title: 'Exp Test Artwork',
  type: 'illust',
  image_urls: {
    square_medium: MOCK_PNG,
    medium: MOCK_PNG,
    large: MOCK_PNG,
  },
  caption: 'This is a mock illustration for exp screen testing without Pixiv.',
  restrict: 0,
  user: {
    id: 99999,
    name: 'Exp Artist',
    account: 'exp_artist',
    profile_image_urls: {
      medium: MOCK_PNG,
    },
    is_followed: false,
  },
  tags: [
    { name: 'Original', translated_name: 'S�R' },
    { name: 'Testing', translated_name: 'mK��' },
    { name: 'ExpBuild', translated_name: '[���g�^�' },
  ],
  tools: ['Clip Studio Paint'],
  create_date: '2026-09-30T12:00:00+09:00',
  page_count: 1,
  width: 1200,
  height: 1200,
  sanity_level: 2,
  x_restrict: 0,
  series: null,
  meta_single_page: {
    original_image_url: MOCK_PNG,
  },
  meta_pages: [],
  total_view: 12345,
  total_bookmarks: 6789,
  is_bookmarked: false,
  visible: true,
  is_muted: false,
  total_comments: 42,
};

export const mockUser = {
  id: '99999999',
  name: 'Exp Tester',
  account: 'exp_tester',
  profile_image_urls: {
    px_16x16: MOCK_PNG,
    px_50x50: MOCK_PNG,
    px_170x170: MOCK_PNG,
    medium: MOCK_PNG,
  },
  is_premium: true,
  x_restrict: 2,
  is_mail_authorized: true,
};

let isMockSetup = false;

export const setupExpMockEnvironment = (store, screenTarget) => {
  if (!isExpBuild()) return;
  if (isMockSetup) return;
  isMockSetup = true;

  if (store) {
    store.dispatch({
      type: AUTH_LOGIN.SUCCESS,
      payload: { user: mockUser, timestamp: Date.now() },
    });
    store.dispatch({
      type: AUTH_REHYDRATE.SUCCESS,
    });
    store.dispatch({
      type: 'EXP_POPULATE_MOCK_ENTITIES',
      payload: {
        entities: {
          illusts: {
            [mockIllust.id]: mockIllust,
          },
          users: {
            [mockIllust.user.id]: mockIllust.user,
          },
        },
      },
    });
    store.dispatch({
      type: ILLUST_DETAIL.SUCCESS,
      payload: {
        illustId: mockIllust.id,
        item: mockIllust,
        timestamp: Date.now(),
      },
    });
  }

  if (pixiv) {
    pixiv.illustDetail = async () => ({ illust: mockIllust });
    pixiv.recommendedIllusts = async () => ({
      illusts: [mockIllust, { ...mockIllust, id: 10002, title: 'Exp Artwork 2' }],
      next_url: null,
    });
    pixiv.searchIllust = async () => ({
      illusts: [mockIllust, { ...mockIllust, id: 10003, title: 'Exp Search Result' }],
      next_url: null,
    });
    pixiv.trendingTagsIllust = async () => ({
      trend_tags: [{ tag: 'ExpTest', illust: mockIllust }],
    });
    pixiv.rankingIllust = async () => ({
      illusts: [mockIllust],
      next_url: null,
    });
    pixiv.userBookmarkIllusts = async () => ({
      illusts: [mockIllust],
      next_url: null,
    });
    pixiv.userIllusts = async () => ({
      illusts: [mockIllust],
      next_url: null,
    });
    pixiv.userNovels = async () => ({
      novels: [],
      next_url: null,
    });
  }
};

export const parseTestTarget = (props, url) => {
  if (!isExpBuild()) return null;

  if (props && props.test_screen) {
    return props.test_screen;
  }

  const rawUrl = url || (props && props.initialUrl);
  if (rawUrl) {
    try {
      const match = rawUrl.match(/[?&]screen=([^&#]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch (e) {}
  }

  return null;
};

export const navigateToTestScreen = (navigation, target) => {
  if (!navigation || !target) return;
  const screen = String(target).toLowerCase();

  switch (screen) {
    case 'home':
      navigation.navigate(SCREENS.Main);
      break;
    case 'search':
      navigation.navigate(SCREENS.SearchResult, {
        word: 'ExpTest',
        searchType: SEARCH_TYPES.ILLUST,
      });
      break;
    case 'detail':
      navigation.navigate(SCREENS.Detail, {
        illustId: mockIllust.id,
        items: [mockIllust],
        index: 0,
      });
      break;
    case 'settings':
      navigation.navigate(SCREENS.Settings);
      break;
    case 'images_viewer':
    case 'imagesviewer':
      navigation.navigate(SCREENS.ImagesViewer, {
        images: [MOCK_PNG],
        viewerIndex: 0,
      });
      break;
    default:
      console.warn('Unknown test screen target:', target);
      break;
  }
};