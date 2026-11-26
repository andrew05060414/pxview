# Project: PxViewR v6.0.0 Dual-Platform (Android + iOS)

## Architecture
- **Framework**: React Native `0.87.1` (New Architecture / Fabric / TurboModules + Hermes) with React `19.2.3`.
- **Android Project**: `android/` (Gradle 9.4.1, JDK 21, `compileSdk 37`, `targetSdk 36`, `minSdk 24`, `NDK 27.1.12297006`, Edge-to-Edge enabled, formal package `com.utopia.pxviewr`, `versionName 6.0.0`, `versionCode 600`).
- **iOS Project**: `ios/PxViewR.xcworkspace` (Swift `AppDelegate` with `RCTReactNativeFactory`, `RNBootSplash`, CocoaPods static frameworks, deployment target iOS 15.1+, Bundle ID `com.utopia.pxviewr`, `MARKETING_VERSION 6.0.0`, `CURRENT_PROJECT_VERSION 600`).
- **Networking & Storage**: Built-in native `fetch`-based `src/common/helpers/pixivApiClient.js` (zero `axios 0.21`), all image requests enforce `https://www.pixiv.net` Referer, gallery saves use `@react-native-camera-roll/camera-roll` v7 (Android MediaStore + iOS PhotoKit), and `UgoiraView.js` provides unified pure-JS frame playback across both platforms.
- **Firebase Defensive Guard**: Real Firebase config (`android/app/google-services.json`, `ios/PxViewR/GoogleService-Info.plist`) stays gitignored. Missing or placeholder configs automatically deactivate Firebase Analytics/Crashlytics/Perf collection natively and in JS (`src/common/helpers/firebase.js`).

## Toolchain Baseline (v6.0.0 — 2026-11-25)

| Component | Version | Notes |
|---|---|---|
| React Native / React | `0.87.1` / `19.2.3` | New Architecture + Hermes enabled |
| Node.js | `24.x` (`>= 22.11.0`) | Strict `npm ci`, zero `--legacy-peer-deps`, zero `jetify`, zero `patch-package` |
| Android JDK / Gradle / NDK | JDK 21 / Gradle 9.4.1 / NDK 27.1.12297006 | `compileSdk 37`, `targetSdk 36`, `minSdk 24`, Edge-to-Edge |
| iOS Xcode / CocoaPods | Xcode 27.2 / CocoaPods 1.17+ | Swift `AppDelegate`, static frameworks, iOS 15.1+ |
| Jest Test Gate | Jest `29.7.0` (`@react-native/jest-preset`) | 48 suites / 279 tests passing (`node scripts/jest-gate.js`) |

## Build & Verification Commands
- Install dependencies: `npm ci`
- Verify lockfile consistency: `npm run verify:dependencies`
- Run full Jest gate: `npm run test:gate`
- Build Android Release APK: `scripts/build-android-release.ps1` (Windows) or `sh scripts/build-android-release.sh` (macOS/Linux)
- Build iOS Simulator (unsigned): `cd ios && pod install && cd .. && sh scripts/build-ios-release.sh`
