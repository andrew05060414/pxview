import {
  evaluateRule,
  filterByRule,
} from '../../src/common/helpers/bookmarkRuleFilter';

describe('bookmarkRuleFilter', () => {
  const item1 = {
    id: '1',
    title: 'Genshin Impact Art',
    type: 'illust',
    restrict: 'public',
    tags: ['GenshinImpact', 'Furina', 'Art'],
    userId: '101',
    userName: 'Artist A',
    totalBookmarks: 1500,
    createDate: '2025-06-01T00:00:00Z',
  };

  const item2 = {
    id: '2',
    title: 'Epic Fantasy Novel',
    type: 'novel',
    restrict: 'private',
    tags: ['Fantasy', 'Magic', 'Adventure'],
    userId: '202',
    userName: 'Author B',
    totalBookmarks: 800,
    textLength: 120000,
    createDate: '2024-03-15T00:00:00Z',
  };

  const classificationMap = {
    1: '同人/二次创作',
    2: '奇幻/异世界',
  };

  test('matches type, restrict, and minBookmarks', () => {
    expect(evaluateRule({ type: 'illust' }, item1)).toBe(true);
    expect(evaluateRule({ type: 'novel' }, item1)).toBe(false);
    expect(evaluateRule({ restrict: 'public' }, item1)).toBe(true);
    expect(evaluateRule({ restrict: 'private' }, item1)).toBe(false);
    expect(evaluateRule({ minBookmarks: 1000 }, item1)).toBe(true);
    expect(evaluateRule({ minBookmarks: 2000 }, item1)).toBe(false);
  });

  test('matches novel textLength range', () => {
    expect(evaluateRule({ minTextLength: 100000 }, item2)).toBe(true);
    expect(evaluateRule({ minTextLength: 150000 }, item2)).toBe(false);
    expect(evaluateRule({ maxTextLength: 150000 }, item2)).toBe(true);
    expect(evaluateRule({ maxTextLength: 50000 }, item2)).toBe(false);
    // Illust item should fail minTextLength
    expect(evaluateRule({ minTextLength: 1000 }, item1)).toBe(false);
  });

  test('matches creation year', () => {
    expect(evaluateRule({ year: '2025' }, item1)).toBe(true);
    expect(evaluateRule({ year: '2024' }, item1)).toBe(false);
    expect(evaluateRule({ year: 2024 }, item2)).toBe(true);
  });

  test('matches author userIds', () => {
    expect(evaluateRule({ userIds: ['101', '999'] }, item1)).toBe(true);
    expect(evaluateRule({ userIds: ['202'] }, item1)).toBe(false);
  });

  test('matches AI classification category', () => {
    expect(
      evaluateRule(
        { category: '同人/二次创作' },
        item1,
        classificationMap,
      ),
    ).toBe(true);
    expect(
      evaluateRule(
        { category: '日常/治愈' },
        item1,
        classificationMap,
      ),
    ).toBe(false);
  });

  test('handles tag inclusion (any vs all) and exclusion', () => {
    // includeTags (any)
    expect(
      evaluateRule({ includeTags: ['Furina', 'NonExistent'] }, item1),
    ).toBe(true);
    // includeTags (all)
    expect(
      evaluateRule(
        {
          includeTags: ['Furina', 'NonExistent'],
          tagMatchMode: 'all',
        },
        item1,
      ),
    ).toBe(false);
    expect(
      evaluateRule(
        {
          includeTags: ['Furina', 'Art'],
          tagMatchMode: 'all',
        },
        item1,
      ),
    ).toBe(true);

    // excludeTags
    expect(evaluateRule({ excludeTags: ['R-18'] }, item1)).toBe(true);
    expect(evaluateRule({ excludeTags: ['furina'] }, item1)).toBe(false);
  });

  test('filterByRule filters array of items correctly', () => {
    const items = [item1, item2];
    const novels = filterByRule({ type: 'novel' }, items);
    expect(novels).toHaveLength(1);
    expect(novels[0].id).toBe('2');

    const highPopularity = filterByRule(
      { minBookmarks: 1000 },
      items,
    );
    expect(highPopularity).toHaveLength(1);
    expect(highPopularity[0].id).toBe('1');
  });
});
