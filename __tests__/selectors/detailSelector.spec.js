import {
  makeGetDetailItem,
  makeGetDetailNovelItem,
} from '../../src/common/selectors';

describe('detail selectors for local collection & list navigation entries', () => {
  const cachedState = {
    entities: {
      illusts: {
        111: { id: 111, title: 'Illust A', user: 1 },
        222: { id: 222, title: 'Illust B', user: 1 },
      },
      novels: {
        333: { id: 333, title: 'Novel C', user: 1 },
      },
      users: {
        1: { id: 1, name: 'Creator' },
      },
    },
  };

  const emptyEntitiesState = {
    entities: {
      illusts: {},
      novels: {},
      users: {},
    },
  };

  test('makeGetDetailItem handles { illustId }, { id, item }, { illust_id } without crashing when uncached', () => {
    const selectDetail = makeGetDetailItem();

    expect(
      selectDetail(emptyEntitiesState, { route: { params: { illustId: '111' } } }),
    ).toBeUndefined();
    expect(
      selectDetail(emptyEntitiesState, {
        route: { params: { id: '111', item: { id: '111', title: 'Art' } } },
      }),
    ).toBeUndefined();
    expect(
      selectDetail(emptyEntitiesState, { route: { params: { illust_id: '111' } } }),
    ).toBeUndefined();

    expect(
      selectDetail(cachedState, { route: { params: { illustId: '111' } } }),
    ).toMatchObject({ id: 111, title: 'Illust A', user: { id: 1, name: 'Creator' } });
    expect(
      selectDetail(cachedState, {
        route: { params: { id: '222', item: { id: '222' } } },
      }),
    ).toMatchObject({ id: 222, title: 'Illust B' });
  });

  test('makeGetDetailItem continues to support list pagination items[index] and guards missing params', () => {
    const selectDetail = makeGetDetailItem();
    const listParams = {
      items: [{ id: 111 }, { id: 222 }],
      index: 1,
    };

    expect(
      selectDetail(cachedState, { route: { params: listParams } }),
    ).toMatchObject({ id: 222, title: 'Illust B' });
    expect(selectDetail(cachedState, { route: {} })).toBeUndefined();
    expect(
      selectDetail(cachedState, { route: { params: { items: [], index: 0 } } }),
    ).toBeUndefined();
  });

  test('makeGetDetailNovelItem handles { novelId }, { id, item }, and list items[index]', () => {
    const selectNovelDetail = makeGetDetailNovelItem();

    expect(
      selectNovelDetail(emptyEntitiesState, {
        route: { params: { id: '333', item: { id: '333' } } },
      }),
    ).toBeUndefined();
    expect(
      selectNovelDetail(cachedState, {
        route: { params: { novelId: '333', id: '333' } },
      }),
    ).toMatchObject({ id: 333, title: 'Novel C' });
    expect(
      selectNovelDetail(cachedState, {
        route: { params: { items: [{ id: 333 }], index: 0 } },
      }),
    ).toMatchObject({ id: 333, title: 'Novel C' });
  });
});
