import React, { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';

// Re-renders the wrapped (usually class) component with a `windowWidth` prop
// whenever the window resizes — e.g. folding/unfolding a foldable — so grids
// re-layout immediately instead of waiting for a manual refresh.
const withWindowWidth = (WrappedComponent) => {
  const WithWindowWidth = (props) => {
    const [windowWidth, setWindowWidth] = useState(
      Dimensions.get('window').width,
    );

    useEffect(() => {
      const handleChange = ({ window }) => {
        if (window) {
          setWindowWidth(window.width);
        }
      };
      const subscription = Dimensions.addEventListener('change', handleChange);
      return () => {
        subscription.remove();
      };
    }, []);

    return (
      <WrappedComponent
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
        windowWidth={windowWidth}
      />
    );
  };

  return WithWindowWidth;
};

export default withWindowWidth;
