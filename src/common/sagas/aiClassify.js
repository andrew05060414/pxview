import { takeEvery, call, put, select, delay } from 'redux-saga/effects';
import { CLASSIFICATIONS } from '../constants/actionTypes';
import {
  classifyProgress,
  classifyBatch,
  classifySuccess,
  classifyFailure,
} from '../actions/classifications';
import {
  sendChatRequest,
  extractJsonContent,
  buildClassificationMessages,
} from '../helpers/llmClient';

export const getAiSettings = (state) => state.aiSettings;
export const getBookmarkItems = (state) => state.bookmarkLibrary.items;
export const getClassificationsState = (state) => state.classifications;

export function* handleClassifyBookmarks() {
  try {
    const aiSettings = yield select(getAiSettings);
    if (!aiSettings || !aiSettings.baseUrl || !aiSettings.apiKey) {
      yield put(
        classifyFailure(
          'AI settings incomplete: Please configure API Base URL and API Key',
        ),
      );
      return;
    }

    const bookmarkItems = yield select(getBookmarkItems);
    const classificationsState = yield select(getClassificationsState);
    const categories =
      classificationsState.categories && classificationsState.categories.length
        ? classificationsState.categories
        : ['其他'];
    const existingMappings = classificationsState.items || {};

    const allItems = Object.values(bookmarkItems || {});
    if (!allItems.length) {
      yield put(classifyFailure('No bookmarks available to classify'));
      return;
    }

    const unclassified = allItems.filter(
      (item) => !existingMappings[String(item.id)],
    );
    if (!unclassified.length) {
      yield put(classifySuccess());
      return;
    }

    const batchSize = Math.max(1, Math.min(aiSettings.maxBatchSize || 40, 50));
    const total = unclassified.length;
    let done = 0;

    for (let i = 0; i < unclassified.length; i += batchSize) {
      const batch = unclassified.slice(i, i + batchSize);
      const messages = buildClassificationMessages(batch, categories);
      const response = yield call(sendChatRequest, aiSettings, messages);
      const results = extractJsonContent(response);

      if (Array.isArray(results) && results.length) {
        yield put(classifyBatch(results));
      }

      done += batch.length;
      yield put(classifyProgress(done, total));
      yield delay(300);
    }

    yield put(classifySuccess());
  } catch (err) {
    yield put(classifyFailure(err && err.message ? err.message : String(err)));
  }
}

export function* watchAiClassify() {
  yield takeEvery(CLASSIFICATIONS.CLASSIFY_START, handleClassifyBookmarks);
}
