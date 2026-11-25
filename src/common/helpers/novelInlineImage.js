const INLINE_IMAGE_PATTERN = /\[(loadedimage|uploadedimage):(\d+)(?:-(\d+))?\]/gi;

export const MAX_IMAGE_HEIGHT_WIDTH_RATIO = 10;

export const getEmbeddedImageCandidateIds = (embeddedImage) =>
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

export const findEmbeddedImageById = (embeddedImages, imageId) => {
  if (!embeddedImages || !imageId) {
    return null;
  }

  const normalizedImageId = String(imageId);
  const numericImageId = parseInt(imageId, 10);

  if (Array.isArray(embeddedImages)) {
    return (
      embeddedImages.find(
        (item) =>
          item &&
          getEmbeddedImageCandidateIds(item).includes(normalizedImageId),
      ) || null
    );
  }

  if (embeddedImages[imageId]) {
    return embeddedImages[imageId];
  }

  if (!Number.isNaN(numericImageId) && embeddedImages[numericImageId]) {
    return embeddedImages[numericImageId];
  }

  const embeddedImageValues = Object.values(embeddedImages);
  return (
    embeddedImageValues.find(
      (item) =>
        item && getEmbeddedImageCandidateIds(item).includes(normalizedImageId),
    ) || null
  );
};

export const normalizeAspectRatio = (width, height) => {
  if (
    width === null ||
    width === undefined ||
    width === '' ||
    height === null ||
    height === undefined ||
    height === ''
  ) {
    return null;
  }

  const numericWidth = Number(width);
  const numericHeight = Number(height);
  if (
    !Number.isFinite(numericWidth) ||
    !Number.isFinite(numericHeight) ||
    numericWidth <= 0 ||
    numericHeight <= 0
  ) {
    return null;
  }

  const ratio = numericWidth / numericHeight;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : null;
};

export const computeConstrainedImageHeight = (
  imageWidth,
  aspectRatio,
  maxRatio = MAX_IMAGE_HEIGHT_WIDTH_RATIO,
) => {
  const safeWidth = Number(imageWidth);
  if (!Number.isFinite(safeWidth) || safeWidth <= 0) {
    return 1;
  }

  const safeRatio =
    Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const rawHeight = Math.round(safeWidth / safeRatio);
  const maxHeight = Math.max(1, Math.round(safeWidth * maxRatio));
  return Math.max(1, Math.min(rawHeight, maxHeight));
};

const dedupeNonEmptyUrls = (urls) => {
  const seen = new Set();
  const result = [];
  urls.forEach((url) => {
    if (typeof url === 'string' && url.length > 0 && !seen.has(url)) {
      seen.add(url);
      result.push(url);
    }
  });
  return result;
};

export const resolveEmbeddedImageUrls = (embeddedImage) => {
  if (!embeddedImage) {
    return [];
  }

  const { urls } = embeddedImage;
  if (!urls) {
    return dedupeNonEmptyUrls([
      embeddedImage.originalUrl,
      embeddedImage.url,
      embeddedImage.coverUrl,
      embeddedImage.thumbnailUrl,
    ]);
  }

  return dedupeNonEmptyUrls([
    urls.original,
    urls['1200x1200'],
    urls.regular,
    urls.large,
    urls['600x600'],
    urls.medium,
    urls['480mw'],
    urls['240mw'],
    urls.small,
    urls['128x128'],
  ]);
};

export const resolveEmbeddedImageUrl = (embeddedImage) =>
  resolveEmbeddedImageUrls(embeddedImage)[0] || null;

export const resolveEmbeddedImageAspectRatio = (embeddedImage) => {
  if (!embeddedImage) {
    return null;
  }

  const width =
    embeddedImage.width || embeddedImage.originalWidth || embeddedImage.w;
  const height =
    embeddedImage.height || embeddedImage.originalHeight || embeddedImage.h;

  return normalizeAspectRatio(width, height);
};

export const resolveIllustImageUrls = (illust, pageNumber) => {
  if (!illust) {
    return [];
  }

  if (illust.meta_pages && illust.meta_pages.length) {
    const pageIndex =
      pageNumber && pageNumber > 0
        ? Math.min(pageNumber - 1, illust.meta_pages.length - 1)
        : 0;
    const page = illust.meta_pages[pageIndex];
    if (page && page.image_urls) {
      return dedupeNonEmptyUrls([
        page.image_urls.original,
        page.image_urls.large,
        page.image_urls.medium,
      ]);
    }
  }

  return dedupeNonEmptyUrls([
    illust.meta_single_page && illust.meta_single_page.original_image_url,
    illust.image_urls && illust.image_urls.large,
    illust.image_urls && illust.image_urls.medium,
  ]);
};

export const resolveIllustImageUrl = (illust, pageNumber) =>
  resolveIllustImageUrls(illust, pageNumber)[0] || null;

export const resolveIllustAspectRatio = (illust, pageNumber) => {
  if (!illust) {
    return null;
  }

  const isMultiPage =
    Array.isArray(illust.meta_pages) && illust.meta_pages.length > 1;
  const pageIndex =
    pageNumber && pageNumber > 0
      ? Math.min(
          pageNumber - 1,
          isMultiPage ? illust.meta_pages.length - 1 : 0,
        )
      : 0;

  if (isMultiPage) {
    const page = illust.meta_pages[pageIndex];
    const pageRatio = page
      ? normalizeAspectRatio(page.width, page.height)
      : null;
    if (pageRatio) {
      return pageRatio;
    }
    if (pageIndex > 0) {
      return null;
    }
  }

  return normalizeAspectRatio(illust.width, illust.height);
};

export const createInlineImageTag = (
  illustId,
  imageKind = 'loadedimage',
  pageNumber = null,
) => {
  const attributes = [`data-illust-id='${illustId}'`];

  if (imageKind) {
    attributes.push(`data-image-kind='${imageKind}'`);
  }

  if (pageNumber !== null && pageNumber !== undefined) {
    attributes.push(`data-page-number='${pageNumber}'`);
  }

  return `<px-image ${attributes.join(' ')}></px-image>`;
};

export const renderTextWithInlineImages = (text) => {
  if (!text) {
    return '';
  }

  let output = '';
  let lastIndex = 0;

  text.replace(
    INLINE_IMAGE_PATTERN,
    (match, imageKind, illustId, pageNumber, offset) => {
      output += text.slice(lastIndex, offset).replace(/</g, '＜');
      output += createInlineImageTag(
        illustId,
        imageKind.toLowerCase(),
        pageNumber || null,
      );
      lastIndex = offset + match.length;
      return match;
    },
  );

  output += text.slice(lastIndex).replace(/</g, '＜');

  return output;
};
