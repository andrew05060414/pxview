# Integrations

## Primary External Service: Pixiv
- All core content fetches and account operations run through `pixiv-api-client` instantiated in `src/common/helpers/apiClient.js`.
- Authentication uses Pixiv's web login flow with PKCE from `src/screens/Auth/Auth.js`, `src/screens/Auth/Login.js`, and `src/common/helpers/pkce.js`.
- Deep-link support accepts Pixiv URLs and the `pixiv://` scheme in `src/screens/App/App.js`.
- Shared content screens such as `src/screens/Shared/Detail.js`, `src/screens/Shared/NovelDetail.js`, and `src/screens/Shared/UserDetail.js` are the main consumers of Pixiv-derived entities.

## Firebase
- Firebase app modules are installed from `@react-native-firebase/app`, `analytics`, `crashlytics`, `database`, and `perf` in `package.json`.
- Android plugin integration is configured in `android/build.gradle` and `android/app/build.gradle`.
- Repo-level Firebase runtime flags live in `firebase.json`.
- `README.md` expects local `google-services.json` in `android/app/` and `GoogleService-Info.plist` in `ios/`; those files are intentionally not checked in.

## Firebase Analytics And Performance
- Navigation screen views are logged from `src/screens/App/App.js`.
- Detail and profile screens emit additional events from `src/screens/Shared/Detail.js`, `src/screens/Shared/NovelDetail.js`, and `src/screens/Shared/UserDetail.js`.
- Firebase Perf is wired at build level through `android/app/build.gradle` and the iOS pods lockfile `ios/Podfile.lock`.

## Firebase Realtime Database
- In-app feedback writes directly to Realtime Database path `feedback` from `src/screens/MyPage/Feedback.js`.
- Captured metadata includes device, locale, app version, and optional email in `src/screens/MyPage/Feedback.js`.
- There is no app-side abstraction layer for feedback writes; the screen talks to Firebase directly.

## Native Platform Integrations
- Custom Android native module/package for ugoira playback is implemented in `android/app/src/main/java/com/utopia/pxviewr/UgoiraView/UgoiraViewPackage.java`.
- JS/native bridge surface for that component is `src/components/UgoiraView.android.js`.
- Android host wiring adds the custom package in `android/app/src/main/java/com/utopia/pxviewr/MainApplication.java`.
- iOS native app lifecycle still uses Objective-C files such as `ios/PxViewR/AppDelegate.m` and `ios/PxViewR/main.m`.

## Device And OS APIs
- Device metadata uses `react-native-device-info` in `src/common/helpers/apiClient.js`, `src/screens/MyPage/Backup.js`, and `src/screens/MyPage/Feedback.js`.
- Locale detection uses `react-native-localization` and `react-native-localize` in `src/common/helpers/i18n.js` and `src/screens/MyPage/Feedback.js`.
- External storage permissions and file IO use `rn-fetch-blob` in `src/screens/MyPage/Backup.js`.
- Photo library access is enabled by `@react-native-community/cameraroll` from `package.json`.

## Web And Sharing Surfaces
- Embedded browser login and likely other web content use `react-native-webview` through `src/components/PXWebView.js` and `src/screens/Auth/Login.js`.
- Share flows depend on `react-native-share` from `package.json`.
- App can interpret Pixiv deep links and URL-based navigation in `src/screens/App/App.js` and `src/components/DetailFooter.js`.

## Persistence And Local Backup
- Redux state persistence uses filesystem-backed storage in `src/common/store/configureStore.js`.
- Legacy persisted state migration is handled in `src/common/store/getStoredStateMigrateToFileSystemStorage.js`.
- User-controlled backup/restore exports JSON files to device storage from `src/screens/MyPage/Backup.js`.

## What Is Not Present
- No custom backend service, REST API, GraphQL endpoint, or webhook receiver is present in this repo.
- No push notification provider, payments SDK, ads SDK, or custom server auth layer is visible.
- No cloud storage abstraction beyond Firebase Realtime Database feedback and device-local filesystem export exists in the current codebase.
