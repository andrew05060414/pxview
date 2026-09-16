import { NOVEL_RANKING_SETTINGS } from '../constants/actionTypes';
import { NOVEL_RANKING_LANGUAGES } from '../constants';

const initState = {
  // null means that the user has not chosen a preference. The UI resolves it
  // to Simplified Chinese for the male novel ranking.
  language: null,
};

const validLanguages = [null, ...Object.values(NOVEL_RANKING_LANGUAGES)];

export default function novelRankingSettings(state = initState, action) {
  switch (action.type) {
    case NOVEL_RANKING_SETTINGS.SET:
      return validLanguages.includes(action.payload.language)
        ? {
            ...state,
            language: action.payload.language,
          }
        : state;
    case NOVEL_RANKING_SETTINGS.RESTORE:
      return validLanguages.includes(action.payload.state?.language)
        ? {
            ...state,
            language: action.payload.state.language,
          }
        : state;
    default:
      return state;
  }
}
