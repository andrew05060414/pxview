const itemValues = (items) =>
  Array.isArray(items) ? items : Object.values(items || {});

/**
 * Build a structured Taste Profile from the local bookmark library.
 *
 * @param {Array|Object} items - Slim bookmark items.
 * @param {Object} [classificationMap={}] - Mapping from itemId -> AI category.
 * @returns {Object} Taste profile containing tag weights, top authors, type ratios, and categories.
 */
export const buildTasteProfile = (items, classificationMap = {}) => {
  const values = itemValues(items);
  const total = values.length;

  if (total === 0) {
    return {
      total: 0,
      tagWeights: {},
      authorWeights: {},
      typeRatio: { illust: 0, novel: 0 },
      topCategories: {},
      preferredLength: { min: 0, max: 0, avg: 0 },
    };
  }

  const tagCounts = {};
  const authorCounts = {};
  const catCounts = {};
  let illustCount = 0;
  let novelCount = 0;
  let totalLength = 0;
  let novelWithLengthCount = 0;

  values.forEach((item) => {
    // Type
    if (item.type === 'illust') illustCount += 1;
    if (item.type === 'novel') {
      novelCount += 1;
      if (item.textLength) {
        totalLength += item.textLength;
        novelWithLengthCount += 1;
      }
    }

    // Tags
    (item.tags || []).forEach((tag) => {
      const lower = String(tag).toLowerCase().trim();
      if (lower) {
        tagCounts[lower] = (tagCounts[lower] || 0) + 1;
      }
    });

    // Author
    if (item.userId) {
      const uKey = String(item.userId);
      authorCounts[uKey] = (authorCounts[uKey] || 0) + 1;
    }

    // Category
    const cat = classificationMap[String(item.id)];
    if (cat) {
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
  });

  // Calculate normalized tag weights (frequency / total)
  const tagWeights = {};
  Object.entries(tagCounts).forEach(([tag, count]) => {
    tagWeights[tag] = Number((count / total).toFixed(4));
  });

  // Calculate normalized author weights
  const authorWeights = {};
  Object.entries(authorCounts).forEach(([authorId, count]) => {
    authorWeights[authorId] = Number((count / total).toFixed(4));
  });

  const avgLength =
    novelWithLengthCount > 0
      ? Math.round(totalLength / novelWithLengthCount)
      : 0;

  return {
    total,
    tagWeights,
    authorWeights,
    typeRatio: {
      illust: Number((illustCount / total).toFixed(2)),
      novel: Number((novelCount / total).toFixed(2)),
    },
    topCategories: catCounts,
    preferredLength: {
      avg: avgLength,
    },
  };
};

/**
 * Score an individual item against the user's taste profile.
 *
 * @param {Object} item - An illust or novel item (can be from recommend or search).
 * @param {Object} tasteProfile - The computed taste profile.
 * @param {Array} [muteTags=[]] - List of muted tags.
 * @returns {number} Score >= 0 (or -1 if muted).
 */
export const scoreItemByTaste = (item, tasteProfile, muteTags = []) => {
  if (!item || !tasteProfile || tasteProfile.total === 0) {
    return 0;
  }

  const itemTags = (item.tags || [])
    .map((t) => {
      if (typeof t === 'string') return t.toLowerCase().trim();
      if (t && typeof t.name === 'string') return t.name.toLowerCase().trim();
      return '';
    })
    .filter(Boolean);

  // Mute check
  const lowerMutes = (muteTags || []).map((t) =>
    String(t).toLowerCase().trim(),
  );
  const isMuted = itemTags.some((tag) => lowerMutes.includes(tag));
  if (isMuted) {
    return -1;
  }

  let score = 0;

  // Tag weight match
  itemTags.forEach((tag) => {
    if (tasteProfile.tagWeights[tag]) {
      score += tasteProfile.tagWeights[tag] * 10;
    }
  });

  // Author match
  const authorId = item.userId || (item.user && item.user.id);
  if (authorId && tasteProfile.authorWeights[String(authorId)]) {
    score += tasteProfile.authorWeights[String(authorId)] * 20;
  }

  // Popularity dampener / bonus
  const bookmarks = item.total_bookmarks || item.totalBookmarks || 0;
  if (bookmarks > 1000) {
    score += Math.min(Math.log10(bookmarks), 5);
  }

  return Number(score.toFixed(2));
};

/**
 * Rank a list of candidate items by taste profile score.
 */
export const rankItemsByTaste = (items, tasteProfile, muteTags = []) => {
  const values = itemValues(items);
  const scored = values.map((item) => ({
    item,
    score: scoreItemByTaste(item, tasteProfile, muteTags),
  }));

  return scored
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item);
};

/**
 * Build LLM prompt for generating taste analysis / personal reading persona summary.
 */
export const buildTasteSummaryPrompt = (tasteProfile) => {
  const topTags = Object.entries(tasteProfile.tagWeights || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag, w]) => `${tag} (${(w * 100).toFixed(1)}%)`)
    .join(', ');

  const topCats = Object.entries(tasteProfile.topCategories || {})
    .sort(([, a], [, b]) => b - a)
    .map(([cat, count]) => `${cat} (${count}件)`)
    .join(', ');

  return [
    {
      role: 'system',
      content:
        '你是一位专业的二次元审美与同人小说/插画鉴赏分析师。请根据用户的 Pixiv 收藏统计数据，生成一段生动、精准、有洞察力的“个人口味画像与鉴赏风格总结”，包含审美偏好、题材倾向与阅读特点，字数在150-300字之间。',
    },
    {
      role: 'user',
      content: `我的收藏总数: ${tasteProfile.total}
插画/小说占比: 插画 ${(tasteProfile.typeRatio.illust * 100).toFixed(
        0,
      )}%, 小说 ${(tasteProfile.typeRatio.novel * 100).toFixed(0)}%
偏好热门标签: ${topTags || '暂无'}
偏好分类: ${topCats || '暂无'}
小说平均篇幅: ${tasteProfile.preferredLength.avg} 字`,
    },
  ];
};
