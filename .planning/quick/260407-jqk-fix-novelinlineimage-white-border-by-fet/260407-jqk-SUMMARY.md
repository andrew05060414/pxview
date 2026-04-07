# Quick Task 260407-jqk — Summary

**Task:** Fix NovelInlineImage white border by fetching intrinsic image dimensions when metadata lacks width/height  
**Date:** 2026-04-07  
**Commit:** 16e788d  

## What Was Done

Fixed white border issue on portrait inline novel images.

**Root cause:** Pixiv novel embedded image API returns only `urls`, no `width`/`height` fields. `resolveEmbeddedImageAspectRatio` always returned `null`, so `imageAspectRatio` stayed at the initial default of `1` (square). With `resizeMode="contain"` and a square container, portrait images were centered with white bars on both sides.

**Fix in `src/components/NovelInlineImage.js`:**
- Added `Image` to the react-native import
- Split the `embeddedImageUrl` branch into two paths:
  - **Fast path:** metadata has real dimensions → use them immediately (no change to existing behavior)
  - **Slow path:** no metadata dimensions → call `Image.getSize(url, successCb, errorCb)` to fetch intrinsic size
- During getSize fetch, keeps `isLoading: true` so "Loading image..." placeholder remains visible (avoids layout jitter)
- On success: `imageAspectRatio = width / height`
- On error: `imageAspectRatio = 1`, image still renders
- Both callbacks have stale-request guard (`unmounted || requestId !== this.requestId`)

## Files Changed

- `src/components/NovelInlineImage.js` — core fix
- `__tests__/components/NovelInlineImage.spec.js` — new test suite covering all paths

## Acceptance Criteria Status

- Portrait images: no white bars (container height = width / aspectRatio from getSize) ✓
- Landscape images: no white bars ✓
- getSize error: image still renders at ratio 1 ✓
- Stale request (unmount, imageId change): no setState race ✓
- Fast path (metadata has ratio): behavior unchanged ✓
