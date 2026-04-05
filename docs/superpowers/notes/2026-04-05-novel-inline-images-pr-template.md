# PR Template - Novel Inline Images

Use this template when opening a PR from `codex/novel-inline-images-pr`.

## Suggested Title

`feat: support inline pixiv novel images via ajax embedded metadata`

## PR Body (copy/paste)

```md
## Summary

- Render Pixiv novel inline image markers (`loadedimage` / `uploadedimage` / `pixivimage`) as actual inline images in reader flow.
- Resolve embedded image metadata from `https://www.pixiv.net/ajax/novel/{id}` (`body.content` + `body.textEmbeddedImages`) and keep legacy webview parsing as fallback.
- Add/adjust parser, saga, and viewer tests to cover inline rendering and ajax metadata resolution paths.

## Problem

Previously, inline image markers in novel text were shown as raw placeholders or ended as `Image unavailable`, because the legacy novel data path did not reliably provide uploaded image metadata.

## What Changed

- Added inline image model + parser helpers.
- Added inline image rendering component and integrated it into novel viewer flow.
- Updated novel text saga to prefer ajax novel metadata and fallback to legacy path if ajax fails.
- Added diagnostics and candidate parsing helpers for webview fallback troubleshooting.
- Added/updated test suites for parser/saga/viewer behavior.

## Out of Scope

- No Android build tooling migration in this PR.
- No lockfile/tooling-format refresh included.
- No local debug scripts or temporary build artifacts included.

## Validation

- [x] `npm test -- --runInBand`
- [x] 9/9 test suites passed
- [x] 85/85 tests passed
- [x] Manual reader verification with novels containing inline image markers

## Risk / Compatibility

- Main risk is endpoint payload shape drift for `ajax/novel`.
- Mitigation: keep legacy webview fallback path and parser safeguards.

## Reviewer Notes

- Focus review on:
  - `src/common/sagas/novelText.js`
  - `src/common/helpers/novelAjaxParser.js`
  - `src/common/helpers/novelInlineImage.js`
  - `src/common/helpers/novelTextParser.js`
  - `src/components/NovelInlineImage.js`
  - `src/components/NovelViewer.js`
```

## Optional Upstream Compare Link

`https://github.com/alphasp/pxview/compare/master...andrew05060414:pxview:codex/novel-inline-images-pr`

