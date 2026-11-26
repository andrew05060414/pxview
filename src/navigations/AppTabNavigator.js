import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from 'react-native-paper';
import Recommended from '../screens/Recommended/Recommended';
import RankingPreview from '../screens/Ranking/RankingPreview';
import Trending from '../screens/Trending/Trending';
import NewWorks from '../screens/NewWorks/NewWorks';
import MyPage from '../screens/MyPage/MyPage';
import { SCREENS } from '../common/constants';
import { useLocalization } from '../components/Localization';

const Tab = createBottomTabNavigator();

const TabBarIcon = ({ color, name, iconType }) => {
  const IconComponent = iconType === 'material' ? MaterialIcons : FontAwesome;
  return <IconComponent name={name} size={22} color={color} />;
};

const AppTabNavigator = ({ initialRouteName }) => {
  const { i18n } = useLocalization();
  const theme = useTheme();

  return (
    <Tab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.7)',
        tabBarStyle: {
          backgroundColor: theme.colors.bottomTabBarBackground,
          borderTopWidth: 0,
        },
      }}
    >
      <Tab.Screen
        name={SCREENS.Recommended}
        component={Recommended}
        options={{
          tabBarLabel: i18n.recommended,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="thumbs-up" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name={SCREENS.RankingPreview}
        component={RankingPreview}
        options={{
          tabBarLabel: i18n.ranking,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="trophy" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name={SCREENS.Trending}
        component={Trending}
        options={{
          tabBarLabel: i18n.search,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="search" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name={SCREENS.NewWorks}
        component={NewWorks}
        options={{
          tabBarLabel: i18n.newest,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="fiber-new"
              iconType="material"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name={SCREENS.MyPageTab}
        component={MyPage}
        options={{
          tabBarLabel: i18n.myPage,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="user" color={color} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default AppTabNavigator;
