import { NOVEL_RANKING_SETTINGS } from '../constants/actionTypes';

export function setLanguage(language) {
  return {
    type: NOVEL_RANKING_SETTINGS.SET,
    payload: {
      language,
    },
  };
}

export function clearLanguage() {
  return setLanguage(null);
}

export function restoreSettings(state) {
  return {
    type: NOVEL_RANKING_SETTINGS.RESTORE,
    payload: {
      state,
    },
  };
}
