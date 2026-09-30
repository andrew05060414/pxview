import React, { PureComponent } from 'react';
import { StyleSheet, Image } from 'react-native';
import PropTypes from 'prop-types';
import { ResumableZoom } from 'react-native-zoom-toolkit';
import { globalStyleVariables } from '../styles';

const styles = StyleSheet.create({
  container: {
    width: globalStyleVariables.getWindowWidth(),
    height: globalStyleVariables.getWindowHeight(),
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: globalStyleVariables.getWindowWidth(),
    height: globalStyleVariables.getWindowHeight(),
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

  handleUpdate = ({ scale }) => {
    const isZoomed = scale > 1.05;
    const { isZoomed: currentIsZoomed } = this.state;
    if (isZoomed !== currentIsZoomed) {
      this.setState({ isZoomed });
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
      ...restProps
    } = this.props;
    const { isZoomed } = this.state;

    return (
      <ResumableZoom
        minScale={minScale}
        maxScale={maxScale}
        panEnabled={isZoomed}
        style={[styles.container, style]}
        onTap={this.handleTap}
        onUpdate={this.handleUpdate}
        decay
      >
        <Image
          source={{
            uri,
            headers: {
              referer: 'http://www.pixiv.net',
            },
          }}
          resizeMode="contain"
          style={styles.photo}
          onLoad={this.handleOnLoad}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...restProps}
        />
      </ResumableZoom>
    );
  }
}

export default PXPhotoView;
