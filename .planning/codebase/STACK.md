# Stack

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
