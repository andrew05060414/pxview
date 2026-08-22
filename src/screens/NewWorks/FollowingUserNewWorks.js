import React, { Component } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { withTheme, Button } from 'react-native-paper';
import FollowingUserIllusts from './FollowingUserIllusts';
import FollowingUserNovels from './FollowingUserNovels';
import { connectLocalization } from '../../components/Localization';
import PXTabView from '../../components/PXTabView';
import Pills from '../../components/Pills';
import HeaderFilterButton from '../../components/HeaderFilterButton';
import VisibilityFilterModal from '../../components/VisibilityFilterModal';
import EmptyStateView from '../../components/EmptyStateView';
import { SCREENS } from '../../common/constants';
import { globalStyles, globalStyleVariables } from '../../styles';

const styles = StyleSheet.create({
  pills: {
    padding: 10,
  },
  pillFilterButton: {
    position: 'absolute',
    right: 0,
  },
});

class FollowingUserNewWorks extends Component {
  constructor(props) {
    super(props);
    this.state = {
      index: 0,
      isOpenIllustFilterModal: false,
      isOpenNovelFilterModal: false,
      illustFilterOptions: {
        restrict: 'all',
      },
      novelFilterOptions: {
        restrict: 'all',
      },
    };
  }

  handleOnPressPill = (index) => {
    this.setState({ index });
  };

  handleOnIndexChange = (index) => {
    this.setState({ index });
  };

  renderScene = ({ route }) => {
    const { active, navigation } = this.props;
    const { illustFilterOptions, novelFilterOptions } = this.state;
    switch (route.key) {
      case 'illust':
        return (
          <FollowingUserIllusts
            renderEmpty={this.renderEmpty}
            navigation={navigation}
            active={active}
            options={illustFilterOptions}
          />
        );
      case 'novel':
        return (
          <FollowingUserNovels
            renderEmpty={this.renderEmpty}
            navigation={navigation}
            active={active}
            options={novelFilterOptions}
          />
        );
      default:
        return null;
    }
  };

  handleOnPressFilterButton = () => {
    const { index } = this.state;
    if (index === 0) {
      this.handleOnPressIllustFilterButton();
    } else {
      this.handleOnPressNovelFilterButton();
    }
  };

  handleOnPressIllustFilterButton = () => {
    this.setState({
      isOpenIllustFilterModal: true,
    });
  };

  handleOnPressCloseIllustFilterButton = () => {
    this.setState({
      isOpenIllustFilterModal: false,
    });
  };

  handleOnSelectIllustVisibility = (visibility) => {
    this.setState({
      isOpenIllustFilterModal: false,
      illustFilterOptions: {
        restrict: visibility,
      },
    });
  };

  handleOnPressNovelFilterButton = () => {
    this.setState({
      isOpenNovelFilterModal: true,
    });
  };

  handleOnPressCloseNovelFilterButton = () => {
    this.setState({
      isOpenNovelFilterModal: false,
    });
  };

  handleOnSelectNovelVisibility = (visibility) => {
    this.setState({
      isOpenNovelFilterModal: false,
      novelFilterOptions: {
        restrict: visibility,
      },
    });
  };

  handleOnPressFindRecommendedUsers = () => {
    const {
      navigation: { push },
    } = this.props;
    push(SCREENS.RecommendedUsers);
  };

  renderPillFilterButton = () => {
    const { theme } = this.props;
    return (
      <View style={styles.pillFilterButton}>
        <HeaderFilterButton
          color={theme.dark ? '#fff' : globalStyleVariables.PRIMARY_COLOR}
          onPress={this.handleOnPressFilterButton}
        />
      </View>
    );
  };

  renderHeader = () => {
    const { i18n } = this.props;
    const { index } = this.state;
    return (
      <Pills
        items={[
          {
            title: i18n.illustManga,
          },
          {
            title: i18n.novel,
          },
        ]}
        renderRightButton={this.renderPillFilterButton}
        onPressItem={this.handleOnPressPill}
        selectedIndex={index}
        style={styles.pills}
      />
    );
  };

  renderEmpty = () => {
    const { i18n } = this.props;
    return (
      <EmptyStateView
        iconName="users"
        iconType="font-awesome"
        title={i18n.noFollowUser}
        description={i18n.noNewWorkFollowSuggestion}
        actionButton={
          <Button
            mode="contained"
            onPress={this.handleOnPressFindRecommendedUsers}
          >
            {i18n.recommendedUsersFind}
          </Button>
        }
      />
    );
  };

  render() {
    const { i18n } = this.props;
    const {
      index,
      isOpenIllustFilterModal,
      isOpenNovelFilterModal,
      illustFilterOptions,
      novelFilterOptions,
    } = this.state;
    return (
      <View style={globalStyles.container}>
        <PXTabView
          navigationState={{
            index,
            routes: [
              { key: 'illust', title: i18n.illustManga },
              { key: 'novel', title: i18n.novel },
            ],
          }}
          renderTabBar={() => this.renderHeader()}
          renderScene={this.renderScene}
          onIndexChange={this.handleOnIndexChange}
          includeStatusBarPadding={Platform.OS === 'ios'}
        />
        <VisibilityFilterModal
          isOpen={isOpenIllustFilterModal}
          onPressCloseButton={this.handleOnPressCloseIllustFilterButton}
          onSelectVisibility={this.handleOnSelectIllustVisibility}
          visibility={illustFilterOptions.restrict}
        />
        <VisibilityFilterModal
          isOpen={isOpenNovelFilterModal}
          onPressCloseButton={this.handleOnPressCloseNovelFilterButton}
          onSelectVisibility={this.handleOnSelectNovelVisibility}
          visibility={novelFilterOptions.restrict}
        />
      </View>
    );
  }
}

export default withTheme(connectLocalization(FollowingUserNewWorks));
