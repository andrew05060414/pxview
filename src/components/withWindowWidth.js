import React, { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';

// Re-renders the wrapped (usually class) component with `windowWidth` and
// `windowHeight` props whenever the window resizes — e.g. folding/unfolding a
// foldable — so grids and detail panes re-layout immediately instead of waiting
// for a manual refresh.
const withWindowWidth = (WrappedComponent) => {
  const WithWindowWidth = (props) => {
    const [windowDimensions, setWindowDimensions] = useState(() => {
      const initial = Dimensions.get('window');
      return {
        width: initial.width,
        height: initial.height,
      };
    });

    useEffect(() => {
      const handleChange = ({ window }) => {
        if (window) {
          setWindowDimensions({
            width: window.width,
            height: window.height,
          });
        }
      };
      const subscription = Dimensions.addEventListener('change', handleChange);
      return () => {
        if (subscription && typeof subscription.remove === 'function') {
          subscription.remove();
        } else {
          Dimensions.removeEventListener('change', handleChange);
        }
      };
    }, []);

    return (
      <WrappedComponent
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
        windowWidth={windowDimensions.width}
        windowHeight={windowDimensions.height}
      />
    );
  };

  return WithWindowWidth;
};

export default withWindowWidth;
