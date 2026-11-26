import React from 'react';
import { TouchableOpacity } from 'react-native';

const DEFAULT_PRESS_IN_DELAY_MS = 80;

const PXTouchable = ({
  activeOpacity = 1,
  delayPressIn = DEFAULT_PRESS_IN_DELAY_MS,
  style,
  ...restProps
}) => (
  <TouchableOpacity
    activeOpacity={activeOpacity}
    delayPressIn={delayPressIn}
    style={style || undefined}
    // eslint-disable-next-line react/jsx-props-no-spreading
    {...restProps}
  />
);

export default PXTouchable;
