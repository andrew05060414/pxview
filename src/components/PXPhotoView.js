import React, { PureComponent, createRef } from 'react';
import { StyleSheet, Image } from 'react-native';
import PropTypes from 'prop-types';
import { ResumableZoom } from 'react-native-zoom-toolkit';
import withWindowWidth from './withWindowWidth';
import { globalStyleVariables } from '../styles';

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

class PXPhotoView extends PureComponent {
  static propTypes = {
    uri: PropTypes.string.isRequired,
    onLoad: PropTypes.func,
    onTap: PropTypes.func,
    onViewTap: PropTypes.func,
    style: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    minScale: PropTypes.number,
    maxScale: PropTypes.number,
  };

  static defaultProps = {
    onLoad: () => {},
    onTap: () => {},
    onViewTap: () => {},
    style: null,
    minScale: 1,
    maxScale: 3,
  };

  constructor(props) {
    super(props);
    this.state = {
      isZoomed: false,
    };
    this.zoomRef = createRef();
  }

  handleOnLoad = () => {
    const { onLoad, uri } = this.props;
    if (onLoad) {
      onLoad(uri);
    }
  };

  handleTap = (e) => {
    const { onTap, onViewTap } = this.props;
    if (onTap) {
      onTap(e);
    } else if (onViewTap) {
      onViewTap(e);
    }
  };

  handleGestureEnd = () => {
    if (
      this.zoomRef &&
      this.zoomRef.current &&
      typeof this.zoomRef.current.getState === 'function'
    ) {
      const zoomState = this.zoomRef.current.getState();
      if (zoomState && typeof zoomState.scale === 'number') {
        const isZoomed = zoomState.scale > 1.05;
        if (isZoomed !== this.state.isZoomed) {
          this.setState({ isZoomed });
        }
      }
    }
  };

  render() {
    const {
      uri,
      style,
      onLoad,
      onTap,
      onViewTap,
      minScale,
      maxScale,
      windowWidth,
      windowHeight,
      ...restProps
    } = this.props;
    const { isZoomed } = this.state;
    const winW = windowWidth || globalStyleVariables.getWindowWidth();
    const winH = windowHeight || globalStyleVariables.getWindowHeight();
    const sizeStyle = { width: winW, height: winH };

    return (
      <ResumableZoom
        key={`zoom-${Math.round(winW)}x${Math.round(winH)}`}
        ref={this.zoomRef}
        minScale={minScale}
        maxScale={maxScale}
        panEnabled={isZoomed}
        style={[styles.container, sizeStyle, style]}
        onTap={this.handleTap}
        onGestureEnd={this.handleGestureEnd}
        onPinchEnd={this.handleGestureEnd}
        onDoubleTapEnd={this.handleGestureEnd}
        decay
      >
        <Image
          source={{
            uri,
            headers: {
              referer: 'https://www.pixiv.net',
            },
          }}
          resizeMode="contain"
          style={sizeStyle}
          onLoad={this.handleOnLoad}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...restProps}
        />
      </ResumableZoom>
    );
  }
}

export { PXPhotoView };
export default withWindowWidth(PXPhotoView);
