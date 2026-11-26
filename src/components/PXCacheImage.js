import React, { Component } from 'react';
import { View, Image } from 'react-native';
import withWindowWidth from './withWindowWidth';
import { globalStyleVariables } from '../styles';

class PXCacheImage extends Component {
  mounted = false;

  constructor(props) {
    super(props);
    const { width, height } = props;
    this.state = {
      width,
      height,
    };
  }

  componentDidMount() {
    const { uri, onFoundImageSize } = this.props;
    this.mounted = true;
    Image.getSizeWithHeaders(
      uri,
      {
        referer: 'https://www.pixiv.net',
      },
      (width, height) => {
        if (this.mounted) {
          this.setState({
            width,
            height,
          });
          if (onFoundImageSize) {
            onFoundImageSize(width, height, uri);
          }
        }
      },
    );
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  render() {
    const { uri, style, windowWidth, ...otherProps } = this.props;
    const { width, height } = this.state;
    const winW = windowWidth || globalStyleVariables.getWindowWidth();
    const displayWidth = width > winW ? winW : width;
    const displayHeight = width ? (displayWidth * height) / width : 0;
    return width && height ? (
      <View
        style={{
          width: winW,
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          // backgroundColor: '#fff',
        }}
      >
        <Image
          source={{
            uri,
            headers: {
              referer: 'https://www.pixiv.net',
            },
          }}
          style={[
            {
              width: displayWidth,
              height: displayHeight,
            },
            style,
          ]}
          {...otherProps}
        />
      </View>
    ) : null;
  }
}

export default withWindowWidth(PXCacheImage);
