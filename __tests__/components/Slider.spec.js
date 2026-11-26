jest.mock('react-native', () => ({
  View: 'View',
  StyleSheet: {
    create: (styles) => styles,
  },
  PanResponder: {
    create: (config) => ({
      panHandlers: {
        onResponderGrant: (evt, state) => config.onPanResponderGrant?.(evt, state),
        onResponderMove: (evt, state) => config.onPanResponderMove?.(evt, state),
        onResponderRelease: (evt, state) => config.onPanResponderRelease?.(evt, state),
      },
      ...config,
    }),
  },
}));

import React from 'react';
import Slider from '../../src/components/Slider';

describe('Slider component', () => {
  it('instantiates with default and custom values', () => {
    const slider = new Slider({ value: 14, minimumValue: 10, maximumValue: 18, step: 2 });
    expect(slider.state.currentValue).toBe(14);
  });

  it('calculates stepped values correctly for integer step', () => {
    const slider = new Slider({ minimumValue: 10, maximumValue: 18, step: 2 });
    slider.state.containerWidth = 220;
    expect(slider.calculateValueFromX(10)).toBe(10);
    expect(slider.calculateValueFromX(60)).toBe(12);
    expect(slider.calculateValueFromX(110)).toBe(14);
    expect(slider.calculateValueFromX(210)).toBe(18);
  });

  it('calculates stepped values correctly for fractional step without float drift', () => {
    const slider = new Slider({ minimumValue: 1.2, maximumValue: 2, step: 0.2 });
    slider.state.containerWidth = 220;
    expect(slider.calculateValueFromX(10)).toBe(1.2);
    expect(slider.calculateValueFromX(60)).toBe(1.4);
    expect(slider.calculateValueFromX(110)).toBe(1.6);
    expect(slider.calculateValueFromX(210)).toBe(2.0);
  });

  it('clamps values within bounds', () => {
    const slider = new Slider({ minimumValue: 0, maximumValue: 100, step: 10 });
    slider.state.containerWidth = 120;
    expect(slider.calculateValueFromX(-50)).toBe(0);
    expect(slider.calculateValueFromX(300)).toBe(100);
  });

  it('triggers onSlidingComplete with final value', () => {
    const onSlidingComplete = jest.fn();
    const slider = new Slider({ value: 12, onSlidingComplete });
    slider.panResponder.panHandlers.onResponderRelease();
    expect(onSlidingComplete).toHaveBeenCalledWith(12);
  });

  it('updates value on touch grant/move and delivers final stepped value on sliding complete', () => {
    const onValueChange = jest.fn();
    const onSlidingComplete = jest.fn();
    const slider = new Slider({
      value: 10,
      minimumValue: 10,
      maximumValue: 18,
      step: 2,
      onValueChange,
      onSlidingComplete,
    });
    slider.state.containerWidth = 220;
    slider.containerPageX = 50;
    slider.setState = (update) => { Object.assign(slider.state, update); };

    // Simulate touching at pageX = 160 (which is containerPageX 50 + 110)
    // x = 110 -> relativeX = 100 -> ratio = 0.5 -> val = 14
    slider.panResponder.panHandlers.onResponderGrant(
      { nativeEvent: { pageX: 160 } },
      { x0: 160 },
    );

    expect(slider.state.currentValue).toBe(14);
    expect(onValueChange).toHaveBeenCalledWith(14);

    // Simulate release
    slider.panResponder.panHandlers.onResponderRelease();
    expect(onSlidingComplete).toHaveBeenCalledWith(14);
  });
});
