import { READING_PROGRESS } from '../constants/actionTypes';

export default function readingProgress(state = {}, action) {
  switch (action.type) {
    case READING_PROGRESS.SET:
      return {
        ...state,
        [action.payload.novelId]: {
          pageIndex: action.payload.pageIndex,
        },
      };
    case READING_PROGRESS.CLEAR:
      return {
        ...state,
        [action.payload.novelId]: undefined,
      };
    default:
      return state;
  }
}
