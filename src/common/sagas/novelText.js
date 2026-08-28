import { takeEvery, apply, put } from 'redux-saga/effects';
import {
  fetchNovelTextSuccess,
  fetchNovelTextFailure,
} from '../actions/novelText';
import { addError } from '../actions/error';
import pixiv from '../helpers/apiClient';
import extractNovelAjaxData from '../helpers/novelAjaxParser';
import buildNovelWebviewDebugInfo from '../helpers/novelWebviewDebug';
import {
  extractUploadedImageCandidatesFromHtml,
  extractTextEmbeddedImagesFromHtml,
} from '../helpers/novelWebviewImageCandidates';
import extractNovelWebviewData from '../helpers/novelWebviewParser';
import { NOVEL_TEXT } from '../constants/actionTypes';

const getEmbeddedImageCandidateIds = (embeddedImage) =>
  [
    embeddedImage && embeddedImage.id,
    embeddedImage && embeddedImage.illustId,
    embeddedImage && embeddedImage.imageId,
    embeddedImage && embeddedImage.novelImageId,
    embeddedImage && embeddedImage.illust_id,
    embeddedImage && embeddedImage.image_id,
  ]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value));

const hasEmbeddedImageForId = (embeddedImages, imageId) => {
  if (!embeddedImages || !imageId) {
    return false;
  }

  const normalizedImageId = String(imageId);
  if (embeddedImages[normalizedImageId] || embeddedImages[imageId]) {
    return true;
  }

  const numericImageId = parseInt(normalizedImageId, 10);
  if (!Number.isNaN(numericImageId) && embeddedImages[numericImageId]) {
    return true;
  }

  return Object.values(embeddedImages).some((item) =>
    getEmbeddedImageCandidateIds(item).includes(normalizedImageId),
  );
};

const extractUploadedImageIdsFromText = (text) => {
  if (!text) {
    return [];
  }

  const uploadedImageIds = new Set();
  text.replace(/\[uploadedimage:(\d+)\]/gi, (fullMatch, imageId) => {
    uploadedImageIds.add(String(imageId));
    return fullMatch;
  });
  return Array.from(uploadedImageIds);
};

const mergeImageCollection = (target, collection) => {
  if (!collection) {
    return target;
  }

  if (Array.isArray(collection)) {
    collection.forEach((item) => {
      if (!item || typeof item !== 'object') {
        return;
      }
      const candidateIds = getEmbeddedImageCandidateIds(item);
      if (!candidateIds.length) {
        return;
      }
      candidateIds.forEach((candidateId) => {
        if (!target[candidateId]) {
          target[candidateId] = item;
        }
      });
    });
    return target;
  }

  if (typeof collection === 'object') {
    Object.keys(collection).forEach((key) => {
      const item = collection[key];
      if (item && typeof item === 'object') {
        target[String(key)] = item;
      }
    });
  }

  return target;
};

const extractEmbeddedImages = (response) => {
  const merged = {};
  if (!response || typeof response !== 'object') {
    return merged;
  }

  mergeImageCollection(merged, response.textEmbeddedImages);
  mergeImageCollection(merged, response.embeddedImages);
  mergeImageCollection(merged, response.illusts);
  mergeImageCollection(merged, response.glossaryItems);
  mergeImageCollection(merged, response.novelImages);

  return merged;
};

export function* handleFetchNovelText(action) {
  const { novelId } = action.payload;
  try {
    let ajaxText = '';
    let ajaxEmbeddedImages = {};
    let ajaxFallbackReason = null;

    const ajaxUrl = `https://www.pixiv.net/ajax/novel/${novelId}`;
    const ajaxOptions = {
      headers: {
        // `/ajax/novel` is a website endpoint.  Do not let the API client's
        // mobile headers make Pixiv treat this request as an invalid API call.
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        Referer: `https://www.pixiv.net/novel/show.php?id=${novelId}`,
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
      },
    };

    try {
      const ajaxResponse = yield apply(pixiv, pixiv.requestUrl, [
        ajaxUrl,
        ajaxOptions,
      ]);
      const response = extractNovelAjaxData(ajaxResponse, novelId);

      if (response) {
        const text = response.text || response.content || '';
        const hasText = typeof text === 'string' && text.trim().length > 0;
        const embeddedImages = extractEmbeddedImages(response);
        const uploadedImageIds = extractUploadedImageIdsFromText(text);
        const uploadedImageCount = uploadedImageIds.length;
        const parsedKeys = Object.keys(response).sort();
        const debugInfo = {
          source: 'ajax',
          embeddedImageCount: Object.keys(embeddedImages).length,
          uploadedImageCount,
          parsedKeys,
          summary: `source=ajax embeddedCount=${
            Object.keys(embeddedImages).length
          } uploadedCount=${uploadedImageCount} parsedKeys=${parsedKeys
            .slice(0, 8)
            .join('|')}`,
        };
        const hasMissingUploadedImageMetadata =
          uploadedImageIds.length > 0 &&
          uploadedImageIds.some(
            (uploadedImageId) =>
              !hasEmbeddedImageForId(embeddedImages, uploadedImageId),
          );

        if (hasText && !hasMissingUploadedImageMetadata) {
          yield put(
            fetchNovelTextSuccess(text, novelId, embeddedImages, debugInfo),
          );
          return;
        }

        ajaxText = text;
        ajaxEmbeddedImages = embeddedImages;
        ajaxFallbackReason = !hasText
          ? 'missing text in ajax response'
          : 'missing uploaded image metadata';
      }
    } catch (ajaxError) {
      ajaxFallbackReason = 'ajax request failed';
      // Fall through to the legacy webview endpoint for older or restricted flows.
    }

    const rawResponse = yield apply(pixiv, pixiv.novelWebview, [novelId, true]);
    const response = extractNovelWebviewData(rawResponse, novelId) || {};
    const debugInfo = buildNovelWebviewDebugInfo(rawResponse, response);
    const text = (response && (response.text || response.content)) || '';
    const embeddedImagesFromResponse = extractEmbeddedImages(response);
    const uploadedImageCandidates = extractUploadedImageCandidatesFromHtml(
      rawResponse,
      text,
    );
    const textEmbeddedImagesFromHtml = extractTextEmbeddedImagesFromHtml(
      rawResponse,
    );
    const embeddedImages = {
      ...ajaxEmbeddedImages,
      ...embeddedImagesFromResponse,
      ...textEmbeddedImagesFromHtml,
      ...uploadedImageCandidates,
    };
    const finalText = text || ajaxText;
    const hasFinalText =
      typeof finalText === 'string' && finalText.trim().length > 0;

    if (!hasFinalText) {
      throw new Error(`Novel ${novelId} content is empty or could not be loaded`);
    }

    const finalDebugInfo = ajaxFallbackReason
      ? {
          ...debugInfo,
          ajaxFallback: {
            reason: ajaxFallbackReason,
          },
          summary: `${debugInfo.summary} ajaxFallback=${ajaxFallbackReason}`,
        }
      : debugInfo;
    yield put(
      fetchNovelTextSuccess(
        finalText,
        novelId,
        embeddedImages,
        finalDebugInfo,
      ),
    );
  } catch (err) {
    yield put(fetchNovelTextFailure(novelId));
    yield put(addError(err));
  }
}

export function* watchFetchNovelText() {
  yield takeEvery(NOVEL_TEXT.REQUEST, handleFetchNovelText);
}
