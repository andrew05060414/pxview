---
phase: quick
plan: 260407-jqk
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/NovelInlineImage.js
autonomous: true
requirements:
  - novel-inline-image-correct-aspect-ratio
must_haves:
  truths:
    - "Portrait novel inline images render without white bars on left/right"
    - "Image.getSize is called when embedded URL is found but metadata has no width/height"
    - "getSize error falls back to aspectRatio 1 (existing behavior)"
    - "During getSize fetch, a loading placeholder is shown (no blank space flash)"
  artifacts:
    - path: src/components/NovelInlineImage.js
      provides: "NovelInlineImage with Image.getSize fallback for aspect ratio"
      contains: "Image.getSize"
  key_links:
    - from: "loadImage (embeddedImageUrl branch)"
      to: "Image.getSize"
      via: "called when embeddedImageAspectRatio === null"
      pattern: "Image\\.getSize"
---

<objective>
Fix white border on portrait Pixiv novel inline images by using `Image.getSize` to fetch intrinsic dimensions when the embedded image API returns URLs only (no width/height metadata).

Purpose: Pixiv novel embedded image API never includes `width`/`height` fields, so `resolveEmbeddedImageAspectRatio` always returns `null`. The component falls back to `imageAspectRatio: 1` (square), making portrait images render with white bars on both sides via `resizeMode="contain"`.

Output: Modified `src/components/NovelInlineImage.js` — no new files.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@src/components/NovelInlineImage.js
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Fetch intrinsic dimensions via Image.getSize when metadata aspect ratio is missing</name>
  <files>src/components/NovelInlineImage.js</files>
  <behavior>
    - When embeddedImageUrl is resolved but embeddedImageAspectRatio is null: stay in isLoading state, call Image.getSize(url, successCb, errorCb)
    - On getSize success: setState({ imageAspectRatio: width / height, isLoading: false, isFailed: false, imageUrl })
    - On getSize error: setState({ imageAspectRatio: 1, isLoading: false, isFailed: false, imageUrl }) — same URL still renders, ratio falls back
    - When embeddedImageAspectRatio is NOT null (metadata had dimensions): existing fast path unchanged — setState immediately without getSize
    - Stale request guard: check `this.unmounted || requestId !== this.requestId` before applying getSize result (same pattern used for illustDetail branch)
    - No new files, no new abstractions, no helper extracted — inline the getSize call in loadImage
  </behavior>
  <action>
    1. Add `Image` to the existing react-native import at line 2 (currently only `StyleSheet, Text`):
       `import { Image, StyleSheet, Text } from 'react-native';`

    2. In `loadImage`, find the `if (embeddedImageUrl)` block (lines 212-221). Currently it does:
       ```js
       if (embeddedImageUrl) {
         this.setState({
           ...
           imageAspectRatio: embeddedImageAspectRatio || this.state.imageAspectRatio,
         });
         return;
       }
       ```

       Replace with:
       ```js
       if (embeddedImageUrl) {
         if (embeddedImageAspectRatio) {
           // Metadata had real dimensions — fast path, no network needed
           this.setState({
             failureReason: null,
             imageUrl: embeddedImageUrl,
             isLoading: false,
             isFailed: false,
             imageAspectRatio: embeddedImageAspectRatio,
           });
         } else {
           // API returned URLs only — must fetch intrinsic size
           // Keep isLoading: true so the "Loading image..." placeholder stays visible
           Image.getSize(
             embeddedImageUrl,
             (width, height) => {
               if (this.unmounted || requestId !== this.requestId) {
                 return;
               }
               this.setState({
                 failureReason: null,
                 imageUrl: embeddedImageUrl,
                 isLoading: false,
                 isFailed: false,
                 imageAspectRatio: width && height ? width / height : 1,
               });
             },
             () => {
               if (this.unmounted || requestId !== this.requestId) {
                 return;
               }
               // getSize failed — still show the image at square ratio
               this.setState({
                 failureReason: null,
                 imageUrl: embeddedImageUrl,
                 isLoading: false,
                 isFailed: false,
                 imageAspectRatio: 1,
               });
             },
           );
         }
         return;
       }
       ```

    3. The `componentDidUpdate` reset block (lines 174-184) already resets `imageAspectRatio: 1` and `isLoading: Boolean(imageId)` — leave it unchanged.

    4. Do NOT change `resolveEmbeddedImageAspectRatio`, `renderContent`, the `illustDetail` branch, or any other logic.
  </action>
  <verify>
    <automated>cd /Users/andrewwang/Code/pxview && npx jest --testPathPattern=NovelInlineImage --no-coverage 2>&1 | tail -30</automated>
  </verify>
  <done>
    - `Image` imported from react-native
    - When `embeddedImageAspectRatio` is null and `embeddedImageUrl` is present, `Image.getSize` is called with the URL
    - getSize success sets `imageAspectRatio = width / height`
    - getSize error sets `imageAspectRatio = 1` and still shows the image
    - Fast path (metadata has ratio) is unchanged
    - Stale request guard (unmounted / requestId) present in both getSize callbacks
    - Existing tests pass (or no test file exists yet, in which case manual lint check suffices)
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| CDN URL → Image.getSize | React Native issues a network request to Pixiv CDN; response is width/height integers |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-jqk-01 | Information Disclosure | Image.getSize CDN request | accept | URL already passed to PXImage anyway; no new data exposed; Pixiv CDN is same origin as existing image load |
| T-jqk-02 | Denial of Service | getSize hangs or slow CDN | accept | React Native Image.getSize has no built-in timeout, but failure callback fires on network error; stale-request guard prevents setState after unmount |
</threat_model>

<verification>
1. Run lint: `cd /Users/andrewwang/Code/pxview && npm run lint -- src/components/NovelInlineImage.js`
2. Run tests if test file exists: `npx jest --testPathPattern=NovelInlineImage --no-coverage`
3. Manual code review: confirm `Image` is in the import, `Image.getSize` is called only when `embeddedImageAspectRatio` is falsy, stale-request guard present in both callbacks
</verification>

<success_criteria>
- `Image` imported from `react-native` in `NovelInlineImage.js`
- `Image.getSize` called in the `embeddedImageUrl` branch when metadata has no ratio
- getSize success path: `imageAspectRatio = width / height`
- getSize error path: `imageAspectRatio = 1`, image still renders
- Fast path (metadata ratio available) bypasses getSize entirely
- No regressions in `illustDetail` branch or existing tests
- `npm run lint` passes with no new errors
</success_criteria>

<output>
No SUMMARY file needed for quick tasks. Changes are self-contained in `src/components/NovelInlineImage.js`.
</output>
