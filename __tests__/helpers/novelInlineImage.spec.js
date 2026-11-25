import {
  MAX_IMAGE_HEIGHT_WIDTH_RATIO,
  computeConstrainedImageHeight,
  findEmbeddedImageById,
  normalizeAspectRatio,
  resolveEmbeddedImageUrls,
  resolveIllustAspectRatio,
  resolveIllustImageUrls,
} from '../../src/common/helpers/novelInlineImage';
import { makeGetParsedNovelText } from '../../src/common/selectors';
import { READING_DIRECTION_TYPES } from '../../src/common/constants';

describe('novelInlineImage helpers', () => {
  it('validates and normalizes numeric or string dimensions while rejecting invalid values', () => {
    expect(normalizeAspectRatio(800, 400)).toBe(2);
    expect(normalizeAspectRatio('600', '1200')).toBe(0.5);
    expect(normalizeAspectRatio(0, 100)).toBeNull();
    expect(normalizeAspectRatio(100, 0)).toBeNull();
    expect(normalizeAspectRatio(-100, 200)).toBeNull();
    expect(normalizeAspectRatio(100, -200)).toBeNull();
    expect(normalizeAspectRatio('', 200)).toBeNull();
    expect(normalizeAspectRatio(NaN, 200)).toBeNull();
    expect(normalizeAspectRatio(Infinity, 200)).toBeNull();
  });

  it('caps extreme tall aspect ratios in computeConstrainedImageHeight', () => {
    expect(computeConstrainedImageHeight(300, 1.5)).toBe(200);
    expect(computeConstrainedImageHeight(300, 1 / 10000)).toBe(
      300 * MAX_IMAGE_HEIGHT_WIDTH_RATIO,
    );
    expect(computeConstrainedImageHeight(0, 1)).toBe(1);
  });

  it('resolves deduplicated embedded and illust fallback URLs in priority order', () => {
    expect(
      resolveEmbeddedImageUrls({
        urls: {
          original: 'https://example.com/orig.png',
          '1200x1200': 'https://example.com/1200.jpg',
          regular: 'https://example.com/1200.jpg',
          medium: 'https://example.com/med.jpg',
        },
      }),
    ).toEqual([
      'https://example.com/orig.png',
      'https://example.com/1200.jpg',
      'https://example.com/med.jpg',
    ]);

    expect(
      resolveIllustImageUrls(
        {
          meta_single_page: {
            original_image_url: 'https://example.com/single-orig.png',
          },
          image_urls: {
            large: 'https://example.com/single-large.jpg',
            medium: 'https://example.com/single-med.jpg',
          },
        },
        1,
      ),
    ).toEqual([
      'https://example.com/single-orig.png',
      'https://example.com/single-large.jpg',
      'https://example.com/single-med.jpg',
    ]);
  });

  it('finds embedded images across arrays, keyed maps, and alternate id fields', () => {
    expect(
      findEmbeddedImageById([{ novelImageId: 42, url: 'https://example.com/a.jpg' }], '42'),
    ).toEqual({ novelImageId: 42, url: 'https://example.com/a.jpg' });

    expect(
      findEmbeddedImageById(
        { entry: { image_id: '77', url: 'https://example.com/b.jpg' } },
        77,
      ),
    ).toEqual({ image_id: '77', url: 'https://example.com/b.jpg' });
  });

  it('resolves multi-page illust aspect ratio without leaking page 1 ratio to page 2+', () => {
    const multiPageIllust = {
      width: 1500,
      height: 1000,
      meta_pages: [
        { image_urls: { original: 'p1.jpg' } },
        { image_urls: { original: 'p2.jpg' } },
        { width: 600, height: 1200, image_urls: { original: 'p3.jpg' } },
      ],
    };

    expect(resolveIllustAspectRatio(multiPageIllust, 1)).toBe(1.5);
    expect(resolveIllustAspectRatio(multiPageIllust, 2)).toBeNull();
    expect(resolveIllustAspectRatio(multiPageIllust, 3)).toBe(0.5);
  });
});

describe('makeGetParsedNovelText memoization', () => {
  it('keeps the exact parsed array reference across unrelated state/props changes', () => {
    const selector = makeGetParsedNovelText();
    const baseState = {
      novelText: {
        101: { text: 'Page 1[newpage]Page 2' },
      },
      readingSettings: {
        novelReadingDirection: READING_DIRECTION_TYPES.LEFT_TO_RIGHT,
        sliderSide: 'right',
      },
    };

    const first = selector(baseState, { novelId: '101' });
    expect(first).toEqual(['Page 1', 'Page 2']);

    // Unrelated props object reference, sliderSide change, and another novel text update
    const second = selector(
      {
        novelText: {
          ...baseState.novelText,
          202: { text: 'Other novel' },
        },
        readingSettings: {
          ...baseState.readingSettings,
          sliderSide: 'left',
        },
      },
      { novelId: '101', extraProp: true },
    );
    expect(second).toBe(first);

    // Reading direction change re-computes
    const reversed = selector(
      {
        ...baseState,
        readingSettings: {
          ...baseState.readingSettings,
          novelReadingDirection: READING_DIRECTION_TYPES.RIGHT_TO_LEFT,
        },
      },
      { novelId: '101' },
    );
    expect(reversed).toEqual(['Page 2', 'Page 1']);
  });
});
