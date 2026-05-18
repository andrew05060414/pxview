# Novel Inline Images Fix Summary

## Goal

Make Pixiv novel inline images render normally in the reader at the exact place where the author inserted them, instead of showing raw placeholders such as:

- `[loadedimage:24095674]`
- `[uploadedimage:24115550]`

## What The Reader Needed To Do

The desired reading experience was simple:

- keep image placement inline with the text flow
- do not move the image into a separate gallery view
- preserve the author-defined position inside the novel body

In practice this means:

```text
line above
[full image rendered here]
line below
```

## The Original Rendering Problem

The original project already had a novel reader pipeline:

- fetch novel text
- parse Pixiv novel tags into HTML-like strings
- render those strings with `react-native-htmlview`

The missing part was that image markers were not first-class content. They either stayed as raw text or failed later as unresolved image placeholders.

## What Was Fixed First

### 1. Parser support

The parser and helpers were extended so the reader can recognize image markers and turn them into internal renderable nodes.

That work covered:

- `loadedimage`
- `uploadedimage`
- `pixivimage`

### 2. Inline renderer support

`NovelViewer` was updated to render custom inline image nodes inside the existing text flow instead of leaving them as plain text.

This preserved the existing reading architecture instead of rewriting the entire reader.

### 3. Fallback diagnostics

When images still did not render, the app was changed to show useful fallback messages instead of only `Image unavailable`.

Those diagnostics were critical because they proved where the failure really was.

## The Important Dead End

A lot of intermediate work was spent checking whether the failure was caused by:

- missing image URL field names
- wrong image ID matching
- `glossaryItems`
- `illusts`
- bad legacy `novel:` object selection
- HTML-nearby URL extraction

Those were reasonable hypotheses, but the diagnostics kept showing the same pattern:

- uploaded image literal existed in the text
- but embedded image metadata was absent
- `glossaryItems` was empty
- `illusts` was empty

This proved the renderer was no longer the main blocker.

## The Real Root Cause

The real issue was the data source.

The old reader logic fetched novel content through `pixiv.novelWebview(...)`, which ultimately relied on:

- `GET /webview/v2/novel?...`
- then parsing a legacy `novel:` object out of the response

That path was not giving this project the uploaded image metadata needed for `[uploadedimage:...]`.

The key discovery was that working Pixiv novel tooling does not rely on that path for inline uploaded images. It requests:

`https://www.pixiv.net/ajax/novel/{id}`

and reads:

- `body.content`
- `body.textEmbeddedImages`

That was the missing piece.

## Final Fix

The final fix changed the novel text saga so it now:

1. Tries `https://www.pixiv.net/ajax/novel/{id}` first.
2. Uses `body.content` as the novel body text.
3. Uses `body.textEmbeddedImages` as the uploaded image metadata source.
4. Falls back to the older `webview` path only if the ajax request fails.

This is why the feature finally worked.

The final successful version was not "a better guess at field names". It was "use the correct novel endpoint for uploaded image data".

## Main Files Involved

Core behavior changes landed in:

- `src/common/sagas/novelText.js`
- `src/common/helpers/novelAjaxParser.js`
- `src/common/helpers/novelInlineImage.js`
- `src/common/helpers/novelTextParser.js`
- `src/components/NovelInlineImage.js`
- `src/components/NovelViewer.js`

Supporting diagnostics and fallback work also touched:

- `src/common/helpers/novelWebviewParser.js`
- `src/common/helpers/novelWebviewDebug.js`
- `src/common/helpers/novelWebviewImageCandidates.js`

## Verification

This fix was not closed out based on manual hope alone.

It was verified with:

- parser tests
- saga tests
- renderer tests
- repeated APK-based device testing

At the end of the debugging cycle, Jest was green with:

- `9` test suites passed
- `85` tests passed

## Short Version

The feature was repaired in two stages:

1. Teach the reader how to represent and render inline images.
2. Change the novel text fetch path to the endpoint that actually carries uploaded image metadata.

Stage 1 made the reader capable of showing images.
Stage 2 finally gave it the correct image data.

That is why the final APK worked when earlier diagnostic APKs only moved from raw tag text to `Image unavailable`.
