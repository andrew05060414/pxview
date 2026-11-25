import React, { useState, useRef } from 'react';
import { FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import RankingHorizontalList from './RankingHorizontalList';
import NovelRankingPreview from './NovelRankingPreview';
import { useLocalization } from '../../components/Localization';
import { RANKING_TYPES, RANKING_FOR_UI, SCREENS } from '../../common/constants';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const RankingPreview = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { i18n } = useLocalization();
  const [refreshing, toggleRefreshing] = useState(false);
  const ref = useRef(null);
  useScrollToTop(ref);

  const renderHeader = () => {
    return (
      <>
        <Button
          icon="trophy"
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate(SCREENS.NovelRanking, {
              rankingType: RANKING_TYPES.NOVEL,
            })
          }
        >
          {`${i18n.novel} ${i18n.ranking}`}
        </Button>
        <RankingHorizontalList
          rankingMode={RANKING_FOR_UI.DAILY_ILLUST}
          rankingType={RANKING_TYPES.ILLUST}
          navigation={navigation}
          refreshing={refreshing}
          theme={theme}
          onRefreshSuccess={() => toggleRefreshing(false)}
        />
        <RankingHorizontalList
          rankingMode={RANKING_FOR_UI.DAILY_MANGA}
          rankingType={RANKING_TYPES.MANGA}
          navigation={navigation}
          refreshing={refreshing}
          theme={theme}
        />
      </>
    );
  };
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <FlatList
        ref={ref}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={
          <NovelRankingPreview
            rankingMode={RANKING_FOR_UI.DAILY_NOVEL}
            navigation={navigation}
            refreshing={refreshing}
            theme={theme}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => toggleRefreshing(true)}
          />
        }
      />
    </SafeAreaView>
  );
};

export default RankingPreview;
