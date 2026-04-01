# Concerns

## Platform And Dependency Age
- The stack is materially old: React Native `0.63.5`, React `16.13.1`, Jest `25`, ESLint `6`, and many pre-2022 ecosystem packages in `package.json`.
- Upgrading this repo will likely require coordinated navigation, Android Gradle, iOS CocoaPods, and native-module work rather than a small incremental bump.
- Android still disables Hermes in `android/app/build.gradle`, which is another signal that runtime/tooling assumptions are dated.

## Checked-In Build Artifacts And Secrets Hygiene
- Generated JS bundle artifacts are committed in `android/app/src/main/assets/index.android.bundle` and `android/app/src/main/assets/index.android.bundle.meta`, which can drift from source and create review noise.
- Debug signing material is present in `android/app/debug.keystore` and `android/keystores/debug.keystore.properties`.
- Release signing expects env/project properties in `android/app/build.gradle`; good that secrets are not hardcoded, but the repo should stay disciplined about not checking in release keystores.

## Auth Flow Fragility
- `src/common/actions/auth.js` still exposes a username/password `login(email, password, isProvisionalAccount)` action shape, but the active login saga in `src/common/sagas/auth.js` only consumes `code` and `codeVerifier`.
- Signup currently dispatches `login(signUpResponse.user_account, signUpResponse.password, true)` from `src/common/sagas/auth.js`, which does not match the code-path the watcher actually expects.
- That mismatch is a likely maintenance trap even if some paths still work via provisional-account behavior.

## Large Central Modules
- `src/common/selectors/index.js` is extremely large and mixes many unrelated feature selectors in one file.
- `src/common/reducers/index.js` and `src/common/sagas/index.js` are also very wide central registries.
- These files are workable today, but they make targeted refactors and code search noisier as the app grows.

## Repetition And Drift Risk
- Many slices are copy-paste variants across actions, reducers, and sagas.
- Repetition lowers the learning curve but increases the odds of inconsistent fixes or missing one slice during changes.
- Navigation also shows legacy residue: active stack/tab navigators coexist with older route config files in `src/navigations/routeConfigs/`.

## Error Handling Quality
- Several flows swallow errors silently, especially `src/screens/MyPage/Backup.js`.
- Saga error handling is inconsistent: some paths dispatch `addError(err)` with raw error objects, others extract messages.
- Production console suppression in `src/screens/App/Root.js` can make field debugging harder if telemetry is incomplete.

## Persistence And Data Safety
- Auth and user settings are persisted locally in `src/common/store/configureStore.js`, including access/refresh token material inside the auth slice.
- Backup/export in `src/screens/MyPage/Backup.js` writes readable JSON files to device storage, which is convenient but increases privacy risk if the exported file is shared or left behind.
- This matters more because the app handles NSFW reading habits, mute lists, and search history.

## Android Storage And OS Compatibility
- Backup uses `WRITE_EXTERNAL_STORAGE` from `src/screens/MyPage/Backup.js`, which is brittle on newer Android versions with scoped storage changes.
- The app likely needs a compatibility pass before modern Android target SDK upgrades.

## Native Maintenance Burden
- Custom native ugoira playback code under `android/app/src/main/java/com/utopia/pxviewr/UgoiraView/` adds value, but it is also a long-term upgrade burden.
- Any React Native major-version move will need that bridge verified early.
- iOS still uses older Objective-C app host patterns under `ios/PxViewR/`, which is normal for the repo age but increases upgrade surface area.

## Testing And Delivery Risk
- Automated coverage is very thin: only `__tests__/sagas/auth.spec.js` is visible.
- There is no visible CI workflow in the repo snapshot.
- The highest-value user journeys for this app, including login, reader behavior, image detail navigation, and save/share flows, are effectively protected by manual testing only.
