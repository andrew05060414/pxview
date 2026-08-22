/* eslint-disable camelcase */

const EXCLUDE_KEYWORDS_SEPARATORS = /[\s,,、]+/;

// 'hide'/'only'/'all' filter values <-> Pixiv search_ai_type API values.
export const mapAiTypeToSearchAiType = (aiType) => {
  if (aiType === 'hide') {
    return '0';
  }
  if (aiType === 'only') {
    return '1';
  }
  return null;
};

export const mapSearchAiTypeToAiType = (searchAiType) => {
  if (searchAiType === '0' || searchAiType === 0) {
    return 'hide';
  }
  if (searchAiType === '1' || searchAiType === 1) {
    return 'only';
  }
  return 'all';
};

// Local-only option keys that must not be sent to the Pixiv API.
const LOCAL_ONLY_SEARCH_OPTION_KEYS = [
  'bookmarkCountsTag',
  'excludeKeywords',
  'minBookmarks',
];

export const parseExcludeKeywords = (excludeKeywords) =>
  (excludeKeywords || '')
    .split(EXCLUDE_KEYWORDS_SEPARATORS)
    .filter((keyword) => keyword.length > 0);

export const buildSearchWord = (word, options, { isNovel = false } = {}) => {
  let searchWord = word;
  const countsTag = options?.bookmarkCountsTag;
  if (countsTag) {
    searchWord = isNovel ? `${word} 小説${countsTag}` : `${word} ${countsTag}`;
  }
  const excludeKeywords = parseExcludeKeywords(options?.excludeKeywords);
  if (excludeKeywords.length) {
    const exclusion = excludeKeywords.map((keyword) => `-${keyword}`).join(' ');
    searchWord = `${searchWord} ${exclusion}`;
  }
  return searchWord;
};

export const stripLocalSearchOptions = (options) => {
  if (!options) {
    return options;
  }
  const apiOptions = { ...options };
  LOCAL_ONLY_SEARCH_OPTION_KEYS.forEach((key) => {
    delete apiOptions[key];
  });
  return apiOptions;
};

// Free accounts only get the first ~30 popular-preview results with no
// next_url; append the first page of the regular (date_desc) search so the
// merged result keeps paging via next_url.
export const mergeSearchResponses = (
  previewResponse,
  regularResponse,
  itemsKey,
) => {
  const seenIds = new Set();
  const mergedItems = [];
  [previewResponse?.[itemsKey], regularResponse?.[itemsKey]].forEach(
    (items) => {
      (items || []).forEach((item) => {
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          mergedItems.push(item);
        }
      });
    },
  );
  return {
    ...regularResponse,
    [itemsKey]: mergedItems,
    next_url: regularResponse?.next_url,
  };
};

export const filterItemsByMinBookmarks = (items, minBookmarks) => {
  const min = Number(minBookmarks);
  if (!min || !items || !items.length) {
    return items;
  }
  return items.filter((item) => (item.total_bookmarks || 0) >= min);
};
