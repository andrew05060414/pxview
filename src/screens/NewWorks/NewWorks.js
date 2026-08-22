import React from 'react';
import { useNavigation } from '@react-navigation/native';
import FollowingUserNewWorks from './FollowingUserNewWorks';

const NewWorks = () => {
  const navigation = useNavigation();
  return <FollowingUserNewWorks active navigation={navigation} />;
};

export default NewWorks;
