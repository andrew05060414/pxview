import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { withTheme, Text } from 'react-native-paper';
import Loader from './Loader';
import PXTouchable from './PXTouchable';
import PXCacheImage from './PXCacheImage';
import withWindowWidth from './withWindowWidth';
import { globalStyleVariables } from '../styles';

const styles = StyleSheet.create({
  pageNumberContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

class PXCacheImageTouchable extends Component {
  constructor(props) {
    const { initWidth, initHeight } = props;
    super(props);
    this.state = {
      width: initWidth,
      height: initHeight,
      naturalWidth: null,
      naturalHeight: null,
      loading: true,
    };
  }

  handleOnFoundImageSize = (width, height, url) => {
    if (width && height) {
      const { windowWidth, onFoundImageSize } = this.props;
      const winW = windowWidth || globalStyleVariables.getWindowWidth();
      const newWidth = width > winW ? winW : width;
      const newHeight = (newWidth * height) / width;
      this.setState({
        width: newWidth,
        height: newHeight,
        naturalWidth: width,
        naturalHeight: height,
        loading: false,
      });
      if (onFoundImageSize) {
        onFoundImageSize(newWidth, newHeight, url);
      }
    }
  };

  handleOnPressImage = () => {
    const { index, onPress } = this.props;
    if (onPress && index !== null) {
      onPress(index);
    }
  };

  handleOnLongPressImage = () => {
    const { index, onLongPress } = this.props;
    if (onLongPress && index !== null) {
      onLongPress(index);
    }
  };

  render() {
    const { uri, pageNumber, style, imageStyle, theme, windowWidth } = this.props;
    const { height, naturalWidth, naturalHeight, loading } = this.state;
    const winW = windowWidth || globalStyleVariables.getWindowWidth();
    let resolvedHeight = height;
    if (naturalWidth && naturalHeight) {
      const resolvedImageWidth = naturalWidth > winW ? winW : naturalWidth;
      resolvedHeight = (resolvedImageWidth * naturalHeight) / naturalWidth;
    }
    return (
      <PXTouchable
        onPress={this.handleOnPressImage}
        onLongPress={this.handleOnLongPressImage}
        style={[
          style,
          {
            width: winW,
            height: resolvedHeight,
            backgroundColor: theme.colors.surface,
          },
        ]}
        activeOpacity={1}
      >
        {loading && pageNumber && (
          <View style={styles.pageNumberContainer}>
            <Text style={styles.pageNumberText}>{pageNumber}</Text>
          </View>
        )}
        {loading && !pageNumber && <Loader />}
        <PXCacheImage
          uri={uri}
          style={imageStyle}
          onFoundImageSize={this.handleOnFoundImageSize}
        />
      </PXTouchable>
    );
  }
}

export default withWindowWidth(withTheme(PXCacheImageTouchable));
