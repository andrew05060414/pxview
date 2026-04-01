# Roadmap: PxView Reader Fixes

**Created:** 2026-04-01
**Project:** `PxView Reader Fixes`
**Planning Profile:** YOLO, coarse granularity, sequential execution, balanced agents

## Summary

This roadmap is intentionally narrow. It exists to make inline Pixiv novel image markers render correctly inside the existing reader flow without mixing in build stabilization, dependency upgrades, or general reader rewrites.

**3 phases** | **5 v1 requirements** | **All mapped ✓**

| # | Phase | Goal | Requirements | UI hint |
|---|-------|------|--------------|---------|
| 1 | Inline Image Parsing And Resolution | Recognize inline image markers and convert them into renderable reader data without surfacing raw placeholders | READ-01 | no |
| 2 | Inline Reader Rendering And Fallbacks | Render inline images in the body flow at the correct position and fail gracefully when image resolution breaks | READ-02, READ-03, READ-04 | yes |
| 3 | Reader Regression Coverage And Finish Pass | Prove existing novel-reader behavior still works after inline-image support is added | READ-05 | no |

## Phase Details

### Phase 1: Inline Image Parsing And Resolution

**Goal:** Extend the novel text pipeline so loaded-image markup becomes a renderable inline node instead of leaking raw placeholder text into the UI.

**Requirements:** READ-01

**Success criteria:**
1. The parser no longer emits raw `[loadedimage:*]` text into the novel body output.
2. Inline image markers are transformed into a stable intermediate representation that the existing reader can detect.
3. The image-resolution path is isolated to the novel reader flow and does not require a cross-app media refactor.

### Phase 2: Inline Reader Rendering And Fallbacks

**Goal:** Render inline images in-place inside the current reader flow while keeping the rest of the page readable if an image cannot load.

**Requirements:** READ-02, READ-03, READ-04

**Success criteria:**
1. Inline images appear where the author placed them relative to surrounding text.
2. Inline images remain inside the current page flow and are not broken out into separate media pages.
3. Failed image resolution or loading shows an inline fallback state rather than crashing the reader.
4. Reader remains usable for the rest of the current page even when one image fails.

### Phase 3: Reader Regression Coverage And Finish Pass

**Goal:** Protect the existing novel-reader experience against regressions introduced by inline-image support.

**Requirements:** READ-05

**Success criteria:**
1. Automated tests cover the new parser behavior and the custom image-node rendering path.
2. Existing chapter-header and jump-link behavior remains intact after the change.
3. Reading direction, font size, and line-height behavior still work for novels after inline-image support is introduced.

## Coverage Check

| Requirement | Phase |
|-------------|-------|
| READ-01 | Phase 1 |
| READ-02 | Phase 2 |
| READ-03 | Phase 2 |
| READ-04 | Phase 2 |
| READ-05 | Phase 3 |

Coverage result: **5 / 5 requirements mapped**

## Next Step

Use `$gsd-discuss-phase 1` to clarify the implementation shape for inline image parsing and resolution before detailed planning or execution.
