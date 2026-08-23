import { CLASSIFICATIONS } from '../constants/actionTypes';

export const DEFAULT_CATEGORIES = [
  '日常/治愈',
  '恋爱/纯爱',
  '战斗/热血',
  '奇幻/异世界',
  '同人/二次创作',
  '风景/背景',
  '其他',
];

const initState = {
  categories: DEFAULT_CATEGORIES,
  items: {},
  classifying: false,
  progress: {
    done: 0,
    total: 0,
  },
  lastClassifiedAt: null,
  error: null,
};

const mergeResults = (items, results) => {
  const nextItems = { ...items };
  (results || []).forEach((res) => {
    if (res && res.id && res.category) {
      nextItems[String(res.id)] = String(res.category);
    }
  });
  return nextItems;
};

export default function classifications(state = initState, action) {
  switch (action.type) {
    case CLASSIFICATIONS.SET_CATEGORIES:
      return {
        ...state,
        categories: action.payload.categories,
      };
    case CLASSIFICATIONS.CLASSIFY_START:
      return {
        ...state,
        classifying: true,
        progress: {
          done: 0,
          total: 0,
        },
        error: null,
      };
    case CLASSIFICATIONS.CLASSIFY_STOP:
      return {
        ...state,
        classifying: false,
      };
    case CLASSIFICATIONS.CLASSIFY_PROGRESS:
      return {
        ...state,
        progress: {
          done: action.payload.done,
          total: action.payload.total,
        },
      };
    case CLASSIFICATIONS.CLASSIFY_BATCH:
      return {
        ...state,
        items: mergeResults(state.items, action.payload.results),
      };
    case CLASSIFICATIONS.CLASSIFY_SUCCESS:
      return {
        ...state,
        classifying: false,
        lastClassifiedAt: action.payload.timestamp,
        error: null,
      };
    case CLASSIFICATIONS.CLASSIFY_FAILURE:
      return {
        ...state,
        classifying: false,
        error: action.payload.error,
      };
    case CLASSIFICATIONS.CLEAR:
      return {
        ...initState,
        categories: state.categories,
      };
    default:
      return state;
  }
}
