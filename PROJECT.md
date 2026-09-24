# Project: PxViewR iOS Platform Enablement

## Architecture
- **Framework**: React Native 0.63.5 on macOS / iOS.
- **Native iOS Project**: `ios/PxViewR.xcworkspace` managed via CocoaPods.
- **Runtime Environment**: iOS 15.0+ deployment target, arm64 device and simulator support.
- **Cross-Platform Bridge**: React Native Bridge, Objective-C Native Modules (`RNFetchBlob`, `RNDeviceInfo`, `cameraroll`, `RNSentry`, `RNFirebase`).
- **File Sharing & Sandbox**: iOS Sandboxed `DocumentDir` exposed via `UIFileSharingEnabled` and `LSSupportsOpeningDocumentsInPlace`.
- **Packaging & Toolchain**: Metro JS Bundler via Node 14 (`bundle-ios-release.sh`), `xcodebuild` via Xcode 14+ toolchain.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | CocoaPods Modernization | Upgrade Podfile deployment target to 12.0+, disable legacy Flipper C++ pods | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Architecture & Xcode Settings | Configure post_install hooks for arm64 Simulator, bitcode disabled | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Defensive Firebase Startup | Guard `[FIRApp configure]` in `AppDelegate.m` against missing plist | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Firebase SDK Configuration | Keep platform SDK config in local, gitignored files and include the iOS plist in the app target | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Photo Library Permissions | Add `NSPhotoLibraryUsageDescription` & `NSPhotoLibraryAddUsageDescription` in `Info.plist` | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Files App Document Sharing | Add `UIFileSharingEnabled` & `LSSupportsOpeningDocumentsInPlace` in `Info.plist` | M2 | ORIGINAL_REQUEST §R2 |
| 7 | iOS Release Bundling Script | Create `scripts/bundle-ios-release.sh` using Metro and Node 14 | M3 | ORIGINAL_REQUEST §R3 |
| 8 | iOS Debug Build Script | Create `scripts/build-ios-debug.sh` for simulator testing via `xcodebuild` | M3 | ORIGINAL_REQUEST §R3 |
| 9 | iOS Release Build Script | Create `scripts/build-ios-release.sh` for release testing via `xcodebuild` | M3 | ORIGINAL_REQUEST §R3 |
| 10 | Novel Reader Cross-Platform | Inline image rendering, aspect ratio, draggable indicator, reading memory | M4 | ORIGINAL_REQUEST §R4 |
| 11 | Bookmark Sync & AI Client | Local bookmark sync, OpenAI client, AI aesthetics/taste scoring, CSV/JSON export | M4 | ORIGINAL_REQUEST §R4 |
| 12 | Search & Works UI Alignment | Popularity sort preview, AI filter, works swipe tabs | M4 | ORIGINAL_REQUEST §R4 |
| 13 | Full Toolchain & E2E Validation | Run `pod install`, bundle generation, `xcodebuild` build, and Jest test suite | M5 | ORIGINAL_REQUEST §Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Native iOS Build Toolchain & CocoaPods Modernization | `ios/Podfile`, `project.pbxproj`, `AppDelegate.m`, `ios/GoogleService-Info.plist` | None | DONE |
| M2 | Native Permissions & iOS Sandbox Capabilities | `ios/PxViewR/Info.plist` (Photo & File sharing permissions) | M1 | DONE |
| M3 | iOS Build & Bundling Scripts | `scripts/bundle-ios-release.sh`, `scripts/build-ios-debug.sh`, `scripts/build-ios-release.sh` | M1, M2 | DONE |
| M4 | Cross-Platform Feature Alignment & Pragmatic Fixes | `src/` novel reader, AI/bookmarks, search, unit test suite verification | None | PLANNED |
| M5 | End-to-End Verification & Toolchain Compilation | Full build & test pipeline execution (`pod install`, bundle, `xcodebuild`, Jest) | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### `ios/Podfile` ↔ `xcodebuild`
- Deployment Target: `15.0` across all CocoaPods targets.
- Header search paths: React core headers resolve without Flipper C++ dependencies.
- Plist references: `GoogleService-Info.plist` resolved at `ios/GoogleService-Info.plist`.

### `src/components/HOC/enhanceSaveImage.js` ↔ `ios/PxViewR/Info.plist`
- `CameraRoll.save` expects `NSPhotoLibraryUsageDescription` and `NSPhotoLibraryAddUsageDescription` present in `Info.plist`.

### `src/components/CollectionExportSection.js` ↔ iOS Files App
- Files saved in `dirs.DocumentDir/pxviewr/export/` accessible via Files app under "On My iPhone / PxView R" through `UIFileSharingEnabled` & `LSSupportsOpeningDocumentsInPlace`.

### `scripts/*.sh` ↔ `package.json`
- Scripts invoke Node 14 (`scripts/use-node14.sh`) and React Native CLI single-worker bundling (`REACT_NATIVE_MAX_WORKERS=1`).

## Code Layout
```
ios/
├── Podfile                        # CocoaPods dependencies and post_install hooks
├── GoogleService-Info.plist       # Local Firebase configuration (gitignored)
├── PxViewR/
│   ├── Info.plist                 # Permissions and sandbox flags
│   ├── AppDelegate.m              # App lifecycle and defensive Firebase initialization
│   └── AppDelegate.h
└── PxViewR.xcodeproj/
    └── project.pbxproj            # Xcode build configuration and deployment targets
scripts/
├── bundle-ios-release.sh          # iOS JS bundle generation
├── build-ios-debug.sh             # iOS Simulator debug build
├── build-ios-release.sh           # iOS release build
└── test-jest.sh                   # Jest test runner
src/                               # Cross-platform React Native source
```
