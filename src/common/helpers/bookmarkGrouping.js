const itemValues = (items) =>
  Array.isArray(items) ? items : Object.values(items || {});

/**
 * Group library items by author (userId / userName).
 * Returns an array sorted by item count descending.
 */
export const groupByAuthor = (items) => {
  const groups = {};
  itemValues(items).forEach((item) => {
    const userId = item.userId ? String(item.userId) : 'unknown';
    if (!groups[userId]) {
      groups[userId] = {
        userId,
        userName: item.userName || `User ${userId}`,
        count: 0,
        illustCount: 0,
        novelCount: 0,
        items: [],
      };
    }
    groups[userId].count += 1;
    if (item.type === 'illust') {
      groups[userId].illustCount += 1;
    } else if (item.type === 'novel') {
      groups[userId].novelCount += 1;
    }
    groups[userId].items.push(item);
  });

  return Object.values(groups).sort(
    (a, b) => b.count - a.count || a.userName.localeCompare(b.userName),
  );
};

/**
 * Group novel items by series (seriesId / seriesTitle).
 * Returns { series: [...], standalone: [...] }
 */
export const groupBySeries = (items) => {
  const seriesMap = {};
  const standalone = [];

  itemValues(items).forEach((item) => {
    if (item.type !== 'novel') {
      return;
    }
    if (item.seriesId || item.seriesTitle) {
      const sKey = String(item.seriesId || item.seriesTitle);
      if (!seriesMap[sKey]) {
        seriesMap[sKey] = {
          seriesId: item.seriesId,
          seriesTitle: item.seriesTitle || `Series ${sKey}`,
          userId: item.userId,
          userName: item.userName,
          count: 0,
          totalLength: 0,
          items: [],
        };
      }
      seriesMap[sKey].count += 1;
      seriesMap[sKey].totalLength += item.textLength || 0;
      seriesMap[sKey].items.push(item);
    } else {
      standalone.push(item);
    }
  });

  const series = Object.values(seriesMap).sort(
    (a, b) => b.count - a.count || a.seriesTitle.localeCompare(b.seriesTitle),
  );

  return {
    series,
    standalone,
  };
};

const normalizeTitle = (title) =>
  String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[【】[\]（）()_—\-\s]+/g, '');

/**
 * Find duplicate or near-duplicate works (same author + same/similar title).
 * Returns an array of duplicate clusters: [{ key, title, userName, items }]
 */
export const findPotentialDuplicates = (items) => {
  const clusters = {};
  itemValues(items).forEach((item) => {
    const norm = normalizeTitle(item.title);
    if (!norm) return;
    const authorKey = item.userId ? String(item.userId) : item.userName || '';
    const clusterKey = `${authorKey}___${norm}`;

    if (!clusters[clusterKey]) {
      clusters[clusterKey] = {
        key: clusterKey,
        title: item.title,
        userId: item.userId,
        userName: item.userName,
        items: [],
      };
    }
    clusters[clusterKey].items.push(item);
  });

  return Object.values(clusters)
    .filter((cluster) => cluster.items.length > 1)
    .sort((a, b) => b.items.length - a.items.length);
};
