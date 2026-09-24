import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/FontAwesome';
import PXTouchable from '../../components/PXTouchable';
import PXBottomSheet from '../../components/PXBottomSheet';
import PXBottomSheetButton from '../../components/PXBottomSheetButton';
import PXBottomSheetCancelButton from '../../components/PXBottomSheetCancelButton';
import { NOVEL_RANKING_LANGUAGES } from '../../common/constants';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontWeight: 'bold',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  buttonText: {
    marginRight: 8,
  },
});

const NovelRankingLanguageFilter = ({ value, i18n, onChange, onReset }) => {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const isSimplifiedChinese =
    value === NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE;
  const currentLabel = isSimplifiedChinese
    ? i18n.rankingLanguageSimplifiedChinese
    : i18n.rankingLanguageAll;

  const handleSelect = (language) => {
    onChange(language);
    setVisible(false);
  };

  const handleReset = () => {
    onReset();
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.controlRow}>
        <Text style={styles.label}>{i18n.rankingLanguageFilter}</Text>
        <PXTouchable
          style={[styles.button, { borderColor: theme.colors.text }]}
          onPress={() => setVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`${i18n.rankingLanguageFilter}: ${currentLabel}`}
        >
          <Text style={styles.buttonText}>{currentLabel}</Text>
          <Icon name="caret-down" size={18} color={theme.colors.text} />
        </PXTouchable>
      </View>
      <PXBottomSheet visible={visible} onCancel={() => setVisible(false)}>
        <PXBottomSheetButton
          iconName={isSimplifiedChinese ? 'check-circle' : 'circle-o'}
          iconType="font-awesome"
          text={i18n.rankingLanguageSimplifiedChinese}
          onPress={() =>
            handleSelect(NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE)
          }
          accessibilityRole="button"
          accessibilityLabel={i18n.rankingLanguageSimplifiedChinese}
        />
        <PXBottomSheetButton
          iconName={!isSimplifiedChinese ? 'check-circle' : 'circle-o'}
          iconType="font-awesome"
          text={i18n.rankingLanguageAll}
          onPress={() => handleSelect(NOVEL_RANKING_LANGUAGES.ALL)}
          accessibilityRole="button"
          accessibilityLabel={i18n.rankingLanguageAll}
        />
        <PXBottomSheetButton
          iconName="refresh"
          iconType="font-awesome"
          text={i18n.rankingLanguageReset}
          onPress={handleReset}
          accessibilityRole="button"
          accessibilityLabel={i18n.rankingLanguageReset}
        />
        <PXBottomSheetCancelButton
          onPress={() => setVisible(false)}
          text={i18n.cancel}
        />
      </PXBottomSheet>
    </View>
  );
};

export default NovelRankingLanguageFilter;
