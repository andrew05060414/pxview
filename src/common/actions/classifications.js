import { CLASSIFICATIONS } from '../constants/actionTypes';

export function setCategories(categories) {
  return {
    type: CLASSIFICATIONS.SET_CATEGORIES,
    payload: {
      categories,
    },
  };
}

export function classifyStart() {
  return {
    type: CLASSIFICATIONS.CLASSIFY_START,
  };
}

export function classifyStop() {
  return {
    type: CLASSIFICATIONS.CLASSIFY_STOP,
  };
}

export function classifyProgress(done, total) {
  return {
    type: CLASSIFICATIONS.CLASSIFY_PROGRESS,
    payload: {
      done,
      total,
    },
  };
}

export function classifyBatch(results) {
  return {
    type: CLASSIFICATIONS.CLASSIFY_BATCH,
    payload: {
      results,
    },
  };
}

export function classifySuccess() {
  return {
    type: CLASSIFICATIONS.CLASSIFY_SUCCESS,
    payload: {
      timestamp: Date.now(),
    },
  };
}

export function classifyFailure(error) {
  return {
    type: CLASSIFICATIONS.CLASSIFY_FAILURE,
    payload: {
      error: String(error),
    },
  };
}

export function clearClassifications() {
  return {
    type: CLASSIFICATIONS.CLEAR,
  };
}
