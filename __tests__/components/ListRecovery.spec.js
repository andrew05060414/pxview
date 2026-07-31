import React from 'react';
import renderer from 'react-test-renderer';
import { FlatList } from 'react-native';

jest.mock('react-native-paper', () => ({
  useTheme: () => ({ colors: { background: '#000000' } }),
  withTheme: (Component) => Component,
}));

jest.mock('../../src/components/IllustItem', () => 'IllustItem');
jest.mock('../../src/components/NovelItem', () => 'NovelItem');

import { IllustList } from '../../src/components/IllustList';
import { NovelList } from '../../src/components/NovelList';

const failedListData = {
  items: [],
  loading: false,
  loaded: false,
  refreshing: false,
  error: true,
};

const listProps = {
  navigation: { push: jest.fn() },
  theme: { colors: { background: '#000000' } },
};

describe('failed list recovery', () => {
  it('keeps illustration lists pull-to-refreshable after a failed load', () => {
    const onRefresh = jest.fn();
    const tree = renderer.create(
      <IllustList
        {...listProps}
        data={failedListData}
        onRefresh={onRefresh}
      />,
    );

    const list = tree.root.findByType(FlatList);
    expect(list.props.data).toEqual([]);
    expect(list.props.refreshControl.props.onRefresh).toBe(onRefresh);
  });

  it('keeps novel lists pull-to-refreshable after a failed load', () => {
    const onRefresh = jest.fn();
    const tree = renderer.create(
      <NovelList {...listProps} data={failedListData} onRefresh={onRefresh} />,
    );

    const list = tree.root.findByType(FlatList);
    expect(list.props.data).toEqual([]);
    expect(list.props.refreshControl.props.onRefresh).toBe(onRefresh);
  });
});
