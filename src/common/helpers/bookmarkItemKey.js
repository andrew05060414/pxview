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

export const getClassificationForItem = (classificationMap, item) => {
  if (!classificationMap || !item) {
    return undefined;
  }
  const compositeKey = getBookmarkItemKey(item);
  if (compositeKey && classificationMap[compositeKey] !== undefined) {
    return classificationMap[compositeKey];
  }
  if (item.id != null) {
    return classificationMap[String(item.id)];
  }
  return undefined;
};
