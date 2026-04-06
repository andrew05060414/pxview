# Mac Release APK 构建流程（2026-04-06）

在 macOS（Apple Silicon）上为 pxview 生成可正常使用的 release APK 的最短路径。
跑通过一次后，下次直接照这个流程走即可。

---

## 工具链前置（一次性）

按用户偏好分工，每个版本管理器只管一类运行时：

| 工具 | 职责 | 本项目需要的版本 |
|---|---|---|
| `fnm` | Node 版本 | Node **16**（`fnm install 16`） |
| `SDKMAN` | Java/JDK 版本 | Java **11**（`sdk install java 11.0.30-tem`） |
| `brew` | CLI 工具本体 | — |
| Android SDK | `~/Library/Android/sdk` | Build-tools 29+，NDK 26.x |

> RN 0.63 + AGP 3.5 不能用更新的 Node/Java —— Node 16 和 Java 11 是硬要求。

---

## 项目级一次性修复（已经做过，不会再丢）

这些已经提交到 git，新机器上只要保留这些就行：

1. **`android/app/build.gradle`**
   - 删掉硬编码的 Windows node 路径 `nodeExecutableAndArgs`
   - 加 `packagingOptions { doNotStrip "**/*.so" }`（保险）
2. **`android/gradle.properties`**
   - 加 `org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g`（防 OOM）
3. **`android/app/google-services.json`**
   - `.gitignore` 排除，但仓库历史里有占位版本，可从 `git show 9d054cc:android/app/google-services.json` 恢复
   - `package_name` 必须等于 `com.utopia.pxviewr`

---

## 每次重装依赖后必做的两件事

### 1) 安装依赖

```bash
eval "$(fnm env)" && fnm use 16
npm ci --legacy-peer-deps
```

> 必须 `--legacy-peer-deps`，否则 ERESOLVE。

### 2) 应用 node_modules 补丁（AndroidX 修复）

老库混用 `android.support.*` 和旧版本号，必须改成 AndroidX。复制下面这一段直接跑：

```bash
cd /Users/andrewwang/Code/pxview

# react-native-photo-view-ex
sed -i '' "s/implementation 'me.relex:photodraweeview:1.1.3'/implementation project(':photodraweeview')/" \
  node_modules/react-native-photo-view-ex/android/build.gradle
sed -i '' 's/android.support.annotation.IntDef/androidx.annotation.IntDef/' \
  node_modules/react-native-photo-view-ex/android/src/main/java/io/amarcruz/photoview/ImageEvent.java
sed -i '' 's/android.support.annotation.NonNull/androidx.annotation.NonNull/' \
  node_modules/react-native-photo-view-ex/android/src/main/java/io/amarcruz/photoview/PhotoView.java

# react-native-share
sed -i '' 's/android.support.v4.content.FileProvider/androidx.core.content.FileProvider/g' \
  node_modules/react-native-share/android/src/main/java/cl/json/RNShareFileProvider.java
sed -i '' 's/android.support.annotation.Nullable/androidx.annotation.Nullable/g' \
  node_modules/react-native-share/android/src/main/java/cl/json/RNShareModule.java
sed -i '' 's/android.support.annotation.NonNull/androidx.annotation.NonNull/g' \
  node_modules/react-native-share/android/src/main/java/cl/json/RNSharePathUtil.java
sed -i '' 's/android.support.v4.content.FileProvider/androidx.core.content.FileProvider/g' \
  node_modules/react-native-share/android/src/main/java/cl/json/RNSharePathUtil.java
sed -i '' 's/android.support.v4.content.CursorLoader/androidx.loader.content.CursorLoader/g' \
  node_modules/react-native-share/android/src/main/java/cl/json/RNSharePathUtil.java
# 注意：版本号别误替换
sed -i '' "s/androidx.appcompat:appcompat:\${safeExtGet('supportLibVersion', '28.0.0')}/androidx.appcompat:appcompat:1.0.0/" \
  node_modules/react-native-share/android/build.gradle

# react-native-localization
GRADLE_FILE="node_modules/react-native-localization/android/build.gradle"
sed -i '' 's/compileSdkVersion [0-9]*/compileSdkVersion 29/' "$GRADLE_FILE"
sed -i '' 's/buildToolsVersion "[^"]*"/buildToolsVersion "29.0.2"/' "$GRADLE_FILE"
sed -i '' 's/targetSdkVersion [0-9]*/targetSdkVersion 29/' "$GRADLE_FILE"
sed -i '' 's/compile /implementation /g' "$GRADLE_FILE"
```

> 长期建议：用 `patch-package` 把这些固化到仓库里，省得每次手动跑。

---

## NDK 26 toolchain 兼容垫片（一次性）

AGP 3.5 的 `stripDebugSymbols` 任务找老版 GCC 前缀（如 `arm-linux-androideabi-strip`），
NDK 26 已经全面切到 LLVM，没有这些前缀。**禁用 strip 任务会导致 APK 里没有 .so，
启动卡死在加载页**。正确做法是建符号链接把旧前缀指向 `llvm-strip`：

```bash
NDK="$HOME/Library/Android/sdk/ndk/26.1.10909125"
LLVM_BIN="$NDK/toolchains/llvm/prebuilt/darwin-x86_64/bin"

for arch in arm-linux-androideabi aarch64-linux-android \
            x86-64-linux-android x86_64-linux-android \
            i686-linux-android x86-linux-android; do
  TARGET="$NDK/toolchains/$arch-4.9/prebuilt/darwin-x86_64/bin"
  mkdir -p "$TARGET"
  ln -sf "$LLVM_BIN/llvm-strip" "$TARGET/$arch-strip"
  ln -sf "$LLVM_BIN/llvm-objcopy" "$TARGET/$arch-objcopy"
done
```

> 升级 NDK 后要重做一遍。注意 `x86-64-linux-android` 和 `x86_64-linux-android` 都要建，AGP 两种命名都查。

---

## 构建命令

```bash
cd /Users/andrewwang/Code/pxview/android

eval "$(fnm env)" && fnm use 16
source "$HOME/.sdkman/bin/sdkman-init.sh" && sdk use java 11.0.30-tem
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

./gradlew :app:assembleRelease --no-daemon \
  -PPXVIEWR_RELEASE_STORE_FILE="$HOME/.android/debug.keystore" \
  -PPXVIEWR_RELEASE_STORE_PASSWORD=android \
  -PPXVIEWR_RELEASE_KEY_ALIAS=androiddebugkey \
  -PPXVIEWR_RELEASE_KEY_PASSWORD=android
```

产物：`android/app/build/outputs/apk/release/app-release.apk`

---

## 健康检查（必做）

```bash
APK=android/app/build/outputs/apk/release/app-release.apk

# .so 数量应在 ~100 左右
unzip -l "$APK" | grep -c "\.so$"

# 应该看到 4 个 ABI
unzip -l "$APK" | grep "lib/" | awk '{print $4}' | awk -F/ '{print $2}' | sort -u

# 大小应在 30MB+，10MB 以下基本就是 native libs 没打进去
ls -lh "$APK"
```

**正常值**：~34MB / 100 个 .so / 4 个 ABI（arm64-v8a, armeabi-v7a, x86, x86_64）。
低于这个就别装了，必然卡在启动加载页。

---

## 常见坑速查

| 现象 | 原因 | 解决 |
|---|---|---|
| `npm ci` ERESOLVE | 新 npm 严格 peer dep | 加 `--legacy-peer-deps` |
| `Could not find me.relex:photodraweeview:1.1.3` | 远端包失效 | 已通过 `:photodraweeview` 本地 module 解决（仓库自带） |
| `Could not find androidx.appcompat:appcompat:28.0.0` | sed 把版本号也替换了 | 见上面 react-native-share 补丁 |
| `No matching client found for package name` | google-services.json 缺失或包名错 | 从 `git show 9d054cc:android/app/google-services.json` 恢复 |
| `No toolchains found ... arm-linux-androideabi` | NDK 26 没有旧前缀 | 建符号链接（见上） |
| `Could not initialize class org.codehaus.groovy.vmplugin.v7.Java7` | Java 21 太新 | `sdk use java 11.0.30-tem` |
| `Java heap space` (packageRelease) | gradle.properties 没设 heap | 已加 `-Xmx4g` |
| 装上后卡在启动加载页 | APK 里没 .so | 走健康检查；几乎都是 strip 任务被错误地"禁用"了 |

---

## 关键教训

1. **不要 `task.enabled = false` strip 任务** —— 它在 native libs 流水线上，禁掉它 .so 就消失了。
   要做也只能"替换为复制操作"或者"修复 toolchain"。本流程选了后者（更干净）。
2. **APK 大小是廉价的健康指标** —— 这个项目正常 release 是 ~34MB，10MB 几乎一定是坏的。
3. **debug 卡顿是正常的** —— LeakCanary + Flipper + `__DEV__` + 未优化 bundle，
   性能比 release 差很多。日常用一定要装 release。
