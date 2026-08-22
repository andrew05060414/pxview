const itemValues = (items) =>
  Array.isArray(items) ? items : Object.values(items || {});

export const computeCounts = (items) => {
  const values = itemValues(items);
  return {
    total: values.length,
    illusts: values.filter((item) => item.type === 'illust').length,
    novels: values.filter((item) => item.type === 'novel').length,
    public: values.filter((item) => item.restrict === 'public').length,
    private: values.filter((item) => item.restrict === 'private').length,
  };
};

export const computeTagTop = (items, limit = 20) => {
  const counts = {};
  itemValues(items).forEach((item) => {
    (item.tags || []).forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
};

export const computeAuthorTop = (items, limit = 20) => {
  const authors = {};
  itemValues(items).forEach((item) => {
    if (!item.userId) {
      return;
    }
    authors[item.userId] = authors[item.userId] || {
      userId: item.userId,
      userName: item.userName || '',
      count: 0,
    };
    authors[item.userId].count += 1;
  });
  return Object.values(authors)
    .sort((a, b) => b.count - a.count || a.userName.localeCompare(b.userName))
    .slice(0, limit);
};

export const computeYearDist = (items) => {
  const counts = {};
  itemValues(items).forEach((item) => {
    if (!item.createDate) {
      return;
    }
    const year = String(item.createDate).slice(0, 4);
    if (/^\d{4}$/.test(year)) {
      counts[year] = (counts[year] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, count]) => ({ year, count }));
};

const LENGTH_BUCKETS = [
  { key: 'short', max: 10000 },
  { key: 'medium', max: 50000 },
  { key: 'long', max: 200000 },
  { key: 'extraLong', max: Infinity },
];

export const computeLengthDist = (items) => {
  const dist = {
    short: 0,
    medium: 0,
    long: 0,
    extraLong: 0,
  };
  itemValues(items).forEach((item) => {
    if (item.type !== 'novel') {
      return;
    }
    const length = item.textLength || 0;
    const bucket = LENGTH_BUCKETS.find((b) => length < b.max);
    dist[bucket.key] += 1;
  });
  return dist;
};
