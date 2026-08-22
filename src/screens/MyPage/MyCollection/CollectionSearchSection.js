import React, { useState, useMemo } from 'react';
import { StyleSheet, View, FlatList, ScrollView, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import {
  useTheme,
  TextInput,
  Button,
  Chip,
  Caption,
  Divider,
  Card,
  Subheading,
} from 'react-native-paper';
import { useLocalization } from '../../../components/Localization';
import PXListItem from '../../../components/PXListItem';
import EmptyStateView from '../../../components/EmptyStateView';
import {
  searchBookmarksLocally,
  buildNaturalLanguageSearchPrompt,
} from '../../../common/helpers/bookmarkSmartSearch';
import {
  sendChatRequest,
  extractJsonContent,
} from '../../../common/helpers/llmClient';
import { SCREENS } from '../../../common/constants';
import { globalStyleVariables } from '../../../styles';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBox: {
    padding: 10,
  },
  input: {
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  filtersContainer: {
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  chipLabel: {
    width: 60,
    fontSize: 12,
  },
  chipScroll: {
    flex: 1,
  },
  chip: {
    marginRight: 6,
  },
  resultHeader: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});

const CollectionSearchSection = ({ navigation }) => {
  const theme = useTheme();
  const { i18n } = useLocalization();

  const items = useSelector((state) => state.bookmarkLibrary.items);
  const aiSettings = useSelector((state) => state.aiSettings);
  const classifications = useSelector((state) => state.classifications);

  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [restrict, setRestrict] = useState('all');
  const [minBookmarks, setMinBookmarks] = useState(null);
  const [sort, setSort] = useState('newest');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAiSearching, setAiSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const hasAiConfig = Boolean(aiSettings.baseUrl && aiSettings.apiKey);

  const searchResults = useMemo(() => {
    const options = {
      type,
      restrict,
      minBookmarks,
      sort,
      category: selectedCategory,
    };
    return searchBookmarksLocally(
      items,
      query,
      options,
      classifications.items || {},
    );
  }, [
    items,
    query,
    type,
    restrict,
    minBookmarks,
    sort,
    selectedCategory,
    classifications.items,
  ]);

  const handleOnPressAiSearch = async () => {
    if (!query.trim()) {
      Alert.alert(i18n.aiSettingsTitle, i18n.collectionSearchAiEmptyQuery);
      return;
    }
    setAiSearching(true);
    try {
      const messages = buildNaturalLanguageSearchPrompt(
        query.trim(),
        classifications.categories || [],
      );
      const response = await sendChatRequest(aiSettings, messages, {
        temperature: 0.1,
      });
      const filter = extractJsonContent(response);

      if (filter) {
        if (filter.query) setQuery(filter.query);
        if (filter.type) setType(filter.type);
        if (filter.restrict) setRestrict(filter.restrict);
        if (typeof filter.minBookmarks === 'number')
          setMinBookmarks(filter.minBookmarks);
        if (filter.sort) setSort(filter.sort);
        if (filter.category) setSelectedCategory(filter.category);
        setShowFilters(true);
      }
    } catch (err) {
      Alert.alert(
        i18n.aiSettingsTitle,
        `${i18n.aiSettingsTestFailure}\n${err.message}`,
      );
    } finally {
      setAiSearching(false);
    }
  };

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

  const renderItem = ({ item }) => {
    const typeLabel =
      item.type === 'novel' ? i18n.userNovels : i18n.userIllusts;
    const cat = (classifications.items || {})[String(item.id)];
    const descParts = [
      `${typeLabel} · ${item.userName || ''}`,
      item.totalBookmarks ? `♥ ${item.totalBookmarks}` : null,
      item.textLength ? `${item.textLength}字` : null,
      cat ? `[${cat}]` : null,
    ].filter(Boolean);

    return (
      <PXListItem
        key={item.id}
        title={item.title}
        description={descParts.join(' · ')}
        onPress={() => handleOnPressItem(item)}
      />
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.searchBox}>
        <TextInput
          mode="outlined"
          placeholder={i18n.collectionSearchPlaceholder}
          value={query}
          onChangeText={setQuery}
          style={styles.input}
        />
        <View style={styles.buttonRow}>
          <Button
            mode="text"
            compact
            color={globalStyleVariables.PRIMARY_COLOR}
            onPress={() => setShowFilters(!showFilters)}
          >
            {showFilters
              ? i18n.collectionSearchHideFilters
              : i18n.collectionSearchShowFilters}
          </Button>
          {hasAiConfig && (
            <Button
              mode="contained"
              compact
              color={globalStyleVariables.PRIMARY_COLOR}
              loading={isAiSearching}
              disabled={isAiSearching}
              onPress={handleOnPressAiSearch}
            >
              {i18n.collectionSearchAiParse}
            </Button>
          )}
        </View>
      </View>

      {showFilters && (
        <Card style={styles.filtersContainer}>
          <View style={styles.chipRow}>
            <Caption style={styles.chipLabel}>{i18n.searchTarget}:</Caption>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
            >
              <Chip
                selected={type === 'all'}
                style={styles.chip}
                onPress={() => setType('all')}
              >
                {i18n.searchPeriodAll}
              </Chip>
              <Chip
                selected={type === 'illust'}
                style={styles.chip}
                onPress={() => setType('illust')}
              >
                {i18n.userIllusts}
              </Chip>
              <Chip
                selected={type === 'novel'}
                style={styles.chip}
                onPress={() => setType('novel')}
              >
                {i18n.userNovels}
              </Chip>
            </ScrollView>
          </View>

          <View style={styles.chipRow}>
            <Caption style={styles.chipLabel}>{i18n.visibility}:</Caption>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
            >
              <Chip
                selected={restrict === 'all'}
                style={styles.chip}
                onPress={() => setRestrict('all')}
              >
                {i18n.searchPeriodAll}
              </Chip>
              <Chip
                selected={restrict === 'public'}
                style={styles.chip}
                onPress={() => setRestrict('public')}
              >
                {i18n.illustrationPublic}
              </Chip>
              <Chip
                selected={restrict === 'private'}
                style={styles.chip}
                onPress={() => setRestrict('private')}
              >
                {i18n.illustrationPrivate}
              </Chip>
            </ScrollView>
          </View>

          <View style={styles.chipRow}>
            <Caption style={styles.chipLabel}>{i18n.collection}:</Caption>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
            >
              <Chip
                selected={minBookmarks === null}
                style={styles.chip}
                onPress={() => setMinBookmarks(null)}
              >
                {i18n.searchPeriodAll}
              </Chip>
              <Chip
                selected={minBookmarks === 500}
                style={styles.chip}
                onPress={() => setMinBookmarks(500)}
              >
                500+
              </Chip>
              <Chip
                selected={minBookmarks === 1000}
                style={styles.chip}
                onPress={() => setMinBookmarks(1000)}
              >
                1000+
              </Chip>
              <Chip
                selected={minBookmarks === 5000}
                style={styles.chip}
                onPress={() => setMinBookmarks(5000)}
              >
                5000+
              </Chip>
            </ScrollView>
          </View>

          <View style={styles.chipRow}>
            <Caption style={styles.chipLabel}>{i18n.sort}:</Caption>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
            >
              <Chip
                selected={sort === 'newest'}
                style={styles.chip}
                onPress={() => setSort('newest')}
              >
                {i18n.collectionSortNewest}
              </Chip>
              <Chip
                selected={sort === 'oldest'}
                style={styles.chip}
                onPress={() => setSort('oldest')}
              >
                {i18n.collectionSortOldest}
              </Chip>
              <Chip
                selected={sort === 'popularity'}
                style={styles.chip}
                onPress={() => setSort('popularity')}
              >
                {i18n.collectionSortPopularity}
              </Chip>
              <Chip
                selected={sort === 'length'}
                style={styles.chip}
                onPress={() => setSort('length')}
              >
                {i18n.collectionSortLength}
              </Chip>
            </ScrollView>
          </View>
        </Card>
      )}

      <View style={styles.resultHeader}>
        <Subheading>
          {i18n.formatString(
            i18n.collectionSearchResultsCount,
            searchResults.length,
          )}
        </Subheading>
      </View>

      {searchResults.length === 0 ? (
        <EmptyStateView
          iconName="search"
          iconType="font-awesome"
          title={i18n.noResults}
        />
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={Divider}
        />
      )}
    </View>
  );
};

export default CollectionSearchSection;
