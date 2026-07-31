import { RECOMMENDED_NOVELS } from '../constants/actionTypes';

const initState = {
  loading: false,
  loaded: false,
  refreshing: false,
  items: [],
  offset: 0,
  url: null,
  nextUrl: null,
};

export default function recommendedNovels(state = initState, action) {
  switch (action.type) {
    case RECOMMENDED_NOVELS.CLEAR:
      return initState;
    case RECOMMENDED_NOVELS.REQUEST:
      return {
        ...state,
        loading: true,
        error: false,
        refreshing: action.payload.refreshing,
        url: action.payload.url,
      };
    case RECOMMENDED_NOVELS.SUCCESS:
      return {
        ...state,
        loading: false,
        loaded: true,
        error: false,
        refreshing: false,
        items: [...new Set([...state.items, ...action.payload.items])],
        offset: action.payload.offset,
        nextUrl: action.payload.nextUrl,
        timestamp: action.payload.timestamp,
      };
    case RECOMMENDED_NOVELS.FAILURE:
      return {
        ...state,
        loading: false,
        loaded: false,
        error: true,
        refreshing: false,
      };
    default:
      return state;
  }
}
