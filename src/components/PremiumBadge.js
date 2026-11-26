import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#F8A128',
    borderRadius: 5,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

const PremiumBadge = ({ containerStyle, ...restProps }) => (
  <View style={[styles.badge, containerStyle]} {...restProps}>
    <Text style={styles.text}>P</Text>
  </View>
);

export default PremiumBadge;