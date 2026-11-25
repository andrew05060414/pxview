import React, { Component, PureComponent } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Linking,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import HtmlView from 'react-native-htmlview';
import entities from 'entities';
import { Text } from 'react-native-paper';
import PXTabView from './PXTabView';
import NovelInlineImage from './NovelInlineImage';
import {
  computeConstrainedImageHeight,
  findEmbeddedImageById,
  resolveEmbeddedImageAspectRatio,
} from '../common/helpers/novelInlineImage';
import { MODAL_TYPES } from '../common/constants';

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 10,
    paddingBottom: 36,
  },
  list: {
    flex: 1,
  },
  novelChapter: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  pageLink: {
    fontWeight: '500',
    color: '#007AFF',
  },
  percentPill: {
    position: 'absolute',
    bottom: 24,
    backgroundColor: 'rgba(30,30,30,0.45)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    zIndex: 80,
  },
  percentPillText: {
    color: '#fff',
    fontSize: 11,
  },
});

const MAX_HTML_CHUNK_LENGTH = 3000;
const VIRTUAL_TEXT_CHUNK_LENGTH = 1500;
const PROTECTED_TAGS = new Set(['a', 'chapter', 'jump', 'px-image']);
const SPLITTABLE_PROTECTED_TAGS = new Set(['a', 'chapter', 'jump']);

const getTagInfo = (token) => {
  const match = token.match(/^<\/?([a-zA-Z0-9-]+)/);
  if (!match) {
    return null;
  }

  return {
    name: match[1],
    isClosing: token[1] === '/',
  };
};

const tokenizeHtml = (html) => html.match(/<[^>]+>|[^<]+/g) || [];
const decodeHtmlText = (text = '') => entities.decodeHTML(text);

const collectProtectedRegion = (tokens, startIndex) => {
  const openingTag = tokens[startIndex];
  const openingTagInfo = getTagInfo(openingTag);
  if (!openingTagInfo || openingTagInfo.isClosing) {
    return null;
  }

  const innerTokens = [];
  let depth = 1;

  for (let index = startIndex + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    const tagInfo = getTagInfo(token);

    if (tagInfo && tagInfo.name === openingTagInfo.name) {
      depth += tagInfo.isClosing ? -1 : 1;
      if (!depth) {
        return {
          closeTag: token,
          innerHtml: innerTokens.join(''),
          nextIndex: index,
          openTag: openingTag,
          tagName: openingTagInfo.name,
          text: `${openingTag}${innerTokens.join('')}${token}`,
        };
      }
    }

    innerTokens.push(token);
  }

  return {
    closeTag: '',
    innerHtml: innerTokens.join(''),
    nextIndex: tokens.length - 1,
    openTag: openingTag,
    tagName: openingTagInfo.name,
    text: `${openingTag}${innerTokens.join('')}`,
  };
};

const normalizeProtectedRegions = (html, maxLength) => {
  const tokens = tokenizeHtml(html);
  let output = '';

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const tagInfo = getTagInfo(token);

    if (tagInfo && !tagInfo.isClosing && PROTECTED_TAGS.has(tagInfo.name)) {
      const region = collectProtectedRegion(tokens, index);
      if (!region) {
        output += token;
        continue;
      }

      if (
        region.text.length > maxLength &&
        SPLITTABLE_PROTECTED_TAGS.has(region.tagName)
      ) {
        const wrapperLength = region.openTag.length + region.closeTag.length;
        const innerMaxLength = maxLength - wrapperLength;

        if (innerMaxLength > 0) {
          const innerChunks = chunkHtmlPreservingTags(
            region.innerHtml,
            innerMaxLength,
          );
          output += innerChunks
            .map((chunk) => `${region.openTag}${chunk}${region.closeTag}`)
            .join('');
        } else {
          output += region.text;
        }
      } else {
        output += region.text;
      }

      index = region.nextIndex;
      continue;
    }

    output += token;
  }

  return output;
};

export const chunkHtmlPreservingTags = (
  html,
  maxLength = MAX_HTML_CHUNK_LENGTH,
) => {
  if (!html) {
    return [];
  }

  const normalizedHtml = normalizeProtectedRegions(html, maxLength);
  const tokens = tokenizeHtml(normalizedHtml);
  const chunks = [];
  let current = '';
  let protectedDepth = 0;

  const flushCurrent = () => {
    if (current) {
      chunks.push(current);
      current = '';
    }
  };

  tokens.forEach((token, tokenIndex) => {
    const tagInfo = getTagInfo(token);
    if (tagInfo) {
      const isProtectedTag = PROTECTED_TAGS.has(tagInfo.name);
      if (!tagInfo.isClosing && isProtectedTag) {
        const protectedRegion = !protectedDepth
          ? collectProtectedRegion(tokens, tokenIndex)
          : null;
        const protectedRegionLength = protectedRegion
          ? protectedRegion.text.length
          : token.length;

        if (
          !protectedDepth &&
          current.length &&
          current.length + protectedRegionLength > maxLength
        ) {
          flushCurrent();
        }
        current += token;
        protectedDepth += 1;
        return;
      }

      current += token;
      if (tagInfo.isClosing && isProtectedTag && protectedDepth > 0) {
        protectedDepth -= 1;
      }

      if (!protectedDepth && current.length >= maxLength) {
        flushCurrent();
      }
      return;
    }

    if (protectedDepth) {
      current += token;
      return;
    }

    let remaining = token;
    while (remaining.length) {
      if (current.length === maxLength) {
        flushCurrent();
      }

      const spaceLeft = maxLength - current.length;
      const nextLength = Math.min(spaceLeft, remaining.length);
      current += remaining.slice(0, nextLength);
      remaining = remaining.slice(nextLength);

      if (current.length === maxLength) {
        flushCurrent();
      }
    }
  });

  flushCurrent();
  return chunks;
};

const parseTagAttributes = (tag) => {
  const attrs = {};
  const attrPattern = /([a-zA-Z0-9_-]+)\s*=\s*(?:'([^']*)'|"([^"]*)")/g;
  let match = attrPattern.exec(tag);
  while (match) {
    attrs[match[1]] = match[2] !== undefined ? match[2] : match[3];
    match = attrPattern.exec(tag);
  }
  return attrs;
};

export const splitHtmlIntoBlocks = (
  html,
  maxTextChunkLength = VIRTUAL_TEXT_CHUNK_LENGTH,
) => {
  if (!html) {
    return [];
  }

  const tokens = tokenizeHtml(html);
  const blocks = [];
  let textBuffer = '';
  let wrapperDepth = 0;

  const flushTextBuffer = () => {
    if (!textBuffer) {
      return;
    }
    const chunks = chunkHtmlPreservingTags(textBuffer, maxTextChunkLength);
    chunks.forEach((chunk) => {
      if (chunk) {
        blocks.push({
          type: 'html',
          key: `html-${blocks.length}`,
          value: chunk,
        });
      }
    });
    textBuffer = '';
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const tagInfo = getTagInfo(token);

    if (tagInfo && SPLITTABLE_PROTECTED_TAGS.has(tagInfo.name)) {
      if (!tagInfo.isClosing) {
        wrapperDepth += 1;
      } else if (wrapperDepth > 0) {
        wrapperDepth -= 1;
      }
      textBuffer += token;
      // eslint-disable-next-line no-continue
      continue;
    }

    if (
      wrapperDepth === 0 &&
      tagInfo &&
      !tagInfo.isClosing &&
      tagInfo.name === 'px-image'
    ) {
      flushTextBuffer();
      const isSelfClosing = /\/>$/.test(token);
      let openTag = token;
      if (!isSelfClosing) {
        const region = collectProtectedRegion(tokens, index);
        if (region) {
          openTag = region.openTag;
          index = region.nextIndex;
        }
      }
      const attrs = parseTagAttributes(openTag);
      const parsedPageNumber = parseInt(attrs['data-page-number'], 10);
      blocks.push({
        type: 'image',
        key: `img-${blocks.length}-${attrs['data-illust-id'] || 'unknown'}`,
        imageId: attrs['data-illust-id'],
        imageKind: attrs['data-image-kind'],
        pageNumber: Number.isNaN(parsedPageNumber) ? null : parsedPageNumber,
      });
      // eslint-disable-next-line no-continue
      continue;
    }

    textBuffer += token;
  }

  flushTextBuffer();
  return blocks;
};

// --- Modal slider constants ---
const MODAL_TRACK_WIDTH = 4;
const MODAL_THUMB_W = 28;
const MODAL_THUMB_H = 60;
const MODAL_SLIDER_WIDTH = 100;
const MODAL_SLIDER_RIGHT_PAD = 20;
const INITIAL_NUM_TO_RENDER = 8;

export const estimateBlockHeight = (
  block,
  { fontSize = 16, lineHeight = 1.6, maxWidth = 340, embeddedImages } = {},
) => {
  if (!block) {
    return 0;
  }
  if (block.type === 'image') {
    const meta = findEmbeddedImageById(embeddedImages, block.imageId);
    const ratio = resolveEmbeddedImageAspectRatio(meta) || 0.85;
    return Math.max(120, computeConstrainedImageHeight(maxWidth, ratio) + 12);
  }
  const plainText = (block.value || '').replace(/<[^>]+>/g, '');
  if (!plainText) {
    return Math.round(fontSize * lineHeight);
  }
  const charsPerLine = Math.max(8, Math.floor(maxWidth / (fontSize * 1.02)));
  const lines = plainText.split('\n').reduce((total, segment) => {
    if (!segment.length) {
      return total + 1;
    }
    return total + Math.max(1, Math.ceil(segment.length / charsPerLine));
  }, 0);
  return Math.max(
    Math.round(fontSize * lineHeight),
    Math.round(lines * fontSize * lineHeight),
  );
};

class NovelHtmlChunk extends PureComponent {
  render() {
    const {
      value,
      renderNode,
      textComponentProps,
      TextComponent,
    } = this.props;
    return (
      <HtmlView
        value={value}
        renderNode={renderNode}
        textComponentProps={textComponentProps}
        TextComponent={TextComponent}
      />
    );
  }
}

class PercentPill extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      visible: false,
      pct: '0.0',
    };
  }

  update = (visible, pct) => {
    if (this.state.visible === visible && this.state.pct === pct) {
      return;
    }
    this.setState({ visible, pct });
  };

  render() {
    const { side, onOpenModal } = this.props;
    const { visible, pct } = this.state;
    if (!visible) {
      return null;
    }
    const pos = side === 'left' ? { left: 14 } : { right: 14 };
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onOpenModal}
        style={[styles.percentPill, pos]}
      >
        <Text style={styles.percentPillText}>{pct}%</Text>
      </TouchableOpacity>
    );
  }
}

class NovelPage extends PureComponent {
  constructor(props) {
    super(props);
    this.listRef = React.createRef();
    this.pillRef = React.createRef();
    this.scrollY = 0;
    this.contentHeight = 0;
    this.containerHeight = 0;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.modalDragStartY = 0;
    this.modalDragStartThumbTop = 0;
    this.isModalDragging = false;
    this.estimatedHeights = this.computeEstimatedHeights(props);
    this.highestRenderedIndex = Math.min(
      Math.max(0, (props.blocks ? props.blocks.length : 0) - 1),
      INITIAL_NUM_TO_RENDER - 1,
    );
    this.state = {
      modalOpen: false,
      modalDragging: false,
      modalThumbTop: 0,
    };
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.blocks !== prevProps.blocks ||
      this.props.fontSize !== prevProps.fontSize ||
      this.props.lineHeight !== prevProps.lineHeight ||
      this.props.maxWidth !== prevProps.maxWidth ||
      this.props.embeddedImages !== prevProps.embeddedImages
    ) {
      this.estimatedHeights = this.computeEstimatedHeights(this.props);
      if (this.props.blocks !== prevProps.blocks) {
        this.highestRenderedIndex = Math.min(
          Math.max(0, (this.props.blocks ? this.props.blocks.length : 0) - 1),
          INITIAL_NUM_TO_RENDER - 1,
        );
      }
      this.syncPercentPill();
    }
  }

  computeEstimatedHeights(props) {
    const {
      blocks = [],
      fontSize,
      lineHeight,
      maxWidth,
      embeddedImages,
    } = props;
    return blocks.map((block) =>
      estimateBlockHeight(block, {
        fontSize,
        lineHeight,
        maxWidth,
        embeddedImages,
      }),
    );
  }

  getUnrenderedTailHeight() {
    let tail = 0;
    for (
      let i = this.highestRenderedIndex + 1;
      i < this.estimatedHeights.length;
      i += 1
    ) {
      tail += this.estimatedHeights[i];
    }
    return tail;
  }

  getEffectiveContentHeight() {
    return this.contentHeight + this.getUnrenderedTailHeight();
  }

  getScrollable() {
    return Math.max(0, this.getEffectiveContentHeight() - this.containerHeight);
  }

  getRatio() {
    const scrollable = this.getScrollable();
    if (!scrollable) return 0;
    return Math.max(0, Math.min(1, this.scrollY / scrollable));
  }

  syncPercentPill(overrideRatio = null) {
    if (!this.pillRef.current) {
      return;
    }
    const scrollable = this.getScrollable();
    const visible = scrollable > 10;
    const ratio = overrideRatio !== null ? overrideRatio : this.getRatio();
    const pct = visible ? (ratio * 100).toFixed(1) : '0.0';
    this.pillRef.current.update(visible, pct);
  }

  handleScroll = (e) => {
    this.scrollY = e.nativeEvent.contentOffset.y;
    if (!this.isModalDragging) {
      this.syncPercentPill();
    }
  };

  handleContentSizeChange = (_w, h) => {
    this.contentHeight = h;
    if (!this.isModalDragging) {
      this.syncPercentPill();
    }
  };

  handleLayout = (e) => {
    this.containerHeight = e.nativeEvent.layout.height;
    if (!this.isModalDragging) {
      this.syncPercentPill();
    }
  };

  handleTouchStart = (e) => {
    const touch = e && e.nativeEvent;
    if (!touch) return;
    this.touchStartX = touch.pageX;
    this.touchStartY = touch.pageY;
    this.touchStartTime = Date.now();
  };

  handleTouchEnd = (e) => {
    const { onToggleHeader, shouldIgnoreTap } = this.props;
    const touch = e && e.nativeEvent;
    if (!onToggleHeader || !touch || !this.touchStartTime) {
      return;
    }
    const dx = Math.abs(touch.pageX - this.touchStartX);
    const dy = Math.abs(touch.pageY - this.touchStartY);
    const dt = Date.now() - this.touchStartTime;
    this.touchStartTime = 0;
    if (dx < 10 && dy < 10 && dt < 280) {
      if (shouldIgnoreTap && shouldIgnoreTap()) {
        return;
      }
      onToggleHeader();
    }
  };

  handleScrollToIndexFailed = (info) => {
    if (!this.listRef.current) {
      return;
    }
    const offset = Math.max(0, info.averageItemLength * info.index);
    this.listRef.current.scrollToOffset({ offset, animated: false });
    setTimeout(() => {
      if (this.listRef.current) {
        this.listRef.current.scrollToIndex({
          index: info.index,
          animated: false,
          viewPosition: 0,
        });
      }
    }, 60);
  };

  // --- Modal navigation ---
  openModal = () => {
    this.setState({
      modalOpen: true,
      modalThumbTop: this.getModalThumbTop(),
    });
  };

  closeModal = () => {
    this.isModalDragging = false;
    this.setState({ modalOpen: false, modalDragging: false });
  };

  getModalTrackHeight() {
    return Dimensions.get('window').height - 200;
  }

  getModalThumbTop() {
    const ratio = this.getRatio();
    const trackH = this.getModalTrackHeight();
    return ratio * (trackH - MODAL_THUMB_H);
  }

  handleModalGrant = (e) => {
    this.isModalDragging = true;
    const currentThumbTop = this.getModalThumbTop();
    this.setState({ modalDragging: true, modalThumbTop: currentThumbTop });
    // Stop momentum
    if (this.listRef.current) {
      this.listRef.current.scrollToOffset({
        offset: this.scrollY,
        animated: false,
      });
    }
    this.modalDragStartThumbTop = currentThumbTop;
    this.modalDragStartY = e.nativeEvent.pageY;
  };

  handleModalMove = (e) => {
    if (!this.isModalDragging) return;
    const scrollable = this.getScrollable();
    if (!scrollable) return;
    const trackH = this.getModalTrackHeight();
    const maxTop = trackH - MODAL_THUMB_H;
    if (!maxTop) return;
    const dy = e.nativeEvent.pageY - this.modalDragStartY;
    const nextThumbTop = Math.max(
      0,
      Math.min(this.modalDragStartThumbTop + dy, maxTop),
    );
    const targetRatio = nextThumbTop / maxTop;
    const targetOffset = targetRatio * scrollable;
    const materializedScrollable = Math.max(
      0,
      this.contentHeight - this.containerHeight,
    );

    if (this.listRef.current) {
      if (
        targetOffset <= materializedScrollable ||
        this.highestRenderedIndex >= this.estimatedHeights.length - 1
      ) {
        this.scrollY = targetOffset;
        this.listRef.current.scrollToOffset({
          offset: targetOffset,
          animated: false,
        });
      } else {
        let acc = this.contentHeight;
        let targetIndex = this.estimatedHeights.length - 1;
        for (
          let i = this.highestRenderedIndex + 1;
          i < this.estimatedHeights.length;
          i += 1
        ) {
          acc += this.estimatedHeights[i];
          if (acc >= targetOffset + this.containerHeight * 0.5) {
            targetIndex = i;
            break;
          }
        }
        this.listRef.current.scrollToIndex({
          index: targetIndex,
          animated: false,
          viewPosition: 0,
        });
      }
    }
    this.syncPercentPill(targetRatio);
    this.setState({ modalThumbTop: nextThumbTop });
  };

  handleModalRelease = () => {
    this.isModalDragging = false;
    this.setState({ modalDragging: false });
    this.syncPercentPill();
  };

  getSliderSide() {
    const { sliderSide } = this.props;
    return sliderSide === 'left' ? 'left' : 'right';
  }

  getPercentageSide() {
    const { sliderPercentageSide, sliderSide } = this.props;
    if (sliderPercentageSide === 'left' || sliderPercentageSide === 'right') {
      return sliderPercentageSide;
    }
    return sliderSide === 'left' ? 'left' : 'right';
  }

  keyExtractor = (block) => block.key;

  renderBlock = ({ item: block, index }) => {
    if (index > this.highestRenderedIndex) {
      this.highestRenderedIndex = index;
    }
    const {
      debugInfo,
      embeddedImages,
      maxWidth,
      renderNode,
      textComponentProps,
      TextComponent,
    } = this.props;

    if (block.type === 'image') {
      return (
        <NovelInlineImage
          debugInfo={debugInfo}
          imageId={block.imageId}
          imageKind={block.imageKind}
          pageNumber={block.pageNumber}
          embeddedImages={embeddedImages}
          maxWidth={maxWidth}
        />
      );
    }

    return (
      <NovelHtmlChunk
        value={block.value}
        renderNode={renderNode}
        textComponentProps={textComponentProps}
        TextComponent={TextComponent}
      />
    );
  };

  renderModalNav() {
    const { modalOpen, modalDragging, modalThumbTop } = this.state;
    if (!modalOpen) return null;
    const trackH = this.getModalTrackHeight();
    const side = this.getSliderSide();
    const isLeft = side === 'left';

    const sliderArea = (
      <View
        style={{
          width: MODAL_SLIDER_WIDTH,
          backgroundColor: 'rgba(0,0,0,0.5)',
          paddingRight: isLeft ? 0 : MODAL_SLIDER_RIGHT_PAD,
          paddingLeft: isLeft ? MODAL_SLIDER_RIGHT_PAD : 0,
          paddingTop: 100,
          paddingBottom: 100,
          alignItems: 'center',
        }}
        onStartShouldSetResponder={() => true}
        onResponderGrant={this.handleModalGrant}
        onResponderMove={this.handleModalMove}
        onResponderRelease={this.handleModalRelease}
      >
        <View
          style={{
            width: MODAL_TRACK_WIDTH,
            height: trackH,
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: 2,
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: -(MODAL_THUMB_W - MODAL_TRACK_WIDTH) / 2,
              top: modalThumbTop,
              width: MODAL_THUMB_W,
              height: MODAL_THUMB_H,
              backgroundColor: modalDragging ? '#e0f0ff' : '#ffffff',
              borderRadius: 14,
              elevation: 6,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
            }}
          />
        </View>
      </View>
    );

    const closeArea = (
      <TouchableOpacity
        activeOpacity={1}
        onPress={this.closeModal}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
          点击退出导航
        </Text>
      </TouchableOpacity>
    );

    return (
      <Modal
        transparent
        visible
        animationType="fade"
        onRequestClose={this.closeModal}
      >
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {isLeft ? sliderArea : closeArea}
          {isLeft ? closeArea : sliderArea}
        </View>
      </Modal>
    );
  }

  getListExtraData() {
    const { maxWidth, fontSize, lineHeight, embeddedImages } = this.props;
    if (
      !this.cachedListExtraData ||
      this.cachedListExtraData.maxWidth !== maxWidth ||
      this.cachedListExtraData.fontSize !== fontSize ||
      this.cachedListExtraData.lineHeight !== lineHeight ||
      this.cachedListExtraData.embeddedImages !== embeddedImages
    ) {
      this.cachedListExtraData = {
        maxWidth,
        fontSize,
        lineHeight,
        embeddedImages,
      };
    }
    return this.cachedListExtraData;
  }

  render() {
    const { blocks } = this.props;

    return (
      <View style={{ flex: 1 }}>
        <FlatList
          ref={this.listRef}
          style={styles.list}
          contentContainerStyle={styles.container}
          data={blocks}
          extraData={this.getListExtraData()}
          renderItem={this.renderBlock}
          keyExtractor={this.keyExtractor}
          scrollEventThrottle={64}
          onScroll={this.handleScroll}
          onContentSizeChange={this.handleContentSizeChange}
          onLayout={this.handleLayout}
          onTouchStart={this.handleTouchStart}
          onTouchEnd={this.handleTouchEnd}
          onScrollToIndexFailed={this.handleScrollToIndexFailed}
          initialNumToRender={INITIAL_NUM_TO_RENDER}
          maxToRenderPerBatch={3}
          updateCellsBatchingPeriod={50}
          windowSize={3}
          removeClippedSubviews={Platform.OS === 'android'}
        />

        <PercentPill
          ref={this.pillRef}
          side={this.getPercentageSide()}
          onOpenModal={this.openModal}
        />
        {this.renderModalNav()}
      </View>
    );
  }
}

class NovelViewer extends Component {
  constructor(props) {
    super(props);
    const { items, index } = props;
    this.pageBlocksCache = new Map();
    this.cachedTextComponentPropsKey = null;
    this.cachedTextComponentProps = null;
    this.lastLinkPressTime = 0;
    this.state = {
      // eslint-disable-next-line react/no-unused-state
      index,
      routes: items.map((item, i) => ({
        key: i.toString(),
      })),
    };
  }

  componentDidUpdate(prevProps) {
    const { index, items } = this.props;
    const { index: prevIndex, items: prevItems } = prevProps;
    if (items !== prevItems) {
      this.pageBlocksCache.clear();
    }
    if (index !== prevIndex) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        // eslint-disable-next-line react/no-unused-state
        index,
      });
    }
  }

  getMemoizedHtmlTextComponentProps = () => {
    const { fontSize, lineHeight } = this.props;
    const cacheKey = `${fontSize}-${lineHeight}`;
    if (this.cachedTextComponentPropsKey !== cacheKey) {
      this.cachedTextComponentPropsKey = cacheKey;
      this.cachedTextComponentProps = this.getHtmlTextComponentProps();
    }
    return this.cachedTextComponentProps;
  };

  getBlocksForPage = (sceneIndex, item) => {
    const cached = this.pageBlocksCache.get(sceneIndex);
    if (cached && cached.item === item) {
      return cached.blocks;
    }
    const blocks = splitHtmlIntoBlocks(item);
    this.pageBlocksCache.set(sceneIndex, { item, blocks });
    return blocks;
  };

  getHtmlTextComponentProps = (textProps = {}) => {
    const { fontSize, lineHeight } = this.props;
    const { style, ...restTextProps } = textProps;

    return {
      selectable: true,
      ...restTextProps,
      style: [
        {
          fontSize,
          lineHeight: fontSize * lineHeight,
        },
        style,
      ].filter(Boolean),
    };
  };

  renderInlineSafeTextContainer = (
    node,
    index,
    parent,
    defaultRenderer,
    textProps = {},
  ) => {
    const mergedTextProps = this.getHtmlTextComponentProps(textProps);
    const { style: textStyle, ...restTextProps } = mergedTextProps;

    if (node.children.length === 1 && node.children[0].type === 'text') {
      return (
        <Text key={index} style={textStyle} {...restTextProps}>
          {decodeHtmlText(node.children[0].data)}
        </Text>
      );
    }

    const renderedChildren = node.children.reduce(
      (children, child, childIndex) => {
        const childKey = `${index}-${childIndex}`;

        if (child.type === 'text') {
          children.push(decodeHtmlText(child.data));
          return children;
        }

        const renderedChild =
          this.handleRenderNode(
            child,
            childKey,
            node.children,
            node,
            defaultRenderer,
          ) || defaultRenderer([child], node);

        React.Children.toArray(renderedChild).forEach(
          (renderedEntry, renderedEntryIndex) => {
            const renderedKey = `${childKey}-${renderedEntryIndex}`;

            if (
              typeof renderedEntry === 'string' ||
              typeof renderedEntry === 'number'
            ) {
              children.push(renderedEntry);
              return;
            }

            if (!React.isValidElement(renderedEntry)) {
              return;
            }

            children.push(
              React.cloneElement(renderedEntry, {
                key: renderedEntry.key || renderedKey,
              }),
            );
          },
        );

        return children;
      },
      [],
    );

    return (
      <Text key={index} style={textStyle} {...restTextProps}>
        {renderedChildren}
      </Text>
    );
  };

  renderChapterNode = (node, index, parent, defaultRenderer) =>
    this.renderInlineSafeTextContainer(node, index, parent, defaultRenderer, {
      style: styles.novelChapter,
    });

  markLinkPress = () => {
    this.lastLinkPressTime = Date.now();
  };

  shouldIgnoreTap = () => Date.now() - this.lastLinkPressTime < 200;

  renderAnchorNode = (node, index, parent, defaultRenderer) => {
    const { href } = node.attribs || {};

    return this.renderInlineSafeTextContainer(
      node,
      index,
      parent,
      defaultRenderer,
      {
        onPress: href
          ? () => {
              this.markLinkPress();
              Linking.openURL(decodeHtmlText(href));
            }
          : undefined,
        style: styles.pageLink,
      },
    );
  };

  handleRenderNode = (node, index, siblings, parent, defaultRenderer) => {
    const { debugInfo, embeddedImages, onPressPageLink } = this.props;
    if (node.name === 'chapter') {
      return this.renderChapterNode(node, index, parent, defaultRenderer);
    }
    if (node.name === 'jump') {
      const { page } = node.attribs;
      return this.renderInlineSafeTextContainer(
        node,
        index,
        parent,
        defaultRenderer,
        {
          onPress: () => {
            this.markLinkPress();
            onPressPageLink(page);
          },
          style: styles.pageLink,
        },
      );
    }
    if (node.name === 'a') {
      return this.renderAnchorNode(node, index, parent, defaultRenderer);
    }
    if (node.name === 'px-image') {
      const imageId = node.attribs && node.attribs['data-illust-id'];
      const imageKind = node.attribs && node.attribs['data-image-kind'];
      const parsedPageNumber = parseInt(
        node.attribs && node.attribs['data-page-number'],
        10,
      );
      return (
        <NovelInlineImage
          key={index}
          debugInfo={debugInfo}
          imageId={imageId}
          imageKind={imageKind}
          pageNumber={Number.isNaN(parsedPageNumber) ? null : parsedPageNumber}
          embeddedImages={embeddedImages}
          maxWidth={this.getContentMaxWidth()}
        />
      );
    }
    // other nodes render by default renderer
    return undefined;
  };

  getContentMaxWidth = () => {
    const { windowWidth } = this.props;
    const width =
      typeof windowWidth === 'number' && windowWidth > 0
        ? windowWidth
        : Dimensions.get('window').width;
    return Math.max(100, width - 20);
  };

  handleOnPressOpenSettings = () => {
    const { openModal } = this.props;
    openModal(MODAL_TYPES.NOVEL_SETTINGS);
  };

  renderHtmlViewTextComponent = (props) => {
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <Text {...props} />;
  };

  renderScene = ({ route }) => {
    const { routes } = this.state;
    const {
      novelId,
      items,
      fontSize,
      lineHeight,
      debugInfo,
      embeddedImages,
      sliderSide,
      sliderPercentageSide,
      onToggleHeader,
    } = this.props;
    const sceneIndex = routes.indexOf(route);
    const item = items[sceneIndex];
    const blocks = this.getBlocksForPage(sceneIndex, item);
    const maxWidth = this.getContentMaxWidth();
    const textComponentProps = this.getMemoizedHtmlTextComponentProps();

    return (
      <NovelPage
        key={`${novelId}-scene-${sceneIndex}`}
        blocks={blocks}
        fontSize={fontSize}
        lineHeight={lineHeight}
        debugInfo={debugInfo}
        embeddedImages={embeddedImages}
        maxWidth={maxWidth}
        renderNode={this.handleRenderNode}
        textComponentProps={textComponentProps}
        TextComponent={this.renderHtmlViewTextComponent}
        sliderSide={sliderSide}
        sliderPercentageSide={sliderPercentageSide}
        onToggleHeader={onToggleHeader}
        shouldIgnoreTap={this.shouldIgnoreTap}
      />
    );
  };

  renderTabBar = () => null;

  render() {
    const { onIndexChange } = this.props;
    return (
      <PXTabView
        navigationState={this.state}
        renderTabBar={this.renderTabBar}
        renderScene={this.renderScene}
        onIndexChange={onIndexChange}
        lazyPreloadDistance={1}
      />
    );
  }
}

export default NovelViewer;
