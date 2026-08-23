import React, { useState, useMemo } from 'react';
import { StyleSheet, View, FlatList, ScrollView, Text } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  useTheme,
  Button,
  ProgressBar,
  Chip,
  Subheading,
  Caption,
  Divider,
} from 'react-native-paper';
import { useLocalization } from '../../../components/Localization';
import PXListItem from '../../../components/PXListItem';
import EmptyStateView from '../../../components/EmptyStateView';
import {
  syncFollowingInsightsStart,
  syncFollowingInsightsCancel,
} from '../../../common/actions/followingInsights';
import {
  sortAuthorsByActivity,
  bucketByInactivity,
} from '../../../common/helpers/followingInsightsCompute';
import { SCREENS } from '../../../common/constants';
import { globalStyleVariables } from '../../../styles';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressContainer: {
    marginVertical: 6,
  },
  chipsScrollView: {
    marginVertical: 6,
  },
  chip: {
    marginRight: 8,
  },
  authorSub: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  restrictBadge: {
    fontSize: 11,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginRight: 6,
    overflow: 'hidden',
  },
});

const FollowingInsights = ({ navigation }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { i18n } = useLocalization();
  const [activeTab, setActiveTab] = useState('all');

  const { syncing, progress, lastSyncedAt, error, authors } = useSelector(
    (state) => state.followingInsights,
  );

  const authorList = useMemo(() => Object.values(authors || {}), [authors]);
  const sortedAll = useMemo(() => sortAuthorsByActivity(authorList), [
    authorList,
  ]);
  const buckets = useMemo(() => bucketByInactivity(authorList), [authorList]);

  const displayedAuthors = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return buckets.active;
      case 'stale3m':
        return buckets.stale3m;
      case 'stale1y':
        return buckets.stale1y;
      case 'unknown':
        return buckets.unknown;
      default:
        return sortedAll;
    }
  }, [activeTab, buckets, sortedAll]);

  const handleOnPressSync = () => {
    if (syncing) {
      dispatch(syncFollowingInsightsCancel());
    } else {
      dispatch(syncFollowingInsightsStart());
    }
  };

  const handleOnPressAuthor = (authorId) => {
    if (authorId) {
      navigation.navigate(SCREENS.UserDetail, { userId: authorId });
    }
  };

  const renderAuthorItem = ({ item }) => {
    const isPrivate = item.restrict === 'private';
    const dateStr = item.lastActiveAt
      ? item.lastActiveAt.slice(0, 10)
      : i18n.followingInsightsNoActivity;

    return (
      <PXListItem
        key={item.id}
        title={item.name || `User ${item.id}`}
        description={`${i18n.followingInsightsLastActive}: ${dateStr} · ${
          i18n.userIllusts
        }: ${item.illustCount || 0} · ${i18n.userNovels}: ${
          item.novelCount || 0
        }`}
        left={() => (
          <View style={{ justifyContent: 'center', marginRight: 6 }}>
            <Text
              style={[
                styles.restrictBadge,
                {
                  backgroundColor: isPrivate ? '#ff9800' : '#2196f3',
                  color: '#fff',
                },
              ]}
            >
              {isPrivate ? i18n.followingPrivate : i18n.followingPublic}
            </Text>
          </View>
        )}
        onPress={() => handleOnPressAuthor(item.id)}
      />
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.headerCard,
          { backgroundColor: theme.colors.surface || theme.colors.background },
        ]}
      >
        <View style={styles.syncRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Subheading>
              {i18n.followingInsightsTitle} ({authorList.length})
            </Subheading>
            {lastSyncedAt ? (
              <Caption>
                {i18n.followingInsightsLastSynced}:{' '}
                {new Date(lastSyncedAt).toLocaleString()}
              </Caption>
            ) : null}
            {error ? (
              <Caption style={{ color: theme.colors.error }}>
                {String(error)}
              </Caption>
            ) : null}
          </View>
          <Button
            mode={syncing ? 'outlined' : 'contained'}
            color={globalStyleVariables.PRIMARY_COLOR}
            loading={syncing}
            onPress={handleOnPressSync}
          >
            {syncing
              ? i18n.followingInsightsCancel
              : i18n.followingInsightsSync}
          </Button>
        </View>

        {syncing && (
          <View style={styles.progressContainer}>
            <ProgressBar
              indeterminate={progress.pagesDone === 0}
              progress={0.5}
              color={globalStyleVariables.PRIMARY_COLOR}
            />
            <Caption>
              {i18n.followingInsightsSyncing} ({progress.authorsSynced}{' '}
              {i18n.user})
            </Caption>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScrollView}
        >
          <Chip
            selected={activeTab === 'all'}
            style={styles.chip}
            onPress={() => setActiveTab('all')}
          >
            {i18n.followingInsightsTabAll} ({sortedAll.length})
          </Chip>
          <Chip
            selected={activeTab === 'active'}
            style={styles.chip}
            onPress={() => setActiveTab('active')}
          >
            {i18n.followingInsightsTabActive} ({buckets.active.length})
          </Chip>
          <Chip
            selected={activeTab === 'stale3m'}
            style={styles.chip}
            onPress={() => setActiveTab('stale3m')}
          >
            {i18n.followingInsightsTabStale3m} ({buckets.stale3m.length})
          </Chip>
          <Chip
            selected={activeTab === 'stale1y'}
            style={styles.chip}
            onPress={() => setActiveTab('stale1y')}
          >
            {i18n.followingInsightsTabStale1y} ({buckets.stale1y.length})
          </Chip>
          <Chip
            selected={activeTab === 'unknown'}
            style={styles.chip}
            onPress={() => setActiveTab('unknown')}
          >
            {i18n.followingInsightsTabUnknown} ({buckets.unknown.length})
          </Chip>
        </ScrollView>
      </View>

      {displayedAuthors.length === 0 ? (
        <EmptyStateView
          iconName="users"
          iconType="font-awesome"
          title={
            authorList.length === 0
              ? i18n.followingInsightsEmpty
              : i18n.noResults
          }
        />
      ) : (
        <FlatList
          data={displayedAuthors}
          keyExtractor={(item) => item.id}
          renderItem={renderAuthorItem}
          ItemSeparatorComponent={Divider}
        />
      )}
    </View>
  );
};

export default FollowingInsights;
