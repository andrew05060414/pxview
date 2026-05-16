---
phase: quick/260517-nrx-fix-network-recovery
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - src/common/reducers/recommendedIllusts.js
  - src/common/reducers/recommendedMangas.js
  - src/common/reducers/recommendedNovels.js
  - src/common/reducers/recommendedUsers.js
  - src/common/reducers/walkthroughIllusts.js
  - src/common/reducers/followingUserIllusts.js
  - src/common/reducers/followingUserNovels.js
  - src/common/reducers/newIllusts.js
  - src/common/reducers/newMangas.js
  - src/common/reducers/newNovels.js
  - src/common/reducers/myPixivIllusts.js
  - src/common/reducers/myPixivNovels.js
  - src/common/reducers/myPrivateBookmarkIllusts.js
  - src/common/reducers/myPrivateBookmarkNovels.js
  - src/common/reducers/userIllusts.js
  - src/common/reducers/userMangas.js
  - src/common/reducers/userNovels.js
  - src/common/reducers/userBookmarkIllusts.js
  - src/common/reducers/userBookmarkNovels.js
  - src/common/reducers/userFollowing.js
  - src/common/reducers/userFollowers.js
  - src/common/reducers/userMyPixiv.js
  - src/common/reducers/relatedIllusts.js
  - src/common/reducers/ranking.js
  - src/common/reducers/searchIllusts.js
  - src/common/reducers/searchNovels.js
  - src/common/reducers/searchUsers.js
  - src/common/sagas/networkRestore.js
  - src/common/sagas/index.js
requirements: []

must_haves:
  truths:
    - "After a network drop + restore, list screens reload automatically without user action"
    - "Pull-to-refresh still works on all affected screens"
    - "No list screen gets stuck in a permanent loading spinner after network failure"
  artifacts:
    - path: "src/common/sagas/networkRestore.js"
      provides: "NetInfo connectivity watcher that dispatches refresh on restore"
      exports: ["watchNetworkRestore"]
    - path: "src/common/reducers/recommendedIllusts.js"
      provides: "FAILURE sets loaded: false so retry is possible"
      contains: "loaded: false"
  key_links:
    - from: "react-native-offline reducer"
      to: "state.network.isConnected"
      via: "@@network-connectivity/CONNECTION_CHANGE action (already dispatched by networkSaga)"
    - from: "src/common/sagas/networkRestore.js"
      to: "src/common/sagas/index.js"
      via: "watchNetworkRestore() added to rootSaga all() array"
---

<objective>
Fix network recovery so the app self-heals after a connectivity drop.

Purpose: Users currently must force-quit and relaunch the app after losing network — unacceptable for a primary reading client. Two surgical changes fix this: (1) list reducers must not mark themselves as `loaded: true` on FAILURE (which blocks retry), and (2) a connectivity watcher must trigger a refresh whenever the connection restores.

Output:
- All list-content FAILURE cases changed to `loaded: false, error: true`
- New saga `networkRestore.js` that watches `state.network.isConnected` transitions false→true and dispatches refresh for currently-visible pending lists
- Wire `watchNetworkRestore` into root saga
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@D:/Andrew/Code/Andrew/pxview/src/common/reducers/recommendedIllusts.js
@D:/Andrew/Code/Andrew/pxview/src/common/sagas/index.js
@D:/Andrew/Code/Andrew/pxview/src/common/reducers/index.js

<interfaces>
<!-- react-native-offline already dispatches CONNECTION_CHANGE. The reducer at
     state.network is already wired (reducers/index.js line 153). -->
<!-- Action type to watch in saga: -->
const CONNECTION_CHANGE = '@@network-connectivity/CONNECTION_CHANGE';
// action.payload === true  → just came online
// action.payload === false → just went offline

<!-- Pattern for every list reducer FAILURE case (before): -->
case FOO.FAILURE:
  return { ...state, loading: false, loaded: true, refreshing: false };

<!-- Pattern after fix: -->
case FOO.FAILURE:
  return { ...state, loading: false, loaded: false, error: true, refreshing: false };

<!-- ranking.js uses keyed sub-state per rankingMode — same fix, nested: -->
case RANKING.FAILURE:
  return {
    ...state,
    [action.payload.rankingMode]: {
      ...state[action.payload.rankingMode],
      loading: false,
      loaded: false,   // was true
      error: true,     // add this
      refreshing: false,
    },
  };

<!-- searchIllusts.js / searchNovels.js / searchUsers.js use navigationStateKey — same fix, nested. -->

<!-- Refresh action available for recommendedIllusts (representative): -->
import { fetchRecommendedIllusts } from '../actions/recommendedIllusts';
// dispatch: fetchRecommendedIllusts(undefined, undefined, true)  ← refreshing=true

<!-- rootSaga signature (sagas/index.js lines 67-139): -->
export default function* rootSaga() {
  yield all([ ...existing watchers..., networkSaga({ pingOnlyIfOffline: true }) ]);
}
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix FAILURE loaded: true in all list-content reducers</name>
  <files>
    src/common/reducers/recommendedIllusts.js
    src/common/reducers/recommendedMangas.js
    src/common/reducers/recommendedNovels.js
    src/common/reducers/recommendedUsers.js
    src/common/reducers/walkthroughIllusts.js
    src/common/reducers/followingUserIllusts.js
    src/common/reducers/followingUserNovels.js
    src/common/reducers/newIllusts.js
    src/common/reducers/newMangas.js
    src/common/reducers/newNovels.js
    src/common/reducers/myPixivIllusts.js
    src/common/reducers/myPixivNovels.js
    src/common/reducers/myPrivateBookmarkIllusts.js
    src/common/reducers/myPrivateBookmarkNovels.js
    src/common/reducers/userIllusts.js
    src/common/reducers/userMangas.js
    src/common/reducers/userNovels.js
    src/common/reducers/userBookmarkIllusts.js
    src/common/reducers/userBookmarkNovels.js
    src/common/reducers/userFollowing.js
    src/common/reducers/userFollowers.js
    src/common/reducers/userMyPixiv.js
    src/common/reducers/relatedIllusts.js
    src/common/reducers/ranking.js
    src/common/reducers/searchIllusts.js
    src/common/reducers/searchNovels.js
    src/common/reducers/searchUsers.js
  </files>
  <action>
In every reducer listed, find the FAILURE case and apply this change:

  BEFORE: `loading: false, loaded: true, refreshing: false`
  AFTER:  `loading: false, loaded: false, error: true, refreshing: false`

Rules for the three structural variants:

1. Flat reducers (recommendedIllusts, followingUserIllusts, newIllusts, etc.):
   The FAILURE case returns `{ ...state, loading: false, loaded: false, error: true, refreshing: false }`.

2. ranking.js — keyed by `action.payload.rankingMode`:
   The nested object gets `loaded: false, error: true` instead of `loaded: true`.

3. searchIllusts.js / searchNovels.js / searchUsers.js — keyed by `action.payload.navigationStateKey`:
   Same nested pattern as ranking.

DO NOT touch:
- bookmarkIllust.js, bookmarkNovel.js, followUser.js, addIllustComment.js, addNovelComment.js,
  editAccount.js, verificationEmail.js — these are action-mutation reducers where loaded: true on
  FAILURE is intentional (signals the operation attempt is complete, not a retry-able list load).
- illustDetail.js, novelDetail.js, illustComments.js, novelComments.js, illustCommentReplies.js,
  novelCommentReplies.js, novelSeries.js, novelText.js, ugoiraMeta.js, userDetail.js,
  illustBookmarkDetail.js, novelBookmarkDetail.js, userFollowDetail.js — these are detail/single-item
  reducers keyed by ID; setting loaded: false would cause infinite reload loops on detail screens.
  Skip them.
- searchAutoComplete.js, searchUsersAutoComplete.js — autocomplete, not list content.
- bookmarkIllustTags.js, bookmarkNovelTags.js, trendingIllustTags.js, trendingNovelTags.js —
  tag list reducers. Evaluate: if the FAILURE case has `loaded: true` AND the reducer has a
  `refreshing` field, apply the fix. If it has no `refreshing` field, skip it.
- auth.js, entities.js, error.js, modal.js, and all settings reducers — never touch.

Commit: `fix(reducers): keep loaded: false on FAILURE to enable retry`
  </action>
  <verify>
    <automated>grep -rn "loaded: true" D:/Andrew/Code/Andrew/pxview/src/common/reducers/recommendedIllusts.js D:/Andrew/Code/Andrew/pxview/src/common/reducers/ranking.js D:/Andrew/Code/Andrew/pxview/src/common/reducers/searchIllusts.js D:/Andrew/Code/Andrew/pxview/src/common/reducers/newIllusts.js D:/Andrew/Code/Andrew/pxview/src/common/reducers/followingUserIllusts.js 2>/dev/null | grep -i failure || echo "PASS: no FAILURE case sets loaded: true in spot-checked reducers"</automated>
  </verify>
  <done>
    All targeted list reducers have `loaded: false, error: true` in their FAILURE case.
    The five spot-checked reducers return no grep hits for `loaded: true` inside a FAILURE block.
    Intentionally-excluded reducers are untouched (verify by checking git diff --stat).
  </done>
</task>

<task type="auto">
  <name>Task 2: Add NetInfo connectivity watcher saga and wire into root</name>
  <files>
    src/common/sagas/networkRestore.js
    src/common/sagas/index.js
  </files>
  <action>
Create `src/common/sagas/networkRestore.js`:

```js
import { put, select, take } from 'redux-saga/effects';
import { fetchRecommendedIllusts } from '../actions/recommendedIllusts';
import { fetchRecommendedNovels } from '../actions/recommendedNovels';
import { fetchRecommendedMangas } from '../actions/recommendedMangas';
import { fetchFollowingUserIllusts } from '../actions/followingUserIllusts';
import { fetchFollowingUserNovels } from '../actions/followingUserNovels';
import { fetchNewIllusts } from '../actions/newIllusts';
import { fetchNewMangas } from '../actions/newMangas';
import { fetchNewNovels } from '../actions/newNovels';
import { fetchRanking } from '../actions/ranking';

const CONNECTION_CHANGE = '@@network-connectivity/CONNECTION_CHANGE';

/**
 * Dispatches a refresh for each list that has error: true (failed to load
 * while offline) when connectivity restores. Mirrors what pull-to-refresh
 * does — dispatches the same REQUEST action with refreshing: true.
 *
 * Only refreshes lists that are in error state (error: true, loaded: false).
 * Lists that loaded successfully are not re-fetched.
 */
function* handleNetworkRestore() {
  const state = yield select();
  const { network } = state;
  // network.isConnected is already true at this point (action just fired)

  const dispatches = [];

  if (state.recommendedIllusts && state.recommendedIllusts.error) {
    dispatches.push(put(fetchRecommendedIllusts(undefined, undefined, true)));
  }
  if (state.recommendedNovels && state.recommendedNovels.error) {
    dispatches.push(put(fetchRecommendedNovels(undefined, undefined, true)));
  }
  if (state.recommendedMangas && state.recommendedMangas.error) {
    dispatches.push(put(fetchRecommendedMangas(undefined, undefined, true)));
  }
  if (state.followingUserIllusts && state.followingUserIllusts.error) {
    dispatches.push(put(fetchFollowingUserIllusts(undefined, undefined, true)));
  }
  if (state.followingUserNovels && state.followingUserNovels.error) {
    dispatches.push(put(fetchFollowingUserNovels(undefined, undefined, true)));
  }
  if (state.newIllusts && state.newIllusts.error) {
    dispatches.push(put(fetchNewIllusts(undefined, undefined, true)));
  }
  if (state.newMangas && state.newMangas.error) {
    dispatches.push(put(fetchNewMangas(undefined, undefined, true)));
  }
  if (state.newNovels && state.newNovels.error) {
    dispatches.push(put(fetchNewNovels(undefined, undefined, true)));
  }

  for (const effect of dispatches) {
    yield effect;
  }
}

export function* watchNetworkRestore() {
  let wasConnected = true; // assume connected on start
  while (true) {
    const action = yield take(CONNECTION_CHANGE);
    const isConnected = action.payload;
    if (isConnected && !wasConnected) {
      // Transitioned from offline → online
      yield* handleNetworkRestore();
    }
    wasConnected = isConnected;
  }
}
```

Implementation notes:
- Check the actual action creator signatures in each `src/common/actions/*.js` file before
  dispatching — use the correct parameter order. The `refreshing` parameter position varies
  (e.g., `fetchRanking(rankingMode, date, options, nextUrl, refreshing)`). Do not guess.
  Read each action file first.
- For ranking: ranking is keyed by mode. Only dispatch refresh for modes that have `error: true`
  in `state.ranking[mode]`. Iterate `Object.keys(state.ranking)` and check each.
- If an action creator does not accept a `refreshing` param, dispatch without it — the CLEAR +
  REQUEST pattern will still work.
- Do NOT import or use `@react-native-community/netinfo` directly — react-native-offline's
  networkSaga is already running and already dispatches CONNECTION_CHANGE. Listening to that
  action in a saga is sufficient; adding a second NetInfo subscriber would be redundant.

Wire into `src/common/sagas/index.js`:
- Add import: `import { watchNetworkRestore } from './networkRestore';`
- Add `watchNetworkRestore()` to the `yield all([...])` array, after `watchError()`.

Commit: `feat(sagas): auto-refresh errored lists when network restores`
  </action>
  <verify>
    <automated>node -e "const fs = require('fs'); const s = fs.readFileSync('D:/Andrew/Code/Andrew/pxview/src/common/sagas/index.js', 'utf8'); if (!s.includes('watchNetworkRestore')) { process.exit(1); } console.log('PASS: watchNetworkRestore wired into rootSaga');"</automated>
  </verify>
  <done>
    `src/common/sagas/networkRestore.js` exists and exports `watchNetworkRestore`.
    `src/common/sagas/index.js` imports and calls `watchNetworkRestore()` in the all() array.
    The saga compiles without errors (run `npx react-native start --reset-cache` or `npm run android-bundle` to verify no import errors).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Network → Redux state | Connectivity events from OS/NetInfo cross into Redux via CONNECTION_CHANGE |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-nrx-01 | Denial of Service | networkRestore.js | accept | Rapid online/offline cycling could trigger many refreshes. Low risk: each list reducer uses takeLatest so extra dispatches are debounced by the saga layer. |
| T-nrx-02 | Elevation of Privilege | FAILURE reducer change | accept | Setting loaded: false is purely internal state; no external trust boundary crossed. |
</threat_model>

<verification>
After both tasks:

1. Reducer smoke check:
```bash
grep -c "loaded: false" D:/Andrew/Code/Andrew/pxview/src/common/reducers/recommendedIllusts.js
# Should be >= 2 (initState + FAILURE case)
```

2. Saga wiring check:
```bash
grep "watchNetworkRestore" D:/Andrew/Code/Andrew/pxview/src/common/sagas/index.js
# Should return two lines: import and call site
```

3. No regressions in excluded files:
```bash
git diff --name-only | grep -E "auth|novelText|novelDetail|illustDetail|bookmarkIllust"
# Should be empty — none of these should be in the diff
```

4. Bundle compiles:
```bash
cd D:/Andrew/Code/Andrew/pxview && npm run android-bundle 2>&1 | tail -5
# Should complete without import errors
```
</verification>

<success_criteria>
- Every list/content reducer targeted above returns `loaded: false, error: true` on FAILURE
- `networkRestore.js` saga exists and is registered in rootSaga
- After simulating offline→online (airplane mode toggle), errored list screens reload without user intervention
- Pull-to-refresh continues to work on all screens (loaded: false means pull-to-refresh will re-fetch, which is the desired behavior)
- No force-quit required after network drop
</success_criteria>

<output>
After completion, create `.planning/quick/260517-nrx-fix-network-recovery/260517-nrx-SUMMARY.md`
with: files changed, commit SHAs, and any deviations from the plan (e.g., action creators that
needed different parameter signatures).
</output>
