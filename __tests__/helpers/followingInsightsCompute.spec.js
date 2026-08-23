import {
  extractAuthor,
  sortAuthorsByActivity,
  bucketByInactivity,
} from '../../src/common/helpers/followingInsightsCompute';

describe('followingInsightsCompute', () => {
  describe('extractAuthor', () => {
    test('extracts author id, name, counts and newest create_date', () => {
      const preview = {
        user: { id: 12345, name: 'Artist A' },
        profile: { total_illusts: 10, total_novels: 2 },
        illusts: [
          { create_date: '2023-01-01T00:00:00+09:00' },
          { create_date: '2023-06-01T00:00:00+09:00' },
        ],
        novels: [{ create_date: '2023-03-01T00:00:00+09:00' }],
      };
      const author = extractAuthor(preview, 'public');
      expect(author).toEqual({
        id: '12345',
        name: 'Artist A',
        restrict: 'public',
        lastActiveAt: '2023-06-01T00:00:00+09:00',
        illustCount: 10,
        novelCount: 2,
      });
    });

    test('handles empty preview and missing works gracefully', () => {
      const author = extractAuthor({}, 'private');
      expect(author).toEqual({
        id: '',
        name: '',
        restrict: 'private',
        lastActiveAt: null,
        illustCount: 0,
        novelCount: 0,
      });
    });
  });

  describe('sortAuthorsByActivity', () => {
    test('sorts authors by newest lastActiveAt descending, nulls at end', () => {
      const authors = [
        { id: '1', lastActiveAt: '2022-01-01T00:00:00Z' },
        { id: '2', lastActiveAt: null },
        { id: '3', lastActiveAt: '2024-01-01T00:00:00Z' },
        { id: '4', lastActiveAt: '2023-01-01T00:00:00Z' },
      ];
      const sorted = sortAuthorsByActivity(authors);
      expect(sorted.map((a) => a.id)).toEqual(['3', '4', '1', '2']);
    });
  });

  describe('bucketByInactivity', () => {
    test('buckets into active (<90d), stale3m (90d-1y), stale1y (>=1y), unknown (null)', () => {
      const now = new Date('2026-08-22T00:00:00Z');
      const authors = {
        a1: { id: 'a1', lastActiveAt: '2026-07-01T00:00:00Z' }, // ~52 days: active
        a2: { id: 'a2', lastActiveAt: '2026-01-01T00:00:00Z' }, // ~233 days: stale3m
        a3: { id: 'a3', lastActiveAt: '2024-01-01T00:00:00Z' }, // ~964 days: stale1y
        a4: { id: 'a4', lastActiveAt: null }, // unknown
      };
      const buckets = bucketByInactivity(authors, now);
      expect(buckets.active.map((a) => a.id)).toEqual(['a1']);
      expect(buckets.stale3m.map((a) => a.id)).toEqual(['a2']);
      expect(buckets.stale1y.map((a) => a.id)).toEqual(['a3']);
      expect(buckets.unknown.map((a) => a.id)).toEqual(['a4']);
    });
  });
});
