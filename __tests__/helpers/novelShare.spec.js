import buildNovelShareOptions from '../../src/common/helpers/novelShare';

describe('novel sharing', () => {
  it('shares one plain-text Pixiv URL without a duplicate url payload', () => {
    expect(
      buildNovelShareOptions({ id: 123456, title: 'A novel title' }),
    ).toEqual({
      title: 'A novel title',
      type: 'text/plain',
      message: 'https://www.pixiv.net/novel/show.php?id=123456',
    });
  });
});
