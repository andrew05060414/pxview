import { BOOKMARK_RULES } from '../constants/actionTypes';

export function addBookmarkRule(rule) {
  return {
    type: BOOKMARK_RULES.ADD,
    payload: {
      rule: {
        id:
          rule.id ||
          `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: rule.name || '未命名规则',
        type: rule.type || 'all',
        restrict: rule.restrict || 'all',
        includeTags: rule.includeTags || [],
        excludeTags: rule.excludeTags || [],
        userIds: rule.userIds || [],
        minBookmarks:
          typeof rule.minBookmarks === 'number' ? rule.minBookmarks : null,
        minTextLength:
          typeof rule.minTextLength === 'number' ? rule.minTextLength : null,
        maxTextLength:
          typeof rule.maxTextLength === 'number' ? rule.maxTextLength : null,
        year: rule.year || null,
        category: rule.category || 'all',
        tagMatchMode: rule.tagMatchMode || 'any',
        ...rule,
      },
    },
  };
}

export function editBookmarkRule(rule) {
  return {
    type: BOOKMARK_RULES.EDIT,
    payload: {
      rule,
    },
  };
}

export function removeBookmarkRule(ruleId) {
  return {
    type: BOOKMARK_RULES.REMOVE,
    payload: {
      ruleId,
    },
  };
}

export function reorderBookmarkRules(rules) {
  return {
    type: BOOKMARK_RULES.REORDER,
    payload: {
      rules,
    },
  };
}

export function restoreBookmarkRules(rules) {
  return {
    type: BOOKMARK_RULES.RESTORE,
    payload: {
      rules,
    },
  };
}

export function clearBookmarkRules() {
  return {
    type: BOOKMARK_RULES.CLEAR,
  };
}
