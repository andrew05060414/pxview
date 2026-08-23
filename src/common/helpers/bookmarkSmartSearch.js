const itemValues = (items) =>
  Array.isArray(items) ? items : Object.values(items || {});

/**
 * Local multi-attribute and keyword search engine for bookmarks.
 * Supports:
 * - keywords (AND / partial match)
 * - negative keywords (e.g., -r18)
 * - type ('all', 'illust', 'novel')
 * - restrict ('all', 'public', 'private')
 * - minBookmarks, maxBookmarks
 * - minLength, maxLength (for novels)
 * - year
 * - category (AI classification)
 * - sort ('newest', 'oldest', 'popularity', 'length')
 */
export const searchBookmarksLocally = (
  items,
  query = '',
  options = {},
  classificationMap = {},
) => {
  const values = itemValues(items);
  const trimmed = String(query || '').trim();

  // Extract positive and negative terms
  const terms = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
  const positiveTerms = [];
  const negativeTerms = [];

  terms.forEach((t) => {
    if (t.startsWith('-') && t.length > 1) {
      negativeTerms.push(t.slice(1).toLowerCase());
    } else {
      positiveTerms.push(t.toLowerCase());
    }
  });

  const filtered = values.filter((item) => {
    // Type filter
    if (options.type && options.type !== 'all' && item.type !== options.type) {
      return false;
    }

    // Restrict filter
    if (
      options.restrict &&
      options.restrict !== 'all' &&
      item.restrict !== options.restrict
    ) {
      return false;
    }

    // Bookmarks threshold
    if (
      typeof options.minBookmarks === 'number' &&
      (item.totalBookmarks || 0) < options.minBookmarks
    ) {
      return false;
    }
    if (
      typeof options.maxBookmarks === 'number' &&
      (item.totalBookmarks || 0) > options.maxBookmarks
    ) {
      return false;
    }

    // Novel text length
    if (typeof options.minTextLength === 'number') {
      if (
        item.type !== 'novel' ||
        (item.textLength || 0) < options.minTextLength
      ) {
        return false;
      }
    }
    if (typeof options.maxTextLength === 'number') {
      if (
        item.type !== 'novel' ||
        (item.textLength || 0) > options.maxTextLength
      ) {
        return false;
      }
    }

    // Year filter
    if (options.year) {
      const itemYear = String(item.createDate || '').slice(0, 4);
      if (itemYear !== String(options.year)) {
        return false;
      }
    }

    // AI Category filter
    if (options.category && options.category !== 'all') {
      const itemCat = classificationMap[String(item.id)];
      if (itemCat !== options.category) {
        return false;
      }
    }

    // Construct searchable text haystack
    const haystack = [
      item.title || '',
      item.userName || '',
      item.seriesTitle || '',
      ...(item.tags || []),
    ]
      .join(' ')
      .toLowerCase();

    // Check negative terms
    for (let i = 0; i < negativeTerms.length; i += 1) {
      if (haystack.includes(negativeTerms[i])) {
        return false;
      }
    }

    // Check positive terms (ALL must match)
    for (let i = 0; i < positiveTerms.length; i += 1) {
      if (!haystack.includes(positiveTerms[i])) {
        return false;
      }
    }

    return true;
  });

  // Sorting
  const sort = options.sort || 'newest';
  return filtered.sort((a, b) => {
    if (sort === 'popularity') {
      return (b.totalBookmarks || 0) - (a.totalBookmarks || 0);
    }
    if (sort === 'length') {
      return (b.textLength || 0) - (a.textLength || 0);
    }
    if (sort === 'oldest') {
      const ad = a.createDate || '';
      const bd = b.createDate || '';
      return ad.localeCompare(bd);
    }
    // newest (default)
    const ad = a.createDate || '';
    const bd = b.createDate || '';
    return bd.localeCompare(ad);
  });
};

/**
 * Prompt builder for LLM natural language search conversion.
 */
export const buildNaturalLanguageSearchPrompt = (
  userQuery,
  categories = [],
) => [
  {
    role: 'system',
    content: `You translate natural language search queries for a Pixiv bookmark library into a JSON filter.
Categories available: ${categories.join(', ')}.
Respond ONLY with a JSON object with any of these optional fields:
{
  "query": "text search keywords",
  "type": "all" | "illust" | "novel",
  "restrict": "all" | "public" | "private",
  "minBookmarks": number,
  "minTextLength": number,
  "maxTextLength": number,
  "year": number,
  "category": "category name",
  "sort": "newest" | "oldest" | "popularity" | "length"
}`,
  },
  {
    role: 'user',
    content: String(userQuery || ''),
  },
];
