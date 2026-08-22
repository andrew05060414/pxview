const {
  extractUploadedImageCandidatesFromHtml,
} = require('../../src/common/helpers/novelWebviewImageCandidates');

describe('extractUploadedImageCandidatesFromHtml', () => {
  it('extracts an uploaded image url from raw html near the uploaded image id', () => {
    const text = 'before[uploadedimage:24115550]after';
    const rawHtml = `
      <html>
        <body>
          <script>
            window.__SOME_STATE__ = {
              imageId: "24115550",
              originalUrl: "https://i.pximg.net/novel-cover-original/img/2026/04/05/00/00/00/24115550_p0.jpg",
              width: 1200,
              height: 800
            };
          </script>
        </body>
      </html>
    `;

    expect(extractUploadedImageCandidatesFromHtml(rawHtml, text)).toEqual({
      24115550: {
        height: 800,
        originalUrl:
          'https://i.pximg.net/novel-cover-original/img/2026/04/05/00/00/00/24115550_p0.jpg',
        width: 1200,
      },
    });
  });

  it('returns an empty object when no uploaded image ids exist in the text', () => {
    expect(
      extractUploadedImageCandidatesFromHtml(
        '<html><body>plain</body></html>',
        'plain text only',
      ),
    ).toEqual({});
  });

  it('accepts image URLs with query strings and newer image formats', () => {
    expect(
      extractUploadedImageCandidatesFromHtml(
        'imageId: "24115550", originalUrl: "https://i.pximg.net/novel-upload.avif?x=1"',
        'before[uploadedimage:24115550]after',
      ),
    ).toEqual({
      24115550: {
        originalUrl: 'https://i.pximg.net/novel-upload.avif?x=1',
      },
    });
  });

  it('preserves a GIF URL query and hash suffix', () => {
    expect(
      extractUploadedImageCandidatesFromHtml(
        'imageId: "24115551", originalUrl: "https://i.pximg.net/novel-upload.gif?x=1#frame=2"',
        'before[uploadedimage:24115551]after',
      ),
    ).toEqual({
      24115551: {
        originalUrl: 'https://i.pximg.net/novel-upload.gif?x=1#frame=2',
      },
    });
  });

  it('extracts candidates for multiple uploaded image ids from separate nearby snippets', () => {
    const firstImageId = '24115552';
    const secondImageId = '24115553';
    const rawHtml = [
      `imageId: "${firstImageId}", originalUrl: "https://i.pximg.net/novel-first.jpg", width: 1200, height: 800`,
      'x'.repeat(6000),
      `imageId: "${secondImageId}", originalUrl: "https://i.pximg.net/novel-second.webp", width: 800, height: 1200`,
    ].join('');

    expect(
      extractUploadedImageCandidatesFromHtml(
        rawHtml,
        `[uploadedimage:${firstImageId}]middle[uploadedimage:${secondImageId}]`,
      ),
    ).toEqual({
      24115552: {
        originalUrl: 'https://i.pximg.net/novel-first.jpg',
        width: 1200,
        height: 800,
      },
      24115553: {
        originalUrl: 'https://i.pximg.net/novel-second.webp',
        width: 800,
        height: 1200,
      },
    });
  });

  it('returns no candidate when the marker id does not occur in the HTML', () => {
    expect(
      extractUploadedImageCandidatesFromHtml(
        'imageId: "24115551", originalUrl: "https://i.pximg.net/novel-neighbor.jpg"',
        'before[uploadedimage:24115550]after',
      ),
    ).toEqual({});
  });

  it('skips an uploaded image id when no image URL is present nearby', () => {
    expect(
      extractUploadedImageCandidatesFromHtml(
        'imageId: "24115554", width: 1200, height: 800',
        'before[uploadedimage:24115554]after',
      ),
    ).toEqual({});
  });
});
