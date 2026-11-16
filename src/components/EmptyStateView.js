import React from 'react';
import { View, StyleSheet } from 'react-native';
import { withTheme, Text } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Entypo from 'react-native-vector-icons/Entypo';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  icon: {
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
  },
  description: {
    marginVertical: 10,
  },
  titleContainer: {
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
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

const EmptyState = (props) => {
  const {
    iconName,
    iconType,
    iconSize,
    iconStyle,
    title,
    description,
    actionButton,
    theme,
  } = props;
  const IconComponent = getIconComponent(iconType || 'material');
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {iconName ? (
        <IconComponent
          name={iconName}
          size={iconSize || 40}
          style={[styles.icon, iconStyle]}
          color={theme.colors.text}
        />
      ) : null}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      {actionButton}
    </View>
  );
};

export default withTheme(EmptyState);
