export const getBookmarkItemKey = (item) => {
  if (!item || item.id == null) {
    return '';
  }
  const id = String(item.id);
  if (item.type === 'illust' || item.type === 'novel') {
    return `${item.type}:${id}`;
  }
  return item.type ? `${item.type}:${id}` : id;
};

export const normalizeBookmarkItems = (items) => {
  if (!items || typeof items !== 'object') {
    return {};
  }
  const normalized = {};
  Object.entries(items).forEach(([key, item]) => {
    if (!item || typeof item !== 'object') {
      return;
    }
    const compositeKey = getBookmarkItemKey(item) || key;
    normalized[compositeKey] = item;
  });
  return normalized;
};

const hasAmbiguousNumericKey = (bookmarkItems, rawId) => {
  if (!bookmarkItems || typeof bookmarkItems !== 'object') {
    return false;
  }
  if (Array.isArray(bookmarkItems)) {
    let seenIllust = false;
    let seenNovel = false;
    bookmarkItems.forEach((entry) => {
      if (entry && String(entry.id) === rawId) {
        if (entry.type === 'illust') seenIllust = true;
        if (entry.type === 'novel') seenNovel = true;
      }
    });
    return seenIllust && seenNovel;
  }
  return Boolean(
    bookmarkItems[`illust:${rawId}`] && bookmarkItems[`novel:${rawId}`],
  );
};

export const migrateLegacyClassificationMap = (
  classificationMap,
  bookmarkItems,
) => {
  if (!classificationMap || typeof classificationMap !== 'object') {
    return {};
  }
  const normalizedBookmarks = normalizeBookmarkItems(bookmarkItems);
  const normalized = {};

  // First pass: preserve all composite type:id entries so stale numeric keys never overwrite them
  Object.entries(classificationMap).forEach(([key, category]) => {
    if (category && key.includes(':')) {
      normalized[key] = category;
    }
  });

  // Second pass: migrate unambiguous legacy numeric keys using normalized composite bookmark items
  Object.entries(classificationMap).forEach(([key, category]) => {
    if (!category || key.includes(':')) {
      return;
    }
    const hasIllust = Boolean(normalizedBookmarks[`illust:${key}`]);
    const hasNovel = Boolean(normalizedBookmarks[`novel:${key}`]);
    if (hasIllust && hasNovel) {
      return;
    }
    const targetKey = hasIllust
      ? `illust:${key}`
      : hasNovel
        ? `novel:${key}`
        : key;
    if (normalized[targetKey] === undefined) {
      normalized[targetKey] = category;
    }
  });

  return normalized;
};

export const getClassificationForItem = (
  classificationMap,
  item,
  bookmarkItems = null,
) => {
  if (!classificationMap || !item) {
    return undefined;
  }
  const compositeKey = getBookmarkItemKey(item);
  if (compositeKey && classificationMap[compositeKey] !== undefined) {
    return classificationMap[compositeKey];
  }
  if (item.id != null) {
    const rawId = String(item.id);
    if (hasAmbiguousNumericKey(bookmarkItems, rawId)) {
      return undefined;
    }
    return classificationMap[rawId];
  }
  return undefined;
};
