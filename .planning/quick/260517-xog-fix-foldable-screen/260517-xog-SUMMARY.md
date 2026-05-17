---
quick_id: 260517-xog
slug: fix-foldable-screen
status: complete
---

## Summary

Three-layer fix for Samsung foldable re-layout failure: Android manifest now notifies RN of fold/unfold events instead of restarting the activity; all 22 callsite files replace frozen module-scope `WINDOW_WIDTH`/`WINDOW_HEIGHT`/`DRAWER_WIDTH` constants with `getWindowWidth()`/`getWindowHeight()`/`getDrawerWidth()` getter calls that read fresh dimensions on each render; and App.js adds a `Dimensions.addEventListener` listener that increments a `forceUpdate` counter to propagate re-renders down the entire component tree.

## Files Changed

### Task 1 — Android manifest
- `android/app/src/main/AndroidManifest.xml` — added `screenLayout|smallestScreenSize` to `configChanges`; added `android:resizeableActivity="true"` to MainActivity

### Task 2 — variables.js getters + all callsites
- `src/styles/variables.js` — replaced `WINDOW_WIDTH`, `WINDOW_HEIGHT`, `DRAWER_WIDTH` constants with `getWindowWidth()`, `getWindowHeight()`, `getDrawerWidth()` function exports
- `src/components/DetailFooter.js` — StyleSheet.create getter call
- `src/components/DetailInfoModal.js` — defaultProps height uses `getWindowHeight()`
- `src/components/IllustDetailContent.js` — StyleSheet.create + renderItem getter calls
- `src/components/IllustItem.js` — render() inline style getter calls (4 occurrences)
- `src/components/IllustList.js` — getItemLayout callback getter calls (2 occurrences)
- `src/components/NovelDetailContent.js` — initWidth prop getter call
- `src/components/NovelGridViewItem.js` — render() inline style getter calls (4 occurrences)
- `src/components/NovelViewer.js` — StyleSheet.create getter call
- `src/components/PXBottomSheet.js` — defaultProps `height: null` sentinel; `setModalVisible` resolves height fresh via `getWindowHeight()`
- `src/components/PXCacheImage.js` — render() getter calls (3 occurrences)
- `src/components/PXCacheImageTouchable.js` — handleOnFoundImageSize + render() getter calls (4 occurrences)
- `src/components/PXPhotoView.js` — StyleSheet.create getter calls for both width and height
- `src/components/PXViewPager.js` — getItemLayout callback getter calls (2 occurrences)
- `src/components/SearchHistory.js` — StyleSheet.create getter call
- `src/components/SingleChoiceDialog.js` — StyleSheet.create getter call
- `src/components/TagList.js` — renderItem function getter calls (6 occurrences)
- `src/components/UgoiraView.ios.js` — render() getter call
- `src/components/UgoiraViewTouchable.js` — render() getter calls (4 occurrences)
- `src/components/UserCover.js` — StyleSheet.create `getDrawerWidth()` call
- `src/components/PXTabView.js` — moved `initialLayout` from module scope into function body
- `src/containers/BookmarkModal.js` — StyleSheet.create getter call
- `src/screens/Ranking/RankingHorizontalList.js` — removed module-scope `SLIDER_WIDTH`/`ITEM_WIDTH`; kept `ITEM_HORIZONTAL_PADDING` at module scope; compute `sliderWidth`/`itemWidth` inside `render()` and `renderItem()`
- `src/screens/Shared/Detail.js` — StyleSheet.create getter calls (2 occurrences)
- `src/screens/Shared/NovelDetail.js` — StyleSheet.create getter calls (2 occurrences)
- `src/screens/Shared/UserDetail.js` — StyleSheet.create + renderProfile getter calls (2 occurrences)

### Task 3 — App.js Dimensions listener
- `src/screens/App/App.js` — added `Dimensions` to react-native import; added `const [, forceUpdate] = useState(0)`; added `useEffect` with `Dimensions.addEventListener('change', ...)` and cleanup via `subscription.remove()`

## Commits

- `c85e384` fix(android): add foldable configChanges and resizeableActivity
- `9243b3e` fix(styles): replace frozen Dimensions constants with getter functions
- `a79d37e` feat(app): propagate Dimensions changes through component tree on fold/unfold

## Deviations

**1. RankingHorizontalList.js `styles.sliderContainer` used module-scope `ITEM_WIDTH`**
- The `StyleSheet.create` block referenced `ITEM_WIDTH` which was removed from module scope. Since the width/height are now dynamic, the static stylesheet entry was stripped of those properties, and `renderItem` computes `itemWidth` inline and applies it via a style array. This is a necessary structural fix, not purely a string substitution.

**2. NovelDetailContent.js line 18 — commented-out `WINDOW_WIDTH` reference**
- A pre-existing commented line `// width: globalStyleVariables.WINDOW_WIDTH,` remains in NovelDetailContent.js. This is inert dead code and was not modified as it has no runtime effect.
