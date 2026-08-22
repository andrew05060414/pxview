import { AI_SETTINGS } from '../constants/actionTypes';

export function setAiSettings(payload) {
  return {
    type: AI_SETTINGS.SET,
    payload,
  };
}

export function restoreAiSettings(state) {
  return {
    type: AI_SETTINGS.RESTORE,
    payload: {
      state,
    },
  };
}
