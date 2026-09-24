import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { withTheme, Text } from 'react-native-paper';
import Loader from './Loader';
import PXTouchable from './PXTouchable';
import PXCacheImage from './PXCacheImage';
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
  rawWidth = 0;

  rawHeight = 0;

  constructor(props) {
    const { initWidth, initHeight } = props;
    super(props);
    this.state = {
      width: initWidth,
      height: initHeight,
      loading: true,
    };
  }

  componentDidUpdate(prevProps) {
    const { windowWidth } = this.props;
    const { windowWidth: prevWindowWidth } = prevProps;
    if (
      windowWidth &&
      prevWindowWidth &&
      windowWidth !== prevWindowWidth &&
      this.rawWidth &&
      this.rawHeight
    ) {
      const newWidth =
        this.rawWidth > windowWidth ? windowWidth : this.rawWidth;
      const newHeight =
        ((this.rawWidth > windowWidth ? windowWidth : this.rawWidth) *
          this.rawHeight) /
        this.rawWidth;
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        width: newWidth,
        height: newHeight,
      });
    }
  }

  handleOnFoundImageSize = (width, height, url) => {
    if (width && height) {
      this.rawWidth = width;
      this.rawHeight = height;
      const currentWindowWidth =
        this.props.windowWidth || globalStyleVariables.getWindowWidth();
      const newWidth =
        width > currentWindowWidth ? currentWindowWidth : width;
      const newHeight =
        ((width > currentWindowWidth ? currentWindowWidth : width) *
          height) /
        width;
      this.setState({
        width: newWidth,
        height: newHeight,
        loading: false,
      });
      const { onFoundImageSize } = this.props;
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
    const { uri, pageNumber, style, imageStyle, theme } = this.props;
    const { height, loading } = this.state;
    return (
      <PXTouchable
        onPress={this.handleOnPressImage}
        onLongPress={this.handleOnLongPressImage}
        style={[
          style,
          {
            width: '100%',
            height,
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

export default withTheme(PXCacheImageTouchable);
