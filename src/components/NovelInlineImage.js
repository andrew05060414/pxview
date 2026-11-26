import React, { PureComponent } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import PXImage from './PXImage';
import pixiv from '../common/helpers/apiClient';
import {
  computeConstrainedImageHeight,
  findEmbeddedImageById,
  normalizeAspectRatio,
  resolveEmbeddedImageAspectRatio,
  resolveEmbeddedImageUrls,
  resolveIllustAspectRatio,
  resolveIllustImageUrls,
} from '../common/helpers/novelInlineImage';

const DEFAULT_PLACEHOLDER_ASPECT_RATIO = 4 / 3;
const MAX_CACHE_ENTRIES = 500;
const RETRYABLE_FAILURE_REASONS = new Set([
  'image request failed',
  'illust detail request failed',
]);

const styles = StyleSheet.create({
  image: {
    backgroundColor: 'rgba(128,128,128,0.12)',
    marginVertical: 6,
  },
  progressiveContainer: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transparentBackground: {
    backgroundColor: 'transparent',
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

const addBoundedSet = (set, key) => {
  if (set.has(key)) {
    set.delete(key);
  } else if (set.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = set.values().next().value;
    set.delete(oldestKey);
  }
  set.add(key);
};

const resolvedAspectRatioCache = new Map();
const resolvedIllustDetailCache = new Map();
const pendingIllustDetailRequests = new Map();
const loadedImageUrlsCache = new Set();

export const clearNovelInlineImageCache = () => {
  resolvedAspectRatioCache.clear();
  resolvedIllustDetailCache.clear();
  pendingIllustDetailRequests.clear();
  loadedImageUrlsCache.clear();
};

const areStringArraysEqual = (a = [], b = []) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const buildLoadedState = (imageUrls, metadataRatio, emptyFailureReason) => {
  if (!imageUrls.length) {
    return {
      failureReason: emptyFailureReason,
      imageUrls: [],
      imageUrl: null,
      urlIndex: 0,
      isFailed: true,
      isLoading: false,
      isPrimaryLoaded: false,
      isPreviewLoaded: false,
      previewFailed: false,
      imageAspectRatio: 1,
      retryNonce: 0,
    };
  }

  const primaryUrl = imageUrls[0];
  const cachedRatio = resolvedAspectRatioCache.get(primaryUrl) || null;
  const resolvedRatio = cachedRatio || metadataRatio || null;
  if (!cachedRatio && metadataRatio) {
    setBoundedCache(resolvedAspectRatioCache, primaryUrl, metadataRatio);
  }

  return {
    failureReason: null,
    imageUrls,
    imageUrl: primaryUrl,
    urlIndex: 0,
    isFailed: false,
    isLoading: false,
    isPrimaryLoaded: loadedImageUrlsCache.has(primaryUrl),
    isPreviewLoaded: false,
    previewFailed: false,
    imageAspectRatio: resolvedRatio,
    retryNonce: 0,
  };
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
      if (
        response &&
        response.illust &&
        resolveIllustImageUrls(response.illust).length > 0
      ) {
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

export const prefetchIllustDetail = (imageId) => {
  if (!imageId) {
    return Promise.resolve(null);
  }
  return fetchIllustDetail(imageId).catch(() => null);
};

const resolveInitialStateFromProps = (props) => {
  const imageId = getImageIdFromProps(props);
  const imageKind = getImageKindFromProps(props);
  if (!imageId) {
    return {
      failureReason: 'missing image id',
      imageUrls: [],
      imageUrl: null,
      urlIndex: 0,
      isFailed: true,
      isLoading: false,
      isPrimaryLoaded: false,
      isPreviewLoaded: false,
      previewFailed: false,
      imageAspectRatio: 1,
      retryNonce: 0,
    };
  }

  const embeddedImage = findEmbeddedImageById(props.embeddedImages, imageId);
  const embeddedImageUrls = resolveEmbeddedImageUrls(embeddedImage);
  if (embeddedImageUrls.length) {
    return buildLoadedState(
      embeddedImageUrls,
      resolveEmbeddedImageAspectRatio(embeddedImage),
      null,
    );
  }

  if (imageKind === 'uploadedimage') {
    return {
      failureReason: embeddedImage
        ? 'embedded image metadata has no usable url'
        : 'no embedded image metadata',
      imageUrls: [],
      imageUrl: null,
      urlIndex: 0,
      isFailed: true,
      isLoading: false,
      isPrimaryLoaded: false,
      isPreviewLoaded: false,
      previewFailed: false,
      imageAspectRatio: 1,
      retryNonce: 0,
    };
  }

  const cachedResponse = resolvedIllustDetailCache.get(String(imageId));
  if (cachedResponse && cachedResponse.illust) {
    const { illust } = cachedResponse;
    return buildLoadedState(
      resolveIllustImageUrls(illust, props.pageNumber),
      resolveIllustAspectRatio(illust, props.pageNumber),
      'illust detail has no usable url',
    );
  }

  return {
    failureReason: null,
    imageUrls: [],
    imageUrl: null,
    urlIndex: 0,
    isFailed: false,
    isLoading: true,
    isPrimaryLoaded: false,
    isPreviewLoaded: false,
    previewFailed: false,
    imageAspectRatio: null,
    retryNonce: 0,
  };
};

class NovelInlineImage extends PureComponent {
  constructor(props) {
    super(props);
    this.unmounted = false;
    this.requestId = 0;
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
    const keyPropsChanged =
      imageId !== prevImageId ||
      imageKind !== prevImageKind ||
      this.props.pageNumber !== prevProps.pageNumber;
    const embeddedImagesChanged =
      this.props.embeddedImages !== prevProps.embeddedImages;

    if (!keyPropsChanged && !embeddedImagesChanged) {
      return;
    }

    const nextState = resolveInitialStateFromProps(this.props);
    if (!keyPropsChanged) {
      const { imageUrls, imageAspectRatio, isFailed, isLoading } = this.state;
      const urlsChanged = !areStringArraysEqual(nextState.imageUrls, imageUrls);
      const gainedRatio =
        imageAspectRatio === null && nextState.imageAspectRatio !== null;
      const statusChanged =
        nextState.isFailed !== isFailed || nextState.isLoading !== isLoading;
      if (!urlsChanged && !gainedRatio && !statusChanged) {
        return;
      }
    }

    this.requestId += 1;
    // eslint-disable-next-line react/no-did-update-set-state
    this.setState(nextState, () => {
      if (!this.unmounted && nextState.isLoading) {
        this.loadImage();
      }
    });
  }

  componentWillUnmount() {
    this.unmounted = true;
  }

  getPreviewUrl = () => {
    const { inline } = this.props;
    const { imageUrls = [], urlIndex = 0, isPrimaryLoaded } = this.state;
    if (!inline && !isPrimaryLoaded && urlIndex === 0 && imageUrls.length > 1) {
      return imageUrls[1];
    }
    return null;
  };

  loadImage = async () => {
    const requestId = this.requestId + 1;
    this.requestId = requestId;
    const { embeddedImages, pageNumber } = this.props;
    const imageId = getImageIdFromProps(this.props);
    const imageKind = getImageKindFromProps(this.props);

    if (!imageId) {
      if (!this.unmounted) {
        this.setState({
          failureReason: 'missing image id',
          isLoading: false,
          isFailed: true,
        });
      }
      return;
    }

    const embeddedImage = findEmbeddedImageById(embeddedImages, imageId);
    const embeddedImageUrls = resolveEmbeddedImageUrls(embeddedImage);
    if (embeddedImageUrls.length) {
      if (!this.unmounted) {
        this.setState(
          buildLoadedState(
            embeddedImageUrls,
            resolveEmbeddedImageAspectRatio(embeddedImage),
            null,
          ),
        );
      }
      return;
    }

    if (imageKind === 'uploadedimage') {
      if (!this.unmounted) {
        this.setState({
          failureReason: embeddedImage
            ? 'embedded image metadata has no usable url'
            : 'no embedded image metadata',
          isLoading: false,
          isFailed: true,
        });
      }
      return;
    }

    try {
      const response = await fetchIllustDetail(imageId);
      if (this.unmounted || requestId !== this.requestId) {
        return;
      }

      const illust = response && response.illust;
      this.setState(
        buildLoadedState(
          resolveIllustImageUrls(illust, pageNumber),
          resolveIllustAspectRatio(illust, pageNumber),
          'illust detail has no usable url',
        ),
      );
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

  handlePreviewLoad = (event) => {
    if (this.unmounted) {
      return;
    }

    const previewUrl = this.getPreviewUrl();
    const { imageAspectRatio, imageUrl, isPreviewLoaded } = this.state;
    const source = event && event.nativeEvent && event.nativeEvent.source;
    const uriMatches = !(
      source &&
      source.uri &&
      previewUrl &&
      source.uri !== previewUrl
    );
    const actualRatio =
      uriMatches && source
        ? normalizeAspectRatio(source.width, source.height)
        : null;

    if (actualRatio) {
      if (previewUrl) {
        setBoundedCache(resolvedAspectRatioCache, previewUrl, actualRatio);
      }
      if (imageUrl && !resolvedAspectRatioCache.has(imageUrl)) {
        setBoundedCache(resolvedAspectRatioCache, imageUrl, actualRatio);
      }
      if (
        imageAspectRatio === null ||
        Math.abs(actualRatio - imageAspectRatio) > 0.01
      ) {
        this.setState({
          imageAspectRatio: actualRatio,
          isPreviewLoaded: true,
        });
        return;
      }
    }

    if (!isPreviewLoaded) {
      this.setState({ isPreviewLoaded: true });
    }
  };

  handlePreviewError = () => {
    if (this.unmounted || this.state.previewFailed) {
      return;
    }
    this.setState({ previewFailed: true });
  };

  handleImageError = () => {
    if (this.unmounted) {
      return;
    }

    const { imageUrls = [], urlIndex = 0 } = this.state;
    const nextIndex = urlIndex + 1;
    if (nextIndex < imageUrls.length) {
      const nextUrl = imageUrls[nextIndex];
      const cachedRatio = resolvedAspectRatioCache.get(nextUrl) || null;
      this.setState({
        urlIndex: nextIndex,
        imageUrl: nextUrl,
        imageAspectRatio: cachedRatio,
        isPrimaryLoaded: loadedImageUrlsCache.has(nextUrl),
        isPreviewLoaded: false,
        previewFailed: false,
        isFailed: false,
        failureReason: null,
      });
      return;
    }

    this.setState({
      failureReason: 'image request failed',
      isFailed: true,
      isLoading: false,
      isPrimaryLoaded: false,
      isPreviewLoaded: false,
      previewFailed: false,
    });
  };

  handleImageLoad = (event) => {
    if (this.unmounted) {
      return;
    }

    const { imageAspectRatio, imageUrl, isPrimaryLoaded } = this.state;
    const source = event && event.nativeEvent && event.nativeEvent.source;
    if (source && source.uri && imageUrl && source.uri !== imageUrl) {
      return;
    }

    if (imageUrl) {
      addBoundedSet(loadedImageUrlsCache, imageUrl);
    }

    const actualRatio = source
      ? normalizeAspectRatio(source.width, source.height)
      : null;
    if (actualRatio) {
      if (imageUrl) {
        setBoundedCache(resolvedAspectRatioCache, imageUrl, actualRatio);
      }
      if (
        imageAspectRatio === null ||
        Math.abs(actualRatio - imageAspectRatio) > 0.01
      ) {
        this.setState({
          imageAspectRatio: actualRatio,
          isPrimaryLoaded: true,
        });
        return;
      }
      if (!isPrimaryLoaded) {
        this.setState({ isPrimaryLoaded: true });
      }
      return;
    }

    const nextState = {};
    if (!isPrimaryLoaded) {
      nextState.isPrimaryLoaded = true;
    }
    if (imageAspectRatio === null) {
      nextState.imageAspectRatio = 1;
    }
    if (Object.keys(nextState).length > 0) {
      this.setState(nextState);
    }
  };

  handleRetry = () => {
    if (this.unmounted) {
      return;
    }

    const { failureReason, imageUrls = [], retryNonce = 0 } = this.state;
    if (failureReason === 'image request failed' && imageUrls.length > 0) {
      const primaryUrl = imageUrls[0];
      loadedImageUrlsCache.delete(primaryUrl);
      const cachedRatio = resolvedAspectRatioCache.get(primaryUrl) || null;
      this.setState({
        urlIndex: 0,
        imageUrl: primaryUrl,
        imageAspectRatio: cachedRatio,
        isPrimaryLoaded: false,
        isPreviewLoaded: false,
        previewFailed: false,
        isFailed: false,
        isLoading: false,
        failureReason: null,
        retryNonce: retryNonce + 1,
      });
      return;
    }

    if (failureReason === 'illust detail request failed') {
      this.setState(
        {
          isLoading: true,
          isFailed: false,
          failureReason: null,
        },
        this.loadImage,
      );
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
      isPreviewLoaded,
      previewFailed,
      imageAspectRatio,
      retryNonce = 0,
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
      const canRetry = RETRYABLE_FAILURE_REASONS.has(failureReason);
      return (
        <Text
          accessibilityLabel={`novel-inline-image-${imageId}`}
          onPress={canRetry ? this.handleRetry : undefined}
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
        ? {
            width: imageWidth,
            height: computeConstrainedImageHeight(imageWidth, imageAspectRatio),
            aspectRatio: imageAspectRatio,
          }
        : {
            width: imageWidth,
            height: computeConstrainedImageHeight(
              imageWidth,
              DEFAULT_PLACEHOLDER_ASPECT_RATIO,
            ),
          };
    const previewUrl = this.getPreviewUrl();

    if (!previewUrl) {
      return (
        <PXImage
          key={`${imageUrl}#${retryNonce}`}
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

    return (
      <View style={[styles.image, styles.progressiveContainer, imageStyle]}>
        {!previewFailed && (
          <PXImage
            key={`preview-${previewUrl}`}
            accessibilityLabel={`novel-inline-image-preview-${imageId}`}
            uri={previewUrl}
            resizeMode="contain"
            resizeMethod="scale"
            fadeDuration={0}
            onLoad={this.handlePreviewLoad}
            onError={this.handlePreviewError}
            style={StyleSheet.absoluteFill}
          />
        )}
        {!isPreviewLoaded && (
          <View pointerEvents="none" style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#888" />
          </View>
        )}
        <PXImage
          key={`${imageUrl}#${retryNonce}`}
          accessibilityLabel={`novel-inline-image-${imageId}`}
          uri={imageUrl}
          resizeMode="contain"
          resizeMethod="scale"
          fadeDuration={0}
          onError={this.handleImageError}
          onLoad={this.handleImageLoad}
          style={[StyleSheet.absoluteFill, styles.transparentBackground]}
        />
      </View>
    );
  }

  render() {
    return this.renderContent();
  }
}

export default NovelInlineImage;
