# Release APK 构建交接（2026-04-05）

## 目标

产出可日常使用的 `release` APK（非 debug），避免开发态提示与调试噪音。

---

## 本次产物

- APK 路径：`android/app/build/outputs/apk/release/app-release.apk`
- SHA256：`DE00873E9DF23200B38797F41262C7B5FEC73EFF41908B49BADB842E9FB47212`

---

## 本次构建中遇到的关键阻塞与处理

## 1) 依赖安装与老项目兼容

- `npm ci` 在新 npm 行为下会触发 peer dependency 冲突（`ERESOLVE`）。
- 处理：使用 `npm ci --legacy-peer-deps`。

## 2) `react-native-photo-view-ex` 依赖的 `photodraweeview` 远端包失效

- 报错：`Could not find me.relex:photodraweeview:1.1.3`
- 处理：改为引用仓库内本地 module `:photodraweeview`。

## 3) AndroidX / support 包混用导致 release 编译失败

涉及库：

- `react-native-photo-view-ex`
- `react-native-share`
- `react-native-localization`

处理方向：

- 将 `android.support.*` 导入改为 `androidx.*`
- 将旧 support 依赖改为 AndroidX 依赖
- 将过低的 `compileSdkVersion/buildToolsVersion/targetSdkVersion` 对齐到项目根配置

## 4) Firebase 包名不匹配导致 `processReleaseGoogleServices` 失败

- 报错：`No matching client found for package name 'com.utopia.pxviewr'`
- 处理：`android/app/google-services.json` 的 `package_name` 需与 `applicationId` 一致。

---

## 本次实际改动位置（用于复现）

> 注意：下面改动发生在 `node_modules`，不会自动进入 Git 版本库。  
> 换机器或重新安装依赖后会丢失，需要重新应用或改为 `patch-package` 固化。

## A. `react-native-photo-view-ex`

- `node_modules/react-native-photo-view-ex/android/build.gradle`
  - `implementation 'me.relex:photodraweeview:1.1.3'`
  - -> `implementation project(':photodraweeview')`
- `node_modules/react-native-photo-view-ex/android/src/main/java/io/amarcruz/photoview/ImageEvent.java`
  - `android.support.annotation.IntDef` -> `androidx.annotation.IntDef`
- `node_modules/react-native-photo-view-ex/android/src/main/java/io/amarcruz/photoview/PhotoView.java`
  - `android.support.annotation.NonNull` -> `androidx.annotation.NonNull`

## B. `react-native-share`

- `node_modules/react-native-share/android/src/main/java/cl/json/RNShareFileProvider.java`
  - `android.support.v4.content.FileProvider` -> `androidx.core.content.FileProvider`
- `node_modules/react-native-share/android/src/main/java/cl/json/RNShareModule.java`
  - `android.support.annotation.Nullable` -> `androidx.annotation.Nullable`
- `node_modules/react-native-share/android/src/main/java/cl/json/RNSharePathUtil.java`
  - `android.support.annotation.NonNull` -> `androidx.annotation.NonNull`
  - `android.support.v4.content.FileProvider` -> `androidx.core.content.FileProvider`
  - `android.support.v4.content.CursorLoader` -> `androidx.loader.content.CursorLoader`
- `node_modules/react-native-share/android/build.gradle`
  - 替换 `com.android.support:appcompat-v7` 为 AndroidX 依赖

## C. `react-native-localization`

- `node_modules/react-native-localization/android/build.gradle`
  - `compileSdkVersion/buildToolsVersion/targetSdkVersion` 对齐根项目配置
  - `compile` -> `implementation`

## D. Firebase 配置

- `android/app/google-services.json`
  - `client.android_client_info.package_name` 需与 `android/app/build.gradle` 中 `applicationId` 一致（当前为 `com.utopia.pxviewr`）

---

## 下次在笔记本继续时的最短流程

1. 安装依赖：

```powershell
& "C:\Program Files\nodejs\npm.cmd" ci --legacy-peer-deps
```

2. 应用上述 node_modules 补丁（或先做 `patch-package` 再一键应用）。

3. 确认 Firebase 包名匹配：

- `android/app/google-services.json` -> `package_name`
- `android/app/build.gradle` -> `applicationId`

4. 构建 release：

```powershell
cd android
$env:ANDROID_HOME='C:\Users\Andrew\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:JAVA_HOME='C:\Program Files\OpenLogic\jdk-11.0.27.6-hotspot'
$env:GRADLE_USER_HOME='D:\Andrew\Code\Andrew\pxview\.gradle-user-home'
.\gradlew.bat assembleRelease --no-daemon `
  -PPXVIEWR_RELEASE_STORE_FILE="C:/Users/Andrew/.android/debug.keystore" `
  -PPXVIEWR_RELEASE_STORE_PASSWORD=android `
  -PPXVIEWR_RELEASE_KEY_ALIAS=androiddebugkey `
  -PPXVIEWR_RELEASE_KEY_PASSWORD=android
```

5. 产物位置：

- `android/app/build/outputs/apk/release/app-release.apk`

---

## 建议（后续可做）

为避免每次重装依赖后重复手改 `node_modules`，建议增加：

- `patch-package`
- `postinstall` 自动应用补丁

这样后续在任何机器上都能稳定复现 release 构建链路。

