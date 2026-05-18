---
quick_id: 260412-gkk
type: quick
subsystem: novel-viewer
tags: [scroll-indicator, novel-reader, ux]
key-files:
  modified:
    - src/components/NovelViewer.js
decisions:
  - Renamed _-prefixed private methods to camelCase (getScrollable, getThumbHeight, getThumbTop) to satisfy no-underscore-dangle lint rule
  - Extracted onResponderGrant/onResponderMove to class arrow methods to avoid no-shadow variable re-declaration inside callbacks
  - Used instance properties (dragStartScrollY, dragStartPageY) instead of state for drag anchor values to avoid spurious re-renders
metrics:
  duration: ~15 minutes
  completed: 2026-04-12
---

# Quick Task 260412-gkk: Draggable Scroll Indicator for NovelPage

**One-liner:** Replaced broken PanResponder-based ScrollableScene with a clean NovelPage component wrapping ScrollView plus an absolutely-positioned draggable scroll thumb that does not interfere with React Navigation swipe gestures.

## What Was Done

### Removed
- `const TRACK_WIDTH = 16`
- `class ScrollableScene` (PanResponder approach, navigation-breaking)
- `const sceneStyles` StyleSheet (used only by ScrollableScene)

### Added
- Four named constants: `SCROLL_TRACK_WIDTH`, `SCROLL_THUMB_MIN`, `SCROLL_THUMB_WIDTH`, `SCROLL_THUMB_RIGHT`
- `class NovelPage extends Component` with:
  - `ScrollView` (full-width, `showsVerticalScrollIndicator={false}`)
  - Absolutely-positioned 28px-wide transparent track overlay (`pointerEvents="box-none"`)
  - 6px-wide thumb `View` that responds to `onResponderGrant`/`onResponderMove` for direct dragging
  - `getScrollable()`, `getThumbHeight()`, `getThumbTop()` helper methods for position math
- `renderScene` updated to wrap `HtmlView` children in `<NovelPage>` instead of `<ScrollableScene>`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Lint] Renamed underscore-prefixed methods to camelCase**
- **Found during:** Post-edit lint run
- **Issue:** `_scrollable`, `_thumbHeight`, `_thumbTop`, `_startScrollY`, `_startPageY` triggered `no-underscore-dangle` errors (new errors, not pre-existing)
- **Fix:** Renamed to `getScrollable`, `getThumbHeight`, `getThumbTop`, `dragStartScrollY`, `dragStartPageY`; extracted `handleResponderGrant` and `handleResponderMove` as class arrow methods to avoid `no-shadow` in callbacks
- **Files modified:** `src/components/NovelViewer.js`
- **Commit:** a032fa1 (included in main commit)

## Pre-existing Lint Errors (Not Introduced Here)

The following errors in NovelViewer.js existed before this task and were not modified:
- `max-classes-per-file` (line 1) — file always had NovelViewer class
- `import/no-extraneous-dependencies` for `entities` (line 4)
- `no-continue` at lines 100, 126
- `no-use-before-define` for `chunkHtmlPreservingTags` (line 111)
- `react/jsx-props-no-spreading` at lines 394, 448
- `no-unused-vars` for `fontSize`/`lineHeight` at line 530

## Commit

- `a032fa1` — feat(novel-viewer): replace ScrollableScene with draggable NovelPage scroll thumb

## Self-Check: PASSED

- `src/components/NovelViewer.js` — modified and committed
- commit `a032fa1` exists in git log
- No `ScrollableScene`, `sceneStyles`, `TRACK_WIDTH`, or `PanResponder` references remain
- `NovelPage` class defined at line 222, used in renderScene at lines 521/531
