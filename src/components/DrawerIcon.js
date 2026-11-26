import React from 'react';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Entypo from 'react-native-vector-icons/Entypo';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const getIconComponent = (type) => {
  switch (type) {
    case 'material':
      return MaterialIcons;
    case 'font-awesome':
      return FontAwesome;
    case 'ionicon':
      return Ionicons;
    case 'feather':
      return Feather;
    case 'material-community':
      return MaterialCommunityIcons;
    case 'entypo':
      return Entypo;
    default:
      return FontAwesome;
  }
};

const DrawerIcon = ({ name, type, color, size, ...restProps }) => {
  const IconComponent = getIconComponent(type || 'font-awesome');
  return (
    <IconComponent
      name={name}
      size={size || 24}
      color={color}
      {...restProps}
    />
  );
};

export default DrawerIcon;
