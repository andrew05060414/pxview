# PxView Reader Fixes

## What This Is

This repo is an old brownfield React Native Pixiv client that the user is treating as a personal NSFW txt/equb reading app. The current project is not a broad rewrite; it is focused maintenance work to make the existing novel reader faithfully render author content, starting with inline novel images.

## Core Value

When opening a Pixiv novel, the reader must preserve the author's intended reading flow, including inline images in their original position.

## Requirements

### Validated

- ✓ User can authenticate into Pixiv and persist session state across app restarts — existing
- ✓ User can browse Pixiv content across recommendation, ranking, search, and detail flows — existing
- ✓ User can open Pixiv novels inside the app and read them with paging, reading direction, and typography settings — existing

### Active

- [ ] Inline novel image markers render as images inside the body text at the original author-defined position
- [ ] Inline image failures degrade gracefully without breaking the rest of the novel page
- [ ] Existing novel reader behavior remains intact for chapter headers, jump links, reading direction, font size, and line height

### Out of Scope

- Local APK build, install, or startup crash fixes — separate environment/runtime problem and not part of this phase
- React Native or dependency modernization — too broad for the current maintenance goal
- Fullscreen image viewing, zooming, or gallery features for novel images — not required for the user's current need
- Generalized media-system refactor across the whole app — unnecessary for the narrow inline-image goal

## Context

The codebase is materially old: React Native `0.63.5`, React `16.13.1`, Redux Saga, React Navigation 5, and `react-native-htmlview` still drive the app. A codebase map already exists under `.planning/codebase/` and confirms a shared mobile monolith with novel fetching via `pixiv.novelWebview`, parsing in `src/common/helpers/novelTextParser.js`, and rendering in `src/components/NovelViewer.js`.

The user previously got the project to produce an APK only through ad hoc fixes and does not currently trust the local runtime, dependency graph, or build flow. Because validation is weak, current work needs to minimize surface area, stay close to the established reader pipeline, and prefer parser/viewer changes that can be covered by focused tests.

## Constraints

- **Tech stack**: Keep the existing React Native `0.63.5` + `react-native-htmlview` reader pipeline — broad rewrites would create too much risk in an old codebase
- **Scope**: First phase is inline novel images only — the user explicitly wants one concrete behavior fixed before any build/runtime cleanup
- **Validation**: Automated and code-level verification matter more than emulator confidence right now — local install/runtime behavior is currently unreliable
- **Compatibility**: Preserve existing novel reader UX such as page order, jump links, and reading settings — this is already working and should not regress

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep the existing `novelWebview -> parser -> HtmlView` pipeline | Smallest-risk change in a brittle brownfield app | — Pending |
| Treat inline novel images as the first and only active feature goal | User only cares about this one reading behavior right now | — Pending |
| Exclude build/crash troubleshooting from the first phase | Avoid mixing environment problems with product behavior changes | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-01 after initialization*
