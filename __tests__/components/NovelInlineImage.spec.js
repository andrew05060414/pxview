import React from 'react';
import renderer, { act } from 'react-test-renderer';

const illustDetail = jest.fn();

jest.mock('../../src/common/helpers/apiClient', () => ({
  __esModule: true,
  default: {
    illustDetail: (...args) => illustDetail(...args),
  },
}));

jest.mock('../../src/components/PXImage', () => {
  const React = require('react');
  const { Image } = require('react-native');

  return function MockPXImage(props) {
    return React.createElement(Image, {
      ...props,
      testID: props.testID || `px-image-${props.uri}`,
    });
  };
});

const {
  default: NovelInlineImage,
  clearNovelInlineImageCache,
  prefetchIllustDetail,
} = require('../../src/components/NovelInlineImage');

const flushPromises = () => Promise.resolve();

const findHostNodeByAccessibilityLabel = (root, accessibilityLabel, type) =>
  root.find(
    (node) =>
      node.type === type &&
      node.props.accessibilityLabel === accessibilityLabel,
  );

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('NovelInlineImage', () => {
  beforeEach(() => {
    illustDetail.mockReset();
    clearNovelInlineImageCache();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows loading while the image request is in flight', async () => {
    const deferred = createDeferred();
    illustDetail.mockReturnValueOnce(deferred.promise);

    const tree = renderer.create(<NovelInlineImage illustId="24095674" />);

    expect(tree.toJSON().type).toBe('Text');
    expect(JSON.stringify(tree.toJSON())).toContain('Loading image...');
    expect(
      findHostNodeByAccessibilityLabel(
        tree.root,
        'novel-inline-image-24095674',
        'Text',
      ).props.children,
    ).toBe('Loading image...');

    tree.unmount();
    deferred.resolve({ illust: {} });
    await act(async () => {
      await deferred.promise;
      await flushPromises();
    });
  });

  it('shares an in-flight illust detail request for the same image id', async () => {
    const deferred = createDeferred();
    illustDetail.mockReturnValueOnce(deferred.promise);

    let firstTree;
    let secondTree;
    await act(async () => {
      firstTree = renderer.create(<NovelInlineImage illustId="24095674" />);
      secondTree = renderer.create(<NovelInlineImage imageId="24095674" />);
      await flushPromises();
    });

    expect(illustDetail).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve({
        illust: {
          width: 120,
          height: 60,
          image_urls: { large: 'https://example.com/shared.jpg' },
        },
      });
      await deferred.promise;
      await flushPromises();
    });

    expect(JSON.stringify(firstTree.toJSON())).toContain(
      'px-image-https://example.com/shared.jpg',
    );
    expect(JSON.stringify(secondTree.toJSON())).toContain(
      'px-image-https://example.com/shared.jpg',
    );
    firstTree.unmount();
    secondTree.unmount();
  });

  it('falls back when the image request resolves without a URL', async () => {
    illustDetail.mockResolvedValueOnce({ illust: {} });

    let tree;
    await act(async () => {
      tree = renderer.create(<NovelInlineImage illustId="24095674" />);
      await flushPromises();
    });

    expect(tree.toJSON().type).toBe('Text');
    expect(JSON.stringify(tree.toJSON())).toContain('Image unavailable');
    expect(
      findHostNodeByAccessibilityLabel(
        tree.root,
        'novel-inline-image-24095674',
        'Text',
      ).props.children,
    ).toBe('Image unavailable (illust detail has no usable url)');
  });

  it('falls back when the image request rejects', async () => {
    illustDetail.mockRejectedValueOnce(new Error('request failed'));

    let tree;
    await act(async () => {
      tree = renderer.create(<NovelInlineImage illustId="24095674" />);
      await flushPromises();
    });

    expect(tree.toJSON().type).toBe('Text');
    expect(JSON.stringify(tree.toJSON())).toContain('Image unavailable');
    expect(
      findHostNodeByAccessibilityLabel(
        tree.root,
        'novel-inline-image-24095674',
        'Text',
      ).props.children,
    ).toBe('Image unavailable (illust detail request failed)');
  });

  it('forwards stable props to PXImage and falls back if the rendered image reports an error', async () => {
    illustDetail.mockResolvedValueOnce({
      illust: {
        width: 120,
        height: 60,
        image_urls: { large: 'https://example.com/image.jpg' },
      },
    });

    let tree;
    await act(async () => {
      tree = renderer.create(<NovelInlineImage illustId="24095674" />);
      await flushPromises();
    });

    const imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24095674',
      'Image',
    );

    expect(imageNode.props.uri).toBe('https://example.com/image.jpg');
    expect(imageNode.props.resizeMode).toBe('contain');
    expect(imageNode.props.resizeMethod).toBe('scale');
    expect(imageNode.props.fadeDuration).toBe(0);
    expect(imageNode.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: 'rgba(128,128,128,0.12)' }),
        expect.objectContaining({ aspectRatio: 2 }),
      ]),
    );

    await act(async () => {
      imageNode.props.onError();
    });

    expect(tree.toJSON().type).toBe('Text');
    expect(JSON.stringify(tree.toJSON())).toContain('Image unavailable');
    expect(
      findHostNodeByAccessibilityLabel(
        tree.root,
        'novel-inline-image-24095674',
        'Text',
      ).props.children,
    ).toBe('Image unavailable (image request failed)');
  });

  it('renders loaded images without a block wrapper and preserves the accessibility label', async () => {
    illustDetail.mockResolvedValueOnce({
      illust: {
        width: 100,
        height: 100,
        image_urls: { large: 'https://example.com/image.jpg' },
      },
    });

    let tree;
    await act(async () => {
      tree = renderer.create(<NovelInlineImage illustId="24095674" />);
      await flushPromises();
    });

    expect(tree.toJSON().type).toBe('Image');
    const imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24095674',
      'Image',
    );

    expect(imageNode.props.uri).toBe('https://example.com/image.jpg');
  });

  it('renders uploaded novel images from embedded image metadata without calling illustDetail', async () => {
    let tree;

    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="24115550"
          imageKind="uploadedimage"
          embeddedImages={{
            24115550: {
              width: 400,
              height: 200,
              urls: { original: 'https://example.com/uploaded-original.jpg' },
            },
          }}
        />,
      );
      await flushPromises();
    });

    const imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );

    expect(imageNode.props.uri).toBe(
      'https://example.com/uploaded-original.jpg',
    );
    expect(illustDetail).not.toHaveBeenCalled();
  });

  it('renders uploaded novel images when Pixiv only provides sized textEmbeddedImages urls', async () => {
    let tree;

    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="24115550"
          imageKind="uploadedimage"
          embeddedImages={{
            24115550: {
              width: 600,
              height: 400,
              urls: {
                '1200x1200': 'https://example.com/uploaded-1200.jpg',
                '480mw': 'https://example.com/uploaded-480.jpg',
              },
            },
          }}
        />,
      );
      await flushPromises();
    });

    const imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );

    expect(imageNode.props.uri).toBe('https://example.com/uploaded-1200.jpg');
    expect(illustDetail).not.toHaveBeenCalled();
  });

  it('renders uploaded novel images when metadata is only discoverable by matching embedded image values', async () => {
    let tree;

    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="24115550"
          imageKind="uploadedimage"
          embeddedImages={{
            preview: {
              id: '24115550',
              width: 400,
              height: 200,
              urls: { original: 'https://example.com/uploaded-by-value.jpg' },
            },
          }}
        />,
      );
      await flushPromises();
    });

    const imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );

    expect(imageNode.props.uri).toBe(
      'https://example.com/uploaded-by-value.jpg',
    );
    expect(illustDetail).not.toHaveBeenCalled();
  });

  it('renders uploaded novel images when embedded metadata uses illustId instead of id', async () => {
    let tree;

    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="24115550"
          imageKind="uploadedimage"
          embeddedImages={{
            preview: {
              illustId: '24115550',
              width: 400,
              height: 200,
              urls: { original: 'https://example.com/uploaded-by-illust-id.jpg' },
            },
          }}
        />,
      );
      await flushPromises();
    });

    const imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );

    expect(imageNode.props.uri).toBe(
      'https://example.com/uploaded-by-illust-id.jpg',
    );
    expect(illustDetail).not.toHaveBeenCalled();
  });

  it('renders uploaded novel images when glossary-style metadata uses imageId and coverUrl', async () => {
    let tree;

    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="24115550"
          imageKind="uploadedimage"
          embeddedImages={{
            glossaryEntry: {
              imageId: '24115550',
              width: 400,
              height: 200,
              coverUrl: 'https://example.com/uploaded-by-glossary-cover-url.jpg',
            },
          }}
        />,
      );
      await flushPromises();
    });

    const imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );

    expect(imageNode.props.uri).toBe(
      'https://example.com/uploaded-by-glossary-cover-url.jpg',
    );
    expect(illustDetail).not.toHaveBeenCalled();
  });

  it('shows when uploadedimage metadata is completely missing', async () => {
    let tree;

    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="24115550"
          imageKind="uploadedimage"
          embeddedImages={{}}
        />,
      );
      await flushPromises();
    });

    expect(
      findHostNodeByAccessibilityLabel(
        tree.root,
        'novel-inline-image-24115550',
        'Text',
      ).props.children,
    ).toBe('Image unavailable (no embedded image metadata)');
  });

  it('uses the requested pixivimage page when resolving multi-page illustrations', async () => {
    illustDetail.mockResolvedValueOnce({
      illust: {
        meta_pages: [
          { image_urls: { original: 'https://example.com/page-1.jpg' } },
          { image_urls: { original: 'https://example.com/page-2.jpg' } },
        ],
      },
    });

    let tree;
    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="24095674"
          imageKind="pixivimage"
          pageNumber={2}
        />,
      );
      await flushPromises();
    });

    const imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24095674',
      'Image',
    );

    expect(imageNode.props.uri).toBe('https://example.com/page-2.jpg');
  });

  it('ignores stale responses after the illust id changes', async () => {
    const first = createDeferred();
    const second = createDeferred();
    illustDetail
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const tree = renderer.create(<NovelInlineImage illustId="24095674" />);

    await act(async () => {
      tree.update(<NovelInlineImage illustId="24095675" />);
      second.resolve({
        illust: {
          width: 100,
          height: 100,
          image_urls: { large: 'https://example.com/second.jpg' },
        },
      });
      await second.promise;
      await flushPromises();
    });

    await act(async () => {
      first.resolve({
        illust: {
          width: 100,
          height: 100,
          image_urls: { large: 'https://example.com/first.jpg' },
        },
      });
      await first.promise;
      await flushPromises();
    });

    expect(JSON.stringify(tree.toJSON())).toContain('px-image-https://example.com/second.jpg');
    expect(JSON.stringify(tree.toJSON())).not.toContain('px-image-https://example.com/first.jpg');
  });

  it('ignores in-flight responses after unmount', async () => {
    const deferred = createDeferred();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    illustDetail.mockReturnValueOnce(deferred.promise);

    const tree = renderer.create(<NovelInlineImage illustId="24095674" />);

    tree.unmount();

    await act(async () => {
      deferred.resolve({
        illust: {
          width: 100,
          height: 100,
          image_urls: { large: 'https://example.com/unmounted.jpg' },
        },
      });
      await deferred.promise;
    });

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('prefers original url over 1200x1200 for sharp display on high-dpi screens', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="24115550"
          imageKind="uploadedimage"
          embeddedImages={{
            24115550: {
              width: 600,
              height: 400,
              urls: {
                original: 'https://example.com/uploaded-original.png',
                '1200x1200': 'https://example.com/uploaded-1200.jpg',
                '600x600': 'https://example.com/uploaded-600.jpg',
              },
            },
          }}
        />,
      );
      await flushPromises();
    });

    const imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );

    expect(imageNode.props.uri).toBe('https://example.com/uploaded-original.png');
    expect(imageNode.props.resizeMethod).toBe('scale');
    expect(illustDetail).not.toHaveBeenCalled();
  });

  it('prefers original_image_url over large for sharp pixivimage illustrations', async () => {
    illustDetail.mockResolvedValueOnce({
      illust: {
        width: 1000,
        height: 1500,
        image_urls: {
          large: 'https://example.com/illust-large.jpg',
          medium: 'https://example.com/illust-medium.jpg',
        },
        meta_single_page: {
          original_image_url: 'https://example.com/illust-original.png',
        },
      },
    });

    let tree;
    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage imageId="24095674" imageKind="pixivimage" />,
      );
      await flushPromises();
    });

    const imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24095674',
      'Image',
    );
    expect(imageNode.props.uri).toBe('https://example.com/illust-original.png');
  });

  it('reuses cached illustDetail responses across remounts in virtualized lists', async () => {
    illustDetail.mockResolvedValueOnce({
      illust: {
        width: 800,
        height: 400,
        image_urls: { large: 'https://example.com/cached-illust.jpg' },
      },
    });

    let firstTree;
    await act(async () => {
      firstTree = renderer.create(<NovelInlineImage illustId="24095674" />);
      await flushPromises();
    });
    firstTree.unmount();

    let secondTree;
    await act(async () => {
      secondTree = renderer.create(<NovelInlineImage illustId="24095674" />);
      await flushPromises();
    });

    expect(illustDetail).toHaveBeenCalledTimes(1);
    const imageNode = findHostNodeByAccessibilityLabel(
      secondTree.root,
      'novel-inline-image-24095674',
      'Image',
    );
    expect(imageNode.props.uri).toBe('https://example.com/cached-illust.jpg');
    expect(imageNode.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ aspectRatio: 2 })]),
    );
    secondTree.unmount();
  });

  it('renders embedded image immediately without Image.getSizeWithHeaders and caches ratio from onLoad', async () => {
    const getSizeWithHeaders = jest.spyOn(
      require('react-native').Image,
      'getSizeWithHeaders',
    );

    const embeddedImages = {
      24115550: {
        // No width/height fields — API provides URLs only
        urls: { original: 'https://example.com/portrait.jpg' },
      },
    };

    let tree;
    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="24115550"
          imageKind="uploadedimage"
          embeddedImages={embeddedImages}
        />,
      );
    });

    expect(getSizeWithHeaders).not.toHaveBeenCalled();

    const imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );
    expect(imageNode.props.uri).toBe('https://example.com/portrait.jpg');

    await act(async () => {
      imageNode.props.onLoad({
        nativeEvent: { source: { width: 400, height: 800 } },
      });
    });

    const imageNodeAfterLoad = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );
    expect(imageNodeAfterLoad.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ aspectRatio: 0.5 })]),
    );
    tree.unmount();

    // Remount (as happens in FlatList virtualization): should use cached aspect ratio immediately
    let remounted;
    await act(async () => {
      remounted = renderer.create(
        <NovelInlineImage
          imageId="24115550"
          imageKind="uploadedimage"
          embeddedImages={embeddedImages}
        />,
      );
    });
    const remountedImage = findHostNodeByAccessibilityLabel(
      remounted.root,
      'novel-inline-image-24115550',
      'Image',
    );
    expect(remountedImage.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ aspectRatio: 0.5 })]),
    );
    expect(illustDetail).not.toHaveBeenCalled();
    remounted.unmount();
  });

  it('skips Image.getSizeWithHeaders when embedded metadata includes width and height', async () => {
    const getSizeWithHeaders = jest.spyOn(
      require('react-native').Image,
      'getSizeWithHeaders',
    );

    let tree;
    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="24115550"
          imageKind="uploadedimage"
          embeddedImages={{
            24115550: {
              width: 400,
              height: 200,
              urls: { original: 'https://example.com/uploaded-original.jpg' },
            },
          }}
        />,
      );
      await flushPromises();
    });

    expect(getSizeWithHeaders).not.toHaveBeenCalled();
    const imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );
    expect(imageNode.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ aspectRatio: 2 }),
      ]),
    );
  });

  it.each([
    [
      'GIF',
      'https://example.com/animated.gif?format=gif&token=gif-query',
    ],
    [
      'AVIF',
      'https://example.com/novel.avif?format=avif&token=avif-query',
    ],
  ])(
    'keeps query parameters on %s embedded URLs when metadata has no dimensions',
    async (_format, imageUrl) => {
      const getSizeWithHeaders = jest.spyOn(
        require('react-native').Image,
        'getSizeWithHeaders',
      );

      let tree;
      await act(async () => {
        tree = renderer.create(
          <NovelInlineImage
            imageId="24115550"
            imageKind="uploadedimage"
            embeddedImages={{
              24115550: {
                urls: { original: imageUrl },
              },
            }}
          />,
        );
      });

      expect(getSizeWithHeaders).not.toHaveBeenCalled();

      let imageNode = findHostNodeByAccessibilityLabel(
        tree.root,
        'novel-inline-image-24115550',
        'Image',
      );
      expect(imageNode.props.uri).toBe(imageUrl);

      await act(async () => {
        imageNode.props.onLoad({
          nativeEvent: { source: { width: 640, height: 360 } },
        });
      });

      imageNode = findHostNodeByAccessibilityLabel(
        tree.root,
        'novel-inline-image-24115550',
        'Image',
      );
      expect(imageNode.props.uri).toBe(imageUrl);
      expect(imageNode.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ aspectRatio: 640 / 360 }),
        ]),
      );

      await act(async () => {
        imageNode.props.onError();
      });

      expect(
        findHostNodeByAccessibilityLabel(
          tree.root,
          'novel-inline-image-24115550',
          'Text',
        ).props.children,
      ).toBe('Image unavailable (image request failed)');
      expect(illustDetail).not.toHaveBeenCalled();
    },
  );

  it('shows when a resolved uploaded image url still fails to load', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="24115550"
          imageKind="uploadedimage"
          embeddedImages={{
            24115550: {
              width: 400,
              height: 200,
              urls: { original: 'https://example.com/uploaded-original.jpg' },
            },
          }}
        />,
      );
      await flushPromises();
    });

    const imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );

    await act(async () => {
      imageNode.props.onError();
    });

    expect(
      findHostNodeByAccessibilityLabel(
        tree.root,
        'novel-inline-image-24115550',
        'Text',
      ).props.children,
    ).toBe('Image unavailable (image request failed)');
  });

  it('does not lock multi-page pixivimage page 2+ to page 1 illust dimensions and caches actual onLoad ratio', async () => {
    const page1Url = 'https://example.com/multi-page-1.jpg';
    const page2Url = 'https://example.com/multi-page-2.jpg';
    illustDetail.mockResolvedValueOnce({
      illust: {
        width: 1536,
        height: 1024,
        meta_pages: [
          { image_urls: { original: page1Url } },
          { image_urls: { original: page2Url } },
        ],
      },
    });

    let tree;
    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="147842449"
          imageKind="pixivimage"
          pageNumber={2}
          maxWidth={400}
        />,
      );
      await flushPromises();
    });

    let imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-147842449',
      'Image',
    );
    expect(imageNode.props.uri).toBe(page2Url);
    expect(imageNode.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 400,
          height: Math.round(400 / (4 / 3)),
        }),
      ]),
    );
    expect(imageNode.props.style).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ aspectRatio: 1.5 }),
      ]),
    );

    const portraitRatio = 832 / 1216;
    await act(async () => {
      imageNode.props.onLoad({
        nativeEvent: {
          source: { uri: page2Url, width: 832, height: 1216 },
        },
      });
    });

    imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-147842449',
      'Image',
    );
    expect(imageNode.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 400,
          height: Math.round(400 / portraitRatio),
          aspectRatio: portraitRatio,
        }),
      ]),
    );
    tree.unmount();

    let remounted;
    await act(async () => {
      remounted = renderer.create(
        <NovelInlineImage
          imageId="147842449"
          imageKind="pixivimage"
          pageNumber={2}
          maxWidth={400}
        />,
      );
      await flushPromises();
    });

    const remountedNode = findHostNodeByAccessibilityLabel(
      remounted.root,
      'novel-inline-image-147842449',
      'Image',
    );
    expect(remountedNode.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 400,
          height: Math.round(400 / portraitRatio),
          aspectRatio: portraitRatio,
        }),
      ]),
    );
    expect(illustDetail).toHaveBeenCalledTimes(1);
    remounted.unmount();
  });

  it('corrects aspect ratio from onLoad even when metadata ratio differs and ignores mismatched source uri', async () => {
    const targetUrl = 'https://example.com/mismatch-check.jpg';
    illustDetail.mockResolvedValueOnce({
      illust: {
        width: 1500,
        height: 1000,
        image_urls: { large: targetUrl },
      },
    });

    let tree;
    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="998877"
          imageKind="pixivimage"
          maxWidth={300}
        />,
      );
      await flushPromises();
    });

    let imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-998877',
      'Image',
    );
    expect(imageNode.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ aspectRatio: 1.5, height: 200 }),
      ]),
    );

    // Mismatched URI should be ignored
    await act(async () => {
      imageNode.props.onLoad({
        nativeEvent: {
          source: {
            uri: 'https://example.com/other.jpg',
            width: 500,
            height: 1000,
          },
        },
      });
    });

    imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-998877',
      'Image',
    );
    expect(imageNode.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ aspectRatio: 1.5, height: 200 }),
      ]),
    );

    // Matching URI with different actual dimensions updates state and cache
    await act(async () => {
      imageNode.props.onLoad({
        nativeEvent: {
          source: { uri: targetUrl, width: 600, height: 1200 },
        },
      });
    });

    imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-998877',
      'Image',
    );
    expect(imageNode.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 300,
          height: 600,
          aspectRatio: 0.5,
        }),
      ]),
    );

    tree.unmount();
  });

  it('does not lock pixivimage without metadata dimensions to 1:1 and resolves ratio on onLoad', async () => {
    const targetUrl = 'https://example.com/no-dims.jpg';
    illustDetail.mockResolvedValueOnce({
      illust: {
        image_urls: { large: targetUrl },
      },
    });

    let tree;
    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="776655"
          imageKind="pixivimage"
          maxWidth={400}
        />,
      );
      await flushPromises();
    });

    let imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-776655',
      'Image',
    );
    expect(imageNode.props.style).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ aspectRatio: 1 }),
      ]),
    );

    await act(async () => {
      imageNode.props.onLoad({
        nativeEvent: {
          source: { uri: targetUrl, width: 1000, height: 2000 },
        },
      });
    });

    imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-776655',
      'Image',
    );
    expect(imageNode.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 400,
          height: 800,
          aspectRatio: 0.5,
        }),
      ]),
    );
  });

  it('falls back through secondary embedded URLs on error and supports tap-to-retry after all URLs fail', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="24115550"
          imageKind="uploadedimage"
          embeddedImages={{
            24115550: {
              width: 600,
              height: 400,
              urls: {
                original: 'https://example.com/orig-broken.png',
                '1200x1200': 'https://example.com/1200-fallback.jpg',
                medium: 'https://example.com/med-fallback.jpg',
              },
            },
          }}
        />,
      );
      await flushPromises();
    });

    let imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );
    expect(imageNode.props.uri).toBe('https://example.com/orig-broken.png');

    // 1st error -> falls back to 1200x1200
    await act(async () => {
      imageNode.props.onError();
    });
    imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );
    expect(imageNode.props.uri).toBe('https://example.com/1200-fallback.jpg');

    // 2nd error -> falls back to medium
    await act(async () => {
      imageNode.props.onError();
    });
    imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );
    expect(imageNode.props.uri).toBe('https://example.com/med-fallback.jpg');

    // 3rd error -> shows retryable failure text
    await act(async () => {
      imageNode.props.onError();
    });
    const errorText = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Text',
    );
    expect(errorText.props.children).toBe(
      'Image unavailable (image request failed)',
    );
    expect(typeof errorText.props.onPress).toBe('function');

    // Tap to retry -> resets to primary URL
    await act(async () => {
      errorText.props.onPress();
    });
    imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );
    expect(imageNode.props.uri).toBe('https://example.com/orig-broken.png');
  });

  it('retries illustDetail request when user taps failed placeholder', async () => {
    illustDetail
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce({
        illust: {
          width: 800,
          height: 400,
          image_urls: { large: 'https://example.com/recovered.jpg' },
        },
      });

    let tree;
    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage imageId="554433" imageKind="pixivimage" />,
      );
      await flushPromises();
    });

    const errorText = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-554433',
      'Text',
    );
    expect(errorText.props.children).toBe(
      'Image unavailable (illust detail request failed)',
    );

    await act(async () => {
      errorText.props.onPress();
      await flushPromises();
    });

    const imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-554433',
      'Image',
    );
    expect(imageNode.props.uri).toBe('https://example.com/recovered.jpg');
    expect(illustDetail).toHaveBeenCalledTimes(2);
  });

  it('ignores onLoad and onError callbacks after unmount without warnings', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    let tree;
    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="24115550"
          imageKind="uploadedimage"
          embeddedImages={{
            24115550: {
              urls: { original: 'https://example.com/unmount-callback.jpg' },
            },
          }}
        />,
      );
    });

    const imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );
    const { onLoad, onError } = imageNode.props;
    tree.unmount();

    act(() => {
      onLoad({
        nativeEvent: {
          source: {
            uri: 'https://example.com/unmount-callback.jpg',
            width: 500,
            height: 1000,
          },
        },
      });
      onError();
    });

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('guards against invalid or extreme aspect ratio dimensions', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="24115550"
          imageKind="uploadedimage"
          maxWidth={300}
          embeddedImages={{
            24115550: {
              width: -100,
              height: 0,
              urls: { original: 'https://example.com/extreme.jpg' },
            },
          }}
        />,
      );
    });

    let imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );
    expect(imageNode.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 300,
          height: Math.round(300 / (4 / 3)),
        }),
      ]),
    );

    await act(async () => {
      imageNode.props.onLoad({
        nativeEvent: {
          source: {
            uri: 'https://example.com/extreme.jpg',
            width: 1,
            height: 10000,
          },
        },
      });
    });

    imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );
    expect(imageNode.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 300,
          height: 3000,
        }),
      ]),
    );
  });

  it('keeps loaded state intact when embeddedImages reference changes without altering this image', async () => {
    const sharedUrl = 'https://example.com/stable-ref.jpg';
    let tree;
    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="24115550"
          imageKind="uploadedimage"
          maxWidth={300}
          embeddedImages={{
            24115550: { urls: { original: sharedUrl } },
          }}
        />,
      );
    });

    const imageNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );
    await act(async () => {
      imageNode.props.onLoad({
        nativeEvent: { source: { uri: sharedUrl, width: 300, height: 600 } },
      });
    });

    // Update with a new embeddedImages object reference containing the same entry
    await act(async () => {
      tree.update(
        <NovelInlineImage
          imageId="24115550"
          imageKind="uploadedimage"
          maxWidth={300}
          embeddedImages={{
            24115550: { urls: { original: sharedUrl } },
            99999999: { urls: { original: 'https://example.com/other.jpg' } },
          }}
        />,
      );
    });

    const updatedNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115550',
      'Image',
    );
    expect(updatedNode.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 300,
          height: 600,
          aspectRatio: 0.5,
        }),
      ]),
    );
  });

  it('renders progressive preview + ActivityIndicator first, upgrades to single-layer primary after onLoad, and skips preview on remount', async () => {
    const { ActivityIndicator } = require('react-native');
    const origUrl = 'https://example.com/prog-orig.png';
    const previewUrl = 'https://example.com/prog-large.jpg';
    let tree;

    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="24115551"
          imageKind="uploadedimage"
          maxWidth={400}
          embeddedImages={{
            24115551: {
              urls: {
                original: origUrl,
                large: previewUrl,
              },
            },
          }}
        />,
      );
    });

    // Initially renders preview, spinner, and transparent primary overlay
    const previewNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-preview-24115551',
      'Image',
    );
    const primaryNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115551',
      'Image',
    );
    expect(previewNode.props.uri).toBe(previewUrl);
    expect(primaryNode.props.uri).toBe(origUrl);
    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(1);

    // Preview loads -> hides spinner and updates aspect ratio to 0.5 (height = 800)
    await act(async () => {
      previewNode.props.onLoad({
        nativeEvent: {
          source: { uri: previewUrl, width: 600, height: 1200 },
        },
      });
    });

    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(0);
    expect(tree.toJSON().type).toBe('View');
    expect(tree.toJSON().props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 400, height: 800, aspectRatio: 0.5 }),
      ]),
    );

    // Primary loads -> unmounts preview layer and collapses to single Image
    await act(async () => {
      primaryNode.props.onLoad({
        nativeEvent: {
          source: { uri: origUrl, width: 1200, height: 2400 },
        },
      });
    });

    expect(
      tree.root.findAll(
        (n) =>
          n.type === 'Image' &&
          n.props.accessibilityLabel === 'novel-inline-image-preview-24115551',
      ),
    ).toHaveLength(0);
    expect(tree.toJSON().type).toBe('Image');
    expect(tree.toJSON().props.uri).toBe(origUrl);
    tree.unmount();

    // Remount -> already in loadedImageUrlsCache, skips preview and spinner immediately
    let remounted;
    await act(async () => {
      remounted = renderer.create(
        <NovelInlineImage
          imageId="24115551"
          imageKind="uploadedimage"
          maxWidth={400}
          embeddedImages={{
            24115551: {
              urls: {
                original: origUrl,
                large: previewUrl,
              },
            },
          }}
        />,
      );
    });

    expect(remounted.toJSON().type).toBe('Image');
    expect(remounted.root.findAllByType(ActivityIndicator)).toHaveLength(0);
    remounted.unmount();
  });

  it('keeps primary image loading when preview layer errors and falls back to preview when primary errors', async () => {
    const origUrl = 'https://example.com/prog2-orig.png';
    const previewUrl = 'https://example.com/prog2-large.jpg';
    let tree;

    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage
          imageId="24115552"
          imageKind="uploadedimage"
          maxWidth={400}
          embeddedImages={{
            24115552: {
              width: 800,
              height: 400,
              urls: {
                original: origUrl,
                large: previewUrl,
              },
            },
          }}
        />,
      );
    });

    const previewNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-preview-24115552',
      'Image',
    );
    await act(async () => {
      previewNode.props.onError();
    });

    expect(
      tree.root.findAll(
        (n) =>
          n.type === 'Image' &&
          n.props.accessibilityLabel === 'novel-inline-image-preview-24115552',
      ),
    ).toHaveLength(0);

    // Primary still present and if it errors, switches to urlIndex=1 (previewUrl)
    const primaryNode = findHostNodeByAccessibilityLabel(
      tree.root,
      'novel-inline-image-24115552',
      'Image',
    );
    expect(primaryNode.props.uri).toBe(origUrl);

    await act(async () => {
      primaryNode.props.onError();
    });

    expect(tree.toJSON().type).toBe('Image');
    expect(tree.toJSON().props.uri).toBe(previewUrl);
  });

  it('prefetchIllustDetail warms cache safely and swallows rejections', async () => {
    illustDetail
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        illust: {
          width: 900,
          height: 600,
          image_urls: { large: 'https://example.com/prefetched.jpg' },
        },
      });

    await expect(prefetchIllustDetail(null)).resolves.toBeNull();
    await expect(prefetchIllustDetail('88001')).resolves.toBeNull();
    await expect(prefetchIllustDetail('88002')).resolves.toEqual(
      expect.objectContaining({
        illust: expect.objectContaining({ width: 900, height: 600 }),
      }),
    );

    // Subsequent mount uses cached illustDetail without another API call
    let tree;
    await act(async () => {
      tree = renderer.create(
        <NovelInlineImage imageId="88002" imageKind="pixivimage" />,
      );
    });

    expect(illustDetail).toHaveBeenCalledTimes(2);
    expect(
      findHostNodeByAccessibilityLabel(
        tree.root,
        'novel-inline-image-88002',
        'Image',
      ).props.uri,
    ).toBe('https://example.com/prefetched.jpg');
  });
});
