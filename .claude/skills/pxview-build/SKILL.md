---
name: pxview-build
description: >
  Build workflow for the pxview React Native 0.63.5 Android app. Use this skill
  whenever the user wants to: build a debug or release APK, set up the Android build
  environment, run Jest tests, install to a device, debug a build failure, or understand
  the known pitfalls of this specific project's build chain. Trigger on phrases like
  "build the app", "compile APK", "install on device", "run tests", "build failing",
  "how do I test this", or any mention of Gradle, Metro, or ADB in this project.
---

# pxview Build & Test Workflow

React Native 0.63.5 Android app. Build chain is fragile — this skill encodes every known pitfall so you don't re-discover them.

## Environment Setup

Set these before every Gradle or Metro command:

```powershell
$env:ANDROID_HOME    = 'C:\Users\Andrew\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:JAVA_HOME       = 'C:\Program Files\OpenLogic\jdk-11.0.27.6-hotspot'
$env:GRADLE_USER_HOME = 'D:\Andrew\Code\Andrew\pxview\.gradle-user-home'
```

**Always use Node v14 for JS operations** (system Node breaks Metro):
```powershell
# Node binary
'C:\Users\Andrew\AppData\Roaming\nvm\v14.21.3\node.exe'
# npm
'C:\Program Files\nodejs\npm.cmd'
```

First-time or clean install:
```powershell
& 'C:\Program Files\nodejs\npm.cmd' ci --legacy-peer-deps
```

---

## Known Build Pitfalls (Already Fixed — Don't Re-solve)

### 1. `photodraweeview` sub-project missing
**Symptom:** `Project with path ':photodraweeview' could not be found`  
**Status:** Fixed in git. `android/photodraweeview/` source restored and `android/settings.gradle` includes:
```gradle
include ':photodraweeview'
project(':photodraweeview').projectDir = new File(rootProject.projectDir, 'photodraweeview')
```
If this reappears, restore from commit `22fb606`.

### 2. `maven.google.com` / `jcenter()` connection timeout (CN network)
**Symptom:** `Could not GET 'https://maven.google.com/...' — Connection timed out`  
**Status:** Fixed via Aliyun mirror init script at `.gradle-user-home/init.d/mirrors.gradle`. If Gradle ever runs from a different `GRADLE_USER_HOME`, recreate this file:
```gradle
allprojects {
    buildscript {
        repositories {
            maven { url 'https://maven.aliyun.com/repository/google' }
            maven { url 'https://maven.aliyun.com/repository/jcenter' }
            maven { url 'https://maven.aliyun.com/repository/central' }
            maven { url 'https://maven.aliyun.com/repository/public' }
        }
    }
    repositories {
        maven { url 'https://maven.aliyun.com/repository/google' }
        maven { url 'https://maven.aliyun.com/repository/jcenter' }
        maven { url 'https://maven.aliyun.com/repository/central' }
        maven { url 'https://maven.aliyun.com/repository/public' }
    }
}
```

### 3. Gradle's built-in JS bundler uses wrong Node → Metro crash
**Symptom:** `TypeError: Cannot read properties of undefined (reading 'transformFile')` in `bundleReleaseJsAndAssets`  
**Fix:** Pre-bundle manually with Node v14, then skip Gradle's bundling step (see Build Process below).

---

## Build Process

### Step 1 — Run Jest first (always)
```powershell
& 'C:\Users\Andrew\AppData\Roaming\nvm\v14.21.3\node.exe' .\node_modules\jest\bin\jest.js --runInBand
```
Ignore duplicate-mock warnings from `.worktrees/` — those are benign. Fix any real test failures before proceeding.

### Step 2 — Pre-bundle JS with Node v14
```powershell
$env:REACT_NATIVE_MAX_WORKERS = '1'
& 'C:\Users\Andrew\AppData\Roaming\nvm\v14.21.3\node.exe' .\node_modules\react-native\cli.js bundle `
  --platform android `
  --dev false `
  --entry-file index.js `
  --bundle-output android\app\src\main\assets\index.android.bundle `
  --assets-dest android\app\src\main\res `
  --max-workers 1
```
`MAX_WORKERS=1` prevents `spawn EPERM` errors on Windows.  
Expected output: `info Done writing bundle output` + `info Done copying assets`.

### Step 3 — Build APK (skip bundling — use pre-built bundle)
```powershell
# Set env vars first (see top of skill)
Set-Location android
.\gradlew.bat assembleRelease --no-daemon `
  "-PPXVIEWR_RELEASE_STORE_FILE=C:/Users/Andrew/.android/debug.keystore" `
  "-PPXVIEWR_RELEASE_STORE_PASSWORD=android" `
  "-PPXVIEWR_RELEASE_KEY_ALIAS=androiddebugkey" `
  "-PPXVIEWR_RELEASE_KEY_PASSWORD=android" `
  -x bundleReleaseJsAndAssets
```

**Output:** `android/app/build/outputs/apk/release/app-release.apk` (~34 MB)  
**Expected:** `BUILD SUCCESSFUL` + `845 actionable tasks: N executed, M up-to-date`

---

## Signing

**Always use the repo's committed keystore** — NOT `~/.android/debug.keystore` (different machine key, causes signature mismatch on install):

```
Keystore: android/app/debug.keystore
Alias:    androiddebugkey
Password: android
SHA-256:  FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C
```

Gradle signing flags:
```
-PPXVIEWR_RELEASE_STORE_FILE=D:/Andrew/Code/Andrew/pxview/android/app/debug.keystore
-PPXVIEWR_RELEASE_STORE_PASSWORD=android
-PPXVIEWR_RELEASE_KEY_ALIAS=androiddebugkey
-PPXVIEWR_RELEASE_KEY_PASSWORD=android
```

**Signature mismatch on install (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`):**
```powershell
adb uninstall com.utopia.pxviewr
adb install android\app\build\outputs\apk\release\app-release.apk
```
Uninstall loses app data but is unavoidable when switching signing keys.

---

## Install & Test on Device

```powershell
adb install -r android\app\build\outputs\apk\release\app-release.apk
```
If signature mismatch error: see Signing section above — uninstall first.

**Test checklist after install:**

| Test | What it verifies |
|------|-----------------|
| App opens, no crash | Build health |
| Login flow completes | Auth / WebView / PKCE |
| Open a novel — images in correct position | Novel inline image fix (must not regress) |
| Kill network → wait for list to fail → restore network → list auto-reloads | Network recovery fix |
| Fold phone → open app → unfold → layout updates | Foldable screen fix |

---

## Debug Tools

**Live logs during test:**
```powershell
adb logcat -s ReactNativeJS:V ReactNative:V
```

**Metro dev server (for JS hot-reload, less stable than APK):**
```powershell
# Terminal 1
npm start

# Terminal 2
npm run android
```
Note: Metro dev mode on this project is less stable than installing an APK. Prefer APK for final validation.

**If build passes but app crashes on open:**
- Check `adb logcat` for the real error — build success ≠ app works
- Look for: Firebase/google-services.json mismatch, WebView init, PKCE verifier
- `android/app/google-services.json` packageName must match `build.gradle` applicationId

---

## Quick Reference: File Locations

| Purpose | Path |
|---------|------|
| Output APK | `android/app/build/outputs/apk/release/app-release.apk` |
| JS bundle (committed) | `android/app/src/main/assets/index.android.bundle` |
| Gradle mirrors init | `.gradle-user-home/init.d/mirrors.gradle` |
| photodraweeview source | `android/photodraweeview/` |
| settings.gradle | `android/settings.gradle` |
| App build.gradle | `android/app/build.gradle` |
| Flipper (debug only) | `android/app/src/debug/java/com/utopia/pxviewr/ReactNativeFlipper.java` |

---

## When JS-Only Changes (No Manifest/Native)

If the change is **only JS** (reducers, sagas, components — no `android/` changes), you can skip Gradle entirely and just re-bundle:

1. Run Step 1 (Jest) + Step 2 (pre-bundle)
2. The committed `index.android.bundle` is updated
3. If you have a previous APK installed, you still need to reinstall — the bundle is baked into the APK, not hot-swapped in release mode

For manifest or native changes (`.java`, `.gradle`, `AndroidManifest.xml`), always do all 3 steps.
