import {
  searchBookmarksLocally,
  buildNaturalLanguageSearchPrompt,
} from '../../src/common/helpers/bookmarkSmartSearch';

describe('bookmarkSmartSearch', () => {
  const sampleItems = [
    {
      id: '1',
      title: 'Genshin Impact Illustration',
      tags: ['Genshin', 'Furina', 'Art'],
      userName: 'Artist1',
      type: 'illust',
      restrict: 'public',
      totalBookmarks: 2500,
      createDate: '2025-05-01T00:00:00Z',
    },
    {
      id: '2',
      title: 'Arknights Drama Novel',
      tags: ['Arknights', 'Amiya', 'Story'],
      userName: 'Author2',
      type: 'novel',
      restrict: 'public',
      totalBookmarks: 800,
      textLength: 60000,
      createDate: '2024-08-01T00:00:00Z',
    },
    {
      id: '3',
      title: 'Genshin Impact R-18 Comic',
      tags: ['Genshin', 'R-18', 'Manga'],
      userName: 'Artist1',
      type: 'illust',
      restrict: 'private',
      totalBookmarks: 5000,
      createDate: '2025-01-01T00:00:00Z',
    },
  ];

  const classificationMap = {
    1: '同人/二次创作',
    2: '奇幻/异世界',
  };

  test('searches with keywords and negative exclusion keywords', () => {
    // Search "Genshin" -> matches 1 and 3
    const res1 = searchBookmarksLocally(sampleItems, 'Genshin');
    expect(res1.map((i) => i.id)).toEqual(['1', '3']);

    // Search "Genshin -r-18" -> matches 1 only
    const res2 = searchBookmarksLocally(sampleItems, 'Genshin -r-18');
    expect(res2.map((i) => i.id)).toEqual(['1']);
  });

  test('filters by type and restrict', () => {
    const illusts = searchBookmarksLocally(sampleItems, '', { type: 'illust' });
    expect(illusts.map((i) => i.id)).toEqual(['1', '3']);

    const privates = searchBookmarksLocally(sampleItems, '', { restrict: 'private' });
    expect(privates.map((i) => i.id)).toEqual(['3']);
  });

  test('filters by bookmarks and text length thresholds', () => {
    const popular = searchBookmarksLocally(sampleItems, '', { minBookmarks: 2000 });
    expect(popular.map((i) => i.id)).toEqual(['1', '3']);

    const longNovels = searchBookmarksLocally(sampleItems, '', { minTextLength: 50000 });
    expect(longNovels.map((i) => i.id)).toEqual(['2']);
  });

  test('filters by AI classification and year', () => {
    const classified = searchBookmarksLocally(
      sampleItems,
      '',
      { category: '同人/二次创作' },
      classificationMap,
    );
    expect(classified.map((i) => i.id)).toEqual(['1']);

    const year2024 = searchBookmarksLocally(sampleItems, '', { year: 2024 });
    expect(year2024.map((i) => i.id)).toEqual(['2']);
  });

  test('sorts by popularity, length, and newest/oldest', () => {
    const popSorted = searchBookmarksLocally(sampleItems, '', { sort: 'popularity' });
    expect(popSorted.map((i) => i.id)).toEqual(['3', '1', '2']);

    const oldest = searchBookmarksLocally(sampleItems, '', { sort: 'oldest' });
    expect(oldest.map((i) => i.id)).toEqual(['2', '3', '1']);
  });

  test('buildNaturalLanguageSearchPrompt creates system and user prompts', () => {
    const prompt = buildNaturalLanguageSearchPrompt('找去年字数大于5万的小说', ['同人', '奇幻']);
    expect(prompt).toHaveLength(2);
    expect(prompt[0].role).toBe('system');
    expect(prompt[0].content).toContain('同人, 奇幻');
    expect(prompt[1].role).toBe('user');
    expect(prompt[1].content).toBe('找去年字数大于5万的小说');
  });
});
