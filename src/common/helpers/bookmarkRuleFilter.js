const itemValues = (items) =>
  Array.isArray(items) ? items : Object.values(items || {});

/**
 * Evaluate if a single bookmark item satisfies a given rule.
 *
 * @param {Object} rule - The rule definition.
 * @param {Object} item - The slim bookmark item.
 * @param {Object} [classificationMap={}] - Mapping from itemId -> AI category.
 * @returns {boolean} True if the item matches the rule.
 */
export const evaluateRule = (rule, item, classificationMap = {}) => {
  if (!rule || !item) {
    return false;
  }

  // Filter by item type ('all', 'illust', 'novel')
  if (rule.type && rule.type !== 'all' && item.type !== rule.type) {
    return false;
  }

  // Filter by restrict ('all', 'public', 'private')
  if (
    rule.restrict &&
    rule.restrict !== 'all' &&
    item.restrict !== rule.restrict
  ) {
    return false;
  }

  // Filter by minBookmarks
  if (
    typeof rule.minBookmarks === 'number' &&
    (item.totalBookmarks || 0) < rule.minBookmarks
  ) {
    return false;
  }

  // Filter by novel text length
  if (typeof rule.minTextLength === 'number') {
    if (item.type !== 'novel' || (item.textLength || 0) < rule.minTextLength) {
      return false;
    }
  }
  if (typeof rule.maxTextLength === 'number') {
    if (item.type !== 'novel' || (item.textLength || 0) > rule.maxTextLength) {
      return false;
    }
  }

  // Filter by create year
  if (rule.year) {
    const itemYear = String(item.createDate || '').slice(0, 4);
    if (itemYear !== String(rule.year)) {
      return false;
    }
  }

  // Filter by specific userIds
  if (Array.isArray(rule.userIds) && rule.userIds.length > 0) {
    const stringUserIds = rule.userIds.map(String);
    if (!stringUserIds.includes(String(item.userId))) {
      return false;
    }
  }

  // Filter by AI category
  if (rule.category && rule.category !== 'all') {
    const itemCat = classificationMap[String(item.id)];
    if (itemCat !== rule.category) {
      return false;
    }
  }

  const itemTags = (item.tags || []).map((t) => String(t).toLowerCase());

  // Filter by excludeTags
  if (Array.isArray(rule.excludeTags) && rule.excludeTags.length > 0) {
    const hasExcluded = rule.excludeTags.some((tag) =>
      itemTags.includes(String(tag).toLowerCase()),
    );
    if (hasExcluded) {
      return false;
    }
  }

  // Filter by includeTags
  if (Array.isArray(rule.includeTags) && rule.includeTags.length > 0) {
    const mode = rule.tagMatchMode || 'any'; // 'any' or 'all'
    if (mode === 'all') {
      const hasAll = rule.includeTags.every((tag) =>
        itemTags.includes(String(tag).toLowerCase()),
      );
      if (!hasAll) {
        return false;
      }
    } else {
      const hasAny = rule.includeTags.some((tag) =>
        itemTags.includes(String(tag).toLowerCase()),
      );
      if (!hasAny) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Filter an array/dictionary of bookmark items by a rule.
 *
 * @param {Object} rule
 * @param {Array|Object} items
 * @param {Object} [classificationMap={}]
 * @returns {Array} Matching items.
 */
export const filterByRule = (rule, items, classificationMap = {}) =>
  itemValues(items).filter((item) =>
    evaluateRule(rule, item, classificationMap),
  );
