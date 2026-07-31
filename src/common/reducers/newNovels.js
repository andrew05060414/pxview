import { NEW_NOVELS } from '../constants/actionTypes';

const initState = {
  loading: false,
  loaded: false,
  refreshing: false,
  items: [],
  nextUrl: null,
};

export default function newNovels(state = initState, action) {
  switch (action.type) {
    case NEW_NOVELS.CLEAR:
      return initState;
    case NEW_NOVELS.REQUEST:
      return {
        ...state,
        loading: true,
        error: false,
        refreshing: action.payload.refreshing,
      };
    case NEW_NOVELS.SUCCESS:
      return {
        ...state,
        loading: false,
        loaded: true,
        error: false,
        refreshing: false,
        items: [...new Set([...state.items, ...action.payload.items])],
        nextUrl: action.payload.nextUrl,
        timestamp: action.payload.timestamp,
      };
    case NEW_NOVELS.FAILURE:
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
