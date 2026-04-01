<!-- GSD:project-start source:PROJECT.md -->
## Project

**PxView Reader Fixes**

This repo is an old brownfield React Native Pixiv client that the user is treating as a personal NSFW txt/equb reading app. The current project is not a broad rewrite; it is focused maintenance work to make the existing novel reader faithfully render author content, starting with inline novel images.

**Core Value:** When opening a Pixiv novel, the reader must preserve the author's intended reading flow, including inline images in their original position.

### Constraints

- **Tech stack**: Keep the existing React Native `0.63.5` + `react-native-htmlview` reader pipeline — broad rewrites would create too much risk in an old codebase
- **Scope**: First phase is inline novel images only — the user explicitly wants one concrete behavior fixed before any build/runtime cleanup
- **Validation**: Automated and code-level verification matter more than emulator confidence right now — local install/runtime behavior is currently unreliable
- **Compatibility**: Preserve existing novel reader UX such as page order, jump links, and reading settings — this is already working and should not regress
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Summary
- Mobile app built with JavaScript + Flow on React Native, targeting Android and iOS from one shared codebase.
- Main product framing in `README.md`, runtime entry in `index.js`, and app registration in `src/screens/App/Root.js`.
- Project version is `5.3.0` in `package.json`; Android release version is `5.3` / code `404` in `android/app/build.gradle`.
## Core Runtime
- React `16.13.1` and React Native `0.63.5` from `package.json`.
- Shared app bootstrap runs through `src/screens/App/Root.js` and `src/screens/App/App.js`.
- Flow is enabled via `.flowconfig`; there is no TypeScript footprint.
- Metro config is minimal in `metro.config.js`; Hermes is disabled in `android/app/build.gradle`.
## State And Async Stack
- Redux, React Redux, Redux Saga, Redux Persist, Reselect, and Normalizr are the main state-management layers in `package.json`.
- Store setup lives in `src/common/store/configureStore.js`.
- Root reducers live in `src/common/reducers/index.js`.
- Root sagas live in `src/common/sagas/index.js`.
- Entity normalization schemas live in `src/common/constants/schemas.js`.
## Navigation And UI
- Navigation uses React Navigation 5 packages plus `react-native-screens` and material bottom tabs from `package.json`.
- Primary app navigation is composed in `src/navigations/AppNavigator.js` and `src/navigations/AppTabNavigator.js`.
- UI kit is mostly `react-native-paper`, `react-native-elements`, `react-native-vector-icons`, and custom `PX*` components under `src/components/`.
- Theming primitives live in `src/styles/index.js` and `src/styles/variables.js`.
## Domain And Content Handling
- Pixiv API access is provided by `pixiv-api-client` through `src/common/helpers/apiClient.js`.
- Novel text parsing uses `pixiv-novel-parser` in `src/common/helpers/novelTextParser.js`.
- PKCE login support uses `react-native-pkce-challenge` through `src/common/helpers/pkce.js`.
- NSFW/equb reader behavior is primarily expressed in the shared detail and reader screens under `src/screens/Shared/`.
## Device, Storage, And Media
- Persistence uses `@react-native-community/async-storage` and `redux-persist-filesystem-storage`.
- File export/import and backup flows use `rn-fetch-blob` in `src/screens/MyPage/Backup.js`.
- Image saving, sharing, photo viewing, and web views rely on packages such as `react-native-share`, `react-native-photo-view-ex`, and `react-native-webview`.
- Animated Pixiv ugoira playback has a custom Android native view under `android/app/src/main/java/com/utopia/pxviewr/UgoiraView/` and JS wrappers in `src/components/UgoiraView.android.js` and `src/components/UgoiraView.ios.js`.
## Observability And Native Tooling
- Firebase Analytics, Crashlytics, Realtime Database, and Performance Monitoring are installed via `@react-native-firebase/*` packages in `package.json`.
- Android applies Google services, Crashlytics, and Firebase Perf plugins in `android/app/build.gradle`.
- Runtime Firebase toggles are declared in `firebase.json`.
- Android debug memory tooling includes LeakCanary in `android/app/build.gradle` and `android/app/src/main/java/com/utopia/pxviewr/MainApplication.java`.
- Flipper is enabled for debug builds in `android/app/src/debug/java/com/utopia/pxviewr/ReactNativeFlipper.java`.
## Build And Repo Tooling
- Package manager is npm with lockfile `package-lock.json`.
- Main scripts are in `package.json`: `start`, `android`, `ios`, `android-bundle`, `pod-install`, `lint`, and `test`.
- Linting is ESLint + Airbnb + Prettier via `.eslintrc` and the `lint` script in `package.json`.
- Jest is configured inline in `package.json`.
- iOS native workspace/project files live under `ios/` and `PxView.xcworkspace/`.
## Notable Checked-In Artifacts
- Android release/debug bundle artifacts are committed in `android/app/src/main/assets/index.android.bundle` and `android/app/src/main/assets/index.android.bundle.meta`.
- Android debug keystore material exists in `android/app/debug.keystore` and `android/keystores/debug.keystore.properties`.
- Screenshot and marketing assets are committed under `screenshots/`, `src/images/`, and `donations/`.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Language And Style
- JavaScript is the dominant language; Flow annotations appear in some shared infrastructure files such as `src/common/store/getStoredStateMigrateToFileSystemStorage.js`.
- Formatting/style rules are enforced through Airbnb + hooks + Prettier in `.eslintrc`.
- Single quotes and trailing commas are preferred per `.eslintrc`.
- JSX lives in `.js` files rather than `.jsx`.
## Redux Slice Pattern
- Feature slices usually follow a repeatable trio:
- Action constants are generated with `redux-define` in `src/common/constants/actionTypes.js`.
- Request lifecycles commonly use `.REQUEST`, `.SUCCESS`, `.FAILURE`, with optional `.CLEAR`, `.CLEAR_ALL`, `.ADD`, `.REMOVE`, `.SET`, or `.RESTORE`.
- Reducers usually keep `loading`, `loaded`, `refreshing`, `items`, pagination, and timestamps.
## Entity And Selector Conventions
- Network responses are normalized before storage, then denormalized in selectors.
- Shared entities are merged into `src/common/reducers/entities.js`.
- Selector factories are preferred for route-bound data needs, using names like `makeGetUserIllustsItems` in `src/common/selectors/index.js`.
- Memoization is customized with shallow equality and domain-specific comparisons in `src/common/selectors/index.js`.
## UI Composition
- Route screens live under `src/screens/`.
- Reusable presentational pieces live under `src/components/`.
- Connected wrappers and modal bridges live under `src/containers/`.
- The codebase mixes class components and function components; newer/simple surfaces often use hooks while older screens remain class-based.
- The custom `PX*` component family acts as an internal design system, for example `src/components/PXImage.js`, `src/components/PXTouchable.js`, and `src/components/PXSearchBar.js`.
## Localization And Theme
- Localization is context-driven through `src/components/Localization/LocalizationProvider.js` and `src/components/Localization/connectLocalization.js`.
- Screens/components commonly expect injected `i18n` and `lang` props rather than importing strings directly.
- Theme colors are read from React Native Paper and shared style helpers in `src/styles/index.js`.
- Global string catalogs are JSON-based under `src/common/constants/strings/`.
## Persistence Conventions
- Important user-state slices are whitelisted in `src/common/store/configureStore.js`.
- Manual backup/restore only covers selected settings/history slices, also in `src/screens/MyPage/Backup.js`.
- Migrations are handled in store setup instead of separate migration modules per slice.
## Error Handling
- Network sagas usually catch exceptions, dispatch a local failure action, then dispatch `addError(...)`, for example `src/common/sagas/recommendedIllusts.js`.
- Some UI flows swallow errors with empty catches, notably `src/screens/MyPage/Backup.js`.
- Console noise is disabled in production in `src/screens/App/Root.js`.
## Naming And File Organization
- Files are predominantly PascalCase for components/screens and camelCase for common modules.
- Constants use upper snake case in `src/common/constants/actionTypes.js`.
- Platform-specific component splits use suffixes like `.android.js` and `.ios.js`, for example `src/components/UgoiraView.android.js`.
- Legacy and current navigation code coexist; active navigation is in `src/navigations/*.js`, while `src/navigations/routeConfigs/` looks partially historical.
## Repeated Implementation Patterns
- Many feature sagas are near-clones with different Pixiv endpoints.
- Many reducers share the same request-success-failure shape.
- Screens often own direct navigation-header configuration and view-specific side effects.
- This repetition makes the codebase easy to pattern-match, but expensive to update globally.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## High-Level Shape
- This is a classic React Native monolith: one mobile app, one shared JS codebase, thin native shells in `android/` and `ios/`.
- App bootstrap is `index.js` -> `src/screens/App/Root.js` -> `src/screens/App/App.js`.
- The app chooses between authenticated and unauthenticated navigation trees based on Redux auth state in `src/screens/App/App.js`.
## Runtime Boot Sequence
- `src/screens/App/Root.js` creates the Redux store/persistor via `src/common/store/configureStore.js`.
- Providers are layered in this order: Redux `Provider`, localization provider, safe-area provider, then Redux Persist gate.
- `src/screens/App/App.js` waits for both persistence rehydration and navigation initial state before rendering the main tree.
- Splash-screen dismissal is coupled to rehydration in `src/screens/App/App.js`.
## Navigation Model
- Logged-out flow uses `src/navigations/AuthNavigator.js`.
- Logged-in flow uses `src/navigations/AppNavigator.js`.
- `src/navigations/AppNavigator.js` is a native stack whose root screen is `SCREENS.Main`.
- `SCREENS.Main` renders `src/navigations/AppTabNavigator.js`, which defines the bottom-tab shell.
- Tab roots are Recommended, RankingPreview, Trending, NewWorks, and MyPage in `src/navigations/AppTabNavigator.js`.
- Shared detail, reader, comments, search result, and settings screens are pushed above the tab shell in `src/navigations/AppNavigator.js`.
## State And Data Flow
- Data flow is action-driven Redux with saga side effects.
- Action constants are centrally declared in `src/common/constants/actionTypes.js`.
- Action creators live in `src/common/actions/`.
- Side effects live in `src/common/sagas/`.
- Persistent and request-state reducers live in `src/common/reducers/`.
- Screens and containers consume denormalized selector output from `src/common/selectors/index.js`.
## Entity Pipeline
- Pixiv responses are normalized with Normalizr in sagas such as `src/common/sagas/recommendedIllusts.js`.
- Shared entity stores live in `src/common/reducers/entities.js`.
- Per-screen/per-query reducers keep ordered IDs, loading flags, timestamps, and pagination cursors.
- Selectors denormalize entities back into render-friendly shapes and apply user-specific filters such as mute/highlight in `src/common/selectors/index.js`.
## Authentication And Session Lifecycle
- Auth is PKCE-based web login initiated from `src/screens/Auth/Auth.js`.
- The login web view returns an auth code handled by `src/screens/Auth/Login.js`.
- Token exchange, refresh, and logout orchestration live in `src/common/sagas/auth.js`.
- Rehydration kicks off token refresh before the rest of the app proceeds in `src/common/sagas/auth.js`.
- Auth state is persisted as part of the Redux root persist config in `src/common/store/configureStore.js`.
## Persistence And Rehydration
- The store persists selected slices to filesystem storage, not just AsyncStorage, in `src/common/store/configureStore.js`.
- There is an explicit migration path from older AsyncStorage-based persists in `src/common/store/getStoredStateMigrateToFileSystemStorage.js`.
- Rehydration is coordinated with auth refresh and language reset in `src/common/sagas/auth.js`.
- Additional manual backup/restore for user settings is separate from redux-persist and lives in `src/screens/MyPage/Backup.js`.
## UI Layering
- `src/screens/` holds route-level screens.
- `src/containers/` contains connected or semi-connected feature wrappers reused by screens.
- `src/components/` contains reusable presentational and low-level widgets, including the `PX*` component family.
- Theming and global styles are centralized in `src/styles/`.
- Localization is provided through context wrappers in `src/components/Localization/`.
## Native Boundaries
- Native Android app host code is in `android/app/src/main/java/com/utopia/pxviewr/`.
- The main custom bridge is the Android ugoira image player under `android/app/src/main/java/com/utopia/pxviewr/UgoiraView/`.
- JS talks to that bridge via `src/components/UgoiraView.android.js`.
- iOS currently relies on stock React Native host wiring plus project-specific app delegate files under `ios/PxViewR/`.
## Notable Architectural Traits
- The architecture is highly slice-oriented: many near-identical action/reducer/saga modules for each Pixiv resource family.
- Business logic is still close to the UI in several places, especially screens such as `src/screens/MyPage/Feedback.js` and `src/screens/MyPage/Backup.js`.
- There is no explicit service layer beyond helper modules like `src/common/helpers/apiClient.js`.
- The app favors pragmatic shared-state reuse over strict feature isolation.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
