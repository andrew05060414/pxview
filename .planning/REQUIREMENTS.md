# Requirements: PxView Reader Fixes

**Defined:** 2026-04-01
**Core Value:** When opening a Pixiv novel, the reader must preserve the author's intended reading flow, including inline images in their original position.

## v1 Requirements

### Novel Reader

- [ ] **READ-01**: User can open a Pixiv novel containing inline image markers without seeing raw placeholder text such as `[loadedimage:24095674]`
- [ ] **READ-02**: User sees each inline novel image at the same position relative to surrounding text where the author inserted it
- [ ] **READ-03**: Inline novel images render inside the existing page flow instead of being moved to a separate media-only page
- [ ] **READ-04**: If an inline image cannot be resolved or loaded, the user can still read the rest of the page and sees an inline fallback at that position
- [ ] **READ-05**: Existing novel-reader behaviors for chapter headers, jump links, reading direction, font size, and line height continue to work after inline-image support is added

## v2 Requirements

### Novel Media

- **MED-01**: User can tap an inline novel image to open a fullscreen viewer
- **MED-02**: User benefits from image prefetching or caching for novels with many inline illustrations

### Runtime Reliability

- **RUN-01**: User can install and launch a locally built APK without startup crashes
- **RUN-02**: User can verify inline-image behavior in a repeatable local test workflow

## Out of Scope

| Feature | Reason |
|---------|--------|
| React Native dependency upgrades | Too broad for the current maintenance phase |
| Fullscreen novel-image UX | Nice-to-have, not required for the user's immediate need |
| Cross-app media refactor | Would expand far beyond the novel reader path |
| Build-system stabilization | Separate problem that should be handled after the reader behavior is fixed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| READ-01 | Unmapped | Pending |
| READ-02 | Unmapped | Pending |
| READ-03 | Unmapped | Pending |
| READ-04 | Unmapped | Pending |
| READ-05 | Unmapped | Pending |

**Coverage:**
- v1 requirements: 5 total
- Mapped to phases: 0
- Unmapped: 5 ⚠️

---
*Requirements defined: 2026-04-01*
*Last updated: 2026-04-01 after initial definition*
