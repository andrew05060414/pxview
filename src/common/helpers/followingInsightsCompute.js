// Extract a slim author record from a user_preview; lastActiveAt is the
// newest create_date among the previewed recent works (no extra requests).
export const extractAuthor = (preview, restrict) => {
  const user = (preview && preview.user) || {};
  const dates = []
    .concat(preview && preview.illusts ? preview.illusts : [])
    .concat(preview && preview.novels ? preview.novels : [])
    .map((work) => (work && work.create_date) || null)
    .filter(Boolean);
  const lastActiveAt = dates.length
    ? dates.reduce((latest, current) => (current > latest ? current : latest))
    : null;
  return {
    id: String(user.id || ''),
    name: user.name || '',
    restrict,
    lastActiveAt,
    illustCount:
      (preview && preview.profile && preview.profile.total_illusts) || 0,
    novelCount:
      (preview && preview.profile && preview.profile.total_novels) || 0,
  };
};

const authorValues = (authors) =>
  Array.isArray(authors) ? authors : Object.values(authors || {});

const toTime = (date) => {
  const time = date ? new Date(date).getTime() : NaN;
  return Number.isNaN(time) ? null : time;
};

export const sortAuthorsByActivity = (authors) =>
  authorValues(authors).sort((a, b) => {
    const at = toTime(a.lastActiveAt);
    const bt = toTime(b.lastActiveAt);
    if (at === null && bt === null) return 0;
    if (at === null) return 1;
    if (bt === null) return -1;
    return bt - at;
  });

const DAY_MS = 24 * 60 * 60 * 1000;

export const bucketByInactivity = (authors, now = new Date()) => {
  const nowTime = now.getTime();
  const buckets = {
    active: [],
    stale3m: [],
    stale1y: [],
    unknown: [],
  };
  authorValues(authors).forEach((author) => {
    const activeTime = toTime(author.lastActiveAt);
    if (activeTime === null) {
      buckets.unknown.push(author);
      return;
    }
    const days = (nowTime - activeTime) / DAY_MS;
    if (days >= 365) {
      buckets.stale1y.push(author);
    } else if (days >= 90) {
      buckets.stale3m.push(author);
    } else {
      buckets.active.push(author);
    }
  });
  return buckets;
};
