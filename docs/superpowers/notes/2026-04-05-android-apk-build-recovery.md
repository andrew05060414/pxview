# Android APK Build Recovery Notes

## Goal

Explain how this old React Native project was brought back to a state where it can produce a testable Android APK again.

## Context

This repository is an old React Native 0.63 project with an old Android toolchain. The original problem was not just "the feature is broken". The project was also hard to package into an installable APK at all.

There were two separate layers of trouble:

1. The project and runtime had old Android and React Native assumptions.
2. The current local sandbox environment was unreliable for full Gradle rebuilds.

The result is that there are two valid build paths:

- a full Gradle build path, which is the real long-term path on a normal machine
- a bundle injection path, which was the stable path used during debugging in this session

## What Had To Be Fixed First

### 1. Gradle startup had old JVM flags

`android/gradle.properties` still contained the old `MaxPermSize` JVM flag. That breaks on modern JDKs.

This had to be removed before Gradle could even get further.

### 2. The app itself needed to stop dying immediately at runtime

Even after packaging improved, the app was not usable until startup was stabilized. The main blockers during this phase were:

- Firebase Performance startup issues when `google-services.json` was placeholder-only
- debug/dev-support paths that still referenced removed perf hooks
- login callback flow needing repair before the app could be used normally

Those runtime fixes were necessary because "APK exists" was not enough. The APK had to open and stay alive.

## Why Full Rebuilds Were Still Painful

Inside the current sandbox, Gradle kept failing with a local socket problem similar to:

`java.net.SocketException: Unrecognized Windows Sockets error: 10106: socket`

That failure was environmental. It was not the novel-image feature itself.

Because of that, repeatedly doing `assembleDebug` was not reliable in this environment.

## The Reliable Packaging Strategy Used Here

The stable path used during this debugging cycle was:

1. Keep one known-good debug APK as a base package.
2. Regenerate the latest React Native Android bundle.
3. Replace `assets/index.android.bundle` inside the APK.
4. Re-align the APK with `zipalign`.
5. Re-sign the APK with the Android debug keystore.

This works well when the changes are mostly JavaScript and bundled assets.

It does not replace a real native rebuild if Java/Kotlin/Gradle/manifest code changes.

## Bundle Generation Command

This command was used because Metro worker spawning also needed to be constrained in the sandbox:

```powershell
$env:REACT_NATIVE_MAX_WORKERS='1'
& 'C:\Users\Andrew\AppData\Roaming\nvm\v14.21.3\node.exe' .\node_modules\react-native\cli.js bundle `
  --platform android `
  --dev false `
  --entry-file index.js `
  --bundle-output android\app\src\main\assets\index.android.bundle `
  --assets-dest android\app\src\main\res `
  --max-workers 1
```

Why this mattered:

- `--max-workers 1` avoided `spawn EPERM` issues in this sandbox
- the output bundle replaced the JS logic inside the APK

## APK Repackaging Flow

The working repackaging flow was:

```powershell
$baseApk = 'D:\Andrew\Code\Andrew\pxview\.worktrees\novel-inline-images\android\app\build\outputs\apk\debug\app-debug-inline-images-html-candidate-fallback-unsigned.apk'
$outDir = 'D:\Andrew\Code\Andrew\pxview\.worktrees\novel-inline-images\android\app\build\outputs\apk\debug'
$newUnsigned = Join-Path $outDir 'app-debug-inline-images-ajax-novel-unsigned.apk'
$newAligned = Join-Path $outDir 'app-debug-inline-images-ajax-novel-aligned.apk'
$newSigned = Join-Path $outDir 'app-debug-inline-images-ajax-novel.apk'

Copy-Item $baseApk $newUnsigned -Force

Push-Location 'D:\Andrew\Code\Andrew\pxview\.worktrees\novel-inline-images\android\app\src\main'
& 'C:\Program Files\OpenLogic\jdk-11.0.27.6-hotspot\bin\jar.exe' uf $newUnsigned assets/index.android.bundle assets/index.android.bundle.meta
Pop-Location

& 'C:\Users\Andrew\AppData\Local\Android\Sdk\build-tools\36.0.0\zipalign.exe' -f 4 $newUnsigned $newAligned

& 'C:\Program Files\OpenLogic\jdk-11.0.27.6-hotspot\bin\java.exe' -jar 'C:\Users\Andrew\AppData\Local\Android\Sdk\build-tools\36.0.0\lib\apksigner.jar' sign `
  --ks 'C:\Users\Andrew\.android\debug.keystore' `
  --ks-key-alias androiddebugkey `
  --ks-pass pass:android `
  --key-pass pass:android `
  --out $newSigned `
  $newAligned

& 'C:\Program Files\OpenLogic\jdk-11.0.27.6-hotspot\bin\java.exe' -jar 'C:\Users\Andrew\AppData\Local\Android\Sdk\build-tools\36.0.0\lib\apksigner.jar' verify --verbose $newSigned
```

## Why This Worked

The novel-image work in this phase was overwhelmingly JavaScript-side:

- parser changes
- saga changes
- viewer changes
- image resolution changes
- fallback/diagnostic text changes

That means replacing the React Native bundle was enough to ship the new behavior into a fresh APK without depending on a full native rebuild every time.

## When You Should Use A Full Gradle Build Instead

Use a real Android rebuild when you change:

- native Android Java or Kotlin
- `AndroidManifest.xml`
- Gradle files
- native libraries
- Firebase or other native dependency wiring

For that case, the intended command is still:

```powershell
cd D:\Andrew\Code\Andrew\pxview\.worktrees\novel-inline-images\android
$env:ANDROID_HOME='C:\Users\Andrew\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:JAVA_HOME='C:\Program Files\OpenLogic\jdk-11.0.27.6-hotspot'
$env:GRADLE_USER_HOME='D:\Andrew\Code\Andrew\pxview\.worktrees\novel-inline-images\.gradle-user-home'
.\gradlew.bat assembleDebug --no-daemon
```

That is the correct long-term route on a normal machine. The bundle injection path was the reliable workaround for this debugging session.

## Practical Summary

The reason APK production became possible again was not a single magic flag. It was a combination of:

- removing obviously obsolete JVM settings
- getting the app back to a runnable state
- accepting that Gradle was unreliable in this sandbox
- shifting to a repeatable "rebundle and resign" workflow for JS-heavy changes

That workflow is the main reason iteration became fast enough to finish the novel-image fix.
