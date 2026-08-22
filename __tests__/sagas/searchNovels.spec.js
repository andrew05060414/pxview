import { apply, put, select } from 'redux-saga/effects';
import pixiv from '../../src/common/helpers/apiClient';
import { getAuthUser } from '../../src/common/selectors';
import { handleFetchSearchNovels } from '../../src/common/sagas/searchNovels';

const novel = (id, extra = {}) => ({
  id,
  visible: true,
  title: `novel-${id}`,
  user: { id: 10, name: 'author' },
  ...extra,
});

describe('handleFetchSearchNovels', () => {
  test('free popularity search merges popular preview with regular first page', () => {
    const action = {
      payload: {
        navigationStateKey: 'search-1',
        word: 'vocaloid',
        options: {
          search_target: 'partial_match_for_tags',
          sort: 'popularity',
        },
      },
    };
    const generator = handleFetchSearchNovels(action);
    expect(generator.next().value).toEqual(select(getAuthUser));
    const searchArgs = [
      'vocaloid',
      { search_target: 'partial_match_for_tags' },
    ];
    const previewResponse = {
      novels: [novel(1, { total_bookmarks: 5000 })],
    };
    const regularResponse = {
      novels: [
        novel(1, { total_bookmarks: 5000 }),
        novel(2, { total_bookmarks: 300 }),
      ],
      next_url: 'https://app-api.pixiv.net/v1/search/novel?offset=30',
    };
    expect(generator.next({ is_premium: false }).value).toEqual(
      apply(pixiv, pixiv.searchNovelPopularPreview, searchArgs),
    );
    expect(generator.next(previewResponse).value).toEqual(
      apply(pixiv, pixiv.searchNovel, searchArgs),
    );
    expect(generator.next(regularResponse).value).toEqual(
      put({
        type: 'PIXIV/SEARCH_NOVELS_SUCCESS',
        payload: expect.objectContaining({
          navigationStateKey: 'search-1',
          items: [1, 2],
          nextUrl: 'https://app-api.pixiv.net/v1/search/novel?offset=30',
        }),
      }),
    );
    expect(generator.next().done).toBe(true);
  });

  test('premium popularity search keeps popular_desc sort', () => {
    const action = {
      payload: {
        navigationStateKey: 'search-2',
        word: 'vocaloid',
        options: {
          search_target: 'partial_match_for_tags',
          sort: 'popularity',
        },
      },
    };
    const generator = handleFetchSearchNovels(action);
    expect(generator.next().value).toEqual(select(getAuthUser));
    expect(generator.next({ is_premium: true }).value).toEqual(
      apply(pixiv, pixiv.searchNovel, [
        'vocaloid',
        { search_target: 'partial_match_for_tags', sort: 'popular_desc' },
      ]),
    );
    expect(generator.next({ novels: [novel(1)] }).value).toEqual(
      put({
        type: 'PIXIV/SEARCH_NOVELS_SUCCESS',
        payload: expect.objectContaining({
          items: [1],
        }),
      }),
    );
  });

  test('exclude keywords join the search word and local options are stripped', () => {
    const action = {
      payload: {
        navigationStateKey: 'search-3',
        word: 'vocaloid',
        options: {
          search_target: 'partial_match_for_tags',
          bookmarkCountsTag: '100users入り',
          excludeKeywords: 'R-18 グロ',
          minBookmarks: 1000,
          search_ai_type: '0',
        },
      },
    };
    const generator = handleFetchSearchNovels(action);
    expect(generator.next().value).toEqual(select(getAuthUser));
    expect(generator.next({ is_premium: false }).value).toEqual(
      apply(pixiv, pixiv.searchNovel, [
        'vocaloid 小説100users入り -R-18 -グロ',
        { search_target: 'partial_match_for_tags', search_ai_type: '0' },
      ]),
    );
    expect(generator.next({ novels: [novel(1)] }).value).toEqual(
      put({
        type: 'PIXIV/SEARCH_NOVELS_SUCCESS',
        payload: expect.objectContaining({
          items: [1],
        }),
      }),
    );
  });
});
