import React, { Component } from 'react';
import { View, Image } from 'react-native';
import withWindowWidth from './withWindowWidth';
import { globalStyleVariables } from '../styles';

const haveImagesChanged = (images, prevImages) => {
  if (images === prevImages) {
    return false;
  }
  if (!Array.isArray(images) || !Array.isArray(prevImages)) {
    return true;
  }
  if (images.length !== prevImages.length) {
    return true;
  }
  for (let i = 0; i < images.length; i += 1) {
    const curr = images[i];
    const prev = prevImages[i];
    if (!curr || !prev || curr.uri !== prev.uri || curr.delay !== prev.delay) {
      return true;
    }
  }
  return false;
};

class UgoiraView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      imageIndex: 0,
    };
    this.frame = null;
    this.lastFrameTime = null;
    this.currentFramePlayedTime = 0;
  }

  componentDidMount() {
    const { paused } = this.props;
    if (!paused) {
      this.resumeFrame();
    }
  }

  componentDidUpdate(prevProps) {
    const { paused, images } = this.props;
    const { paused: prevPaused, images: prevImages } = prevProps;
    if (haveImagesChanged(images, prevImages)) {
      this.currentFramePlayedTime = 0;
      this.lastFrameTime = Date.now();
      this.setState({ imageIndex: 0 });
    }
    if (paused !== prevPaused) {
      if (paused) {
        this.pauseFrame();
      } else {
        this.resumeFrame();
      }
    }
  }

  componentWillUnmount() {
    if (this.frame != null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }

  displayFrame = () => {
    const { images } = this.props;
    if (!images || !images.length) {
      this.frame = null;
      return;
    }
    const { imageIndex } = this.state;
    const safeIndex = imageIndex < images.length ? imageIndex : 0;
    const now = Date.now();
    const delay =
      (images[safeIndex] && typeof images[safeIndex].delay === 'number'
        ? images[safeIndex].delay
        : 0) || 0;
    if (this.lastFrameTime == null) {
      this.lastFrameTime = now;
    } else if (now - this.lastFrameTime >= delay) {
      this.lastFrameTime = now;
      const nextIndex = safeIndex + 1 >= images.length ? 0 : safeIndex + 1;
      this.setState({ imageIndex: nextIndex });
    }
    this.frame = requestAnimationFrame(this.displayFrame);
  };

  pauseFrame = () => {
    if (this.lastFrameTime != null) {
      this.currentFramePlayedTime = Date.now() - this.lastFrameTime;
    }
    if (this.frame != null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  };

  resumeFrame = () => {
    if (this.frame != null) {
      cancelAnimationFrame(this.frame);
    }
    this.lastFrameTime = Date.now() - this.currentFramePlayedTime;
    this.frame = requestAnimationFrame(this.displayFrame);
  };

  render() {
    const { images, width, height, resizeMode, windowWidth } = this.props;
    const { imageIndex } = this.state;
    if (!images || !images.length) {
      return null;
    }
    const winW = windowWidth || globalStyleVariables.getWindowWidth();
    const currentFrame = images[imageIndex] || images[0];
    return (
      <View
        style={{
          width: winW,
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: globalStyleVariables.BACKGROUND_COLOR,
        }}
      >
        <Image
          source={{
            uri: currentFrame.uri,
          }}
          style={{
            width,
            height,
          }}
          resizeMode={resizeMode}
        />
      </View>
    );
  }
}

export default withWindowWidth(UgoiraView);
