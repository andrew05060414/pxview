const slimTags = (tags) =>
  (tags || [])
    .map((tag) => (tag && tag.name) || '')
    .filter((name) => name.length > 0);

// Keep only the fields the local library needs; full illust/novel objects
// are too large to persist for thousands of bookmarks.
const slimBookmarkItem = (item, type, restrict) => ({
  id: String(item.id),
  type,
  restrict,
  title: item.title || '',
  tags: slimTags(item.tags),
  userId: String((item.user && item.user.id) || ''),
  userName: (item.user && item.user.name) || '',
  seriesId: item.series && item.series.id ? String(item.series.id) : null,
  seriesTitle: (item.series && item.series.title) || null,
  createDate: item.create_date || null,
  totalBookmarks: item.total_bookmarks || 0,
  totalView: item.total_view || 0,
  textLength: type === 'novel' ? item.text_length || 0 : null,
  pageCount: item.page_count || 1,
  xRestrict: item.x_restrict || 0,
});

export default slimBookmarkItem;
