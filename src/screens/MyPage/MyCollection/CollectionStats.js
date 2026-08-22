import React, { useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Text } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  useTheme,
  Button,
  ProgressBar,
  Card,
  Subheading,
  Caption,
  Chip,
} from 'react-native-paper';
import { useLocalization } from '../../../components/Localization';
import CollectionExportSection from '../../../components/CollectionExportSection';
import CollectionSearchSection from './CollectionSearchSection';
import CollectionGroupingSection from './CollectionGroupingSection';
import CollectionRulesSection from './CollectionRulesSection';
import {
  syncBookmarkLibraryStart,
  syncBookmarkLibraryCancel,
} from '../../../common/actions/bookmarkLibrary';
import {
  classifyStart,
  classifyStop,
} from '../../../common/actions/classifications';
import {
  computeCounts,
  computeTagTop,
  computeAuthorTop,
  computeYearDist,
  computeLengthDist,
} from '../../../common/helpers/bookmarkLibraryStats';
import { SCREENS } from '../../../common/constants';
import { globalStyleVariables } from '../../../styles';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabHeaderScroll: {
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  tabChip: {
    marginRight: 8,
  },
  card: {
    margin: 10,
    padding: 12,
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
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: globalStyleVariables.PRIMARY_COLOR,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    margin: 4,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
});

const CollectionStats = ({ navigation }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { i18n } = useLocalization();

  const [mainTab, setMainTab] = useState('stats'); // 'stats' | 'search' | 'grouping' | 'rules'

  const { syncing, progress, lastSyncedAt, error, items } = useSelector(
    (state) => state.bookmarkLibrary,
  );
  const aiSettings = useSelector((state) => state.aiSettings);
  const classifications = useSelector((state) => state.classifications);

  const counts = useMemo(() => computeCounts(items), [items]);
  const topTags = useMemo(() => computeTagTop(items, 15), [items]);
  const topAuthors = useMemo(() => computeAuthorTop(items, 10), [items]);
  const yearDist = useMemo(() => computeYearDist(items), [items]);
  const lengthDist = useMemo(() => computeLengthDist(items), [items]);

  const hasAiConfig = Boolean(aiSettings.baseUrl && aiSettings.apiKey);
  const classifiedCount = Object.keys(classifications.items || {}).length;

  const categoryCounts = useMemo(() => {
    const map = {};
    (classifications.categories || []).forEach((c) => {
      map[c] = 0;
    });
    Object.values(classifications.items || {}).forEach((cat) => {
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).filter(([, count]) => count > 0);
  }, [classifications]);

  const handleOnPressSync = () => {
    if (syncing) {
      dispatch(syncBookmarkLibraryCancel());
    } else {
      dispatch(syncBookmarkLibraryStart());
    }
  };

  const handleOnPressClassify = () => {
    if (classifications.classifying) {
      dispatch(classifyStop());
    } else {
      dispatch(classifyStart());
    }
  };

  const handleOnPressOpenAiSettings = () => {
    if (navigation) {
      navigation.navigate(SCREENS.AISettings);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabHeaderScroll}
      >
        <Chip
          selected={mainTab === 'stats'}
          style={styles.tabChip}
          onPress={() => setMainTab('stats')}
        >
          {i18n.collectionTabStats}
        </Chip>
        <Chip
          selected={mainTab === 'search'}
          style={styles.tabChip}
          onPress={() => setMainTab('search')}
        >
          {i18n.collectionTabSearch}
        </Chip>
        <Chip
          selected={mainTab === 'grouping'}
          style={styles.tabChip}
          onPress={() => setMainTab('grouping')}
        >
          {i18n.collectionTabGrouping}
        </Chip>
        <Chip
          selected={mainTab === 'rules'}
          style={styles.tabChip}
          onPress={() => setMainTab('rules')}
        >
          {i18n.collectionTabRules}
        </Chip>
      </ScrollView>

      {mainTab === 'search' && (
        <CollectionSearchSection navigation={navigation} />
      )}
      {mainTab === 'grouping' && (
        <CollectionGroupingSection navigation={navigation} />
      )}
      {mainTab === 'rules' && (
        <CollectionRulesSection navigation={navigation} />
      )}

      {mainTab === 'stats' && (
        <ScrollView style={styles.container}>
          <Card style={styles.card}>
            <View style={styles.syncRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Subheading>{i18n.collectionStatsTitle}</Subheading>
                {lastSyncedAt ? (
                  <Caption>
                    {i18n.collectionStatsLastSynced}:{' '}
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
                  ? i18n.collectionStatsCancel
                  : i18n.collectionStatsSync}
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
                  {i18n.collectionStatsSyncing} ({progress.itemsSynced}{' '}
                  {i18n.worksCount})
                </Caption>
              </View>
            )}
          </Card>

          <Card style={styles.card}>
            <View style={styles.syncRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Subheading>{i18n.collectionStatsAiClassify}</Subheading>
                <Caption>
                  {i18n.formatString(
                    i18n.collectionStatsAiClassifiedCount,
                    classifiedCount,
                    counts.total,
                  )}
                </Caption>
                {classifications.error ? (
                  <Caption style={{ color: theme.colors.error }}>
                    {String(classifications.error)}
                  </Caption>
                ) : null}
              </View>
              {hasAiConfig ? (
                <Button
                  mode={classifications.classifying ? 'outlined' : 'contained'}
                  color={globalStyleVariables.PRIMARY_COLOR}
                  loading={classifications.classifying}
                  disabled={counts.total === 0}
                  onPress={handleOnPressClassify}
                >
                  {classifications.classifying
                    ? i18n.collectionStatsCancel
                    : i18n.collectionStatsAiClassify}
                </Button>
              ) : (
                <Button
                  mode="outlined"
                  color={globalStyleVariables.PRIMARY_COLOR}
                  onPress={handleOnPressOpenAiSettings}
                >
                  {i18n.collectionStatsAiClassifyConfigPrompt}
                </Button>
              )}
            </View>

            {classifications.classifying && (
              <View style={styles.progressContainer}>
                <ProgressBar
                  progress={
                    classifications.progress.total > 0
                      ? classifications.progress.done /
                        classifications.progress.total
                      : 0.5
                  }
                  color={globalStyleVariables.PRIMARY_COLOR}
                />
                <Caption>
                  {i18n.formatString(
                    i18n.collectionStatsAiClassifyProgress,
                    classifications.progress.done,
                    classifications.progress.total,
                  )}
                </Caption>
              </View>
            )}

            {categoryCounts.length > 0 && (
              <View style={styles.chipContainer}>
                {categoryCounts.map(([name, count]) => (
                  <Chip key={name} style={styles.chip}>
                    {name} ({count})
                  </Chip>
                ))}
              </View>
            )}
          </Card>

          <Card style={styles.card}>
            <Subheading>{i18n.collectionStatsTotal}</Subheading>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{counts.total}</Text>
                <Caption>{i18n.collectionStatsTotal}</Caption>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{counts.illusts}</Text>
                <Caption>{i18n.userIllusts}</Caption>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{counts.novels}</Text>
                <Caption>{i18n.userNovels}</Caption>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{counts.public}</Text>
                <Caption>{i18n.illustrationPublic}</Caption>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{counts.private}</Text>
                <Caption>{i18n.illustrationPrivate}</Caption>
              </View>
            </View>
          </Card>

          {topTags.length > 0 && (
            <Card style={styles.card}>
              <Subheading>{i18n.collectionStatsTopTags}</Subheading>
              <View style={styles.chipContainer}>
                {topTags.map((tag) => (
                  <Chip key={tag.name} style={styles.chip}>
                    {tag.name} ({tag.count})
                  </Chip>
                ))}
              </View>
            </Card>
          )}

          {topAuthors.length > 0 && (
            <Card style={styles.card}>
              <Subheading>{i18n.collectionStatsTopAuthors}</Subheading>
              {topAuthors.map((author) => (
                <View key={author.userId} style={styles.listRow}>
                  <Text>{author.userName || `User ${author.userId}`}</Text>
                  <Caption>
                    {author.count} {i18n.worksCount}
                  </Caption>
                </View>
              ))}
            </Card>
          )}

          {yearDist.length > 0 && (
            <Card style={styles.card}>
              <Subheading>{i18n.collectionStatsYearDist}</Subheading>
              {yearDist.map((item) => (
                <View key={item.year} style={styles.listRow}>
                  <Text>{item.year}</Text>
                  <Caption>
                    {item.count} {i18n.worksCount}
                  </Caption>
                </View>
              ))}
            </Card>
          )}

          {counts.novels > 0 && (
            <Card style={styles.card}>
              <Subheading>{i18n.collectionStatsLengthDist}</Subheading>
              <View style={styles.listRow}>
                <Text>{i18n.collectionStatsLengthShort}</Text>
                <Caption>
                  {lengthDist.short} {i18n.worksCount}
                </Caption>
              </View>
              <View style={styles.listRow}>
                <Text>{i18n.collectionStatsLengthMedium}</Text>
                <Caption>
                  {lengthDist.medium} {i18n.worksCount}
                </Caption>
              </View>
              <View style={styles.listRow}>
                <Text>{i18n.collectionStatsLengthLong}</Text>
                <Caption>
                  {lengthDist.long} {i18n.worksCount}
                </Caption>
              </View>
              <View style={styles.listRow}>
                <Text>{i18n.collectionStatsLengthExtraLong}</Text>
                <Caption>
                  {lengthDist.extraLong} {i18n.worksCount}
                </Caption>
              </View>
            </Card>
          )}

          <Card style={styles.card}>
            <Subheading>{i18n.backup}</Subheading>
            <CollectionExportSection />
          </Card>
        </ScrollView>
      )}
    </View>
  );
};

export default CollectionStats;
