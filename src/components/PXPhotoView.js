import React, { PureComponent } from 'react';
import { StyleSheet, Image, Platform, UIManager } from 'react-native';
import PhotoView from 'react-native-photo-view-ex';
import { globalStyleVariables } from '../styles';

const styles = StyleSheet.create({
  photo: {
    width: globalStyleVariables.getWindowWidth(),
    height: globalStyleVariables.getWindowHeight(),
  },
});

const hasNativePhotoView =
  Platform.OS === 'android'
    ? !!(
        UIManager.getViewManagerConfig &&
        UIManager.getViewManagerConfig('PhotoViewAndroid')
      )
    : true;

class PXPhotoView extends PureComponent {
  handleOnLoad = () => {
    const { onLoad, uri } = this.props;
    if (onLoad) {
      onLoad(uri);
    }
  };

  render() {
    const { uri, style, onLoad, ...restProps } = this.props;
    const source = {
      uri,
      headers: {
        referer: 'http://www.pixiv.net',
      },
    };

    if (!hasNativePhotoView) {
      return (
        <Image
          source={source}
          resizeMode="contain"
          style={[styles.photo, style]}
          onLoad={this.handleOnLoad}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...restProps}
        />
      );
    }

    return (
      <PhotoView
        source={source}
        resizeMode="contain"
        androidScaleType="fitCenter"
        minimumZoomScale={1}
        maximumZoomScale={3}
        style={[styles.photo, style]}
        onLoad={this.handleOnLoad}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...restProps}
      />
    );
  }
}

export default PXPhotoView;
