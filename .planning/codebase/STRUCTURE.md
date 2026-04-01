# Structure

## Root Layout
- `package.json`, `package-lock.json`, `.eslintrc`, `.flowconfig`, and `metro.config.js` define the JS workspace.
- `index.js` is the JS entry point.
- `README.md` is still the main onboarding document.
- `android/` and `ios/` contain the native projects.
- `src/` contains nearly all shared product logic.

## Source Tree
- `src/screens/` contains route-level UI grouped mostly by product area:
  - `src/screens/App/`
  - `src/screens/Auth/`
  - `src/screens/Recommended/`
  - `src/screens/Ranking/`
  - `src/screens/Trending/`
  - `src/screens/NewWorks/`
  - `src/screens/MyPage/`
  - `src/screens/Shared/`
- `src/navigations/` contains top-level navigator definitions and some legacy route config fragments under `src/navigations/routeConfigs/`.
- `src/components/` contains reusable view primitives, headers, overlays, lists, and the `Localization/` helpers.
- `src/containers/` contains stateful wrappers, modal containers, and feature-specific connected helpers.

## Shared Application Core
- `src/common/actions/` contains action creators, generally one file per domain slice.
- `src/common/reducers/` contains Redux reducers, mirroring action filenames closely.
- `src/common/sagas/` contains side effects, again mirroring slice names.
- `src/common/selectors/index.js` centralizes selector factories and derived-state logic.
- `src/common/store/` contains store setup and persist migration code.
- `src/common/helpers/` contains low-level helpers such as API client, PKCE, search period logic, i18n setup, and novel parsing.
- `src/common/constants/` contains action constants, schemas, strings, and shared enumerations.
- `src/common/config/` switches between `env.dev.js` and `env.prod.js`.

## Naming Patterns
- Screen files are PascalCase and generally named after the route or feature, for example `src/screens/Shared/NovelDetail.js`.
- Action, reducer, and saga files use matching camelCase filenames such as:
  - `src/common/actions/recommendedIllusts.js`
  - `src/common/reducers/recommendedIllusts.js`
  - `src/common/sagas/recommendedIllusts.js`
- Reusable UI primitives often use the `PX` prefix, for example `src/components/PXImage.js` and `src/components/PXSnackbar.js`.
- Selector factories often use the `makeGet...` naming convention in `src/common/selectors/index.js`.

## Platform-Specific Layout
- Android app code lives under `android/app/src/main/`.
- Android custom native view code is isolated under `android/app/src/main/java/com/utopia/pxviewr/UgoiraView/`.
- Android assets include bundled JS and fonts under `android/app/src/main/assets/`.
- iOS app sources live under `ios/PxViewR/`, with tests under `ios/PxViewRTests/`.
- Workspace/project metadata exists both under `ios/PxViewR.xcodeproj/` and top-level `PxView.xcworkspace/`.

## Assets And Content
- Static images live in `src/images/`.
- Screenshots for docs/store listings live in `screenshots/android/` and `screenshots/ios/`.
- Donation and privacy-policy markdown content lives in `donations/` and `privacy-policy/`.
- Localized strings are JSON files under `src/common/constants/strings/`.

## Testing And Mocks
- Tests currently live in `__tests__/`, with only saga coverage visible.
- Jest mocks live in `__mocks__/`.
- There is no visible `.github/` directory or CI-specific test orchestration in the repo snapshot.

## Repo Shape Observations
- The codebase is wide rather than deep: many parallel feature files instead of a smaller number of large shared abstractions.
- `src/screens/Shared/` is a major hub for cross-feature route implementations.
- `src/common/selectors/index.js` is a very large central module rather than a set of per-feature selector files.
- Some generated or build-output files are committed, notably `android/app/src/main/assets/index.android.bundle`.
