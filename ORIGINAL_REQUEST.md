# Original User Request

## Initial Request — 2026-08-30T17:57:59Z

Enable complete iOS platform support for PxViewR (React Native 0.63.5 Pixiv client), resolving all native build toolchain issues, permissions, CocoaPods dependencies, and build scripts with minimal friction so that the app builds cleanly and all features (novel reader enhancements, AI aesthetic/taste scoring, bookmark sync, search upgrades, camera roll saving, and export) work seamlessly on iOS.

Working directory: `/Users/andrewwang/Code/pxview`
Integrity mode: development

## Requirements

### R1. Native iOS Build Toolchain & CocoaPods Modernization
- Update `ios/Podfile` and build settings for compatibility with modern macOS / Xcode:
  - Upgrade minimum iOS deployment target (iOS 12.0+ / 13.0).
  - Disable or safely configure legacy Flipper for iOS to prevent C++ header/folly build failures.
  - Configure architecture settings and pod post-install hooks for Apple Silicon (arm64) and Simulator builds.
  - Implement defensive initialization in `ios/PxViewR/AppDelegate.m` and/or provide a placeholder `GoogleService-Info.plist` to prevent fatal Firebase startup crashes when configuration files are missing.

### R2. Native Permissions & iOS Sandbox Capabilities
- Update `ios/PxViewR/Info.plist`:
  - Add `NSPhotoLibraryUsageDescription` and `NSPhotoLibraryAddUsageDescription` to enable image saving via CameraRoll (`@react-native-community/cameraroll`).
  - Add `UIFileSharingEnabled` and `LSSupportsOpeningDocumentsInPlace` so exported CSV/JSON bookmarks in `DocumentDir` can be accessed via the iOS Files app.

### R3. iOS Build & Bundling Scripts
- Create standalone helper scripts in `scripts/`:
  - `bundle-ios-release.sh`: Pre-bundle iOS JavaScript bundle (`main.jsbundle`) using Metro.
  - `build-ios-debug.sh` / `build-ios-release.sh`: Clean and build `.app` / test build via `xcodebuild`.
  - Maintain parity and conventions matching the existing Android build scripts.

### R4. Cross-Platform Feature Alignment & Pragmatic Fixes
- Ensure all business features work consistently across iOS and Android without regressions:
  - Novel reader: inline image rendering, aspect ratio calculation, draggable vertical scroll indicator, reading position memory.
  - Bookmarks & AI: local bookmark sync engine, OpenAI LLM settings client, AI aesthetics/taste scoring, CSV/JSON export with Share Sheet.
  - Search & Works: Popularity sort, AI filter, works swipe tabs.
  - Use existing community solutions and minimal safe modifications rather than over-engineering or unnecessary rewrites.

## Acceptance Criteria

### Automated & Toolchain Verification
- [ ] `pod install` in `ios/` executes successfully without dependency errors.
- [ ] iOS JS bundle script (`scripts/bundle-ios-release.sh` or equivalent) generates a valid `main.jsbundle`.
- [ ] Project compiles via `xcodebuild` (Simulator or Generic iOS target) without fatal compiler or linker errors.
- [ ] All existing Jest unit tests pass (`npm test` / `sh ./scripts/test-jest.sh`).

### Runtime & Permissions Verification
- [ ] App initializes cleanly without crashing on Firebase startup when `GoogleService-Info.plist` is absent or default.
- [ ] Photo saving flow requests and handles iOS photo library permissions properly.
- [ ] Bookmark export generates files accessible in `DocumentDir` and triggers the system share sheet.
- [ ] Novel reader displays inline images and tracks reading progress as expected.
