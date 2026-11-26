import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { withTheme } from 'react-native-paper';
import { globalStyleVariables } from '../styles';

const DOT_COUNT = 3;
const DOT_SIZE = 10;
const STAGGER_DELAY_MS = 160;
const HALF_CYCLE_MS = 320;
const REST_DELAY_MS = 240;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absolutePosition: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginHorizontal: 4,
  },
});

const Loader = ({ theme, absolutePosition, style, color }) => {
  const animValues = useRef(
    Array.from({ length: DOT_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      return undefined;
    }

    const animations = animValues.map((animValue, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * STAGGER_DELAY_MS),
          Animated.timing(animValue, {
            toValue: 1,
            duration: HALF_CYCLE_MS,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: HALF_CYCLE_MS,
            useNativeDriver: true,
          }),
          Animated.delay(
            (DOT_COUNT - 1 - index) * STAGGER_DELAY_MS + REST_DELAY_MS,
          ),
        ]),
      ),
    );

    animations.forEach((anim) => anim.start());

    return () => {
      animations.forEach((anim) => anim.stop());
    };
  }, [animValues]);

  const indicatorColor =
    color ||
    (theme && theme.colors && (theme.colors.text || theme.colors.onSurface)) ||
    globalStyleVariables.PRIMARY_COLOR;

  return (
    <View
      style={[
        styles.container,
        absolutePosition && styles.absolutePosition,
        style,
      ]}
    >
      <View style={styles.dotsRow}>
        {animValues.map((animValue, index) => {
          const scale = animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0.35, 1],
          });
          const opacity = animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0.35, 1],
          });
          return (
            <Animated.View
              key={index}
              testID="loader-dot"
              style={[
                styles.dot,
                {
                  backgroundColor: indicatorColor,
                  opacity,
                  transform: [{ scale }],
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

export default withTheme(Loader);
