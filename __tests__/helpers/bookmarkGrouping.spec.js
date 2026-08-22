import {
  groupByAuthor,
  groupBySeries,
  findPotentialDuplicates,
} from '../../src/common/helpers/bookmarkGrouping';

describe('bookmarkGrouping', () => {
  const sampleItems = [
    {
      id: '1',
      title: 'Art 1',
      type: 'illust',
      userId: 'u1',
      userName: 'Artist 1',
    },
    {
      id: '2',
      title: 'Art 2',
      type: 'illust',
      userId: 'u1',
      userName: 'Artist 1',
    },
    {
      id: '3',
      title: 'Novel Ep 1',
      type: 'novel',
      userId: 'u1',
      userName: 'Artist 1',
      seriesId: 's1',
      seriesTitle: 'Epic Novel',
      textLength: 5000,
    },
    {
      id: '4',
      title: 'Novel Ep 2',
      type: 'novel',
      userId: 'u1',
      userName: 'Artist 1',
      seriesId: 's1',
      seriesTitle: 'Epic Novel',
      textLength: 7000,
    },
    {
      id: '5',
      title: 'Solo Story',
      type: 'novel',
      userId: 'u2',
      userName: 'Author 2',
      seriesId: null,
      seriesTitle: null,
      textLength: 3000,
    },
    {
      id: '6',
      title: 'Art 1 (Re-upload)',
      type: 'illust',
      userId: 'u1',
      userName: 'Artist 1',
    },
    {
      id: '7',
      title: 'Art 1',
      type: 'illust',
      userId: 'u1',
      userName: 'Artist 1',
    },
  ];

  describe('groupByAuthor', () => {
    test('groups items by author and calculates counts', () => {
      const groups = groupByAuthor(sampleItems);
      expect(groups).toHaveLength(2);
      expect(groups[0].userId).toBe('u1');
      expect(groups[0].count).toBe(6);
      expect(groups[0].illustCount).toBe(4);
      expect(groups[0].novelCount).toBe(2);
      expect(groups[1].userId).toBe('u2');
      expect(groups[1].count).toBe(1);
    });

    test('handles empty input gracefully', () => {
      expect(groupByAuthor([])).toEqual([]);
      expect(groupByAuthor(null)).toEqual([]);
    });
  });

  describe('groupBySeries', () => {
    test('groups novels by series and separates standalone novels', () => {
      const { series, standalone } = groupBySeries(sampleItems);
      expect(series).toHaveLength(1);
      expect(series[0].seriesId).toBe('s1');
      expect(series[0].seriesTitle).toBe('Epic Novel');
      expect(series[0].count).toBe(2);
      expect(series[0].totalLength).toBe(12000);
      expect(standalone).toHaveLength(1);
      expect(standalone[0].id).toBe('5');
    });

    test('ignores non-novel items in series grouping', () => {
      const illustOnly = [
        { id: '1', type: 'illust', title: 'A' },
        { id: '2', type: 'illust', title: 'B' },
      ];
      const result = groupBySeries(illustOnly);
      expect(result.series).toHaveLength(0);
      expect(result.standalone).toHaveLength(0);
    });
  });

  describe('findPotentialDuplicates', () => {
    test('detects duplicate works by same author with identical or bracketed title', () => {
      const duplicates = findPotentialDuplicates(sampleItems);
      expect(duplicates.length).toBeGreaterThanOrEqual(1);
      const art1Cluster = duplicates.find((d) => d.title === 'Art 1');
      expect(art1Cluster).toBeDefined();
      expect(art1Cluster.items.map((i) => i.id)).toEqual(['1', '7']);
    });

    test('returns empty array when no duplicates exist', () => {
      const distinct = [
        { id: '1', title: 'Alpha', userId: 'u1' },
        { id: '2', title: 'Beta', userId: 'u1' },
        { id: '3', title: 'Alpha', userId: 'u2' },
      ];
      expect(findPotentialDuplicates(distinct)).toEqual([]);
    });
  });
});
