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
    expect(touchable.props.delayPressIn).toBe(80);
    expect(touchable.props.style).toBeUndefined();

    touchable.props.onPress();
    touchable.props.onLongPress();
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  test('allows explicit activeOpacity and delayPressIn overrides', () => {
    Platform.OS = 'android';
    Platform.Version = 37;

    let tree;
    act(() => {
      tree = renderer.create(
        <PXTouchable activeOpacity={0.7} delayPressIn={0} style={{ padding: 4 }}>
          <Text>Pill</Text>
        </PXTouchable>,
      );
    });

    const touchable = tree.root.findByType(TouchableOpacity);
    expect(touchable.props.activeOpacity).toBe(0.7);
    expect(touchable.props.delayPressIn).toBe(0);
    expect(touchable.props.style).toEqual({ padding: 4 });
  });
});
