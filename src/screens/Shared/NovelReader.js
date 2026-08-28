import React, { Component } from 'react';
import { View, InteractionManager } from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { withTheme, Button } from 'react-native-paper';
import NovelViewer from '../../components/NovelViewer';
import PXHeader from '../../components/PXHeader';
import HeaderTextTitle from '../../components/HeaderTextTitle';
import HeaderSettingsButton from '../../components/HeaderSettingsButton';
import Loader from '../../components/Loader';
import EmptyStateView from '../../components/EmptyStateView';
import { connectLocalization } from '../../components/Localization';
import * as novelTextActionCreators from '../../common/actions/novelText';
import * as modalActionCreators from '../../common/actions/modal';
import { makeGetParsedNovelText } from '../../common/selectors';
import { MODAL_TYPES, READING_DIRECTION_TYPES } from '../../common/constants';
import { READING_PROGRESS } from '../../common/constants/actionTypes';
import { globalStyles } from '../../styles';

class NovelReader extends Component {
  constructor(props) {
    super(props);
    const { novelReadingDirection, parsedNovelText, savedPageIndex } = props;
    let index = 0;
    if (parsedNovelText) {
      if (
        savedPageIndex != null &&
        savedPageIndex > 0 &&
        savedPageIndex < parsedNovelText.length
      ) {
        index = savedPageIndex;
      } else if (
        novelReadingDirection === READING_DIRECTION_TYPES.RIGHT_TO_LEFT
      ) {
        index = parsedNovelText.length - 1;
      }
    }
    this.state = { index };
  }

  componentDidMount() {
    const { fetchNovelText, clearNovelText, novelText, novelId } = this.props;
    if (!novelText || !novelText.text) {
      clearNovelText(novelId);
      InteractionManager.runAfterInteractions(() => {
        fetchNovelText(novelId);
      });
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
      let index;
      if (
        savedPageIndex != null &&
        savedPageIndex > 0 &&
        savedPageIndex < parsedNovelText.length
      ) {
        index = savedPageIndex;
      } else {
        index =
          novelReadingDirection === READING_DIRECTION_TYPES.RIGHT_TO_LEFT
            ? parsedNovelText.length - 1
            : 0;
      }
      this.setState({ index });
    }
  }

  handleOnRetry = () => {
    const { fetchNovelText, clearNovelText, novelId } = this.props;
    clearNovelText(novelId);
    InteractionManager.runAfterInteractions(() => {
      fetchNovelText(novelId);
    });
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

  renderHeaderRight = () => (
    <HeaderSettingsButton onPress={this.handleOnPressOpenSettings} />
  );

  render() {
    const {
      novelId,
      novelText,
      parsedNovelText,
      novelSettings: { fontSize, lineHeight },
      i18n,
      theme,
    } = this.props;
    const { index } = this.state;
    const isLoading =
      !novelText ||
      !novelText.loaded ||
      novelText.loading ||
      (parsedNovelText && index === null);
    const isErrorOrEmpty =
      !isLoading &&
      (!parsedNovelText || !parsedNovelText.length);

    return (
      <View
        style={[
          globalStyles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <PXHeader
          darkTheme
          withShadow
          showBackButton
          headerTitle={parsedNovelText && this.renderHeaderTitle()}
          headerRight={this.renderHeaderRight()}
        />
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
            onIndexChange={this.handleOnIndexChange}
            onPressPageLink={this.handleOnPressPageLink}
            sliderSide={this.props.sliderSide}
            sliderPercentageSide={this.props.sliderPercentageSide}
          />
        )}
      </View>
    );
  }
}

export default withTheme(
  connectLocalization(
    connect(
    () => {
      const getParsedNovelText = makeGetParsedNovelText();
      return (state, props) => {
        const {
          novelText,
          novelSettings,
          readingSettings,
          readingProgress,
        } = state;
        const parsedNovelText = getParsedNovelText(state, props);
        const novelId = props.novelId || props.route.params.novelId;
        return {
          novelText: novelText[novelId],
          novelId,
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
  )(NovelReader)),
);
