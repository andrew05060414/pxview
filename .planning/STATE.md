# State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-01)

**Core value:** When opening a Pixiv novel, the reader must preserve the author's intended reading flow, including inline images in their original position.
**Current focus:** Phase 1 - Inline Image Parsing And Resolution

## Initialization Status

- Codebase map: complete
- Project context: complete
- Workflow config: complete
- Requirements: complete
- Roadmap: complete

## Active Roadmap

- Phase 1: Inline Image Parsing And Resolution
- Phase 2: Inline Reader Rendering And Fallbacks
- Phase 3: Reader Regression Coverage And Finish Pass

## Immediate Next Command

`$gsd-discuss-phase 1`

## Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260407-jqk | Fix NovelInlineImage white border by fetching intrinsic image dimensions when metadata lacks width/height | 2026-04-07 | 16e788d | [260407-jqk-fix-novelinlineimage-white-border-by-fet](.planning/quick/260407-jqk-fix-novelinlineimage-white-border-by-fet/) |
| 260407-v7m | Add reading position memory to novel reader — persist and restore last-viewed page per novelId | 2026-04-07 | 42f0d25 | [260407-v7m-add-reading-position-memory-to-novel-rea](.planning/quick/260407-v7m-add-reading-position-memory-to-novel-rea/) |
| 260412-gkk | Replace ScrollableScene with draggable NovelPage scroll thumb — removes PanResponder, adds absolutely-positioned draggable indicator | 2026-04-12 | a032fa1 | [260412-gkk-add-draggable-vertical-scroll-indicator-](.planning/quick/260412-gkk-add-draggable-vertical-scroll-indicator-/) |

## Notes

- This is a brownfield React Native maintenance track, not a greenfield product build.
- Local build/runtime instability is explicitly out of scope for the current roadmap.
- The first milestone is successful only when inline novel images render in-place without regressing the current reader behavior.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260517-nrx | Fix network recovery: auto-refresh errored lists on reconnect | 2026-05-17 | 42beaec | [260517-nrx-fix-network-recovery](.planning/quick/260517-nrx-fix-network-recovery/) |
| 260517-xog | Fix Samsung foldable screen: dynamic Dimensions getters + manifest configChanges | 2026-05-17 | a79d37e | [260517-xog-fix-foldable-screen](.planning/quick/260517-xog-fix-foldable-screen/) |

Last activity: 2026-05-17 - Completed quick task 260517-xog: Fix Samsung foldable screen support
