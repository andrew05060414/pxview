import React from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import { withTheme } from 'react-native-paper';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0, 0, 0, .3)',
      },
      android: {
        shadowColor: 'black',
        shadowOpacity: 0.1,
        shadowRadius: StyleSheet.hairlineWidth,
        shadowOffset: {
          height: StyleSheet.hairlineWidth,
        },
        elevation: 4,
      },
    }),
  },
  subContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pillButton: {
    padding: 10,
    paddingHorizontal: 10,
    marginHorizontal: 15,
  },
  pillButtonSelected: {
    borderRadius: 20,
  },
  pillText: {
    fontSize: 14,
  },
});

const Pills = (props) => {
  const {
    items,
    selectedIndex,
    style,
    onPressItem,
    renderRightButton,
    theme,
  } = props;
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
        },
        style,
      ]}
    >
      <View style={styles.subContainer}>
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <TouchableOpacity
              key={item.title}
              onPress={() => onPressItem(index)}
              style={[
                styles.pillButton,
                isSelected && styles.pillButtonSelected,
                {
                  backgroundColor: isSelected
                    ? theme.colors.headerBackground
                    : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    color: isSelected ? '#fff' : 'gray',
                  },
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {renderRightButton && renderRightButton()}
    </View>
  );
};

export default withTheme(Pills);
