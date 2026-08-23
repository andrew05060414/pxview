import {
  computeCounts,
  computeTagTop,
  computeAuthorTop,
  computeYearDist,
  computeLengthDist,
} from '../../src/common/helpers/bookmarkLibraryStats';

const item = (overrides = {}) => ({
  id: '1',
  type: 'novel',
  restrict: 'public',
  title: 't',
  tags: [],
  userId: 'u1',
  userName: 'author1',
  createDate: '2024-06-01T00:00:00+09:00',
  textLength: 0,
  ...overrides,
});

describe('bookmarkLibraryStats', () => {
  test('computeCounts splits by type and restrict', () => {
    const counts = computeCounts([
      item(),
      item({ id: '2', type: 'illust' }),
      item({ id: '3', restrict: 'private' }),
    ]);
    expect(counts).toEqual({
      total: 3,
      illusts: 1,
      novels: 2,
      public: 2,
      private: 1,
    });
  });

  test('computeTagTop sorts by count and applies limit', () => {
    const top = computeTagTop(
      [
        item({ tags: ['a', 'b'] }),
        item({ id: '2', tags: ['a'] }),
        item({ id: '3', tags: ['a', 'b'] }),
      ],
      1,
    );
    expect(top).toEqual([{ name: 'a', count: 3 }]);
  });

  test('computeAuthorTop aggregates and sorts', () => {
    const top = computeAuthorTop([
      item(),
      item({ id: '2', userId: 'u2', userName: 'zz' }),
      item({ id: '3' }),
    ]);
    expect(top[0]).toEqual({ userId: 'u1', userName: 'author1', count: 2 });
    expect(top).toHaveLength(2);
  });

  test('computeYearDist skips invalid and missing dates', () => {
    const dist = computeYearDist([
      item(),
      item({ id: '2', createDate: '2023-01-01T00:00:00+09:00' }),
      item({ id: '3', createDate: null }),
    ]);
    expect(dist).toEqual([
      { year: '2023', count: 1 },
      { year: '2024', count: 1 },
    ]);
  });

  test('computeLengthDist buckets novel lengths only', () => {
    const dist = computeLengthDist([
      item({ textLength: 500 }),
      item({ id: '2', textLength: 9999 }),
      item({ id: '3', textLength: 20000 }),
      item({ id: '4', textLength: 100000 }),
      item({ id: '5', textLength: 500000 }),
      item({ id: '6', type: 'illust' }),
    ]);
    expect(dist).toEqual({
      short: 2,
      medium: 1,
      long: 1,
      extraLong: 1,
    });
  });

  test('helpers tolerate empty input', () => {
    expect(computeCounts([])).toEqual({
      total: 0,
      illusts: 0,
      novels: 0,
      public: 0,
      private: 0,
    });
    expect(computeTagTop({})).toEqual([]);
    expect(computeAuthorTop(null)).toEqual([]);
    expect(computeYearDist({})).toEqual([]);
    expect(computeLengthDist([])).toEqual({
      short: 0,
      medium: 0,
      long: 0,
      extraLong: 0,
    });
  });
});
