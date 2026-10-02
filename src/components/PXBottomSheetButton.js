import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Entypo from 'react-native-vector-icons/Entypo';
import { withTheme, Text } from 'react-native-paper';
import PXTouchable from './PXTouchable';

const styles = StyleSheet.create({
  bottomSheetListItem: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    height: 48,
  },
  bottomSheetText: {
    marginLeft: 32,
  },
});

const getIconComponent = (type) => {
  switch (type) {
    case 'font-awesome':
      return FontAwesome;
    case 'feather':
      return Feather;
    case 'ionicon':
      return Ionicons;
    case 'material-community':
      return MaterialCommunityIcons;
    case 'entypo':
      return Entypo;
    case 'material':
    default:
      return MaterialIcons;
  }
};

const PXBottomSheetButton = ({
  onPress,
  iconName,
  iconType,
  iconSize,
  text,
  textStyle,
  accessibilityLabel,
  accessibilityRole,
  theme,
}) => {
  const IconComponent = getIconComponent(iconType || 'material');
  return (
    <PXTouchable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
    >
      <View style={styles.bottomSheetListItem}>
        {iconName && (
          <IconComponent
            name={iconName}
            size={iconSize || 24}
            color={theme.colors.text}
          />
        )}

        <Text style={[styles.bottomSheetText, textStyle]}>{text}</Text>
      </View>
    </PXTouchable>
  );
};

export default withTheme(PXBottomSheetButton);
