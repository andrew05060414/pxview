import React, { useState, useMemo } from 'react';
import { StyleSheet, View, FlatList, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme, Chip, List, Divider } from 'react-native-paper';
import { useLocalization } from '../../../components/Localization';
import PXListItem from '../../../components/PXListItem';
import EmptyStateView from '../../../components/EmptyStateView';
import {
  groupByAuthor,
  groupBySeries,
  findPotentialDuplicates,
} from '../../../common/helpers/bookmarkGrouping';
import { SCREENS } from '../../../common/constants';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabScroll: {
    padding: 10,
  },
  chip: {
    marginRight: 8,
  },
});

const CollectionGroupingSection = ({ navigation }) => {
  const theme = useTheme();
  const { i18n } = useLocalization();

  const items = useSelector((state) => state.bookmarkLibrary.items);
  const [subTab, setSubTab] = useState('author'); // 'author' | 'series' | 'duplicates'

  const authorGroups = useMemo(() => groupByAuthor(items), [items]);
  const seriesGroups = useMemo(() => groupBySeries(items), [items]);
  const duplicateClusters = useMemo(() => findPotentialDuplicates(items), [
    items,
  ]);

  const handleOnPressItem = (item) => {
    if (!navigation) return;
    if (item.type === 'novel') {
      navigation.navigate(SCREENS.NovelDetail, {
        id: item.id,
        item: { id: item.id, title: item.title },
      });
    } else {
      navigation.navigate(SCREENS.Detail, {
        id: item.id,
        item: { id: item.id, title: item.title },
      });
    }
  };

  const renderAuthorGroup = ({ item }) => (
    <List.Accordion
      key={item.userId}
      title={item.userName || `User ${item.userId}`}
      description={`${item.count} ${i18n.worksCount} (${i18n.userIllusts}: ${item.illustCount} · ${i18n.userNovels}: ${item.novelCount})`}
      left={({ color, style }) => (
        <List.Icon color={color} style={style} icon="account" />
      )}
    >
      {item.items.map((work) => (
        <PXListItem
          key={work.id}
          title={work.title}
          description={`${
            work.type === 'novel' ? i18n.userNovels : i18n.userIllusts
          }${work.totalBookmarks ? ` · ♥ ${work.totalBookmarks}` : ''}`}
          onPress={() => handleOnPressItem(work)}
        />
      ))}
    </List.Accordion>
  );

  const renderSeriesGroup = ({ item }) => (
    <List.Accordion
      key={item.seriesId || item.seriesTitle}
      title={item.seriesTitle}
      description={`${item.userName || ''} · ${item.count} 话 · 共 ${
        item.totalLength
      } 字`}
      left={({ color, style }) => (
        <List.Icon color={color} style={style} icon="book-open-page-variant" />
      )}
    >
      {item.items.map((novel) => (
        <PXListItem
          key={novel.id}
          title={novel.title}
          description={`${novel.textLength || 0} 字 · ♥ ${
            novel.totalBookmarks || 0
          }`}
          onPress={() => handleOnPressItem(novel)}
        />
      ))}
    </List.Accordion>
  );

  const renderDuplicateCluster = ({ item }) => (
    <List.Accordion
      key={item.key}
      title={item.title}
      description={`${item.userName || ''} · ${item.items.length} 个相似作品`}
      left={({ color, style }) => (
        <List.Icon color={color} style={style} icon="content-copy" />
      )}
    >
      {item.items.map((work) => (
        <PXListItem
          key={work.id}
          title={work.title}
          description={`ID: ${work.id} · ${
            work.type === 'novel' ? i18n.userNovels : i18n.userIllusts
          } · ${work.createDate ? work.createDate.slice(0, 10) : ''}`}
          onPress={() => handleOnPressItem(work)}
        />
      ))}
    </List.Accordion>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
      >
        <Chip
          selected={subTab === 'author'}
          style={styles.chip}
          onPress={() => setSubTab('author')}
        >
          {i18n.collectionGroupAuthor} ({authorGroups.length})
        </Chip>
        <Chip
          selected={subTab === 'series'}
          style={styles.chip}
          onPress={() => setSubTab('series')}
        >
          {i18n.collectionGroupSeries} ({seriesGroups.series.length})
        </Chip>
        <Chip
          selected={subTab === 'duplicates'}
          style={styles.chip}
          onPress={() => setSubTab('duplicates')}
        >
          {i18n.collectionGroupDuplicates} ({duplicateClusters.length})
        </Chip>
      </ScrollView>

      {subTab === 'author' &&
        (authorGroups.length === 0 ? (
          <EmptyStateView
            iconName="users"
            iconType="font-awesome"
            title={i18n.noResults}
          />
        ) : (
          <FlatList
            data={authorGroups}
            keyExtractor={(item) => String(item.userId)}
            renderItem={renderAuthorGroup}
            ItemSeparatorComponent={Divider}
          />
        ))}

      {subTab === 'series' &&
        (seriesGroups.series.length === 0 ? (
          <EmptyStateView
            iconName="book"
            iconType="font-awesome"
            title={i18n.noResults}
          />
        ) : (
          <FlatList
            data={seriesGroups.series}
            keyExtractor={(item) => String(item.seriesId || item.seriesTitle)}
            renderItem={renderSeriesGroup}
            ItemSeparatorComponent={Divider}
          />
        ))}

      {subTab === 'duplicates' &&
        (duplicateClusters.length === 0 ? (
          <EmptyStateView
            iconName="check-circle"
            iconType="font-awesome"
            title={i18n.collectionGroupNoDuplicates}
          />
        ) : (
          <FlatList
            data={duplicateClusters}
            keyExtractor={(item) => item.key}
            renderItem={renderDuplicateCluster}
            ItemSeparatorComponent={Divider}
          />
        ))}
    </View>
  );
};

export default CollectionGroupingSection;
