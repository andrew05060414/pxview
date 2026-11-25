const UPLOADED_IMAGE_PATTERN = /\[uploadedimage:(\d+)\]/gi;
const IMAGE_URL_PATTERN = /https?:\/\/[^"'\\<>\s]+?\.(?:jpe?g|png|webp|gif|avif)(?:[?#][^"'\\<>\s]*)?/gi;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseNumericField = (snippet, fieldName) => {
  const match = snippet.match(
    new RegExp(`${escapeRegExp(fieldName)}["']?\\s*[:=]\\s*(\\d+)`, 'i'),
  );
  return match ? parseInt(match[1], 10) : undefined;
};

const extractUploadedImageIds = (text) => {
  if (!text) {
    return [];
  }

  const ids = new Set();
  text.replace(UPLOADED_IMAGE_PATTERN, (match, imageId) => {
    ids.add(imageId);
    return match;
  });
  return Array.from(ids);
};

const isDigitChar = (ch) => ch >= '0' && ch <= '9';

const findStandaloneIdPositions = (rawHtml, imageId) => {
  const preferredPositions = [];
  const fallbackPositions = [];
  let fromIndex = 0;

  while (fromIndex < rawHtml.length) {
    const pos = rawHtml.indexOf(imageId, fromIndex);
    if (pos === -1) {
      break;
    }
    const prevChar = pos > 0 ? rawHtml[pos - 1] : '';
    const nextChar =
      pos + imageId.length < rawHtml.length
        ? rawHtml[pos + imageId.length]
        : '';
    if (!isDigitChar(prevChar) && !isDigitChar(nextChar)) {
      const prefix = rawHtml
        .slice(Math.max(0, pos - 16), pos)
        .toLowerCase();
      if (prefix.endsWith('[uploadedimage:')) {
        fallbackPositions.push(pos);
      } else {
        preferredPositions.push(pos);
      }
    }
    fromIndex = pos + imageId.length;
  }

  return preferredPositions.concat(fallbackPositions);
};

const extractCandidateFromPosition = (rawHtml, pos, imageId) => {
  const snippet = rawHtml.slice(
    Math.max(0, pos - 1500),
    Math.min(rawHtml.length, pos + 5000),
  );
  const urlMatches = snippet.match(IMAGE_URL_PATTERN);
  if (!urlMatches || !urlMatches.length) {
    return null;
  }

  const matchingIdUrl = urlMatches.find((url) => url.includes(imageId));
  return {
    originalUrl: matchingIdUrl || urlMatches[0],
    width: parseNumericField(snippet, 'width'),
    height: parseNumericField(snippet, 'height'),
  };
};

const extractUploadedImageCandidatesFromHtml = (rawHtml, text) => {
  if (!rawHtml || !text) {
    return {};
  }

  const uploadedImageIds = extractUploadedImageIds(text);
  return uploadedImageIds.reduce((candidates, imageId) => {
    const positions = findStandaloneIdPositions(rawHtml, imageId);
    for (let index = 0; index < positions.length; index += 1) {
      const candidate = extractCandidateFromPosition(
        rawHtml,
        positions[index],
        imageId,
      );
      if (candidate) {
        candidates[imageId] = candidate;
        break;
      }
    }
    return candidates;
  }, {});
};

const extractBalancedObject = (value, startIndex) => {
  if (!value || value[startIndex] !== '{') {
    return null;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < value.length; index += 1) {
    const currentChar = value[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (currentChar === '\\') {
        isEscaped = true;
      } else if (currentChar === '"') {
        inString = false;
      }
      // eslint-disable-next-line no-continue
      continue;
    }

    if (currentChar === '"') {
      inString = true;
      // eslint-disable-next-line no-continue
      continue;
    }

    if (currentChar === '{') {
      depth += 1;
    } else if (currentChar === '}') {
      depth -= 1;
      if (depth === 0) {
        return value.slice(startIndex, index + 1);
      }
    }
  }

  return null;
};

const extractTextEmbeddedImagesFromHtml = (rawHtml) => {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return {};
  }

  // Search for textEmbeddedImages key anywhere in the HTML
  const pattern = /["']?textEmbeddedImages["']?\s*:\s*\{/g;
  let match = pattern.exec(rawHtml);

  while (match) {
    const objectStart = rawHtml.indexOf('{', match.index + match[0].indexOf(':'));
    if (objectStart === -1) {
      match = pattern.exec(rawHtml);
      // eslint-disable-next-line no-continue
      continue;
    }

    const objectValue = extractBalancedObject(rawHtml, objectStart);
    if (objectValue) {
      try {
        const parsed = JSON.parse(objectValue);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      } catch (e) {
        // try next match
      }
    }

    match = pattern.exec(rawHtml);
  }

  return {};
};

module.exports = {
  extractUploadedImageCandidatesFromHtml,
  extractTextEmbeddedImagesFromHtml,
};
