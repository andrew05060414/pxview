import React, { Component } from 'react';
import { StyleSheet, View, ScrollView, Platform } from 'react-native';
import { connect } from 'react-redux';
import { withTheme, Text } from 'react-native-paper';
import moment from 'moment';
import camelCase from 'lodash.camelcase';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/FontAwesome';
import RankingList from './RankingList';
import NovelRankingList from './NovelRankingList';
import PXTouchable from '../../components/PXTouchable';
import PXBottomSheet from '../../components/PXBottomSheet';
import PXBottomSheetButton from '../../components/PXBottomSheetButton';
import PXBottomSheetCancelButton from '../../components/PXBottomSheetCancelButton';
import { connectLocalization } from '../../components/Localization';
import {
  RANKING_ILLUST,
  R18_RANKING_ILLUST,
  R18G_RANKING_ILLUST,
  RANKING_MANGA,
  R18_RANKING_MANGA,
  R18G_RANKING_MANGA,
  RANKING_NOVEL,
  R18_RANKING_NOVEL,
  R18G_RANKING_NOVEL,
  RANKING_TYPES,
} from '../../common/constants';
import { globalStyles, globalStyleVariables } from '../../styles';

const styles = StyleSheet.create({
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 10,
  },
  rankingPickerContainer: {
    marginRight: 10,
  },
  rankingPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: 'gray',
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 42,
  },
  rankingPickerText: {
    padding: 10,
  },
  rankingPickerIcon: {
    paddingLeft: 5,
  },
  bottomSheetListItem: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    height: 48,
  },
  bottomSheetText: {
    marginLeft: 32,
  },
  bottomSheetCancelIcon: {
    marginLeft: 3,
  },
  bottomSheetCancelText: {
    marginLeft: 36,
  },
  datePicker: {
    flex: 1,
    borderColor: 'gray',
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    height: 42,
  },
  datePickerText: {
    padding: 10,
  },
  datePickerIcon: {
    paddingLeft: 5,
  },
});

class PastRanking extends Component {
  constructor(props) {
    super(props);
    const { rankingType } = props;
    let mode;
    if (rankingType === RANKING_TYPES.ILLUST) {
      this.ranking = RANKING_ILLUST;
      this.r18Ranking = R18_RANKING_ILLUST;
      this.r18GRanking = R18G_RANKING_ILLUST;
      mode = 'day';
    } else if (rankingType === RANKING_TYPES.MANGA) {
      this.ranking = RANKING_MANGA;
      this.r18Ranking = R18_RANKING_MANGA;
      this.r18GRanking = R18G_RANKING_MANGA;
      mode = 'day_manga';
    } else if (rankingType === RANKING_TYPES.NOVEL) {
      this.ranking = RANKING_NOVEL;
      this.r18Ranking = R18_RANKING_NOVEL;
      this.r18GRanking = R18G_RANKING_NOVEL;
      mode = 'day';
    }
    this.state = {
      isOpenRankingModeBottomSheet: false,
      showDatePicker: !!props.initialDatePickerVisible,
      date: moment().subtract(2, 'days').format('YYYY-MM-DD'),
      mode,
    };
  }

  openRankingModeBottomSheet = () => {
    this.setState({ isOpenRankingModeBottomSheet: true });
  };

  handleOnCancelRankingModeBottomSheet = () => {
    this.setState({ isOpenRankingModeBottomSheet: false });
  };

  handleOnPressRankingMode = (mode) => {
    this.setState({ mode });
    this.handleOnCancelRankingModeBottomSheet();
  };

  openDatePicker = () => {
    if (Platform.OS === 'android' && DateTimePickerAndroid) {
      DateTimePickerAndroid.open({
        value: moment(this.state.date, 'YYYY-MM-DD').toDate(),
        onChange: this.handleOnDateChange,
        mode: 'date',
        minimumDate: new Date(2007, 8, 13),
        maximumDate: new Date(),
      });
    } else {
      this.setState({ showDatePicker: true });
    }
  };

  handleOnDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      this.setState({ showDatePicker: false });
    }
    if (event && event.type === 'set' && selectedDate) {
      this.setState({
        date: moment(selectedDate).format('YYYY-MM-DD'),
        showDatePicker: false,
      });
    } else if (event && event.type === 'dismissed') {
      this.setState({ showDatePicker: false });
    }
  };

  mapRankingString = (ranking) => {
    const { i18n } = this.props;
    return i18n[`ranking${ranking.charAt(0).toUpperCase() + ranking.slice(1)}`];
  };

  renderRankingOptions = (ranking, rankingMode) => (
    <PXBottomSheetButton
      key={ranking}
      onPress={() => this.handleOnPressRankingMode(rankingMode)}
      iconName="md-funnel"
      iconType="ionicon"
      text={this.mapRankingString(ranking)}
    />
  );

  render() {
    const { user, i18n, route, rankingMode, rankingType, theme } = this.props;
    const { date, mode, isOpenRankingModeBottomSheet, showDatePicker } = this.state;
    const selectedRankingMode =
      rankingType === RANKING_TYPES.MANGA ? mode.replace('_manga', '') : mode;
    return (
      <View style={globalStyles.container}>
        <View style={styles.filterContainer}>
          <PXTouchable
            style={styles.rankingPickerContainer}
            onPress={this.openRankingModeBottomSheet}
          >
            <View style={styles.rankingPicker}>
              <Text style={styles.rankingPickerText}>
                {this.mapRankingString(camelCase(selectedRankingMode))}
              </Text>
              <Icon
                name="caret-down"
                size={24}
                style={styles.rankingPickerIcon}
                color={theme.colors.text}
              />
            </View>
          </PXTouchable>
          <PXTouchable
            style={styles.datePicker}
            onPress={this.openDatePicker}
          >
            <View style={styles.datePickerButton}>
              <Text style={[styles.datePickerText, { color: theme.colors.text }]}>
                {date}
              </Text>
              <Icon
                name="calendar"
                size={16}
                style={styles.datePickerIcon}
                color={theme.colors.text}
              />
            </View>
          </PXTouchable>
          {showDatePicker && (
            <DateTimePicker
              value={moment(date, 'YYYY-MM-DD').toDate()}
              mode="date"
              display="default"
              minimumDate={new Date(2007, 8, 13)}
              maximumDate={new Date()}
              onChange={this.handleOnDateChange}
            />
          )}
        </View>
        {rankingType === RANKING_TYPES.NOVEL ? (
          <NovelRankingList
            rankingMode={rankingMode}
            options={{ date, mode }}
            route={route}
          />
        ) : (
          <RankingList
            rankingMode={rankingMode}
            options={{ date, mode }}
            route={route}
          />
        )}

        <PXBottomSheet
          visible={isOpenRankingModeBottomSheet}
          onCancel={this.handleOnCancelRankingModeBottomSheet}
        >
          <ScrollView>
            {Object.keys(this.ranking).map((ranking) =>
              this.renderRankingOptions(ranking, this.ranking[ranking]),
            )}
            {user &&
              user.x_restrict > 0 &&
              Object.keys(this.r18Ranking).map((ranking) =>
                this.renderRankingOptions(ranking, this.r18Ranking[ranking]),
              )}
            {user &&
              user.x_restrict > 1 &&
              Object.keys(this.r18GRanking).map((ranking) =>
                this.renderRankingOptions(ranking, this.r18GRanking[ranking]),
              )}
            <PXBottomSheetCancelButton
              onPress={this.handleOnCancelRankingModeBottomSheet}
              text={i18n.cancel}
            />
          </ScrollView>
        </PXBottomSheet>
      </View>
    );
  }
}

export default withTheme(
  connectLocalization(
    connect((state) => ({
      user: state.auth.user,
    }))(PastRanking),
  ),
);
