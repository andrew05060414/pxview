const CSV_COLUMNS = [
  'id',
  'type',
  'restrict',
  'title',
  'tags',
  'userId',
  'userName',
  'seriesTitle',
  'createDate',
  'totalBookmarks',
  'totalView',
  'textLength',
  'pageCount',
  'xRestrict',
];

const itemValues = (items) =>
  Array.isArray(items) ? items : Object.values(items || {});

// missing dates sort last, otherwise newest first
const sortByCreateDateDesc = (values) =>
  values.slice().sort((a, b) => {
    const ad = a.createDate || '';
    const bd = b.createDate || '';
    if (ad === bd) {
      return 0;
    }
    if (!ad) {
      return 1;
    }
    if (!bd) {
      return -1;
    }
    return ad < bd ? 1 : -1;
  });

const escapeCsvField = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const toCsvRow = (item) =>
  CSV_COLUMNS.map((column) =>
    escapeCsvField(
      column === 'tags' ? (item.tags || []).join(';') : item[column],
    ),
  ).join(',');

// BOM keeps Excel from mangling CJK text
export const toCsv = (items) => {
  const rows = [CSV_COLUMNS.join(',')];
  sortByCreateDateDesc(itemValues(items)).forEach((item) => {
    rows.push(toCsvRow(item));
  });
  return `\uFEFF${rows.join('\r\n')}`;
};

export const toJson = (items) => {
  const sorted = sortByCreateDateDesc(itemValues(items));
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      count: sorted.length,
      items: sorted,
    },
    null,
    2,
  );
};

const pad = (value) => String(value).padStart(2, '0');

export const buildExportFileName = (format, now = new Date()) =>
  `pxview-bookmarks-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate(),
  )}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(
    now.getSeconds(),
  )}.${format}`;
