import React, { useEffect, useState } from 'react';
import { Dimensions, AppState } from 'react-native';

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
        if (window && window.width) {
          setWindowWidth(window.width);
        } else {
          setWindowWidth(Dimensions.get('window').width);
        }
      };
      const subscription = Dimensions.addEventListener('change', handleChange);

      const handleAppStateChange = (nextAppState) => {
        if (nextAppState === 'active') {
          const currentWidth = Dimensions.get('window').width;
          if (currentWidth) {
            setWindowWidth(currentWidth);
          }
        }
      };
      const appStateSubscription = AppState.addEventListener(
        'change',
        handleAppStateChange,
      );

      return () => {
        if (subscription && typeof subscription.remove === 'function') {
          subscription.remove();
        } else {
          Dimensions.removeEventListener('change', handleChange);
        }
        if (
          appStateSubscription &&
          typeof appStateSubscription.remove === 'function'
        ) {
          appStateSubscription.remove();
        } else {
          AppState.removeEventListener('change', handleAppStateChange);
        }
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
