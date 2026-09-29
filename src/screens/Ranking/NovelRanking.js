import React, { Component } from 'react';
import { Platform } from 'react-native';
import { connect } from 'react-redux';
import NovelRankingList from './NovelRankingList';
import PastRanking from './PastRanking';
import PXTabView from '../../components/PXTabView';
import TabContentWrapper from '../../components/TabContentWrapper';
import { connectLocalization } from '../../components/Localization';
import { RANKING_FOR_UI } from '../../common/constants';
import mapRankingTypeString from '../../common/helpers/mapRankingTypeString';

class NovelRanking extends Component {
  constructor(props) {
    super(props);
    this.state = {
      index: 0,
      routes: this.getRoutes(),
    };
  }

  componentDidMount() {
    const { navigation, route, i18n } = this.props;
    navigation.setOptions({
      title: `${mapRankingTypeString(route.params?.rankingType, i18n)} ${
        i18n.ranking
      }`,
    });
  }

  componentDidUpdate(prevProps) {
    const previousRestriction = prevProps.user?.x_restrict || 0;
    const restriction = this.props.user?.x_restrict || 0;
    if (previousRestriction !== restriction) {
      const routes = this.getRoutes();
      this.setState(({ index }) => ({
        routes,
        index: Math.min(index, routes.length - 1),
      }));
    }
  }

  getRoutes = () => {
    const { i18n, user } = this.props;
    const restriction = user?.x_restrict || 0;
    // always return new array so that localized title will be updated on switch language
    const routes = [
      {
        key: '1',
        title: i18n.rankingDay,
        rankingMode: RANKING_FOR_UI.DAILY_NOVEL,
        reload: false,
      },
      {
        key: '2',
        title: i18n.rankingDayMale,
        rankingMode: RANKING_FOR_UI.DAILY_MALE_NOVEL,
      },
      {
        key: '3',
        title: i18n.rankingDayFemale,
        rankingMode: RANKING_FOR_UI.DAILY_FEMALE_NOVEL,
      },
      {
        key: '4',
        title: i18n.rankingWeekRookie,
        rankingMode: RANKING_FOR_UI.WEEKLY_ROOKIE_NOVEL,
      },
      {
        key: '5',
        title: i18n.rankingWeek,
        rankingMode: RANKING_FOR_UI.WEEKLY_NOVEL,
      },
    ];
    if (restriction > 0) {
      routes.push(
        {
          key: 'r18-day',
          title: i18n.rankingDayR18,
          rankingMode: RANKING_FOR_UI.DAILY_R18_NOVEL,
        },
        {
          key: 'r18-week',
          title: i18n.rankingWeekR18,
          rankingMode: RANKING_FOR_UI.WEEKLY_R18_NOVEL,
        },
        {
          key: 'r18-male',
          title: i18n.rankingDayMaleR18,
          rankingMode: RANKING_FOR_UI.DAILY_MALE_R18_NOVEL,
        },
        {
          key: 'r18-female',
          title: i18n.rankingDayFemaleR18,
          rankingMode: RANKING_FOR_UI.DAILY_FEMALE_R18_NOVEL,
        },
      );
    }
    if (restriction > 1) {
      routes.push({
        key: 'r18g-week',
        title: i18n.rankingWeekR18G,
        rankingMode: RANKING_FOR_UI.WEEKLY_R18G_NOVEL,
      });
    }
    routes.push({
      key: 'past',
      title: i18n.rankingPast,
      rankingMode: RANKING_FOR_UI.PAST_NOVEL,
    });
    return routes;
  };

  handleChangeTab = (index) => {
    this.setState({ index });
  };

  renderScene = ({ route }) => {
    const { route: navigationRoute } = this.props;
    const { routes, index } = this.state;
    const { rankingType } = navigationRoute.params;
    const { rankingMode, reload } = route;
    return (
      <TabContentWrapper active={routes.indexOf(route) === index}>
        {rankingMode === RANKING_FOR_UI.PAST_NOVEL ? (
          <PastRanking
            rankingType={rankingType}
            rankingMode={rankingMode}
            route={route}
          />
        ) : (
          <NovelRankingList
            rankingMode={rankingMode}
            route={route}
            reload={reload}
          />
        )}
      </TabContentWrapper>
    );
  };

  render() {
    return (
      <PXTabView
        navigationState={this.state}
        renderScene={this.renderScene}
        onIndexChange={this.handleChangeTab}
        scrollEnabled
        includeStatusBarPadding={Platform.OS === 'ios'}
      />
    );
  }
}

export default connect((state) => ({ user: state.auth.user }))(
  connectLocalization(NovelRanking),
);
