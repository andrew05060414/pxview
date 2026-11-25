---
name: pxview-build
description: Use when building, testing, installing, or debugging the Android or iOS app in this pxview repository, especially when Gradle, CocoaPods, Xcode, Metro, Node 24, JDK 21, signing, or device install behavior is involved.
---

# pxview Build Skill (v6.0.0 / RN 0.87.1)

Use the repo scripts first. Do not hand-type legacy Node 14 / JDK 11 / `jetify` / `--legacy-peer-deps` commands.

## Toolchain Baseline (v6.0.0)

- React Native `0.87.1` / React `19.2.3` (New Architecture + Hermes)
- Node.js `24.x` (`>= 22.11.0`), strict `npm ci` (zero `--legacy-peer-deps`, zero `jetify`, zero `patch-package`)
- Android: JDK 21, Gradle `9.4.1`, `compileSdk 37`, `targetSdk 36`, `minSdk 24`, `NDK 27.1.12297006`, Edge-to-Edge enabled
- iOS: Xcode 26/27+, CocoaPods `1.17+`, iOS `15.1+`, Swift `AppDelegate` (`RCTReactNativeFactory`), static frameworks (`use_frameworks! :linkage => :static`)

## Primary Entry Points

From the repo root on Windows:

```powershell
pwsh -NoLogo -File .\scripts\test-jest.ps1
pwsh -NoLogo -File .\scripts\build-android-debug.ps1
pwsh -NoLogo -File .\scripts\build-android-release.ps1
pwsh -NoLogo -File .\scripts\install-android-release.ps1
```

From the repo root on macOS / Linux:

```sh
sh ./scripts/test-jest.sh
sh ./scripts/build-android-debug.sh
sh ./scripts/build-android-release.sh
sh ./scripts/install-android-release.sh
cd ios && pod install && cd .. && sh ./scripts/build-ios-release.sh
```

## Signing Rule (Android)

Release builds default to the repository keystore so updated APKs overwrite-install cleanly on Andrew's devices:

- `android/app/debug.keystore`
- alias `androiddebugkey`
- password `android`

## Firebase Configs (Gitignored)

- Android: `android/app/google-services.json` (gitignored)
- iOS: `ios/PxViewR/GoogleService-Info.plist` (gitignored)
- When absent or configured with placeholder values, Gradle/Xcode/AppDelegate/JS automatically deactivate Firebase collection without failing builds or spinning telemetry retries.

## CI Workflows

- `.github/workflows/ci.yml`: PR & `main` checks — Jest + lockfile gate (`ubuntu-latest`, Node 24), Android Release APK (`ubuntu-latest`, Node 24 + JDK 21), and unsigned iOS Simulator Release build (`macos-15`, Node 24 + CocoaPods + `xcodebuild`).
- `.github/workflows/android-release.yml`: Release tag / `workflow_dispatch` APK build & GitHub Release attachment.

## Output Paths

- Android Release APK: `android/app/build/outputs/apk/release/app-release.apk`
- Android Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- iOS Simulator build: `ios/build/Build/Products/<Configuration>-iphonesimulator/PxViewR.app`
