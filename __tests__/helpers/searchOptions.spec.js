import {
  parseExcludeKeywords,
  buildSearchWord,
  stripLocalSearchOptions,
  mergeSearchResponses,
  filterItemsByMinBookmarks,
} from '../../src/common/helpers/searchOptions';

describe('parseExcludeKeywords', () => {
  test('splits on spaces, commas and full-width separators', () => {
    expect(parseExcludeKeywords('R-18 グロ, テスト、foo')).toEqual([
      'R-18',
      'グロ',
      'テスト',
      'foo',
    ]);
  });

  test('returns empty array for empty input', () => {
    expect(parseExcludeKeywords(undefined)).toEqual([]);
    expect(parseExcludeKeywords('  ')).toEqual([]);
  });
});

describe('buildSearchWord', () => {
  test('returns plain word when no extras', () => {
    expect(buildSearchWord('vocaloid', {})).toBe('vocaloid');
    expect(buildSearchWord('vocaloid', undefined)).toBe('vocaloid');
  });

  test('appends illust bookmark counts tag with space', () => {
    expect(
      buildSearchWord('vocaloid', { bookmarkCountsTag: '100users入り' }),
    ).toBe('vocaloid 100users入り');
  });

  test('appends novel bookmark counts tag with 小説 prefix', () => {
    expect(
      buildSearchWord(
        'vocaloid',
        { bookmarkCountsTag: '100users入り' },
        {
          isNovel: true,
        },
      ),
    ).toBe('vocaloid 小説100users入り');
  });

  test('appends exclusion keywords with minus syntax', () => {
    expect(buildSearchWord('vocaloid', { excludeKeywords: 'R-18 グロ' })).toBe(
      'vocaloid -R-18 -グロ',
    );
  });

  test('combines counts tag and exclusion keywords', () => {
    expect(
      buildSearchWord(
        'vocaloid',
        { bookmarkCountsTag: '500users入り', excludeKeywords: 'グロ' },
        { isNovel: true },
      ),
    ).toBe('vocaloid 小説500users入り -グロ');
  });
});

describe('stripLocalSearchOptions', () => {
  test('removes local-only keys and keeps api keys', () => {
    expect(
      stripLocalSearchOptions({
        search_target: 'partial_match_for_tags',
        search_ai_type: '0',
        bookmarkCountsTag: '100users入り',
        excludeKeywords: 'R-18',
        minBookmarks: 1000,
      }),
    ).toEqual({
      search_target: 'partial_match_for_tags',
      search_ai_type: '0',
    });
  });

  test('passes through undefined', () => {
    expect(stripLocalSearchOptions(undefined)).toBeUndefined();
  });
});

describe('mergeSearchResponses', () => {
  test('dedupes by id, preview first, keeps regular next_url', () => {
    const preview = { illusts: [{ id: 1 }, { id: 2 }] };
    const regular = { illusts: [{ id: 2 }, { id: 3 }], next_url: 'next' };
    const merged = mergeSearchResponses(preview, regular, 'illusts');
    expect(merged.illusts.map((i) => i.id)).toEqual([1, 2, 3]);
    expect(merged.next_url).toBe('next');
  });

  test('handles missing item arrays', () => {
    const merged = mergeSearchResponses({}, { novels: [{ id: 5 }] }, 'novels');
    expect(merged.novels.map((i) => i.id)).toEqual([5]);
  });
});

describe('filterItemsByMinBookmarks', () => {
  const items = [
    { id: 1, total_bookmarks: 1500 },
    { id: 2, total_bookmarks: 200 },
    { id: 3 },
  ];

  test('keeps items at or above the minimum', () => {
    expect(filterItemsByMinBookmarks(items, 1000).map((i) => i.id)).toEqual([
      1,
    ]);
  });

  test('treats missing bookmarks as zero', () => {
    expect(filterItemsByMinBookmarks(items, 100).map((i) => i.id)).toEqual([
      1,
      2,
    ]);
  });

  test('returns items unchanged when no minimum', () => {
    expect(filterItemsByMinBookmarks(items, null)).toBe(items);
    expect(filterItemsByMinBookmarks(items, 0)).toBe(items);
  });
});
