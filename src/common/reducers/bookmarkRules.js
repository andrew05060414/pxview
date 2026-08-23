import { BOOKMARK_RULES } from '../constants/actionTypes';

export const DEFAULT_RULES = [
  {
    id: 'preset_long_novels',
    name: '长篇小说 (>5万字)',
    type: 'novel',
    restrict: 'all',
    minTextLength: 50000,
    maxTextLength: null,
    includeTags: [],
    excludeTags: [],
    userIds: [],
    minBookmarks: null,
    year: null,
    category: 'all',
    tagMatchMode: 'any',
  },
  {
    id: 'preset_popular',
    name: '超人气作品 (收藏>=5000)',
    type: 'all',
    restrict: 'all',
    minTextLength: null,
    maxTextLength: null,
    includeTags: [],
    excludeTags: [],
    userIds: [],
    minBookmarks: 5000,
    year: null,
    category: 'all',
    tagMatchMode: 'any',
  },
  {
    id: 'preset_private',
    name: '私有收藏',
    type: 'all',
    restrict: 'private',
    minTextLength: null,
    maxTextLength: null,
    includeTags: [],
    excludeTags: [],
    userIds: [],
    minBookmarks: null,
    year: null,
    category: 'all',
    tagMatchMode: 'any',
  },
];

const initState = {
  rules: DEFAULT_RULES,
};

export default function bookmarkRules(state = initState, action) {
  switch (action.type) {
    case BOOKMARK_RULES.ADD:
      return {
        ...state,
        rules: [...state.rules, action.payload.rule],
      };
    case BOOKMARK_RULES.EDIT: {
      const updated = action.payload.rule;
      return {
        ...state,
        rules: state.rules.map((r) =>
          r.id === updated.id ? { ...r, ...updated } : r,
        ),
      };
    }
    case BOOKMARK_RULES.REMOVE:
      return {
        ...state,
        rules: state.rules.filter((r) => r.id !== action.payload.ruleId),
      };
    case BOOKMARK_RULES.REORDER:
      return {
        ...state,
        rules: action.payload.rules,
      };
    case BOOKMARK_RULES.RESTORE:
      return {
        ...state,
        rules: action.payload.rules,
      };
    case BOOKMARK_RULES.CLEAR:
      return {
        ...state,
        rules: DEFAULT_RULES,
      };
    default:
      return state;
  }
}
