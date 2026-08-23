import {
  toCsv,
  toJson,
  buildExportFileName,
} from '../../src/common/helpers/bookmarkExport';

const item = (overrides = {}) => ({
  id: '1',
  type: 'novel',
  restrict: 'public',
  title: 'plain',
  tags: ['a', 'b'],
  userId: 'u1',
  userName: '作者',
  seriesId: null,
  seriesTitle: null,
  createDate: '2024-01-01T00:00:00+09:00',
  totalBookmarks: 5,
  totalView: 10,
  textLength: 100,
  pageCount: 1,
  xRestrict: 0,
  ...overrides,
});

describe('bookmarkExport', () => {
  test('csv prepends BOM and joins tags with semicolons', () => {
    const csv = toCsv([item()]);
    const lines = csv.split('\r\n');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lines[0].replace(/^\uFEFF/, '')).toBe(
      'id,type,restrict,title,tags,userId,userName,seriesTitle,createDate,totalBookmarks,totalView,textLength,pageCount,xRestrict',
    );
    expect(lines[1]).toBe(
      '1,novel,public,plain,a;b,u1,作者,,2024-01-01T00:00:00+09:00,5,10,100,1,0',
    );
  });

  test('csv escapes commas, quotes and newlines', () => {
    const csv = toCsv([
      item({ id: '2', title: 'has,comma' }),
      item({ id: '3', title: 'has "quote" and\nnewline' }),
    ]);
    const lines = csv.split('\r\n');
    expect(lines[1]).toContain('"has,comma"');
    expect(lines[2]).toContain('"has ""quote"" and\nnewline"');
  });

  test('csv sorts by createDate descending with missing dates last', () => {
    const csv = toCsv([
      item({ id: 'old', createDate: '2020-01-01T00:00:00+09:00' }),
      item({ id: 'new', createDate: '2025-01-01T00:00:00+09:00' }),
      item({ id: 'nodate', createDate: null }),
    ]);
    const lines = csv.split('\r\n');
    expect(lines[1].startsWith('new,')).toBe(true);
    expect(lines[2].startsWith('old,')).toBe(true);
    expect(lines[3].startsWith('nodate,')).toBe(true);
  });

  test('json wraps items with metadata', () => {
    const json = toJson([item({ id: '9' })]);
    const parsed = JSON.parse(json);
    expect(parsed.count).toBe(1);
    expect(parsed.items[0].id).toBe('9');
    expect(typeof parsed.exportedAt).toBe('string');
  });

  test('file names are zero padded', () => {
    expect(buildExportFileName('csv', new Date(2026, 7, 22, 1, 2, 3))).toBe(
      'pxview-bookmarks-20260822-010203.csv',
    );
  });

  test('tolerates empty library', () => {
    expect(toCsv({}).split('\r\n')).toHaveLength(1);
    expect(JSON.parse(toJson(null)).count).toBe(0);
  });
});
