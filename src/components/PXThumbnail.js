import React from 'react';
import { View } from 'react-native';
import PXImage from './PXImage';
import { globalStyleVariables } from '../styles';

const PXThumbnail = (props) => {
  const { uri, size = 30, style, ...otherProps } = props;
  return (
    <View
      style={{
        backgroundColor: globalStyleVariables.BACKGROUND_COLOR,
        borderRadius: size / 2,
        overflow: 'hidden',
        width: size,
        height: size,
      }}
    >
      <PXImage
        uri={uri}
        style={[
          {
            resizeMode: 'cover',
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style,
        ]}
        {...otherProps}
      />
    </View>
  );
};

export default PXThumbnail;
