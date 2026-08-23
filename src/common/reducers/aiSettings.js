import { AI_SETTINGS } from '../constants/actionTypes';

const initState = {
  baseUrl: '',
  model: 'gpt-4o-mini',
  apiKey: '',
  maxBatchSize: 40,
};

export default function aiSettings(state = initState, action) {
  switch (action.type) {
    case AI_SETTINGS.SET:
      return {
        ...state,
        baseUrl:
          action.payload.baseUrl !== undefined
            ? action.payload.baseUrl
            : state.baseUrl,
        model:
          action.payload.model !== undefined
            ? action.payload.model
            : state.model,
        apiKey:
          action.payload.apiKey !== undefined
            ? action.payload.apiKey
            : state.apiKey,
        maxBatchSize:
          action.payload.maxBatchSize !== undefined
            ? action.payload.maxBatchSize
            : state.maxBatchSize,
      };
    case AI_SETTINGS.RESTORE:
      return {
        ...state,
        ...action.payload.state,
      };
    default:
      return state;
  }
}
