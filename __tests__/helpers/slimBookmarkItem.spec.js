import slimBookmarkItem from '../../src/common/helpers/slimBookmarkItem';

const illust = {
  id: 123,
  title: 'タイトル, with "quotes"',
  tags: [{ name: '風景' }, { name: null }, {}, { name: 'オリジナル' }],
  user: { id: 45, name: 'author' },
  series: { id: 9, title: '系列' },
  create_date: '2024-05-01T00:00:00+09:00',
  total_bookmarks: 1500,
  total_view: 30000,
  page_count: 3,
  x_restrict: 1,
  visible: true,
};

const novel = {
  id: '789',
  title: 'novel',
  tags: [{ name: '小説' }],
  user: { id: 45, name: 'author' },
  create_date: null,
  total_bookmarks: 10,
  total_view: 100,
  text_length: 25000,
  page_count: 5,
};

describe('slimBookmarkItem', () => {
  test('maps illust fields to slim contract', () => {
    const slim = slimBookmarkItem(illust, 'illust', 'private');
    expect(slim).toEqual({
      id: '123',
      type: 'illust',
      restrict: 'private',
      title: 'タイトル, with "quotes"',
      tags: ['風景', 'オリジナル'],
      userId: '45',
      userName: 'author',
      seriesId: '9',
      seriesTitle: '系列',
      createDate: '2024-05-01T00:00:00+09:00',
      totalBookmarks: 1500,
      totalView: 30000,
      textLength: null,
      pageCount: 3,
      xRestrict: 1,
    });
  });

  test('maps novel fields and text length', () => {
    const slim = slimBookmarkItem(novel, 'novel', 'public');
    expect(slim.type).toBe('novel');
    expect(slim.textLength).toBe(25000);
    expect(slim.id).toBe('789');
  });

  test('tolerates missing optional fields', () => {
    const slim = slimBookmarkItem(
      { id: 1, title: null, tags: null },
      'novel',
      'public',
    );
    expect(slim.title).toBe('');
    expect(slim.tags).toEqual([]);
    expect(slim.userId).toBe('');
    expect(slim.seriesId).toBeNull();
    expect(slim.createDate).toBeNull();
    expect(slim.totalBookmarks).toBe(0);
    expect(slim.pageCount).toBe(1);
  });
});
