# Architecture

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
