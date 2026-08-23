---
name: pxview-build
description: Use when building, testing, installing, or debugging the Android app in this pxview repository, especially when Gradle, Metro, Node version, signing, or device install behavior is involved.
---

# pxview Build Skill

Use the repo scripts first. Do not hand-type the old command chain unless a script is missing or broken.

## Primary Entry Points

From the repo root on Windows:

```powershell
pwsh -NoLogo -File .\scripts\test-jest.ps1
pwsh -NoLogo -File .\scripts\bundle-android-release.ps1
pwsh -NoLogo -File .\scripts\build-android-debug.ps1
pwsh -NoLogo -File .\scripts\build-android-release.ps1
pwsh -NoLogo -File .\scripts\install-android-release.ps1
```

From the repo root on macOS / Linux / WSL:

```sh
sh ./scripts/test-jest.sh
sh ./scripts/bundle-android-release.sh
sh ./scripts/build-android-debug.sh
sh ./scripts/build-android-release.sh
sh ./scripts/install-android-release.sh
```

## What Each Script Does

| Script | Purpose |
|--------|---------|
| `scripts/use-node14.ps1` | pins JS tooling to Node v14 |
| `scripts/use-android-jdk11.ps1` | sets Android SDK, JDK 11, and Gradle home |
| `scripts/test-jest.ps1` | runs Jest with the known-good Node binary |
| `scripts/bundle-android-release.ps1` | pre-bundles Android JS with Metro workers forced to 1 |
| `scripts/build-android-debug.ps1` | runs Jest, pre-bundles JS, cleans stale Gradle outputs, then builds Debug APK while skipping Gradle's duplicate Bundle task |
| `scripts/build-android-release.ps1` | runs Jest, pre-bundles JS, cleans stale Gradle outputs, then builds signed release APK while skipping Gradle's duplicate Bundle task |
| `scripts/install-android-release.ps1` | installs the built release APK with `adb install -r` |
| `scripts/use-node14.sh` | pins JS tooling to Node v14 on macOS / Linux / WSL |
| `scripts/use-android-jdk11.sh` | sets Android SDK, JDK 11, and Gradle home on macOS / Linux / WSL |
| `scripts/test-jest.sh` | runs Jest on macOS / Linux / WSL |
| `scripts/bundle-android-release.sh` | pre-bundles Android JS on macOS / Linux / WSL |
| `scripts/build-android-debug.sh` | builds debug APK on macOS / Linux / WSL |
| `scripts/build-android-release.sh` | builds signed release APK on macOS / Linux / WSL |
| `scripts/install-android-release.sh` | installs release APK on macOS / Linux / WSL |

## CI Auto-Build (GitHub Actions)

`.github/workflows/android-release.yml` mirrors the local flow in the cloud:

- Trigger A: publishing a GitHub release -> APK is built and attached to that release
- Trigger B: manual `workflow_dispatch` from the Actions tab -> APK uploaded as a workflow artifact
- Environment: Node 14.21.3 + npm 9 (lockfile v3), JDK 11, `npx jetify`, repo debug keystore signing
- A placeholder `google-services.json` is generated at build time (real one is gitignored)

If the workflow needs changes, keep it in sync with the local scripts' ordering:
jest -> Metro bundle -> placeholder google-services -> `clean` (own invocation) -> `assembleRelease -x bundleReleaseJsAndAssets`.

## Signing Rule

Always sign with the repo keystore:

- `android/app/debug.keystore`
- alias `androiddebugkey`
- password `android`

Do not switch to `C:\Users\Andrew\.android\debug.keystore`. That causes signature mismatch on install.

On macOS / Linux / WSL, if the repo path or keystore path differs, override with:

```sh
export PXVIEW_KEYSTORE_PATH="/absolute/path/to/android/app/debug.keystore"
export PXVIEW_KEY_ALIAS="androiddebugkey"
export PXVIEW_KEYSTORE_PASSWORD="android"
export PXVIEW_KEY_PASSWORD="android"
```

If install fails with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, uninstall first:

```powershell
adb uninstall com.utopia.pxviewr
pwsh -NoLogo -File .\scripts\install-android-release.ps1
```

```sh
adb uninstall com.utopia.pxviewr
sh ./scripts/install-android-release.sh
```

## Known Pitfalls

### Wrong Node version

Symptom:
- Metro bundling crashes
- `transformFile` / React Native bundler errors

Fix:
- always use the repo's `use-node14` script for your platform
- always invoke JS-side tasks through the repo scripts

### CN network / Maven timeout

Symptom:
- Gradle cannot fetch `maven.google.com` / `jcenter()`

Fix:
- keep using the repository-local `.gradle-user-home` created by
  `scripts/use-android-jdk11.ps1`
- set `GRADLE_USER_HOME` explicitly only when a shared cache is needed
- that directory already contains the Aliyun mirror init script

### photodraweeview missing

Symptom:
- `Project with path ':photodraweeview' could not be found`

Fix:
- verify `android/settings.gradle` still includes `:photodraweeview`
- restore from git if removed

### PackageList cannot find symbol after clean

Symptom:
- `:app:compileReleaseJavaWithJavac FAILED`
- `import com.facebook.react.PackageList` — cannot find symbol

Cause:
- In a single `gradlew clean assembleRelease` invocation, javac can run
  before the `clean`/`generatePackageList` ordering settles the generated
  `build/generated/rncli/src/main/java/com/facebook/react/PackageList.java`,
  so the compile source set misses it. Gradle then still finishes the
  remaining independent tasks (writing PackageList.java), so a plain retry
  without `clean` succeeds and hides the problem.

Fix:
- the build scripts run `gradlew clean` in its own invocation before
  `assembleRelease`/`assembleDebug`; keep that split when editing them

### `android.support.annotation does not exist` on a fresh checkout

Symptom:
- `:react-native-photo-view-ex:compileReleaseJavaWithJavac FAILED`
- imports of `android.support.annotation.*` unresolved

Cause:
- pre-AndroidX sources in older RN libs; the local `node_modules` was
  jetified at some point, so only fresh installs (CI) hit it

Fix:
- run `npx jetify` after `npm ci` (package.json also declares it as
  `postinstall`)

### NDK `stripReleaseDebugSymbols` fails on CI runners

Symptom:
- `No toolchains found in the NDK toolchains folder for ABI with prefix: arm-linux-androideabi`

Cause:
- GitHub runners export `ANDROID_NDK_HOME`/`ANDROID_NDK_ROOT` pointing at
  NDK 29+, which removed the legacy toolchain layout AGP 3.5.3 expects;
  `packagingOptions.doNotStrip` alone does not prevent the probe

Fix:
- the CI workflow clears `ANDROID_NDK_HOME`/`ANDROID_NDK_ROOT` in the
  build step env; keep doing that if the step is rewritten

## Verification Sequence

Before claiming success:

1. Run the Jest script for your platform
2. Build the intended APK with the repo script; Debug and Release both pre-bundle JS and skip the duplicate Gradle Bundle task
3. If device testing matters, install and check:
   - app opens
   - login works
   - novel inline images render in-place

## Output Paths

- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK: `android/app/build/outputs/apk/release/app-release.apk`
- JS bundle: `android/app/src/main/assets/index.android.bundle`

## When To Deviate

Only bypass the scripts if:

1. a script itself is failing
2. you are debugging the script
3. you need a one-off Gradle target not covered yet

If you add a repeated manual command twice, promote it into `scripts/` and update this skill.
