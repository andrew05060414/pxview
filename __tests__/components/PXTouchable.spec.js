import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Platform, Text, TouchableNativeFeedback, TouchableOpacity } from 'react-native';
import PXTouchable from '../../src/components/PXTouchable';

describe('PXTouchable', () => {
  const originalOS = Platform.OS;
  const originalVersion = Platform.Version;

  afterEach(() => {
    Platform.OS = originalOS;
    Platform.Version = originalVersion;
  });

  test('uses TouchableOpacity instead of TouchableNativeFeedback on Android with scroll-safe defaults', () => {
    Platform.OS = 'android';
    Platform.Version = 37;

    const onPress = jest.fn();
    const onLongPress = jest.fn();
    let tree;
    act(() => {
      tree = renderer.create(
        <PXTouchable style={false} onPress={onPress} onLongPress={onLongPress}>
          <Text>Novel Row</Text>
        </PXTouchable>,
      );
    });

    expect(tree.root.findAllByType(TouchableNativeFeedback)).toHaveLength(0);
    const touchable = tree.root.findByType(TouchableOpacity);
    expect(touchable.props.activeOpacity).toBe(1);
    expect(touchable.props.delayPressIn).toBe(0);
    expect(touchable.props.pressRetentionOffset).toEqual({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    });
    expect(touchable.props.style).toBeUndefined();

    touchable.props.onPress();
    touchable.props.onLongPress();
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  test('defaults delayPressIn to 80 when activeOpacity < 1 and honors explicit overrides', () => {
    Platform.OS = 'android';
    Platform.Version = 37;

    let treeDefaultDelay;
    act(() => {
      treeDefaultDelay = renderer.create(
        <PXTouchable activeOpacity={0.7} style={{ padding: 4 }}>
          <Text>Button</Text>
        </PXTouchable>,
      );
    });
    const touchableDefault = treeDefaultDelay.root.findByType(TouchableOpacity);
    expect(touchableDefault.props.delayPressIn).toBe(80);
    expect(touchableDefault.props.style).toEqual({ padding: 4 });
    expect(touchableDefault.props.onPress).toBeUndefined();

    let treeExplicitDelay;
    act(() => {
      treeExplicitDelay = renderer.create(
        <PXTouchable activeOpacity={0.7} delayPressIn={0} style={{ padding: 4 }}>
          <Text>Pill</Text>
        </PXTouchable>,
      );
    });
    const touchableExplicit = treeExplicitDelay.root.findByType(TouchableOpacity);
    expect(touchableExplicit.props.activeOpacity).toBe(0.7);
    expect(touchableExplicit.props.delayPressIn).toBe(0);
  });

  test('triggers onPress for small jitter within threshold in RN Pressability order (pressIn -> pressOut -> press)', () => {
    const onPress = jest.fn();
    const onPressIn = jest.fn();
    const onPressOut = jest.fn();
    let tree;
    act(() => {
      tree = renderer.create(
        <PXTouchable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
          <Text>Item</Text>
        </PXTouchable>,
      );
    });

    const touchable = tree.root.findByType(TouchableOpacity);
    const pressInEvent = { nativeEvent: { pageX: 100, pageY: 200 } };
    const pressOutEvent = { nativeEvent: { pageX: 104, pageY: 203 } };
    const pressEvent = { nativeEvent: { pageX: 104, pageY: 203 } };

    touchable.props.onPressIn(pressInEvent);
    touchable.props.onPressOut(pressOutEvent);
    touchable.props.onPress(pressEvent);

    expect(onPressIn).toHaveBeenCalledWith(pressInEvent);
    expect(onPressOut).toHaveBeenCalledWith(pressOutEvent);
    expect(onPress).toHaveBeenCalledWith(pressEvent);
  });

  test('suppresses accidental micro-drag taps exceeding tapMoveThreshold in RN Pressability order (pressIn -> pressOut -> press)', async () => {
    const onPress = jest.fn();
    const onPressOut = jest.fn();
    let tree;
    act(() => {
      tree = renderer.create(
        <PXTouchable onPress={onPress} onPressOut={onPressOut}>
          <Text>Item</Text>
        </PXTouchable>,
      );
    });

    const touchable = tree.root.findByType(TouchableOpacity);
    touchable.props.onPressIn({ nativeEvent: { pageX: 100, pageY: 200 } });
    touchable.props.onPressOut({ nativeEvent: { pageX: 100, pageY: 215 } });
    touchable.props.onPress({ nativeEvent: { pageX: 100, pageY: 215 } });
    expect(onPress).not.toHaveBeenCalled();

    // Cancelled drag without onPress clears start coordinates after microtask tick
    touchable.props.onPressIn({ nativeEvent: { pageX: 50, pageY: 60 } });
    touchable.props.onPressOut({ nativeEvent: { pageX: 50, pageY: 75 } });
    expect(onPressOut).toHaveBeenCalledTimes(2);
    await Promise.resolve();

    touchable.props.onPress({ nativeEvent: { pageX: 0, pageY: 0 } });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('also handles delayed pressOut order (pressIn -> press -> pressOut)', () => {
    const onPress = jest.fn();
    let tree;
    act(() => {
      tree = renderer.create(
        <PXTouchable onPress={onPress}>
          <Text>Delayed</Text>
        </PXTouchable>,
      );
    });

    const touchable = tree.root.findByType(TouchableOpacity);
    touchable.props.onPressIn({ nativeEvent: { pageX: 100, pageY: 200 } });
    touchable.props.onPress({ nativeEvent: { pageX: 120, pageY: 200 } });
    touchable.props.onPressOut({ nativeEvent: { pageX: 120, pageY: 200 } });
    expect(onPress).not.toHaveBeenCalled();

    touchable.props.onPressIn({ nativeEvent: { pageX: 100, pageY: 200 } });
    touchable.props.onPress({ nativeEvent: { pageX: 105, pageY: 205 } });
    touchable.props.onPressOut({ nativeEvent: { pageX: 105, pageY: 205 } });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('omits TouchableOpacity onPress when PXTouchable onPress prop is not provided', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <PXTouchable>
          <Text>Non-pressable</Text>
        </PXTouchable>,
      );
    });

    const touchable = tree.root.findByType(TouchableOpacity);
    expect(touchable.props.onPress).toBeUndefined();
  });
});
