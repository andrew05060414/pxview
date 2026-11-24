import React, { PureComponent } from 'react';
import { StyleSheet, Text, Dimensions } from 'react-native';
import PXImage from './PXImage';
import pixiv from '../common/helpers/apiClient';

const DEFAULT_PLACEHOLDER_ASPECT_RATIO = 4 / 3;
const MAX_CACHE_ENTRIES = 500;

const styles = StyleSheet.create({
  image: {
    backgroundColor: 'rgba(128,128,128,0.12)',
    marginVertical: 6,
  },
  fallback: {
    color: '#666',
    fontStyle: 'italic',
  },
});

const getImageIdFromProps = (props) => props.imageId || props.illustId;

const getImageKindFromProps = (props) => props.imageKind || 'loadedimage';

const setBoundedCache = (cache, key, value) => {
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, value);
};

const resolvedAspectRatioCache = new Map();
const resolvedIllustDetailCache = new Map();
const pendingIllustDetailRequests = new Map();

export const clearNovelInlineImageCache = () => {
  resolvedAspectRatioCache.clear();
  resolvedIllustDetailCache.clear();
  pendingIllustDetailRequests.clear();
};

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

const findEmbeddedImageById = (embeddedImages, imageId) => {
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

const resolveEmbeddedImageUrl = (embeddedImage) => {
  if (!embeddedImage) {
    return null;
  }

  const { urls } = embeddedImage;
  if (!urls) {
    return (
      embeddedImage.originalUrl ||
      embeddedImage.url ||
      embeddedImage.coverUrl ||
      embeddedImage.thumbnailUrl ||
      null
    );
  }

  return (
    urls.original ||
    urls['1200x1200'] ||
    urls.regular ||
    urls.large ||
    urls['600x600'] ||
    urls.medium ||
    urls['480mw'] ||
    urls['240mw'] ||
    urls.small ||
    urls['128x128'] ||
    null
  );
};

const resolveEmbeddedImageAspectRatio = (embeddedImage) => {
  if (!embeddedImage) {
    return null;
  }

  const width =
    embeddedImage.width || embeddedImage.originalWidth || embeddedImage.w;
  const height =
    embeddedImage.height || embeddedImage.originalHeight || embeddedImage.h;

  return width && height ? width / height : null;
};

const resolveIllustImageUrl = (illust, pageNumber) => {
  if (!illust) {
    return null;
  }

  if (illust.meta_pages && illust.meta_pages.length) {
    const pageIndex =
      pageNumber && pageNumber > 0
        ? Math.min(pageNumber - 1, illust.meta_pages.length - 1)
        : 0;
    const page = illust.meta_pages[pageIndex];
    if (page && page.image_urls) {
      return (
        page.image_urls.original ||
        page.image_urls.large ||
        page.image_urls.medium ||
        null
      );
    }
  }

  if (illust.meta_single_page && illust.meta_single_page.original_image_url) {
    return illust.meta_single_page.original_image_url;
  }

  if (illust.image_urls && (illust.image_urls.large || illust.image_urls.medium)) {
    return illust.image_urls.large || illust.image_urls.medium;
  }

  return null;
};

const fetchIllustDetail = (imageId) => {
  const requestKey = String(imageId);
  if (resolvedIllustDetailCache.has(requestKey)) {
    return Promise.resolve(resolvedIllustDetailCache.get(requestKey));
  }

  const pendingRequest = pendingIllustDetailRequests.get(requestKey);
  if (pendingRequest) {
    return pendingRequest;
  }

  const request = Promise.resolve().then(() => pixiv.illustDetail(imageId));
  pendingIllustDetailRequests.set(requestKey, request);
  request.then(
    (response) => {
      if (pendingIllustDetailRequests.get(requestKey) === request) {
        pendingIllustDetailRequests.delete(requestKey);
      }
      if (response && response.illust && resolveIllustImageUrl(response.illust)) {
        setBoundedCache(resolvedIllustDetailCache, requestKey, response);
      }
    },
    () => {
      if (pendingIllustDetailRequests.get(requestKey) === request) {
        pendingIllustDetailRequests.delete(requestKey);
      }
    },
  );
  return request;
};

const resolveInitialStateFromProps = (props) => {
  const imageId = getImageIdFromProps(props);
  const imageKind = getImageKindFromProps(props);
  if (!imageId) {
    return {
      failureReason: 'missing image id',
      imageUrl: null,
      isFailed: true,
      isLoading: false,
      imageAspectRatio: 1,
    };
  }

  const embeddedImage = findEmbeddedImageById(props.embeddedImages, imageId);
  const embeddedImageUrl = resolveEmbeddedImageUrl(embeddedImage);
  if (embeddedImageUrl) {
    const metadataRatio = resolveEmbeddedImageAspectRatio(embeddedImage);
    const cachedRatio = resolvedAspectRatioCache.get(embeddedImageUrl) || null;
    const resolvedRatio = metadataRatio || cachedRatio;
    if (metadataRatio) {
      setBoundedCache(resolvedAspectRatioCache, embeddedImageUrl, metadataRatio);
    }
    return {
      failureReason: null,
      imageUrl: embeddedImageUrl,
      isFailed: false,
      isLoading: false,
      imageAspectRatio: resolvedRatio,
    };
  }

  if (imageKind === 'uploadedimage') {
    return {
      failureReason: embeddedImage
        ? 'embedded image metadata has no usable url'
        : 'no embedded image metadata',
      imageUrl: null,
      isFailed: true,
      isLoading: false,
      imageAspectRatio: 1,
    };
  }

  const cachedResponse = resolvedIllustDetailCache.get(String(imageId));
  if (cachedResponse && cachedResponse.illust) {
    const { illust } = cachedResponse;
    const imageUrl = resolveIllustImageUrl(illust, props.pageNumber);
    const width = illust.width;
    const height = illust.height;
    const cachedRatio = imageUrl
      ? resolvedAspectRatioCache.get(imageUrl) || null
      : null;
    const imageAspectRatio =
      width && height ? width / height : cachedRatio || 1;
    if (imageUrl && width && height) {
      setBoundedCache(resolvedAspectRatioCache, imageUrl, width / height);
    }
    return {
      failureReason: imageUrl ? null : 'illust detail has no usable url',
      imageUrl,
      isFailed: !imageUrl,
      isLoading: false,
      imageAspectRatio,
    };
  }

  return {
    failureReason: null,
    imageUrl: null,
    isFailed: false,
    isLoading: true,
    imageAspectRatio: 1,
  };
};

class NovelInlineImage extends PureComponent {
  constructor(props) {
    super(props);
    this.state = resolveInitialStateFromProps(props);
  }

  componentDidMount() {
    if (this.state.isLoading) {
      this.loadImage();
    }
  }

  componentDidUpdate(prevProps) {
    const imageId = getImageIdFromProps(this.props);
    const prevImageId = getImageIdFromProps(prevProps);
    const imageKind = getImageKindFromProps(this.props);
    const prevImageKind = getImageKindFromProps(prevProps);
    if (
      imageId !== prevImageId ||
      imageKind !== prevImageKind ||
      this.props.pageNumber !== prevProps.pageNumber ||
      this.props.embeddedImages !== prevProps.embeddedImages
    ) {
      const nextState = resolveInitialStateFromProps(this.props);
      this.requestId = (this.requestId || 0) + 1;
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState(nextState, () => {
        if (nextState.isLoading) {
          this.loadImage();
        }
      });
    }
  }

  componentWillUnmount() {
    this.unmounted = true;
  }

  loadImage = async () => {
    const requestId = (this.requestId || 0) + 1;
    this.requestId = requestId;
    const { embeddedImages, pageNumber } = this.props;
    const imageId = getImageIdFromProps(this.props);
    const imageKind = getImageKindFromProps(this.props);

    if (!imageId) {
      this.setState({
        failureReason: 'missing image id',
        isLoading: false,
        isFailed: true,
      });
      return;
    }

    const embeddedImage = findEmbeddedImageById(embeddedImages, imageId);
    const embeddedImageUrl = resolveEmbeddedImageUrl(embeddedImage);
    const embeddedImageAspectRatio = resolveEmbeddedImageAspectRatio(
      embeddedImage,
    );

    if (embeddedImageUrl) {
      const cachedRatio = resolvedAspectRatioCache.get(embeddedImageUrl) || null;
      const resolvedRatio = embeddedImageAspectRatio || cachedRatio;
      if (embeddedImageAspectRatio) {
        setBoundedCache(
          resolvedAspectRatioCache,
          embeddedImageUrl,
          embeddedImageAspectRatio,
        );
      }
      this.setState({
        failureReason: null,
        imageUrl: embeddedImageUrl,
        isLoading: false,
        isFailed: false,
        imageAspectRatio: resolvedRatio,
      });
      return;
    }

    if (imageKind === 'uploadedimage') {
      this.setState({
        failureReason: embeddedImage
          ? 'embedded image metadata has no usable url'
          : 'no embedded image metadata',
        isLoading: false,
        isFailed: true,
      });
      return;
    }

    try {
      const response = await fetchIllustDetail(imageId);
      if (this.unmounted || requestId !== this.requestId) {
        return;
      }

      const illust = response && response.illust;
      const imageUrl = resolveIllustImageUrl(illust, pageNumber);
      const width = illust && illust.width;
      const height = illust && illust.height;
      const cachedRatio = imageUrl
        ? resolvedAspectRatioCache.get(imageUrl) || null
        : null;
      const imageAspectRatio =
        width && height
          ? width / height
          : cachedRatio || this.state.imageAspectRatio;
      if (imageUrl && width && height) {
        setBoundedCache(resolvedAspectRatioCache, imageUrl, width / height);
      }

      this.setState({
        failureReason: imageUrl ? null : 'illust detail has no usable url',
        imageUrl,
        isLoading: false,
        isFailed: !imageUrl,
        imageAspectRatio,
      });
    } catch (err) {
      if (!this.unmounted && requestId === this.requestId) {
        this.setState({
          failureReason: 'illust detail request failed',
          isLoading: false,
          isFailed: true,
        });
      }
    }
  };

  handleImageError = () => {
    this.setState({
      failureReason: 'image request failed',
      isFailed: true,
      isLoading: false,
    });
  };

  handleImageLoad = (event) => {
    const { imageAspectRatio, imageUrl } = this.state;
    if (imageAspectRatio !== null) {
      return;
    }
    const source = event && event.nativeEvent && event.nativeEvent.source;
    if (source && source.width && source.height) {
      const ratio = source.width / source.height;
      if (imageUrl) {
        setBoundedCache(resolvedAspectRatioCache, imageUrl, ratio);
      }
      this.setState({ imageAspectRatio: ratio });
    } else {
      this.setState({ imageAspectRatio: 1 });
    }
  };

  renderContent() {
    const { debugInfo, maxWidth } = this.props;
    const imageId = getImageIdFromProps(this.props);
    const {
      failureReason,
      imageUrl,
      isFailed,
      isLoading,
      imageAspectRatio,
    } = this.state;

    if (isLoading) {
      return (
        <Text
          accessibilityLabel={`novel-inline-image-${imageId}`}
          style={styles.fallback}
        >
          Loading image...
        </Text>
      );
    }

    if (!imageUrl || isFailed) {
      const diagnosticSuffix =
        failureReason === 'no embedded image metadata' &&
        debugInfo &&
        debugInfo.summary
          ? `; ${debugInfo.summary}`
          : '';
      return (
        <Text
          accessibilityLabel={`novel-inline-image-${imageId}`}
          style={styles.fallback}
        >
          {`Image unavailable${
            failureReason ? ` (${failureReason}${diagnosticSuffix})` : ''
          }`}
        </Text>
      );
    }

    const imageWidth =
      maxWidth || Dimensions.get('window').width - 20;
    const imageStyle =
      imageAspectRatio !== null
        ? { width: imageWidth, aspectRatio: imageAspectRatio }
        : {
            width: imageWidth,
            height: Math.round(imageWidth / DEFAULT_PLACEHOLDER_ASPECT_RATIO),
          };

    return (
      <PXImage
        accessibilityLabel={`novel-inline-image-${imageId}`}
        uri={imageUrl}
        resizeMode="contain"
        resizeMethod="scale"
        fadeDuration={0}
        onError={this.handleImageError}
        onLoad={this.handleImageLoad}
        style={[styles.image, imageStyle]}
      />
    );
  }

  render() {
    return this.renderContent();
  }
}

export default NovelInlineImage;
