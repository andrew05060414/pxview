import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import {
  NavigationContainer,
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';
import { getStateFromPath } from '@react-navigation/core';
import analytics from '@react-native-firebase/analytics';
import {
  DefaultTheme as PaperDefaultTheme,
  MD3DarkTheme as PaperDarkTheme,
  Provider as PaperProvider,
} from 'react-native-paper';
import SplashScreen from 'react-native-splash-screen';
import FlashMessage from 'react-native-flash-message';
import AppNavigator from '../../navigations/AppNavigator';
import AuthNavigator from '../../navigations/AuthNavigator';
import Loader from '../../components/Loader';
import ModalRoot from '../../containers/ModalRoot';
import PXSnackbar from '../../components/PXSnackbar';
import { THEME_TYPES, SCREENS } from '../../common/constants';
import { globalStyleVariables } from '../../styles';
import usePrevious from '../../common/hooks/usePrevious';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const getActiveRouteName = (state) => {
  if (!state || !state.routes || state.routes.length === 0) {
    return '';
  }
  const route = state.routes[state.index || 0];

  if (route && route.state) {
    // Dive into nested navigators
    return getActiveRouteName(route.state);
  }

  return route ? route.name : '';
};

const App = () => {
  const [, forceUpdate] = useState(0);
  const rehydrated = useSelector((state) => state.auth.rehydrated);
  const user = useSelector((state) => state.auth.user);
  const initialRouteName = useSelector(
    (state) => state.initialScreenSettings.routeName,
  );
  const themeName = useSelector((state) => state.theme.name);
  const navigationRef = useRef();
  const routeNameRef = useRef();
  const prevRehydrated = usePrevious(rehydrated);

  const linking = useMemo(
    () => ({
      prefixes: [
        'https://www.pixiv.net/en',
        'https://www.pixiv.net',
        'http://www.pixiv.net',
        'http://www.pixiv.net/en',
        'https://touch.pixiv.net',
        'pixiv://',
      ],
      config: {
        screens: {
          [SCREENS.Detail]: 'artworks/:illustId',
          [SCREENS.NovelDetail]: 'novel/show.php',
          [SCREENS.UserDetail]: 'users/:uid',
          // workaround to handle deep link to one screen with multiple path
          [`${SCREENS.Detail}-1`]: 'illusts/:illustId',
          [`${SCREENS.Detail}-2`]: 'member_illust.php',
          [`${SCREENS.NovelDetail}-1`]: 'novels/:novelId',
          [`${SCREENS.UserDetail}-1`]: 'member.php',
          [SCREENS.Login]: 'account/login',
        },
      },
      getStateFromPath: (path, options) => {
        const state = getStateFromPath(path, options);
        if (!state || !state.routes || state.routes.length === 0) {
          return state;
        }
        const newRoutes = [...state.routes];
        newRoutes[0].name = newRoutes[0].name.split('-')[0];
        let routes;
        if (user) {
          routes = [
            {
              name: SCREENS.Main, // Load tab navigation first
            },
            ...newRoutes,
          ];
        } else {
          routes = newRoutes;
        }
        return {
          ...state,
          routes,
        };
      },
    }),
    [user],
  );

  useEffect(() => {
    if (!prevRehydrated && rehydrated) {
      if (SplashScreen && typeof SplashScreen.hide === 'function') {
        SplashScreen.hide();
      }
    }
  }, [prevRehydrated, rehydrated]);

  useEffect(() => {
    const handleChange = () => {
      forceUpdate((n) => n + 1);
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

  const handleOnNavigationStateChange = (state) => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = getActiveRouteName(state);
    if (previousRouteName !== currentRouteName) {
      analytics().logScreenView({
        screen_name: currentRouteName,
        screen_class: currentRouteName,
      });
    }
    routeNameRef.current = currentRouteName;
  };

  const handleOnReady = () => {
    if (navigationRef.current) {
      const state = navigationRef.current.getRootState();
      if (state) {
        routeNameRef.current = getActiveRouteName(state);
      }
    }
  };

  let renderComponent;
  let theme;
  const extraColorsConfig = {
    primary: globalStyleVariables.PRIMARY_COLOR,
    activeTint:
      themeName === THEME_TYPES.DARK
        ? '#000000'
        : globalStyleVariables.PRIMARY_COLOR,
    headerBackground:
      themeName === THEME_TYPES.DARK
        ? '#1a1a1a'
        : globalStyleVariables.PRIMARY_COLOR,
    modalTitleBackground:
      themeName === THEME_TYPES.DARK ? '#1a1a1a' : '#E9EBEE',
    bottomTabBarBackground:
      themeName === THEME_TYPES.DARK
        ? PaperDarkTheme.colors.surface
        : globalStyleVariables.PRIMARY_COLOR,
  };
  const paperTheme =
    themeName === THEME_TYPES.DARK ? PaperDarkTheme : PaperDefaultTheme;
  const navTheme =
    themeName === THEME_TYPES.DARK
      ? NavigationDarkTheme
      : NavigationDefaultTheme;

  theme = {
    ...navTheme,
    ...paperTheme,
    fonts: {
      ...navTheme.fonts,
      ...paperTheme.fonts,
    },
    colors: {
      ...navTheme.colors,
      ...paperTheme.colors,
      ...extraColorsConfig,
    },
  };
  if (!rehydrated) {
    renderComponent = <Loader />;
  } else if (user) {
    renderComponent = <AppNavigator initialRouteName={initialRouteName} />;
  } else {
    renderComponent = <AuthNavigator />;
  }

  return (
    <PaperProvider theme={theme}>
      {!rehydrated ? (
        <Loader />
      ) : (
        <NavigationContainer
          ref={navigationRef}
          linking={linking}
          fallback={<Loader />}
          onReady={handleOnReady}
          theme={theme}
          onStateChange={handleOnNavigationStateChange}
        >
          <View style={styles.container}>
            <StatusBar
              barStyle={
                Platform.OS === 'ios' && themeName === THEME_TYPES.LIGHT
                  ? 'dark-content'
                  : 'light-content'
              }
              backgroundColor={
                themeName === THEME_TYPES.DARK
                  ? PaperDarkTheme.colors.surface
                  : 'rgb(33,123,178)'
              }
              animated
            />
            {renderComponent}
            <FlashMessage />
            <ModalRoot />
            <PXSnackbar />
          </View>
        </NavigationContainer>
      )}
    </PaperProvider>
  );
};

export default App;

