# PXView 调试、验证与 APK 打包流程手册

## 目标

这份文档是给后续继续维护这个老 React Native 项目时直接照着用的。

重点解决 4 件事：

1. 改完代码之后，怎么先做最小验证
2. 遇到问题时，怎么一步步调试
3. 怎么把 debug APK 跑出来给自己测试
4. 什么时候该走完整 Gradle 构建，什么时候可以只重打 JS bundle

---

## 一、先理解这个项目现在的现实情况

这是一个比较老的 React Native `0.63.5` 项目，Android 侧和依赖侧都比较脆。

所以实际开发时要接受两个事实：

1. **功能调试和正式构建是两条相关但不完全相同的链路**
2. **不是每次改动都值得跑完整 native rebuild**

这也是这次能把 novel 图片支持修好的关键：先保证可迭代，再回头补标准构建验证。

---

## 二、推荐工作方式

建议每次都按这个顺序：

1. 在独立分支改代码
2. 先跑 Jest 或最小代码级验证
3. 再决定是否需要 Android 安装验证
4. 如果只是 JS 逻辑改动，优先出 debug 包测试
5. 只有改到 Android 原生层时，才优先追求完整 `assembleDebug` / `assembleRelease`

一句话说：

- **先用最便宜的方法证明改动有效**
- **再用更贵的方法验证整机行为**

---

## 三、环境前提

至少需要这些：

- Node.js：建议继续用之前跑通过的 `v14.21.3`
- Java：JDK 11
- Android SDK
- `adb`
- npm 依赖安装完成

常用环境变量：

```powershell
$env:ANDROID_HOME='C:\Users\Andrew\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:JAVA_HOME='C:\Program Files\OpenLogic\jdk-11.0.27.6-hotspot'
$env:GRADLE_USER_HOME='D:\Andrew\Code\Andrew\pxview\.gradle-user-home'
```

如果是新机器或刚重装依赖，先跑：

```powershell
& "C:\Program Files\nodejs\npm.cmd" ci --legacy-peer-deps
```

这里用 `--legacy-peer-deps` 是因为这个老项目在新 npm 行为下容易触发 peer dependency 冲突。

---

## 四、改完代码后，第一步先怎么验证

### 情况 A：你改的是 JS 逻辑

比如：

- saga
- parser
- Redux
- novel reader 组件
- 登录流程里的 JS 部分

先跑测试，不要一上来就折腾 APK。

推荐命令：

```powershell
& 'C:\Users\Andrew\AppData\Roaming\nvm\v14.21.3\node.exe' .\node_modules\jest\bin\jest.js --runInBand
```

为什么用这个形式：

- 这个项目比较老，直接走系统默认 node/npm 有时会飘
- `--runInBand` 可以减少并发带来的随机问题

如果你只改了小说图片相关，也可以先只跑相关测试文件。

---

### 情况 B：你改的是 Android 原生层

比如：

- `android/app/build.gradle`
- `AndroidManifest.xml`
- Java/Kotlin 文件
- Firebase / WebView / autolinking / native module 连接方式

这种情况下，测试通过还不够，必须最终做一次 Android 构建验证。

---

## 五、小说图片功能这次到底是怎么修好的

这里给你一个以后自己排查时最重要的结论：

### 不要先怀疑渲染器，先确认数据源对不对

这次我们前面绕了很久，最后真正打通的核心是：

- 阅读器本身后来已经“会渲染图片节点”
- 真正的问题是旧数据源拿不到 `uploadedimage` 对应的 metadata

旧链路是：

- `pixiv.novelWebview(...)`
- 依赖旧 `webview` 返回里解析 `novel:` 对象

真正有效的链路是：

- `https://www.pixiv.net/ajax/novel/{id}`
- 使用：
  - `body.content`
  - `body.textEmbeddedImages`

所以以后如果再遇到：

- 裸文本 `[uploadedimage:xxxxx]`
- `Image unavailable`
- 明明识别了标签但拿不到图

第一优先排查的不是 UI，而是：

1. 当前拿正文的接口是不是对的
2. 当前返回里到底有没有 `textEmbeddedImages`
3. 图片 id 和 metadata 是否真的能对上

---

## 六、最实用的调试顺序

以后调 bug，建议按这个顺序来。

### 第 1 步：先确认是“显示问题”还是“数据问题”

把问题分成两类：

1. **数据没拿到**
   - 比如 saga 里就没拿到图片 metadata
2. **数据拿到了但没显示**
   - 比如 URL 存在，但组件渲染/请求失败

这一步一定要先分清，不然会在错误方向上浪费很多时间。

---

### 第 2 步：优先加“可读诊断”，不要盲猜

这次图片问题能解决，不是因为一开始就知道答案，而是不断把 fallback 信息变具体。

以后如果再遇到类似问题，推荐直接在 UI fallback 或日志里显示：

- 当前 source 是 `ajax` 还是 `webview`
- embedded image count
- 上传图 id
- 是否命中 metadata
- 是否拿到 usable URL

核心原则：

- **让失败信息能指导下一步**
- 不要只留一个没信息量的 `Image unavailable`

---

### 第 3 步：能写测试的地方先写测试

这类问题最适合补测试的地方：

- parser
- saga
- helper
- `NovelViewer`
- `NovelInlineImage`

因为这几个点比模拟器稳定得多。

尤其是当项目原生环境很老、调试慢的时候，测试是缩短定位时间的关键。

---

### 第 4 步：再上设备/模拟器验证

只有当代码级行为已经大致可信时，再去装 APK 看实际效果。

你后面验证时，最值得关心的是：

- app 能不能打开
- 登录链路能不能回跳成功
- 小说页能不能正常打开
- 图片是不是出现在作者原文位置
- 出错时会不会把整页弄崩

---

## 七、怎么启动 app 做日常调试

### 方式 1：直接连接 Metro 开发

适合：

- 快速看 UI
- 改 JS 后马上热更新

命令：

```powershell
npm start
```

另开一个终端：

```powershell
npm run android
```

但对这个项目要有心理准备：

- 老项目 + 老依赖 + 旧 Android 侧配置，Metro/开发态有时不稳定
- 如果你只是为了验证某个功能，很多时候直接装 debug APK 更省心

---

### 方式 2：装 debug APK 做真实流程验证

适合：

- 登录
- 打开小说
- 看图
- 检查是否闪退

这是这个项目后期更实用的方式。

---

## 八、怎么出 debug APK

### 标准方式：完整 Gradle 构建

在正常环境里，优先尝试：

```powershell
cd android
$env:ANDROID_HOME='C:\Users\Andrew\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:JAVA_HOME='C:\Program Files\OpenLogic\jdk-11.0.27.6-hotspot'
$env:GRADLE_USER_HOME='D:\Andrew\Code\Andrew\pxview\.gradle-user-home'
.\gradlew.bat assembleDebug --no-daemon
```

产物一般在：

`android/app/build/outputs/apk/debug/app-debug.apk`

---

### 如果完整构建卡住，但你改动主要是 JS

可以走“重打 bundle + 重签名”路径。

这条路的适用前提：

- 你改的是 JS / 资源
- 不是 Android 原生代码

先生成 bundle：

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

这一步当时特别重要，因为旧环境里 Metro worker 容易触发 `spawn EPERM`，所以要把 worker 压到 `1`。

之后再把新的 bundle 注入现有 APK，并重新：

- `zipalign`
- `apksigner`

这条路径不适合作为长期正式发布方案，但非常适合快速验证 JS 功能。

---

## 九、怎么出 release APK

如果是要给自己日常装、尽量像正式包一样用，建议走 release。

最短流程：

```powershell
& "C:\Program Files\nodejs\npm.cmd" ci --legacy-peer-deps

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

产物通常在：

`android/app/build/outputs/apk/release/app-release.apk`

---

## 十、常见坑位

### 1. `MaxPermSize` 这种过时 JVM 参数

这个老项目以前在 `android/gradle.properties` 里带过旧参数。

如果你遇到 Gradle 一启动就炸，先看这里。

---

### 2. Firebase / `google-services.json`

如果 `google-services.json` 是 placeholder，或者包名不匹配，会直接导致：

- 构建失败
- 启动崩溃
- 登录链路异常

重点检查：

- `android/app/google-services.json`
- `android/app/build.gradle` 里的 `applicationId`

两边包名要一致。

---

### 3. AndroidX / 老 support 包混用

这个项目一些老依赖会踩这个坑，特别是 release 构建时。

如果突然遇到某个库编不过，优先怀疑：

- `react-native-photo-view-ex`
- `react-native-share`
- `react-native-localization`

之前已经踩过一轮，这些库是已知易炸点。

---

### 4. Metro / Jest / worktree 路径问题

这个项目一些配置假设 `node_modules` 在 `<rootDir>/node_modules`。

所以如果你在独立 worktree 里直接跑 Jest，可能会遇到：

- Jest transform 找不到
- `react-native/jest/preprocessor.js` not found

这种情况下有两个办法：

1. 在 worktree 里也装一份依赖
2. 或者回到主仓库根目录去跑测试

对这个项目来说，第二种通常更省心。

---

### 5. 构建能过，但 app 打不开

这时候不要再盯着构建脚本。

先看：

- `adb logcat`
- 登录回跳
- WebView
- PKCE verifier
- Firebase perf / dev support

也就是说：

- **能出包 != app 可用**

这次就是先把“打开就死 / 登录回跳卡住”处理掉，后面图片问题才有机会继续调。

---

## 十一、推荐的日常调试闭环

以后如果你只是继续改这个 app，我建议就用这个闭环：

1. 改代码
2. 先跑 Jest
3. 如果只是 JS 改动，优先出 debug 包
4. 安装到设备/模拟器
5. 实测关键路径
6. 用 `adb logcat` 抓失败点
7. 需要时补诊断文案或测试
8. 功能稳定后，再决定要不要补 release 包

这个闭环比“每次都先硬刚完整 Android 环境”要高效得多。

---

## 十二、这次图片支持最值得记住的经验

只有一句话最值得记：

**先判断是数据源错了，还是渲染错了。**

这次之所以花了不少时间，就是因为表面上看像“图片显示不出来”，但真正决定性的修复其实是：

- 改成优先使用 `ajax/novel/{id}`
- 从 `body.content + body.textEmbeddedImages` 取数据

不是单纯修一个 UI 组件。

---

## 十三、建议你后面再补的东西

如果后续还会长期维护这个项目，最值得做的几件事是：

1. 给 node_modules 侧热修补上 `patch-package`
2. 把常用构建命令整理成脚本
3. 固定 Node / Java / Android SDK 版本
4. 把 debug / release 的最短打包流程再自动化一点

这样你以后就不会再因为“明明改好了，但包出不来”卡很久。

---

## 结论

对这个项目，最实用的策略不是追求一开始就把环境完全现代化，而是：

- 先建立一个能稳定迭代的工作流
- 先把功能做通
- 再逐步把构建链路整理干净

这也是这次我们最终能把 app 跑起来、登录跑通、小说图片显示修好的真正原因。
