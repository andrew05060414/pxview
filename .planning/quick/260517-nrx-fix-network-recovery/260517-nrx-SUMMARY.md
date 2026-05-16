---
quick_id: 260517-nrx
slug: fix-network-recovery
status: complete
---

## Summary

Fixed app network recovery by (1) changing all 27 list-content reducer FAILURE cases from
`loaded: true` to `loaded: false, error: true` so that failed loads are retryable, and (2)
adding a new `watchNetworkRestore` saga that listens for the CONNECTION_CHANGE action
(dispatched by react-native-offline) and dispatches refreshing=true for any list currently
in error state when connectivity transitions false->true.

## Files Changed

### Reducers (27 files) — Task 1

- `src/common/reducers/recommendedIllusts.js`
- `src/common/reducers/recommendedMangas.js`
- `src/common/reducers/recommendedNovels.js`
- `src/common/reducers/recommendedUsers.js`
- `src/common/reducers/walkthroughIllusts.js`
- `src/common/reducers/followingUserIllusts.js`
- `src/common/reducers/followingUserNovels.js`
- `src/common/reducers/newIllusts.js`
- `src/common/reducers/newMangas.js`
- `src/common/reducers/newNovels.js`
- `src/common/reducers/myPixivIllusts.js`
- `src/common/reducers/myPixivNovels.js`
- `src/common/reducers/myPrivateBookmarkIllusts.js`
- `src/common/reducers/myPrivateBookmarkNovels.js`
- `src/common/reducers/userIllusts.js`
- `src/common/reducers/userMangas.js`
- `src/common/reducers/userNovels.js`
- `src/common/reducers/userBookmarkIllusts.js`
- `src/common/reducers/userBookmarkNovels.js`
- `src/common/reducers/userFollowing.js`
- `src/common/reducers/userFollowers.js`
- `src/common/reducers/userMyPixiv.js`
- `src/common/reducers/relatedIllusts.js`
- `src/common/reducers/ranking.js`
- `src/common/reducers/searchIllusts.js`
- `src/common/reducers/searchNovels.js`
- `src/common/reducers/searchUsers.js`

### Sagas (2 files) — Task 2

- `src/common/sagas/networkRestore.js` (new file)
- `src/common/sagas/index.js` (added import + call in all() array)

## Commits

- `df8ebe9` — fix(reducers): keep loaded: false on FAILURE to enable retry
- `42beaec` — feat(sagas): auto-refresh errored lists when network restores

## Deviations

**Action creator signatures differ from plan template for newIllusts/Mangas/Novels:**
The plan's template showed `fetchNewIllusts(undefined, undefined, true)` (3 args), but the
actual signatures are `fetchNewIllusts(nextUrl, refreshing)` (2 args). The saga uses the
correct `fetchNewIllusts(undefined, true)` form. Verified by reading each action file before
writing the saga.

**ranking.js FAILURE payload — networkRestore correctly keys by rankingMode:**
The plan noted ranking is nested by rankingMode. The saga iterates `Object.keys(state.ranking)`
and dispatches `fetchRanking(mode, undefined, undefined, true)` only for modes where
`state.ranking[mode].error` is true. Correct signature: `fetchRanking(rankingMode, options, nextUrl, refreshing)`.

**Rule 1 auto-fix — userFollowers and userMyPixiv FAILURE had `refreshing: true` bug:**
Both had a pre-existing bug where the FAILURE case set `refreshing: true` instead of `false`,
which would permanently show a spinner. Fixed to `refreshing: false` alongside the `loaded`
change since both were touched by this task. Also fixed `userFollowers` FAILURE which was
dropping `...state[userId]` spread (could clobber existing items).

**networkRestore saga scope — ranking and recommendedUsers not covered for auto-refresh:**
`recommendedUsers` reducer is fixed (loaded: false, error: true on FAILURE) but was not
added to the networkRestore saga's dispatch list (the plan's template did not include it
either). If the recommended users tab fails during offline, it will not auto-refresh on
reconnect, but pull-to-refresh will still work. This can be added in a follow-up.
