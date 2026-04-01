# Novel Inline Images Design

## Summary

This phase adds inline image rendering to the existing novel reader so Pixiv novel image markers such as `[loadedimage:24095674]` appear inside the body text at the author-intended position. The goal is to preserve the current novel reader architecture and behavior while extending the parser and renderer to support inline media.

This phase does not address local build instability, APK startup crashes, dependency upgrades, or broader reader refactors.

## Problem Statement

The current novel reading flow fetches novel text and parses it into per-page HTML strings, but image markers are not handled as first-class content. As a result, inline image references surface as raw placeholder text instead of actual images.

Relevant existing flow:

- [`src/common/sagas/novelText.js`](D:\Andrew\Code\Andrew\pxview\src\common\sagas\novelText.js) fetches novel text with `pixiv.novelWebview(novelId)`.
- [`src/common/helpers/novelTextParser.js`](D:\Andrew\Code\Andrew\pxview\src\common\helpers\novelTextParser.js) converts Pixiv novel markup into HTML-like strings split by page.
- [`src/components/NovelViewer.js`](D:\Andrew\Code\Andrew\pxview\src\components\NovelViewer.js) renders those strings with `react-native-htmlview`.
- [`src/screens/Shared/NovelReader.js`](D:\Andrew\Code\Andrew\pxview\src\screens\Shared\NovelReader.js) manages page index, direction, and viewer settings.

## Goals

- Render inline novel images inside the existing novel body flow.
- Preserve author-intended placement of inline images relative to surrounding text.
- Keep existing page navigation, reading direction, font sizing, line height, and jump-link behavior intact.
- Fail gracefully when an inline image cannot be resolved or loaded.

## Non-Goals

- Fix local build or APK startup issues.
- Upgrade React Native, navigation, or other old dependencies.
- Replace the current HTML-based novel rendering pipeline.
- Add image lightbox/fullscreen viewing.
- Add aggressive preloading, caching, or gallery behavior for novel images.

## Recommended Approach

Retain the current `novelWebview -> parseNovelText -> NovelViewer` pipeline and extend it to support inline image placeholders.

The parser will detect loaded-image markup and emit a dedicated inline tag in the generated HTML-like content. The viewer will intercept that tag through its custom `renderNode` hook and render a native image component in the document flow.

This approach is preferred because it:

- minimizes changes to the old codebase,
- preserves the current paging model,
- keeps feature risk localized to the novel reader path, and
- avoids a large rewrite of the reader into a custom AST renderer.

## Data Flow

### 1. Novel Text Fetch

No phase-one change to text fetch behavior is required. The existing saga in [`src/common/sagas/novelText.js`](D:\Andrew\Code\Andrew\pxview\src\common\sagas\novelText.js) remains the entry point.

### 2. Parsing

[`src/common/helpers/novelTextParser.js`](D:\Andrew\Code\Andrew\pxview\src\common\helpers\novelTextParser.js) will be extended to recognize loaded-image markup and convert it into an internal inline HTML tag such as:

```html
<px-image data-illust-id="24095674"></px-image>
```

The parser output remains an array of page strings so [`src/common/selectors/index.js`](D:\Andrew\Code\Andrew\pxview\src\common\selectors\index.js) and [`src/screens/Shared/NovelReader.js`](D:\Andrew\Code\Andrew\pxview\src\screens\Shared\NovelReader.js) do not need a structural redesign.

### 3. Image Resolution

A small helper layer will resolve illustration IDs to renderable image URLs. This should be a narrow utility dedicated to the novel-inline-image use case rather than a generic media system.

Likely inputs and outputs:

- input: illustration ID extracted from novel markup
- output: a stable display URL suitable for `Image` rendering in React Native

If the API client already exposes enough illustration detail to derive image URLs, reuse it. If not, add the thinnest possible request/helper needed to retrieve those URLs.

### 4. Rendering

[`src/components/NovelViewer.js`](D:\Andrew\Code\Andrew\pxview\src\components\NovelViewer.js) will extend `handleRenderNode` to detect the `px-image` node and return a React Native image block rendered inline with the text content.

Expected rendering behavior:

- image appears in the natural content order,
- image width fits the reader content column,
- image height preserves aspect ratio,
- surrounding text remains selectable where already supported,
- chapter and jump-link rendering continue to work as before.

## UI Behavior

- Inline images render where the author inserted them in the novel body.
- Images share the same page flow as text; they are not split into a separate media page by design.
- If an image resolves slowly, the reader should show a compact loading placeholder in place.
- If an image fails to resolve or load, the reader should show a lightweight fallback message in the same position, not crash and not remove the surrounding text.

## Error Handling

Failure modes to handle explicitly:

- parser sees malformed image markup,
- image ID resolves to no valid URL,
- image request fails,
- image render fails for one item on the page.

Required behavior:

- do not crash the reader,
- keep the rest of the page readable,
- render a small fallback placeholder where the image belongs,
- avoid surfacing raw Pixiv markup back to the user after parsing.

## File-Level Change Plan

Primary edits:

- [`src/common/helpers/novelTextParser.js`](D:\Andrew\Code\Andrew\pxview\src\common\helpers\novelTextParser.js)
  Add parsing support for inline image markers and emit a dedicated inline tag.
- [`src/components/NovelViewer.js`](D:\Andrew\Code\Andrew\pxview\src\components\NovelViewer.js)
  Add custom node handling, inline image component rendering, and loading/failure placeholders.

Likely supporting additions:

- a new helper under `src/common/helpers/` for illustration URL resolution,
- a small reusable image-render subcomponent if `NovelViewer.js` becomes too crowded,
- possible small touchpoints in selectors if the viewer needs preprocessed metadata rather than only page strings.

## Testing Strategy

Automated tests should focus on the new logic rather than broad app behavior.

### Parser Tests

Add or extend tests to verify:

- `[loadedimage:24095674]` no longer survives as raw placeholder text,
- the parser emits the expected inline tag,
- text before and after the image remains in the correct order,
- page splitting still behaves correctly when images appear near `newpage` markers.

### Viewer Tests

Add focused rendering tests to verify:

- `px-image` nodes render a React Native image component,
- fallback UI renders on failure,
- existing `chapter` and `jump` behavior remains unchanged.

### Manual Acceptance

Manual acceptance for this phase is intentionally narrow:

- open a novel that contains inline images,
- confirm the images appear inside the text at the intended position,
- confirm surrounding text remains readable,
- confirm failed images do not break the page or crash the reader.

## Risks And Constraints

- The project uses an old React Native stack, so new rendering code should avoid modern assumptions or heavy dependencies.
- `react-native-htmlview` is old and may have quirks when custom-rendering nonstandard nodes.
- The available Pixiv client API surface may not expose image URLs exactly where needed; this may require a small adapter layer.
- Because local build/runtime validation is currently weak, the first pass should emphasize unit-testable logic and minimal surface area.

## Phase Exit Criteria

This phase is complete when:

- inline novel image markers render as images in the existing reader,
- images appear in the original text position,
- page reading remains usable with current settings and navigation,
- failures degrade gracefully,
- parser/viewer tests cover the new behavior.

## Deferred Work

Explicitly deferred to later phases:

- fixing local build setup,
- debugging startup crashes,
- dependency modernization,
- tap-to-zoom or fullscreen image viewing,
- media caching and prefetch,
- broader reader architecture cleanup.
