import React from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  useTheme,
  List,
  Divider,
  Button,
  Subheading,
} from 'react-native-paper';
import { useLocalization } from '../../../components/Localization';
import PXListItem from '../../../components/PXListItem';
import EmptyStateView from '../../../components/EmptyStateView';
import { filterByRule } from '../../../common/helpers/bookmarkRuleFilter';
import { clearBookmarkRules } from '../../../common/actions/bookmarkRules';
import { SCREENS } from '../../../common/constants';
import { getBookmarkItemKey } from '../../../common/helpers/bookmarkItemKey';
import { globalStyleVariables } from '../../../styles';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
});

const CollectionRulesSection = ({ navigation }) => {
  const theme = useTheme();
  const { i18n } = useLocalization();
  const dispatch = useDispatch();

  const items = useSelector((state) => state.bookmarkLibrary.items);
  const rules = useSelector((state) => state.bookmarkRules.rules);
  const classifications = useSelector((state) => state.classifications);

  const handleOnPressItem = (item) => {
    if (!navigation) return;
    if (item.type === 'novel') {
      navigation.navigate(SCREENS.NovelDetail, {
        novelId: item.id,
        id: item.id,
      });
    } else {
      navigation.navigate(SCREENS.Detail, {
        illustId: item.id,
      });
    }
  };

  const handleOnPressResetRules = () => {
    dispatch(clearBookmarkRules());
  };

  const renderRuleAccordion = ({ item: rule }) => {
    const matched = filterByRule(rule, items, classifications.items || {});

    return (
      <List.Accordion
        key={rule.id}
        title={rule.name}
        description={`${matched.length} ${i18n.worksCount}`}
        left={({ color, style }) => (
          <List.Icon color={color} style={style} icon="folder-search-outline" />
        )}
      >
        {matched.length === 0 ? (
          <List.Item title={i18n.noResults} />
        ) : (
          matched.map((work) => (
            <PXListItem
              key={getBookmarkItemKey(work)}
              title={work.title}
              description={`${
                work.type === 'novel' ? i18n.userNovels : i18n.userIllusts
              } · ${work.userName || ''}${
                work.totalBookmarks ? ` · ♥ ${work.totalBookmarks}` : ''
              }`}
              onPress={() => handleOnPressItem(work)}
            />
          ))
        )}
      </List.Accordion>
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.headerRow}>
        <Subheading>
          {i18n.collectionRulesTitle} ({rules.length})
        </Subheading>
        <Button
          compact
          mode="text"
          textColor={globalStyleVariables.PRIMARY_COLOR}
          onPress={handleOnPressResetRules}
        >
          {i18n.restoreDefault}
        </Button>
      </View>

      {rules.length === 0 ? (
        <EmptyStateView
          iconName="filter"
          iconType="font-awesome"
          title={i18n.noResults}
        />
      ) : (
        <FlatList
          data={rules}
          keyExtractor={(r) => r.id}
          renderItem={renderRuleAccordion}
          ItemSeparatorComponent={Divider}
        />
      )}
    </View>
  );
};

export default CollectionRulesSection;
