import React, { useRef } from 'react';
import { TouchableOpacity } from 'react-native';

const DEFAULT_PRESS_IN_DELAY_MS = 80;
const DEFAULT_TAP_MOVE_THRESHOLD = 10;
const DEFAULT_PRESS_RETENTION_OFFSET = { top: 0, left: 0, right: 0, bottom: 0 };

const scheduleClearStart =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (fn) => Promise.resolve().then(fn);

const PXTouchable = ({
  activeOpacity = 1,
  delayPressIn,
  pressRetentionOffset = DEFAULT_PRESS_RETENTION_OFFSET,
  tapMoveThreshold = DEFAULT_TAP_MOVE_THRESHOLD,
  style,
  onPress,
  onPressIn,
  onPressOut,
  ...restProps
}) => {
  const pressStartRef = useRef(null);
  const defaultDelay = activeOpacity < 1 ? DEFAULT_PRESS_IN_DELAY_MS : 0;
  const effectiveDelayPressIn =
    delayPressIn !== undefined ? delayPressIn : defaultDelay;

  const handlePressIn = (event) => {
    const nativeEvent = event && event.nativeEvent;
    if (
      nativeEvent &&
      Number.isFinite(nativeEvent.pageX) &&
      Number.isFinite(nativeEvent.pageY)
    ) {
      pressStartRef.current = {
        x: nativeEvent.pageX,
        y: nativeEvent.pageY,
      };
    } else {
      pressStartRef.current = null;
    }
    if (onPressIn) {
      onPressIn(event);
    }
  };

  const handlePressOut = (event) => {
    // Pressability invokes onPressOut synchronously before onPress when
    // minPressDuration/delayPressOut is 0; defer cleanup to a microtask so
    // handlePress still sees the initial touch coordinates.
    const startSnapshot = pressStartRef.current;
    if (startSnapshot) {
      scheduleClearStart(() => {
        if (pressStartRef.current === startSnapshot) {
          pressStartRef.current = null;
        }
      });
    }
    if (onPressOut) {
      onPressOut(event);
    }
  };

  const handlePress = (event) => {
    const start = pressStartRef.current;
    pressStartRef.current = null;
    const nativeEvent = event && event.nativeEvent;
    if (
      start &&
      tapMoveThreshold > 0 &&
      nativeEvent &&
      Number.isFinite(nativeEvent.pageX) &&
      Number.isFinite(nativeEvent.pageY)
    ) {
      const distance = Math.hypot(
        nativeEvent.pageX - start.x,
        nativeEvent.pageY - start.y,
      );
      if (distance > tapMoveThreshold) {
        return;
      }
    }
    if (onPress) {
      onPress(event);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      delayPressIn={effectiveDelayPressIn}
      pressRetentionOffset={pressRetentionOffset}
      style={style || undefined}
      onPress={onPress ? handlePress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...restProps}
    />
  );
};

export default PXTouchable;
