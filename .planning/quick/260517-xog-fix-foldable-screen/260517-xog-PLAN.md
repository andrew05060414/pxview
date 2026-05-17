---
phase: quick
plan: 260517-xog
type: execute
wave: 1
depends_on: []
files_modified:
  - android/app/src/main/AndroidManifest.xml
  - src/styles/variables.js
  - src/components/DetailFooter.js
  - src/components/DetailInfoModal.js
  - src/components/IllustDetailContent.js
  - src/components/IllustItem.js
  - src/components/IllustList.js
  - src/components/NovelDetailContent.js
  - src/components/NovelGridViewItem.js
  - src/components/NovelViewer.js
  - src/components/PXBottomSheet.js
  - src/components/PXCacheImage.js
  - src/components/PXCacheImageTouchable.js
  - src/components/PXPhotoView.js
  - src/components/PXViewPager.js
  - src/components/SearchHistory.js
  - src/components/SingleChoiceDialog.js
  - src/components/TagList.js
  - src/components/UgoiraView.ios.js
  - src/components/UgoiraViewTouchable.js
  - src/components/UserCover.js
  - src/components/PXTabView.js
  - src/containers/BookmarkModal.js
  - src/screens/Ranking/RankingHorizontalList.js
  - src/screens/Shared/Detail.js
  - src/screens/Shared/NovelDetail.js
  - src/screens/Shared/UserDetail.js
  - src/screens/App/App.js
autonomous: true
requirements: [foldable-screen-fix]

must_haves:
  truths:
    - "Android does not restart the activity on fold/unfold — it handles the config change in JS instead"
    - "WINDOW_WIDTH and WINDOW_HEIGHT are never read as frozen module-scope values after this fix"
    - "All 22 callsite files use getter functions, not the old constant names"
    - "PXTabView initialLayout is computed per-render, not at module scope"
    - "PXBottomSheet default height is computed via getter, not frozen at class definition time"
    - "RankingHorizontalList SLIDER_WIDTH and ITEM_WIDTH are computed inside render, not at module scope"
    - "App.js propagates Dimensions change events so all children re-render with fresh sizes"
  artifacts:
    - path: "src/styles/variables.js"
      provides: "getWindowWidth(), getWindowHeight(), getDrawerWidth() getter functions replacing frozen constants"
      exports: ["getWindowWidth", "getWindowHeight", "getDrawerWidth"]
    - path: "android/app/src/main/AndroidManifest.xml"
      provides: "configChanges with screenLayout|smallestScreenSize; resizeableActivity=true"
      contains: "screenLayout|smallestScreenSize"
    - path: "src/screens/App/App.js"
      provides: "Dimensions change listener that forces re-render of the whole tree"
      contains: "Dimensions.addEventListener"
  key_links:
    - from: "android/app/src/main/AndroidManifest.xml"
      to: "React Native JS runtime"
      via: "configChanges prevents activity restart; RN Dimensions fires change event instead"
      pattern: "screenLayout.*smallestScreenSize"
    - from: "src/screens/App/App.js"
      to: "all descendant components"
      via: "Dimensions.addEventListener triggers setState which forces full tree re-render"
      pattern: "Dimensions\\.addEventListener"
    - from: "src/styles/variables.js"
      to: "all 22 callsite files"
      via: "getWindowWidth() called fresh on each render after the change event fires"
      pattern: "getWindowWidth\\(\\)"
---

<objective>
Fix Samsung foldable screen re-layout failure in React Native 0.63.5.

Purpose: When the user unfolds the device, the app currently shows a broken layout
because window dimensions were captured once at module startup and never updated.
This fix closes all three root causes in one surgical pass: Android manifest (OS
notification), variables.js (frozen constants), and App.js (change propagation).

Output: 3 atomic commits leaving the app fully responsive to fold/unfold events.
</objective>

<execution_context>
@/d/Andrew/Code/Andrew/pxview/.planning/quick/260517-xog-fix-foldable-screen/260517-xog-PLAN.md
</execution_context>

<context>
@/d/Andrew/Code/Andrew/pxview/src/styles/variables.js
@/d/Andrew/Code/Andrew/pxview/src/styles/index.js
@/d/Andrew/Code/Andrew/pxview/android/app/src/main/AndroidManifest.xml
@/d/Andrew/Code/Andrew/pxview/src/screens/App/App.js

<!-- KEY INTERFACES THE EXECUTOR NEEDS -->
<interfaces>
<!-- src/styles/variables.js — current frozen constants to replace -->
```javascript
// BEFORE (frozen at module load):
export const WINDOW_WIDTH = Math.floor(Dimensions.get('window').width);
export const WINDOW_HEIGHT = Math.floor(Dimensions.get('window').height);
export const DRAWER_WIDTH =
  WINDOW_WIDTH - (Platform.OS === 'android' ? 56 : 64);

// AFTER (getters, called fresh on each render):
export const getWindowWidth = () => Math.floor(Dimensions.get('window').width);
export const getWindowHeight = () => Math.floor(Dimensions.get('window').height);
export const getDrawerWidth = () =>
  getWindowWidth() - (Platform.OS === 'android' ? 56 : 64);
```

<!-- src/styles/index.js — re-exports variables as namespace -->
// import * as globalStyleVariables from './variables';
// Callsites use: globalStyleVariables.WINDOW_WIDTH
// After fix they use: globalStyleVariables.getWindowWidth()
// No change needed in index.js itself.

<!-- AndroidManifest.xml — current configChanges line (line 23): -->
// android:configChanges="keyboard|keyboardHidden|orientation|screenSize|uiMode"
// Needs: screenLayout|smallestScreenSize appended
// Needs: android:resizeableActivity="true" added to <activity>

<!-- App.js — function component using hooks, no lifecycle methods -->
// Must add useEffect with Dimensions.addEventListener('change', handler)
// and remove listener on cleanup (return () => subscription.remove() for RN 0.63+
// OR Dimensions.removeEventListener for older RN 0.63 API)
// Use a dummy state flag to force re-render: const [, forceUpdate] = useState(0)
// handler: () => forceUpdate(n => n + 1)
</interfaces>

<!-- CALLSITE INVENTORY — all 22 files that must be updated in Task 2 -->
<!-- grep -rn "WINDOW_WIDTH\|WINDOW_HEIGHT" src/ --include="*.js" | grep -v variables.js -->
<!--
src/components/DetailFooter.js:22         globalStyleVariables.WINDOW_WIDTH
src/components/DetailInfoModal.js:95      globalStyleVariables.WINDOW_HEIGHT
src/components/IllustDetailContent.js:24  globalStyleVariables.WINDOW_WIDTH
src/components/IllustDetailContent.js:267 globalStyleVariables.WINDOW_HEIGHT
src/components/IllustItem.js:85,89,109,114  globalStyleVariables.WINDOW_WIDTH
src/components/IllustList.js:183,185      globalStyleVariables.WINDOW_WIDTH
src/components/NovelDetailContent.js:148  globalStyleVariables.WINDOW_HEIGHT
src/components/NovelGridViewItem.js:54,55,73,76  globalStyleVariables.WINDOW_WIDTH
src/components/NovelViewer.js:12          globalStyleVariables.WINDOW_WIDTH (in StyleSheet.create)
src/components/PXBottomSheet.js:28-30     globalStyleVariables.WINDOW_HEIGHT (defaultProps — special case)
src/components/PXCacheImage.js:49,66,67,69  globalStyleVariables.WINDOW_WIDTH
src/components/PXCacheImageTouchable.js:35,36,39,40,80  globalStyleVariables.WINDOW_WIDTH
src/components/PXPhotoView.js:8,9         globalStyleVariables.WINDOW_WIDTH, WINDOW_HEIGHT
src/components/PXViewPager.js:107,108     globalStyleVariables.WINDOW_WIDTH
src/components/SearchHistory.js:30        globalStyleVariables.WINDOW_WIDTH
src/components/SingleChoiceDialog.js:16   globalStyleVariables.WINDOW_HEIGHT
src/components/TagList.js:78,80,94,95,106,107  globalStyleVariables.WINDOW_WIDTH
src/components/UgoiraView.ios.js:70       globalStyleVariables.WINDOW_WIDTH
src/components/UgoiraViewTouchable.js:150,151,154,165  globalStyleVariables.WINDOW_WIDTH
src/components/UserCover.js:12            globalStyleVariables.DRAWER_WIDTH (becomes getDrawerWidth())
src/containers/BookmarkModal.js:50        globalStyleVariables.WINDOW_HEIGHT
src/screens/Ranking/RankingHorizontalList.js:16,19  WINDOW_WIDTH at module scope (special case)
src/screens/Shared/Detail.js:45,52       globalStyleVariables.WINDOW_WIDTH
src/screens/Shared/NovelDetail.js:45,52  globalStyleVariables.WINDOW_WIDTH
src/screens/Shared/UserDetail.js:58,384  globalStyleVariables.WINDOW_WIDTH
-->
<!-- PXTabView.js line 8: const initialLayout = { width: Dimensions.get('window').width }; -->
<!-- Already uses Dimensions directly but frozen at module scope — special case below -->
</context>

<tasks>

<task type="auto">
  <name>Task 1: Android manifest — foldable configChanges and resizeableActivity</name>
  <files>android/app/src/main/AndroidManifest.xml</files>
  <action>
Edit the MainActivity entry in android/app/src/main/AndroidManifest.xml:

1. Find the `android:configChanges` attribute on the `<activity android:name=".MainActivity">` element.
   Current value: `"keyboard|keyboardHidden|orientation|screenSize|uiMode"`
   New value: `"keyboard|keyboardHidden|orientation|screenSize|uiMode|screenLayout|smallestScreenSize"`

2. Add `android:resizeableActivity="true"` as a new attribute on the same `<activity>` element,
   immediately after `android:windowSoftInputMode="adjustPan"`.

No other changes to this file. Commit with:
  git commit -m "fix(android): add foldable configChanges and resizeableActivity"
  </action>
  <verify>
    <automated>grep "screenLayout|smallestScreenSize" android/app/src/main/AndroidManifest.xml && grep 'resizeableActivity="true"' android/app/src/main/AndroidManifest.xml && echo "MANIFEST OK"</automated>
  </verify>
  <done>
AndroidManifest.xml configChanges includes screenLayout|smallestScreenSize.
android:resizeableActivity="true" is present on MainActivity.
Committed as fix(android): add foldable configChanges and resizeableActivity.
  </done>
</task>

<task type="auto">
  <name>Task 2: Replace frozen Dimensions constants with getter functions at all callsites</name>
  <files>
    src/styles/variables.js,
    src/components/DetailFooter.js,
    src/components/DetailInfoModal.js,
    src/components/IllustDetailContent.js,
    src/components/IllustItem.js,
    src/components/IllustList.js,
    src/components/NovelDetailContent.js,
    src/components/NovelGridViewItem.js,
    src/components/NovelViewer.js,
    src/components/PXBottomSheet.js,
    src/components/PXCacheImage.js,
    src/components/PXCacheImageTouchable.js,
    src/components/PXPhotoView.js,
    src/components/PXViewPager.js,
    src/components/SearchHistory.js,
    src/components/SingleChoiceDialog.js,
    src/components/TagList.js,
    src/components/UgoiraView.ios.js,
    src/components/UgoiraViewTouchable.js,
    src/components/UserCover.js,
    src/components/PXTabView.js,
    src/containers/BookmarkModal.js,
    src/screens/Ranking/RankingHorizontalList.js,
    src/screens/Shared/Detail.js,
    src/screens/Shared/NovelDetail.js,
    src/screens/Shared/UserDetail.js
  </files>
  <action>
**Step A — variables.js: replace constants with getters**

Replace lines 23–30 in src/styles/variables.js:

  BEFORE:
    export const WINDOW_WIDTH = Math.floor(Dimensions.get('window').width);
    export const WINDOW_HEIGHT = Math.floor(Dimensions.get('window').height);
    ...
    export const DRAWER_WIDTH =
      WINDOW_WIDTH - (Platform.OS === 'android' ? 56 : 64);

  AFTER:
    export const getWindowWidth = () => Math.floor(Dimensions.get('window').width);
    export const getWindowHeight = () => Math.floor(Dimensions.get('window').height);
    export const getDrawerWidth = () =>
      getWindowWidth() - (Platform.OS === 'android' ? 56 : 64);

Do NOT add backward compat aliases (WINDOW_WIDTH = ...). All callsites are updated below.

**Step B — standard callsite replacement**

In every file listed that uses `globalStyleVariables.WINDOW_WIDTH`, replace each occurrence with `globalStyleVariables.getWindowWidth()`.
In every file listed that uses `globalStyleVariables.WINDOW_HEIGHT`, replace each occurrence with `globalStyleVariables.getWindowHeight()`.
In UserCover.js, replace `globalStyleVariables.DRAWER_WIDTH` with `globalStyleVariables.getDrawerWidth()`.

These replacements are straightforward string substitutions — context does not change, only the identifier name gains parentheses.

**Step C — special case: StyleSheet.create() usages**

React Native's StyleSheet.create() is called at module scope. When WINDOW_WIDTH appears inside a StyleSheet.create() block, the getter call is valid because it runs at module load — the fix for re-render comes from App.js (Task 3), not from making StyleSheet dynamic. Leave these usages as getter calls inside StyleSheet.create(); they will produce correct values on initial load and re-layout will be handled by React re-rendering the component tree.

Files with StyleSheet.create usage (no structural change, just getter call substitution):
- NovelViewer.js line 12: `width: globalStyleVariables.getWindowWidth()`
- PXPhotoView.js lines 8-9: `width: globalStyleVariables.getWindowWidth()`, `height: globalStyleVariables.getWindowHeight()`
- SearchHistory.js line 30: `width: globalStyleVariables.getWindowWidth() - 45`
- SingleChoiceDialog.js line 16: `maxHeight: globalStyleVariables.getWindowHeight() - 200`
- DetailFooter.js line 22: `width: globalStyleVariables.getWindowWidth()`
- IllustDetailContent.js line 24: `width: globalStyleVariables.getWindowWidth()`
- Detail.js lines 45, 52: getter calls
- NovelDetail.js lines 45, 52: getter calls
- UserDetail.js lines 58, 384: getter calls

**Step D — special case: PXBottomSheet.js defaultProps**

The `height` default in `static defaultProps` uses `globalStyleVariables.WINDOW_HEIGHT` at class definition time. Move the height computation out of defaultProps and into setModalVisible so it reads fresh dimensions when the sheet opens:

  BEFORE (static defaultProps):
    height:
      globalStyleVariables.WINDOW_HEIGHT -
      globalStyleVariables.APPBAR_HEIGHT -
      globalStyleVariables.STATUSBAR_HEIGHT,

  AFTER (static defaultProps — use a sentinel):
    height: null,

  In setModalVisible(), resolve the actual height before the animation:
    const resolvedHeight =
      height != null
        ? height
        : globalStyleVariables.getWindowHeight() -
          globalStyleVariables.APPBAR_HEIGHT -
          globalStyleVariables.STATUSBAR_HEIGHT;
    Animated.timing(animatedHeight, {
      toValue: resolvedHeight,
      ...
    }).start();

**Step E — special case: PXTabView.js module-scope initialLayout**

Current line 8: `const initialLayout = { width: Dimensions.get('window').width };`

This is already using Dimensions directly (not via variables.js) but it is still frozen at module scope. Move it inside the PXTabView function component body so it evaluates on each render:

  BEFORE (module scope, line 8):
    const initialLayout = { width: Dimensions.get('window').width };

  AFTER (inside the PXTabView function body, before the return):
    const initialLayout = { width: Dimensions.get('window').width };

Remove the module-scope declaration. No import changes needed — Dimensions is already imported.

**Step F — special case: RankingHorizontalList.js module-scope constants**

Lines 16–19 define SLIDER_WIDTH and ITEM_WIDTH at module scope using WINDOW_WIDTH.
Move them inside the render() method of the class component so they are evaluated
fresh on each render call:

  BEFORE (module scope):
    const SLIDER_WIDTH = globalStyleVariables.WINDOW_WIDTH;
    const ITEM_HORIZONTAL_PADDING = 5;
    const ITEM_WIDTH =
      globalStyleVariables.WINDOW_WIDTH / 3 + ITEM_HORIZONTAL_PADDING * 2;

  AFTER: Remove SLIDER_WIDTH and ITEM_WIDTH from module scope. Keep ITEM_HORIZONTAL_PADDING
  at module scope (it is a pure constant). Inside render():
    const sliderWidth = globalStyleVariables.getWindowWidth();
    const itemWidth =
      globalStyleVariables.getWindowWidth() / 3 + ITEM_HORIZONTAL_PADDING * 2;

  Update all references to SLIDER_WIDTH → sliderWidth and ITEM_WIDTH → itemWidth
  within the render() and any methods in that class. (They are passed as props to
  the Carousel component.)

Commit with:
  git commit -m "fix(styles): replace frozen Dimensions constants with getter functions"
  </action>
  <verify>
    <automated>grep -rn "WINDOW_WIDTH\|WINDOW_HEIGHT\|DRAWER_WIDTH" src/ --include="*.js" | grep -v "^src/styles/variables.js" | grep -v "getWindowWidth\|getWindowHeight\|getDrawerWidth" | grep -v "^Binary"</automated>
  </verify>
  <done>
src/styles/variables.js exports getWindowWidth, getWindowHeight, getDrawerWidth as functions.
The verify grep returns zero lines (no remaining frozen constant references outside variables.js).
PXTabView initialLayout is computed inside the function body.
PXBottomSheet defaultProps height is null; setModalVisible resolves it fresh.
RankingHorizontalList SLIDER_WIDTH and ITEM_WIDTH computed inside render().
Committed as fix(styles): replace frozen Dimensions constants with getter functions.
  </done>
</task>

<task type="auto">
  <name>Task 3: App-level Dimensions change listener to propagate fold/unfold events</name>
  <files>src/screens/App/App.js</files>
  <action>
App.js is a function component using hooks. Add a Dimensions change listener
that forces the whole component tree to re-render when window dimensions change.

1. Add `Dimensions` to the import from 'react-native' (currently imports View, StyleSheet,
   StatusBar, Platform — add Dimensions to this list).

2. Add a dummy counter state to trigger re-renders:
     const [, forceUpdate] = useState(0);
   Place this with the other useState calls near the top of the App function.

3. Add a useEffect that registers and cleans up the listener:
     useEffect(() => {
       const subscription = Dimensions.addEventListener('change', () => {
         forceUpdate((n) => n + 1);
       });
       return () => {
         // RN 0.63 addEventListener returns an object with .remove()
         // Fall back to removeEventListener for safety
         if (subscription && typeof subscription.remove === 'function') {
           subscription.remove();
         } else {
           Dimensions.removeEventListener('change', () => {});
         }
       };
     }, []);

   Place this useEffect after the existing useEffect blocks (after the SplashScreen
   hide effect around line 130). The empty dependency array ensures it runs once
   on mount and cleans up on unmount.

The forceUpdate state increment causes App to re-render. Because all descendant
components now call getWindowWidth()/getWindowHeight() fresh on each render, they
will pick up the new dimensions automatically. No prop drilling needed.

Commit with:
  git commit -m "feat(app): propagate Dimensions changes through component tree on fold/unfold"
  </action>
  <verify>
    <automated>grep -n "Dimensions.addEventListener" src/screens/App/App.js</automated>
  </verify>
  <done>
App.js imports Dimensions.
Dimensions.addEventListener('change', ...) is registered in a useEffect with [] deps.
The listener cleanup removes the subscription on unmount.
forceUpdate state drives re-render on fold/unfold.
Committed as feat(app): propagate Dimensions changes through component tree on fold/unfold.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Device OS -> JS runtime | Android configChanges controls whether RN receives Dimensions change events at all |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-xog-01 | Denial of Service | Dimensions change listener | accept | Fold/unfold is infrequent; forceUpdate on change is O(1) and safe |
| T-xog-02 | Tampering | PXBottomSheet height resolution | accept | Height is derived from device Dimensions — no user-controlled input |
</threat_model>

<verification>
After all three tasks and commits, run the full callsite audit:

```bash
grep -rn "WINDOW_WIDTH\|WINDOW_HEIGHT\|DRAWER_WIDTH" src/ --include="*.js" | grep -v "^src/styles/variables.js"
```

Expected result: zero output lines.

Secondary check — verify getters are defined:
```bash
grep -n "getWindowWidth\|getWindowHeight\|getDrawerWidth" src/styles/variables.js
```

Expected: 3 lines showing the three function exports.

Verify App.js listener:
```bash
grep -n "Dimensions" src/screens/App/App.js
```

Expected: import line + addEventListener call + cleanup.
</verification>

<success_criteria>
1. `grep -rn "WINDOW_WIDTH\|WINDOW_HEIGHT\|DRAWER_WIDTH" src/ --include="*.js" | grep -v "^src/styles/variables.js"` returns zero lines.
2. AndroidManifest.xml configChanges includes `screenLayout|smallestScreenSize` and MainActivity has `android:resizeableActivity="true"`.
3. App.js has `Dimensions.addEventListener('change', ...)` inside a useEffect.
4. Three atomic commits exist with the prescribed messages.
</success_criteria>

<output>
No SUMMARY file needed for quick tasks. Return completion status inline.
</output>
