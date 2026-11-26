import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, PanResponder } from 'react-native';

const THUMB_SIZE = 20;
const TRACK_HEIGHT = 4;

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    position: 'absolute',
    left: THUMB_SIZE / 2,
    right: THUMB_SIZE / 2,
  },
  activeTrack: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    position: 'absolute',
    left: THUMB_SIZE / 2,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    position: 'absolute',
    top: (40 - THUMB_SIZE) / 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
});

export default class Slider extends Component {
  static propTypes = {
    value: PropTypes.number,
    minimumValue: PropTypes.number,
    maximumValue: PropTypes.number,
    step: PropTypes.number,
    minimumTrackTintColor: PropTypes.string,
    maximumTrackTintColor: PropTypes.string,
    thumbTintColor: PropTypes.string,
    onValueChange: PropTypes.func,
    onSlidingComplete: PropTypes.func,
    disabled: PropTypes.bool,
    style: PropTypes.any,
  };

  static defaultProps = {
    value: 0,
    minimumValue: 0,
    maximumValue: 1,
    step: 0,
    minimumTrackTintColor: '#009688',
    maximumTrackTintColor: '#b3b3b3',
    thumbTintColor: '#009688',
    disabled: false,
  };

  constructor(props) {
    super(props);
    this.state = {
      containerWidth: 0,
      currentValue: props.value ?? props.minimumValue,
    };
    this.containerRef = null;
    this.containerPageX = undefined;

    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => !this.props.disabled,
      onMoveShouldSetPanResponder: () => !this.props.disabled,
      onPanResponderGrant: (evt, gestureState) => {
        this.measureContainer(() => {
          this.handleTouch(evt.nativeEvent, gestureState);
        });
        this.handleTouch(evt.nativeEvent, gestureState);
      },
      onPanResponderMove: (evt, gestureState) => {
        this.handleTouch(evt.nativeEvent, gestureState);
      },
      onPanResponderRelease: () => {
        const { onSlidingComplete } = this.props;
        if (onSlidingComplete) {
          onSlidingComplete(this.state.currentValue);
        }
      },
      onPanResponderTerminate: () => {
        const { onSlidingComplete } = this.props;
        if (onSlidingComplete) {
          onSlidingComplete(this.state.currentValue);
        }
      },
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.value !== this.props.value && this.props.value !== undefined) {
      this.setState({ currentValue: this.props.value });
    }
  }

  measureContainer = (callback) => {
    if (this.containerRef && this.containerRef.measure) {
      this.containerRef.measure((x, y, width, height, pageX) => {
        this.containerPageX = pageX;
        if (width && width !== this.state.containerWidth) {
          this.setState({ containerWidth: width });
        }
        if (callback) {
          callback();
        }
      });
    } else if (callback) {
      callback();
    }
  };

  handleOnLayout = (e) => {
    const { width } = e.nativeEvent.layout;
    this.setState({ containerWidth: width });
    this.measureContainer();
  };

  calculateValueFromX = (x) => {
    const { minimumValue, maximumValue, step } = this.props;
    const { containerWidth } = this.state;
    const trackWidth = containerWidth - THUMB_SIZE;
    if (trackWidth <= 0) {
      return minimumValue;
    }
    const relativeX = Math.max(0, Math.min(x - THUMB_SIZE / 2, trackWidth));
    const ratio = relativeX / trackWidth;
    let val = minimumValue + ratio * (maximumValue - minimumValue);
    if (step > 0) {
      const steps = Math.round((val - minimumValue) / step);
      val = minimumValue + steps * step;
      const precision = (step.toString().split('.')[1] || '').length;
      val = Number(val.toFixed(precision));
    }
    return Math.min(maximumValue, Math.max(minimumValue, val));
  };

  handleTouch = (nativeEvent, gestureState) => {
    let x;
    const pageX = nativeEvent?.pageX ?? gestureState?.moveX ?? gestureState?.x0;
    if (pageX !== undefined && this.containerPageX !== undefined) {
      x = pageX - this.containerPageX;
    } else if (nativeEvent?.locationX !== undefined) {
      x = nativeEvent.locationX;
    } else {
      x = 0;
    }
    const nextVal = this.calculateValueFromX(x);
    if (nextVal !== this.state.currentValue) {
      this.state.currentValue = nextVal;
      this.setState({ currentValue: nextVal });
      const { onValueChange } = this.props;
      if (onValueChange) {
        onValueChange(nextVal);
      }
    }
  };

  render() {
    const {
      style,
      minimumValue,
      maximumValue,
      minimumTrackTintColor,
      maximumTrackTintColor,
      thumbTintColor,
    } = this.props;
    const { containerWidth, currentValue } = this.state;

    const trackWidth = Math.max(0, containerWidth - THUMB_SIZE);
    const range = maximumValue - minimumValue;
    const ratio = range > 0 ? Math.max(0, Math.min(1, (currentValue - minimumValue) / range)) : 0;
    const thumbLeft = ratio * trackWidth;

    return (
      <View
        ref={(ref) => {
          this.containerRef = ref;
        }}
        style={[styles.container, style]}
        onLayout={this.handleOnLayout}
        {...this.panResponder.panHandlers}
      >
        <View
          pointerEvents="none"
          style={[
            styles.track,
            { backgroundColor: maximumTrackTintColor },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.activeTrack,
            {
              width: thumbLeft,
              backgroundColor: minimumTrackTintColor,
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              left: thumbLeft,
              backgroundColor: thumbTintColor,
            },
          ]}
        />
      </View>
    );
  }
}
