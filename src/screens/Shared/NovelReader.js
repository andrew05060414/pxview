import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { withTheme, Button } from 'react-native-paper';
import NovelViewer from '../../components/NovelViewer';
import PXHeader from '../../components/PXHeader';
import HeaderTextTitle from '../../components/HeaderTextTitle';
import HeaderSettingsButton from '../../components/HeaderSettingsButton';
import BookmarkNovelButton from '../../components/BookmarkNovelButton';
import Loader from '../../components/Loader';
import EmptyStateView from '../../components/EmptyStateView';
import withWindowWidth from '../../components/withWindowWidth';
import { connectLocalization } from '../../components/Localization';
import * as novelTextActionCreators from '../../common/actions/novelText';
import * as modalActionCreators from '../../common/actions/modal';
import { makeGetParsedNovelText } from '../../common/selectors';
import { MODAL_TYPES, READING_DIRECTION_TYPES } from '../../common/constants';
import { READING_PROGRESS } from '../../common/constants/actionTypes';
import { globalStyles } from '../../styles';

const styles = StyleSheet.create({
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 6,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBookmarkContainer: {
    marginRight: 8,
    padding: 8,
  },
});

export const resolveInitialNovelPageIndex = ({
  parsedNovelText,
  savedPageIndex,
  novelReadingDirection,
}) => {
  if (!Array.isArray(parsedNovelText) || parsedNovelText.length === 0) {
    return 0;
  }
  if (typeof savedPageIndex === 'number' && Number.isFinite(savedPageIndex)) {
    return Math.min(
      Math.max(Math.trunc(savedPageIndex), 0),
      parsedNovelText.length - 1,
    );
  }
  return novelReadingDirection === READING_DIRECTION_TYPES.RIGHT_TO_LEFT
    ? parsedNovelText.length - 1
    : 0;
};

class NovelReader extends Component {
  constructor(props) {
    super(props);
    const { novelReadingDirection, parsedNovelText, savedPageIndex } = props;
    const index = resolveInitialNovelPageIndex({
      parsedNovelText,
      savedPageIndex,
      novelReadingDirection,
    });
    this.state = {
      index,
      showHeader: false,
    };
  }

  componentDidMount() {
    const { fetchNovelText, clearNovelText, novelText, novelId } = this.props;
    if (!novelText || !novelText.text) {
      clearNovelText(novelId);
      fetchNovelText(novelId);
    } else if (novelText.embeddedImagesIncomplete) {
      fetchNovelText(novelId, true);
    }
  }

  componentDidUpdate(prevProps) {
    const {
      novelReadingDirection,
      parsedNovelText,
      savedPageIndex,
    } = this.props;
    const { parsedNovelText: prevParsedNovelText } = prevProps;
    if (parsedNovelText && !prevParsedNovelText) {
      const index = resolveInitialNovelPageIndex({
        parsedNovelText,
        savedPageIndex,
        novelReadingDirection,
      });
      this.setState({ index });
    }
  }

  handleOnRetry = () => {
    const { fetchNovelText, clearNovelText, novelId } = this.props;
    clearNovelText(novelId);
    fetchNovelText(novelId);
  };

  handleOnIndexChange = (index) => {
    const { novelId, dispatch } = this.props;
    this.setState({ index });
    dispatch({
      type: READING_PROGRESS.SET,
      payload: { novelId, pageIndex: index },
    });
  };

  handleOnPressPageLink = (page) => {
    const { novelReadingDirection, parsedNovelText } = this.props;
    const parsedPage = parseInt(page, 10);
    this.setState({
      index:
        novelReadingDirection === READING_DIRECTION_TYPES.RIGHT_TO_LEFT
          ? parsedNovelText.length - parsedPage
          : parsedPage - 1,
    });
  };

  handleOnPressOpenSettings = () => {
    const { openModal } = this.props;
    openModal(MODAL_TYPES.NOVEL_SETTINGS);
  };

  handleToggleHeader = () => {
    this.setState((prevState) => ({
      showHeader: !prevState.showHeader,
    }));
  };

  renderHeaderTitle = () => {
    const { parsedNovelText, novelReadingDirection } = this.props;
    const { index } = this.state;
    return (
      <HeaderTextTitle>
        {`${
          novelReadingDirection === READING_DIRECTION_TYPES.RIGHT_TO_LEFT
            ? parsedNovelText.length - index
            : index + 1
        }/${parsedNovelText.length}`}
      </HeaderTextTitle>
    );
  };

  renderHeaderRight = () => {
    const { novelItem } = this.props;
    return (
      <View style={styles.headerRightContainer}>
        {novelItem && (
          <View style={styles.headerBookmarkContainer}>
            <BookmarkNovelButton item={novelItem} size={24} />
          </View>
        )}
        <HeaderSettingsButton onPress={this.handleOnPressOpenSettings} />
      </View>
    );
  };

  render() {
    const {
      novelId,
      novelText,
      parsedNovelText,
      novelSettings: { fontSize, lineHeight },
      i18n,
      theme,
    } = this.props;
    const { index, showHeader } = this.state;
    const hasCachedText = Boolean(novelText && novelText.text);
    const isLoading =
      (!hasCachedText && (!novelText || !novelText.loaded || novelText.loading)) ||
      (parsedNovelText && index === null);
    const isErrorOrEmpty =
      !isLoading &&
      (!parsedNovelText || !parsedNovelText.length);
    const isHeaderVisible = showHeader || isLoading || isErrorOrEmpty;

    return (
      <View
        style={[
          globalStyles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        {isLoading && <Loader />}
        {isErrorOrEmpty && (
          <EmptyStateView
            iconName="book-open"
            iconType="feather"
            title={i18n ? i18n.noResults || 'No content' : 'No content'}
            description={
              i18n
                ? i18n.novelLoadError || 'Failed to load novel text'
                : 'Failed to load novel text'
            }
            actionButton={
              <Button mode="contained" onPress={this.handleOnRetry}>
                {i18n ? i18n.retry || 'Retry' : 'Retry'}
              </Button>
            }
          />
        )}
        {parsedNovelText && index !== null && !isErrorOrEmpty && (
          <NovelViewer
            novelId={novelId}
            items={parsedNovelText}
            debugInfo={novelText && novelText.debugInfo}
            embeddedImages={novelText && novelText.embeddedImages}
            index={index}
            fontSize={fontSize}
            lineHeight={lineHeight}
            windowWidth={this.props.windowWidth}
            onIndexChange={this.handleOnIndexChange}
            onPressPageLink={this.handleOnPressPageLink}
            onToggleHeader={this.handleToggleHeader}
            sliderSide={this.props.sliderSide}
            sliderPercentageSide={this.props.sliderPercentageSide}
          />
        )}
        {isHeaderVisible && (
          <View style={styles.floatingHeader}>
            <PXHeader
              darkTheme
              withShadow
              showBackButton
              headerTitle={parsedNovelText && this.renderHeaderTitle()}
              headerRight={this.renderHeaderRight()}
            />
          </View>
        )}
      </View>
    );
  }
}

export default withWindowWidth(
  withTheme(
    connectLocalization(
      connect(
        () => {
          const getParsedNovelText = makeGetParsedNovelText();
          return (state, props) => {
            const {
              entities,
              novelText,
              novelSettings,
              readingSettings,
              readingProgress,
            } = state;
            const parsedNovelText = getParsedNovelText(state, props);
            const novelId = props.novelId || props.route.params.novelId;
            const novelItem =
              (entities && entities.novels && entities.novels[novelId]) ||
              (novelId ? { id: novelId, is_bookmarked: false } : null);
            return {
              novelText: novelText[novelId],
              novelId,
              novelItem,
              parsedNovelText,
              novelSettings,
              novelReadingDirection: readingSettings.novelReadingDirection,
              sliderSide: readingSettings.sliderSide || 'right',
              sliderPercentageSide:
                readingSettings.sliderPercentageSide ||
                readingSettings.sliderSide ||
                'right',
              savedPageIndex:
                readingProgress[novelId] != null
                  ? readingProgress[novelId].pageIndex
                  : null,
            };
          };
        },
        (dispatch) => ({
          dispatch,
          ...bindActionCreators(
            { ...novelTextActionCreators, ...modalActionCreators },
            dispatch,
          ),
        }),
      )(NovelReader),
    ),
  ),
);
