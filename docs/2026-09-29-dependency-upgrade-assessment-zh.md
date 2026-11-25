# PxView 依赖升级评估（2026-09-29）

> 性质：评估报告，不包含任何代码改动。
> 目的：回答三个问题——升级到最新依赖要多大 effort、值不值得、建议做到哪一步。第二部分（§7–§10）补充全 AI 开发下的工期、升级 vs 重写、以及上架 Google Play / App Store 的工作量。
> 数据来源：本仓库 `e76aa5c` 的代码 / lockfile / 构建脚本 / CI，`npm view` 查询到的当日最新版本，以及 React Native 官方发布说明与 Google Play / App Store 政策页。
>
> 相关文档：
> - 本文取代 [`superpowers/notes/2026-04-05-dependency-modernization-roadmap-zh.md`](./superpowers/notes/2026-04-05-dependency-modernization-roadmap-zh.md)（旧路线图，保留作历史记录）。
> - 当前（冻结）工具链的日常构建流程见 [`2026-05-17-pxview-debug-build-workflow-zh.md`](./2026-05-17-pxview-debug-build-workflow-zh.md) 与 `.claude/skills/pxview-build/SKILL.md`。

---

## 0. 一句话结论

- **现状**：RN 0.63.5 + React 16.13，发布于 2020 年中，距最新的 RN 0.87.1 差 **24 个 minor 版本、约 6 年**。整个工具链（Node 14 / JDK 11 / AGP 3.5.3 / Gradle 6.2 / compileSdk 29）已全部 EOL，靠 6~7 个 workaround 撑着能编译。
- **Effort**：一次做到位（RN 0.87 + 全部依赖现代化）约 **7–9 个专注人周**；单人兼职配合 AI agent，日历时间大约 **2–3 个月**。
- **值不值得**：**取决于这个 App 还要不要继续维护一年以上。** 要，就值得，且越拖越贵（每年 RN 都在抬门槛，2025-10 起 RN 0.82+ 只支持新架构）。不要，就冻结基线、只补运行时安全项，别半升。
- **建议做到哪一步**：不要做"只升导航 / 只升 Paper"这类局部升级——在 RN 0.63 上收益极低。二选一：
  - **A. 全量升级到 RN 0.87（推荐，若持续维护）**：原生工程按模板重建而非逐版本 diff，JS 侧先在 0.63 上做一周"预迁移"降风险。
  - **C. 冻结不升（若只是维持现状）**：把工具链钉死（`.nvmrc` / Docker 构建镜像），只处理运行时安全依赖，接受它是 legacy 产物。
  - 折中方案：**先只做 Phase 0 + Phase 1（≈1.5 周，全部在 0.63 上可验证）**，把死库和废弃 API 清掉，等有 4–6 周窗口再做原生重建。

---

## 1. 现状快照

### 1.1 代码规模

| 项 | 数值 |
|---|---|
| JS 源文件 | 494 个，约 42k 行（`src/`） |
| 组件形态 | 114 个 class component；32 个文件用 hooks；无 TypeScript、无 Flow 注解（`.flowconfig` 和 `@babel/preset-flow` 是模板残留） |
| 单测 | 40 suites / 227 tests，**全绿**（本次在 Node 22 上跑通，见 §1.4） |
| 自定义原生代码 | Android：`UgoiraView`（272 行 Java，旧架构 `SimpleViewManager`）、`FirebasePerfOkHttpClient` shim、vendored `photodraweeview` 模块；iOS：`AppDelegate.m`（Firebase 防御性初始化）、`SceneDelegate.m` |
| 运行时依赖 | 78 个；devDependencies 25 个 |

### 1.2 工具链及其 workaround（这是升级的真正动因）

| 组件 | 当前 | 状态 |
|---|---|---|
| Node | 14.21.3（`scripts/use-node14.*` 强制） | 2023-04 EOL |
| JDK | 11（`scripts/use-android-jdk11.*`） | RN 0.73+ 要求 17 |
| AGP / Gradle | 3.5.3 / 6.2 | AGP 3.x 无法用于 compileSdk ≥ 31 |
| compileSdk / targetSdk | 29 / 29 | Google Play 自 2026-08-31 起要求 **targetSdk 36** |
| Jetifier | `postinstall: jetify` | 为 pre-AndroidX 的库（photo-view-ex）改字节码 |
| jcenter | 已关闭 → 仓库内 vendored `photodraweeview` + `dependencySubstitution` | 为 photo-view-ex 续命 |
| compileSdk 强制覆盖 | `subprojects.afterEvaluate` 把所有模块压到 29 | 为 `react-native-localization@1.0.12` 等钉死 compileSdk 25 的库 |
| NDK | CI 中 `rm -rf $ANDROID_HOME/ndk*` | AGP 3.5 不认识新 NDK 目录结构 |
| npm | `--legacy-peer-deps` | 多个库的 peer range 已过时 |
| Flipper | 0.87.0（iOS Podfile 已去掉） | RN 0.74 起官方移除 |

每一条单独看都能忍，合在一起意味着：**换一台新机器 / 新 CI runner / 新 Xcode，都有概率再多一条 workaround。** 这套东西现在能跑，是因为有人把坑一个个填过了，而不是因为它稳定。

### 1.3 安全面（`npm audit`，2026-09-29）

```
120 vulnerabilities (8 low, 40 moderate, 54 high, 18 critical)
```

绝大多数在构建期依赖（metro / cli / babel / eslint），对最终 APK 无影响。**真正打进 App 运行时的**：

| 包 | 当前 | 引入方 | 说明 |
|---|---|---|---|
| axios | 0.21.4 | `pixiv-api-client` | 已知 SSRF / 原型污染类 CVE；所有 Pixiv API 请求都走它 |
| qs | 6.9.3 | 直接依赖（26 个文件）+ pixiv-api-client | 原型污染 |
| moment | 2.24.0 | 直接 + pixiv-api-client | ReDoS |
| crypto-js | 3.3.0 | `react-native-pkce-challenge@3` | PBKDF2 弱默认（PKCE 用的是 SHA-256，实际影响有限） |
| form-data / node-fetch 1.x | 旧 | RN 0.63 的 fetch polyfill 链 | 随 RN 升级消失 |
| lodash | 4.17.15 | 多处 | 原型污染 |

结论：安全不是"必须马上升"的理由（App 只与 Pixiv 通信，攻击面小），但 axios 0.21 是里面最值得单独处理的一项。

### 1.4 本次实测

- `npm ci --legacy-peer-deps --ignore-scripts`（Node 22.22 / npm 10.9）：**可安装**，1730 个包。
- `npx jest`（Node 22）：**40/40 suites、227/227 tests 通过**，23 秒。
  → 说明 Node 14 的钉死至少对测试不是硬需求；真正需要 Node 14 的是 Metro 0.59 打包（见 build skill 里的 `transformFile` 崩溃记录）。

---

## 2. 与"最新"的差距：逐包分类

版本为 2026-09-29 `npm view` 结果。

### A. 框架核心（决定一切的层）

| 包 | 当前 | 最新 | 跨度 / 备注 |
|---|---|---|---|
| react-native | 0.63.5 | **0.87.1** | 24 个 minor。0.82+ **只支持新架构**（Fabric/TurboModules），0.87 要求 Node ≥ 22.13、JDK 17、AGP 9、Kotlin 2.0+、compileSdk 37、Xcode 26 |
| react | 16.13.1 | 19.x（随 RN 模板） | class component 仍可用；`componentWillReceiveProps` 仍能跑但有警告 |
| @react-navigation/* | v5 | **v7** | `headerMode` 等 prop 变 option；`material-bottom-tabs` 在 v7 **移出**导航库，改从 `react-native-paper/react-navigation` 引入；`react-native-screens/native-stack`（v2 私有 API，`stackAnimation` / `headerTopInsetEnabled`）→ `@react-navigation/native-stack`。另外 `src/navigations/routeConfigs/*.js`（4 个文件，还在用 v4 的 `screenProps`）、`AppDrawerNavigator.js`、`DrawerContent.js` **没有任何引用，是死代码**，升级前直接删 |
| react-native-paper | 4.7.1 | **5.15.3** | v5 默认 MD3；用 `MD2LightTheme/MD2DarkTheme` 可保持现有外观。仓库用法很浅（`Text` / `withTheme` / `useTheme` / `Button` / `TextInput` 为主，96 个文件），迁移主要是 rename |
| react-native-screens | 2.17.1 | 4.28.0 | 随导航一起换 |
| react-native-safe-area-context | 0.7.3 | 5.10.0 | API 基本兼容 |
| react-native-reanimated | 1.13.2 | **4.7.0** | 业务代码 **0 处直接引用**，只为 drawer / tab-view 服务；v4 需要 `react-native-worklets` + 新架构 |
| react-native-gesture-handler | 1.10.1 | **3.3.0** | 业务代码 0 处直接引用；`RNGestureHandlerEnabledRootView` 在 MainActivity 里要删 |
| react-native-tab-view (+ viewpager-adapter) | 2.15.2 + 1.1.0 | 4.3.2 | v3+ 内置 `react-native-pager-view`，`ViewPagerAdapter`、`ScrollPager` 整段删掉 |

### B. 活跃维护、但跨了多个大版本（改动可控）

| 包 | 当前 → 最新 | 备注 |
|---|---|---|
| @react-native-firebase/* | 11.4 → **26.4** | 5 个文件；iOS 要 `use_frameworks! :linkage => :static`；Perf 在 Android 已被 `react-native.config.js` 禁掉，建议直接删 Perf |
| react-native-webview | 10 → 14 | 小说阅读器用；API 稳定 |
| react-native-device-info | 7 → 15 | 4 个文件 |
| react-native-share | 1 → 12 | 4 个文件 |
| react-native-localize | 1 → 3 | 1 个文件 |
| react-native-zip-archive | 5 → 9 | Podfile 里那段 `RNZipArchive` 编译 flag hack 可删 |
| react-native-vector-icons | 6 → 10（或 `@react-native-vector-icons/*` 分包） | 43 个文件；主要是 import 路径 |
| @react-native-community/netinfo | 6 → 12 | 只被 `react-native-offline` 间接用 |
| react-native-pkce-challenge | 3 → 6 | 1 个文件 |
| redux / react-redux / redux-saga / redux-persist / reselect | 4→5 / 7→9 / 1.1→1.5 / 5→6 / 3→5 | `connect` 和 hooks 都还在；`redux-persist` 6 基本兼容；`reselect` 5 `createSelector` 签名兼容 |
| formik | 1 → 2 | 3 个文件，render-prop → hooks/子组件形式 |
| react-native-linear-gradient / progress / animatable / flash-message / loading-spinner-overlay / modal-datetime-picker | 均有新版 | 小改 |

### C. 改名 / 换组织（必须换包名）

| 旧 | 新 |
|---|---|
| @react-native-community/async-storage 1.9 | **@react-native-async-storage/async-storage** 3.1 |
| @react-native-community/cameraroll 4.1 | **@react-native-camera-roll/camera-roll** 7.10 |
| @react-native-community/viewpager 4.2 | **react-native-pager-view** 9.0 |
| @react-native-community/masked-view | `@react-native-masked-view/masked-view`（v7 导航已不需要，可直接删） |
| rn-fetch-blob 0.12（2022 停更） | **react-native-blob-util** 0.25（drop-in fork，7 个文件基本只改 import；`redux-persist-filesystem-storage` 4.x 也已切到它） |

### D. 已停更 / 无法在新 RN 上工作，需要**替换**（这是工作量的主要来源之一）

| 包 | 最后更新 | 用处 | 建议替代 |
|---|---|---|---|
| react-native-photo-view-ex | 2022 | 图片查看器缩放（`PXPhotoView.js`） | `react-native-zoom-toolkit` 或 `react-native-awesome-gallery`（基于 reanimated/gesture-handler，维护中）。替换后可删 vendored `android/photodraweeview`、jetifier、jcenter substitution |
| react-native-snap-carousel | 2022 | 排行榜横向列表（1 处） | `FlatList` + `snapToInterval`，或 `react-native-reanimated-carousel` |
| react-native-splash-screen | 2022 | 启动屏 | `react-native-bootsplash` 7 |
| react-native-spinkit | 2022 | Loading 动画（1 处） | RN `ActivityIndicator` / Paper `ActivityIndicator` |
| react-native-datepicker | 2022 | 搜索日期过滤（1 处） | 已有的 `react-native-modal-datetime-picker` 18 + `@react-native-community/datetimepicker` |
| react-native-slider 0.11 | 2022 | 1 处 | `@react-native-community/slider` 5 |
| react-native-easy-toast | 2022 | 1 处 | Paper `Snackbar` / 现有 `flash-message` |
| react-native-iphone-x-helper | 2022 | 1 处 | `useSafeAreaInsets()` |
| react-native-action-button（alphasp fork） | fork | FAB（4 处） | Paper `FAB` / `FAB.Group` |
| react-native-tab-view-viewpager-adapter | dead | 见 A | 删 |
| react-native-elements 0.18 | 2018 | 仅 `Icon` / `Button` / `Badge`（8 处） | 直接用 vector-icons / Paper；**不要**升到 3.x / `@rneui`，API 完全不同还多一个 UI 库 |
| redux-enhancer-react-native-appstate | 2022 | 2 处 | 20 行代码内联（`AppState.addEventListener`） |
| react-native-webp-format | iOS WebP 解码 | 0 处 JS 引用 | iOS 14+ 原生支持 WebP，删 |
| react-native-offline 5.8 | 2023 半停更 | 网络中间件（3 处） | 6.0.2 还能用；长期可换 `netinfo` + 一个 saga |
| react-native-htmlview / hyperlink / localization | 2023 / 2025 / 2023 低活跃 | 小说/评论渲染、i18n | 先升到最新版观察；`htmlview` 若出问题换 `react-native-render-html` 6 |

### E. 纯 JS 工具库（低风险，顺手升）

moment、qs、normalizr、bluebird（1 处，可删）、color、lodash.camelcase/truncate、sanitize-filename、shallow-equals、hoist-non-react-statics 2→3、prop-types、`pixiv-api-client`（alphasp 自维护，需要 fork 一版把 axios 升到 1.x）、`pixiv-novel-parser`（git 依赖，纯 JS）。

### F. 开发工具链

jest 25 → 30（配合 `@react-native/babel-preset`，去掉 `metro-react-native-babel-preset` 和自定义 `transform`）、eslint 6 → 9/10（flat config；`babel-eslint` 已废弃 → `@babel/eslint-parser` 或直接用 `@react-native/eslint-config`）、prettier 2 → 3（会重排一批代码，单独一个 commit）、删 `@babel/preset-flow` / `.flowconfig` / `.buckconfig` / `BUCK`。

---

## 3. 三个硬约束（决定"跳板"怎么选）

1. **RN 0.82（2025-10）起只有新架构。** 自定义 `UgoiraView` 是旧架构 `SimpleViewManager`；0.87 仍保留 interop layer 所以大概率能直接跑，但要实测；如果想干净，用 Codegen 重写成 Fabric 组件（272 行 Java，或借机改成 Kotlin，1–2 天）。iOS 侧 `UgoiraView.ios.js` 是纯 JS 实现，无影响。
2. **RN 官方只支持最近 3 个 minor（0.85 / 0.86 / 0.87）。** 0.81 是最后一个允许关闭新架构的版本，可以当调试跳板，但**不能当终点**——落在 0.81 上意味着半年后又要再来一次。
3. **Google Play 自 2026-08-31 起要求 targetSdk 36**（新 App 和更新都要求；存量 App 至少 35 才对新用户可见）。本 fork 目前通过 GitHub Release 分发 APK（侧载），所以这条**现在**不卡脖子；但一旦想上架就是死线。而且 targetSdk 一过 30，`dirs.SDCardDir` + `WRITE_EXTERNAL_STORAGE` 这套写法（`enhanceSaveImage.js` / `CollectionExportSection.js` / `Backup.js` 三处）在 scoped storage 下会失效，需要改成 MediaStore / camera-roll / SAF——这是**功能改动**，不只是换包。

---

## 4. 可选目标与 effort

### 目标 C：冻结不升（0.5–2 天）

- 加 `.nvmrc` / `.tool-versions`，或者一个 Dockerfile 把 Node 14 + JDK 11 + SDK 29 + Gradle 缓存固化成构建镜像，让"新机器能不能编"不再靠运气。
- fork `pixiv-api-client` 把 axios 升到 1.x（0.63 上能跑），顺手升 qs / moment / lodash。
- 接受：iOS 侧随 Xcode 每年一升迟早编不过；Android 侧 AGP 3.5 在新版 Android Studio 里已打不开工程；新库一个都装不进来。

**适用**：这个 App 只是给自己用、功能已经够、不打算再加需要原生能力的功能。

### 目标 B：跳板 RN 0.81（在 A 的基础上 +1 周）

按官方建议"先到 0.81 → 开新架构验证 → 再到 0.82+"。对本仓库的实际价值是：如果 0.87 上 `UgoiraView` / interop 出了难查的问题，可以退回 0.81 关新架构定位。**我不建议主动走这条路**，只当 A 的 fallback。

### 目标 A：一次到位 RN 0.87（推荐，若持续维护）

**核心方法论：原生工程不做 24 个版本的 diff，而是用 `npx @react-native-community/cli init` 生成 0.87 模板，把自定义部分移植进去。** 本仓库原生自定义很少，清单是明确的：

- Android：`UgoiraView` 4 个类、Firebase 接入（`google-services` / crashlytics 插件）、签名配置、`AndroidManifest` 里的 deep link（pixiv.net / `pixiv://`）、`largeHeap`、图标 / 启动图、`FirebasePerfOkHttpClient` shim（升级后不再需要）。
- iOS：`AppDelegate` 里的 Firebase 防御性初始化（0.87 模板是 Swift，重写 20 行）、`Info.plist` 的相册 / 文件共享权限、4 个 `.lproj`、Podfile 里 deployment target。

| Phase | 内容 | 估时 | 可否在 0.63 上先做 |
|---|---|---|---|
| 0 护栏 | CI 加一条 Node 22 跑 jest 的 job；写一页手工回归清单（登录 / 推荐 / 排行 / 搜索 / 详情 / 小说阅读 / 收藏保存 / 导出 / 备份）；留存当前可用 APK 作对照 | 1–2 天 | ✅ |
| 1 JS 预迁移 | 删 react-native-elements（8 处）、`ViewPropTypes`（2 处）、`componentWillReceiveProps`（3 处）；formik 2；redux 家族升级；替换 snap-carousel / action-button / easy-toast / iphone-x-helper / spinkit / datepicker / slider（都是 1–4 处引用）；rn-fetch-blob → blob-util；内联 appstate enhancer；`screenProps` 残留清理 | 5–7 天 | ✅ 全部可在 0.63 上验证并发版 |
| 2 原生重建 | 0.87 模板 + 移植上面的清单；Hermes；bootsplash；删 photodraweeview / jetifier / NDK hack / compileSdk 覆盖；CI 改 Node 22 + JDK 17 | 5–8 天 | ❌ |
| 3 生态大版本 | 导航 v7（native-stack、bottom-tabs、删 drawer）、Paper 5（MD2 主题）、tab-view 4 + pager-view、screens / safe-area、firebase 26、async-storage / camera-roll 改名、webview 14、vector-icons 10 | 8–10 天 | ❌ |
| 4 死原生库 | photo-view-ex → zoom-toolkit / awesome-gallery（图片查看器是核心体验，要仔细调手势）；localization 2.x 验证 | 3–5 天 | ❌ |
| 5 targetSdk 36 | 三处存储流程改 scoped storage；`requestLegacyExternalStorage` 删除；Android 15 edge-to-edge 适配 status bar / tab bar；预测性返回手势 | 3–5 天 | ❌ |
| 6 工具链 | jest 30 / babel preset / eslint flat config / prettier 3；删 flow / buck 残留 | 2–3 天 | ⚠️ jest 部分可以 |
| 7 回归发布 | 按 Phase 0 清单双端手测；iOS 在 Xcode 26 上出包；CI 出 release APK | 4–5 天 | ❌ |
| **合计** | | **31–45 人日 ≈ 7–9 人周** | |

估时前提：一名做过 RN 大版本升级的开发（或开发 + AI agent 协作），Android 优先、iOS 随后；不含把 114 个 class component 改 hooks、不含 TypeScript 化、不含 redux → RTK——这些**不是升级的必要条件**，React 19 和 redux 5 都还支持现有写法，可以以后按文件渐进做。

风险最高的三块（预留 buffer）：图片查看器手势替换（Phase 4）、scoped storage 三个流程（Phase 5）、iOS 侧 Firebase static framework + 新 Podfile 的联调（Phase 2/3）。

---

## 5. 升级后能得到什么

| 维度 | 具体收益 |
|---|---|
| 可构建性 | 任何一台装了当前 Node / JDK 17 / Android Studio / Xcode 的机器和 CI runner 都能直接编；删掉 6 条 workaround 和两份 `SKILL.md` 里一半的"Known Pitfalls" |
| 性能 | Hermes（当前是 JSC，`enableHermes: false`）：冷启动和内存明显改善；Fabric + 新 reanimated / gesture-handler：列表滚动和图片手势更顺；可选 FlashList |
| 合规 | targetSdk 36 → 随时可上 Google Play；16KB page size 合规；Android 15 edge-to-edge |
| 安全 | 120 条 audit 基本清零；axios 1.x |
| 生态 | 能装任何现代库（当前几乎所有新库都要求 RN ≥ 0.7x）；React Navigation v7 静态 API、Paper 5；不再依赖 2 个私人 fork + 1 个 vendored 模块 |
| 开发效率 | AI coding agent 对现代 RN API 的掌握远好于 0.63 时代的 API（这个仓库明显在用 agent 开发，这一条的实际权重不低）；可渐进引入 TypeScript |
| 维护成本 | 每年跟一次 RN minor 升级的成本是 1–3 天；现在这种 6 年一跳是 7–9 周。**拖得越久，差价越大** |

---

## 6. 我的建议（做到哪一步）

1. **不要局部升级。** 在 RN 0.63 上把导航升到 v7 或 Paper 升到 5 是做不到的（peer 依赖直接卡死），勉强做到也没收益。要么 A 要么 C。
2. **如果这个 App 还要活一年以上 → 选 A。** 但按 Phase 拆分，**先做 Phase 0 + 1（≈1.5 周）**：全部在 0.63 上能验证、能发版，清掉 ~12 个死库和废弃 API，把后面大跳的风险砍掉一截；同时也是"练手"——做完这一段，对后面 Phase 2–5 的估时会准得多。然后找一个 4–6 周的窗口一口气做 Phase 2–7，期间功能开发冻结。
3. **目标版本选做的时候的最新 stable**（现在是 0.87），不要选 0.81/0.7x 这种"看起来稳"的旧版——它们都已不受支持，落上去等于白做。
4. **借升级删东西，不借升级加东西。** 删：react-native-elements、drawer navigator（已被注释掉）、Firebase Perf（Android 已禁用）、Flipper、bluebird、webp-format、masked-view、flow / buck 残留。加：只加替代死库所必需的。TypeScript / hooks 化 / RTK 全部推后。
5. **如果不打算再投入 → 选 C**，花半天把工具链固化（`.nvmrc` + Docker 构建镜像），fork `pixiv-api-client` 升 axios，然后不要再碰依赖。
6. 两个需要你先拍板的问题：
   - **是否有上架 Google Play 的计划？** 有 → Phase 5 是硬需求，且 A 的优先级直接拉满。没有 → Phase 5 可以后做，但 targetSdk 建议至少到 34。
   - **iOS 是不是一等公民？** 是 → Phase 2/3/7 各加 30% 时间，且需要一台 Xcode 26 的 Mac 全程参与。不是 → 先 Android 通，iOS 放到最后单独一轮。

---

## 附录：本次核实的关键事实与出处

- RN 0.82 起只运行新架构，legacy 开关被忽略；官方建议先在 0.81 上开启新架构验证再升。（reactnative.dev 0.82 发布说明）
- RN 0.87（2026-08-11）：Node ≥ 22.13、AGP 9、Kotlin 2.0+、compileSdk 37、minCompileSdk 34、Xcode 26；0.84 同时转为不受支持。（reactnative.dev 0.87 发布说明、reactwg/react-native-releases support.md）
- RN 0.81（2025-08）：Node ≥ 20.19.4、Xcode ≥ 16.1，默认 targetSdk 36；最后一个可关闭新架构的版本。
- Google Play：2026-08-31 起新 App 与更新须 targetSdk 36；存量 App 须 ≥ 35 才对新设备用户可见。（Play Console Help 11926878）
- `@react-navigation/material-bottom-tabs` 停在 6.2.29，v7 由 `react-native-paper/react-navigation` 提供。
- 本仓库 `npm ci`（Node 22）可安装；`jest` 40/40 通过；`npm audit` 120 条。

---

# 第二部分：全 AI 开发下的工期、升级 vs 重写、以及上架 Google Play / App Store 的工作量

> 追加于同日。所有工期都是估算，前提写在 §7.1。

## 7. 全 AI 开发的工期模型

### 7.1 前提（不满足则估算不成立）

1. Agent 运行在**有完整构建环境的机器上**（你的 Mac / Windows 上跑 Claude Code、Codex CLI 之类），能自己执行 `gradlew` / `xcodebuild` / 模拟器 + 截图。像本次这种没有 JDK、Android SDK、Xcode 的云沙箱只能做 JS 层和 Jest，原生阶段在这里做不了。
2. 你每天能抽 30–60 分钟做真机验收和拍板（R-18 策略、UI 取舍、商店表单这些 agent 替不了）。
3. iOS 需要一台能装 **Xcode 26** 的 Mac（macOS 15.5+ / 26），或改用 EAS Build 云端出包。

### 7.2 为什么 AI 只能把这件事提速 1.5–2 倍，而不是 5–10 倍

这个项目的瓶颈不是"写代码"，是**构建—验证循环**：一次 Gradle clean build 5–10 分钟，Xcode 10–20 分钟，真机验证要人。Agent 在 Paper v4→v5 这类跨 96 个文件的机械改写上是几分钟的事，但在"Podfile 里 Firebase static framework 和某个库冲突"这种问题上，它和人一样要一轮轮试。所以：

| 阶段类型 | AI 提速 | 例子 |
|---|---|---|
| 机械迁移（有编译器 / lint / 测试兜底） | 3–5× | 库改名、API rename、删死库、formik 2、redux 5 |
| 原生工程配置与调试 | 1–1.5× | 模板重建、Podfile、Gradle、签名、bootsplash |
| 需要"看"的工作 | ≈1× | 图片查看器手势、edge-to-edge 适配、回归测试 |
| 商店流程 | 0×（纯人工 + 日历时间） | 开发者账号、封闭测试 14 天、审核往返 |

### 7.3 升级路径（保留现有代码）的全 AI 工期

| Phase | 人类开发者估算 | 全 AI（agent-day） |
|---|---|---|
| 0 护栏 | 1–2 天 | 0.5 |
| 1 JS 预迁移（在 0.63 上） | 5–7 天 | 2–3 |
| 2 原生重建 | 5–8 天 | 3–5 |
| 3 生态大版本 | 8–10 天 | 4–6 |
| 4 图片查看器替换 | 3–5 天 | 2–3 |
| 5 targetSdk 36 / scoped storage / edge-to-edge | 3–5 天 | 2–3 |
| 6 工具链 | 2–3 天 | 1 |
| 7 回归修复 | 4–5 天 | 3–5（人测为主） |
| **合计** | **31–45 天** | **18–27 agent-day** |

日历时间：全职盯着 **4–5 周**；晚上周末式兼职 **6–10 周**。

### 7.4 重写路径（新栈从零写，功能对齐现状）的全 AI 工期

要复刻的范围（数据来自本仓库）：66 个 screen、64 个 Pixiv API 端点、PKCE + WebView 登录 + token 刷新、325 条 i18n × 6 语言、小说阅读器（webview 解析 / 内联图 / 阅读位置，6 个测试文件）、动图（zip 解包 + 帧播放 + Android 原生视图）、存图 / 导出 / 备份、屏蔽 / 高亮、浏览历史、AI 功能（LLM 客户端 / 口味评分 / 分类 / 收藏库规则 / 智能搜索 / 关注洞察）、deep link、深色主题、约 10 个设置页。

可以原样搬走的：`pixiv-api-client`（fork 升 axios）、`pixiv-novel-parser`、`src/common/helpers`（2k 行，有测试）、i18n JSON、LLM 客户端——约 6–8k 行。**要重写的：全部 UI（26k 行）+ 数据层（saga / reducer / action / selector 12k 行换成 TanStack Query + 轻量 store）。**

| 模块 | agent-day |
|---|---|
| 骨架：Expo/RN 0.86+、TS、导航、主题、i18n、登录 | 3–4 |
| Feed 类：推荐 / 排行 / 趋势 / 新作 / 搜索 + 过滤器 | 5–7 |
| 详情类：插画（多页 / 动图 / 评论 / 相关）、用户页、小说详情 / 系列 / 阅读器 | 7–10 |
| 我的页：收藏 / 标签 / 关注 / 好P友 / 历史 / 屏蔽 / 高亮 / 设置 ×10 / 备份 / 反馈 | 5–7 |
| 存图 / 导出 / 分享 / deep link / scoped storage | 2–3 |
| AI 功能 + 收藏库 + 洞察（逻辑可搬，UI 新写） | 4–6 |
| 原生：动图模块（Expo Module 或纯 JS）、启动图、图标、Firebase | 2–3 |
| **对齐 QA 与长尾修补**（重写最容易死的地方：没有测试当 oracle，只能对着旧 App 一屏一屏比） | 8–12 |
| **合计** | **36–52 agent-day** |

日历时间：全职 **8–12 周**；兼职 **4–6 个月**。约为升级路径的 **2 倍**，且方差大得多。

## 8. 升级 vs 重写：全 AI 工作流下怎么选

先澄清一点：**两条路最后都落在 RN 新架构上**（RN 0.82+ 只有新架构）。区别只在"迁移现有 42k 行代码"还是"重新产出一份"。

### 8.1 AI 让重写变便宜的部分——是真的，但不是主要成本

写代码的边际成本确实降了。但这个 App 真正贵的东西是**沉淀在代码里的行为知识**：64 个 Pixiv 私有 API 的用法和坑、PKCE 登录与刷新、小说 webview 解析、动图处理、图片 referer、屏蔽/高亮语义、持久化迁移、6 语言文案。现有代码 + 227 个测试就是这些知识的载体。重写时 agent 没有 oracle，只能靠你对着旧 App 逐屏验收——**这恰好是全 AI 工作流最弱的一环**（长尾对齐 bug 要到用户用到才暴露）。

### 8.2 验证不对称

- 升级：完成定义是"行为不变"。逻辑层（38% 代码）有 227 个测试自动兜底，UI 层有旧 APK 当对照。
- 重写：测试和 saga/reducer 耦合，得先重写测试才有兜底；UI 全新，没有对照物。

### 8.3 什么情况下重写反而划算

- **产品方向变了、要砍掉一半以上功能。** 注意到本仓库最近的分支叫 `pxread`、测试和文档高度集中在小说阅读器——如果未来是"小说为主"的产品，插画 / 漫画 / 动图 / 图片查看器（恰好是最重的原生 + UI 部分）都可以不要，那"重写"其实是"写一个小得多的新 App"，工期可能压到 4–6 周，与升级持平，而结果更干净。这时选重写。
- 想换技术栈（Flutter / KMP / SwiftUI）——目前没这个迹象。

### 8.4 推荐：升级，但原生侧落在 Expo（Prebuild/CNG）上，然后用绞杀者模式逐屏现代化

具体：

1. JS 层照第一部分 Phase 1 清理，保留 redux-saga 数据层（它能跑、有测试、agent 也能维护）。
2. 原生侧不用 bare RN 0.87 模板，改用 **Expo SDK 57（RN 0.86）+ `expo prebuild`**：`android/`、`ios/` 不再进 git，由 `app.json` + config plugin 生成。Firebase、权限、deep link、启动图都有现成 plugin；`UgoiraView` 改写成一个本地 Expo Module（Kotlin 约 150 行）或退回 iOS 那种纯 JS 实现。
3. 之后新功能一律 TS + hooks，老 screen 碰到才改。224 个 UI 文件，agent 每天顺手改 10–20 个，几个月内自然换血。

为什么 Expo 对"全 AI + 上架"这个组合特别值：

| 收益 | 对全 AI 工作流的意义 |
|---|---|
| EAS Build 云端出 iOS 包 | agent 在任何环境都能触发 `eas build -p ios`，Mac 不再是每次构建的必经环节（调试仍建议有 Mac） |
| EAS Submit | `eas submit` 直接推 App Store Connect / Play Console，省掉 Fastlane 配置 |
| expo-updates OTA | JS 改动不走审核就能到用户手上——对一个要跟着 Pixiv 私有 API 变化的非官方客户端尤其重要 |
| Prebuild 每次升级重新生成原生工程 | 直接消灭"6 年攒 7 个 workaround"的根因；以后每年跟 SDK 是 1–3 天的事 |
| Agent 对 Expo 约定极熟 | 幻觉率明显低于手写 Podfile / Gradle |

成本：Expo SDK 比 RN 最新版晚 1–2 个 minor（无所谓）；EAS 免费额度够个人项目起步，不够再上付费档；所有第三方原生库照用（走 dev build，不用 Expo Go）。工期与 bare 0.87 路径基本持平（config plugin 多花 1–2 天，iOS 构建折腾少 2–3 天）。

### 8.5 全 AI 下"不升级"的代价比人工开发时更大

Agent 的训练语料以现代 RN 为主。留在 0.63 上，它会持续给出 0.63 没有的 API（`@react-navigation/native-stack`、hooks 化的库、新 Reanimated），每加一个功能都在和工具链打架——这个仓库的两份 `SKILL.md` 里那一长串 Known Pitfalls 就是证据。**所以在全 AI 工作流下，升级的 ROI 比人工开发时更高，而不是更低。**

## 9. 只上 Google Play / 只上 App Store 各要多少工作量

两边有一个共同前提：**升级是上架的先决条件，不是可选项。**

- Google Play：2026-08-31 起新 App 和更新都必须 targetSdk 36 → 需要 AGP 8/9 → RN 0.63 做不到。
- App Store：2026-04-28 起提交的包必须用 **Xcode 26 / iOS 26 SDK** 构建 → RN 0.63 在 Xcode 26 上编不过。

另一个共同项：`com.utopia.pxviewr` 是原作者 alphasp 在 Play 上的包名（README 里的商店链接就是它），除非你就是那个账号，否则 **applicationId / bundle id 必须换新**，等于全新上架。现有侧载用户要重装（App 自带的备份 / 导出功能可以兜一下数据）。

### 9.1 只上 Google Play

| 项 | 工作量 | 备注 |
|---|---|---|
| 升级（Android-only：去掉 iOS 部分） | 15–22 agent-day ≈ 3–4 周 | Phase 2/3/7 少掉 iOS 部分 |
| 新包名 + 上传密钥 + Play App Signing + AAB 出包 | 0.5 天 | `bundleRelease` 脚本已有 |
| targetSdk 36 行为：scoped storage、`READ_MEDIA_*` / Photo Picker、强制 edge-to-edge、预测性返回、16 KB page size 检查 | 已含在 Phase 5 | 16 KB 主要看第三方 .so，RN 0.77+ 自身合规 |
| 政策与商店表单：数据安全表、隐私政策 URL（仓库已有 `privacy-policy/`）、IARC 分级问卷、UGC 政策（已有屏蔽用户 / 标签，补一个"举报"入口跳 Pixiv 举报页）、名称与描述明确"非官方"且不能以 pixiv 品牌为主视觉、R-18 默认关闭 | 1–2 天 | 有先例：PixEz、Pixiv-Shaft 都在 Play 上 |
| 账号与日历：$25 一次性；**2023-11-13 之后注册的个人账号必须先做 12 名测试者连续 14 天的封闭测试**才能申请正式发布 | 人工 0.5 天 + **日历 3 周** | 可与开发并行，尽早建账号开测试轨道 |
| 审核 | 通常数小时到数天 | 拒审风险低 |
| **合计** | **≈ 4–5 周工程 + 3 周封闭测试（可重叠），日历约 5–7 周** | 确定性高 |

### 9.2 只上 App Store

| 项 | 工作量 | 备注 |
|---|---|---|
| 升级（iOS-only） | 15–22 agent-day ≈ 3–4 周 | 原生代码更少（动图是纯 JS），但 Xcode 构建慢、CocoaPods + Firebase static framework 联调占时间；无 Phase 5 |
| Apple Developer Program、新 bundle id、证书 / 描述文件 | 0.5–1 天 | $99/年；用 Xcode 自动签名或 EAS 托管 |
| Privacy Manifest（`PrivacyInfo.xcprivacy`，2024-05 起强制） | 0.5 天 | RN 0.74+ 模板自带，Firebase 自带；老库（如 `react-native-localization`）可能触发 ITMS-91053 警告 |
| App Privacy 标签 | 0.5 天 | Firebase Analytics / Crashlytics 采集项；AI 功能把收藏数据发给 OpenAI（用户自带 key）也要申报 |
| 准则 5.1.1(v) 账号删除：App 里有 Pixiv 注册 WebView 和 `createProvisionalAccount` → 要么 iOS 版去掉注册入口，要么提供"删除账号"入口跳 Pixiv 删号页 | 0.5 天 | Apple 更倾向应用内发起，链接式方案有被要求整改的可能 |
| 内容与分级：R-18 默认隐藏；新版年龄分级问卷（预计 16+/18+ 档）；UGC 要求过滤 / 举报 / 屏蔽 / 联系方式（准则 1.2） | 1 天 | |
| 品牌与第三方服务：不能用 pixiv logo、名称不能以 pixiv 开头、描述写明非官方；准则 5.2.2（未经许可展示第三方服务内容）是最大的不确定性 | 0.5 天准备 + **审核往返日历 1–3 周** | 有先例（PixEz 在美区 App Store），但每次都可能被要求解释 / 被拒 / 上诉；**存在被永久拒绝的可能** |
| Sign in with Apple | 不需要 | 登录的是 Pixiv 自己的账号体系，不属于第三方社交登录 |
| TestFlight | 免费、即时 | 没有 Play 那种 14 天门槛，可先用 TestFlight 发给自己人 |
| 硬件 | 一台能装 Xcode 26 的 Mac，或 EAS Build | |
| **合计** | **≈ 4–5 周工程 + 1 周商店准备 + 1–3 周审核往返，日历约 6–9 周** | 工程量与 Play 相当，**风险显著更高**，且风险在审核不在代码 |

### 9.3 两个都上

全量升级 4–5 周 + 商店准备约 1.5–2 周（可重叠）→ 全职 **6–8 周**，兼职 **3–4 个月**。顺序建议：**Android / Play 先行**（确定性高、封闭测试的 14 天可以早点开始），iOS / App Store 随后，用 TestFlight 先跑起来再交审。

## 10. 直接结论

1. **升级值得，且全 AI 下更值得**；不升级就是放弃两个商店，同时让每次 agent 开发都在和 2020 年的工具链对抗。
2. **升级不重写**——除非产品方向已经变成"小说为主"要砍一半功能；那种情况下重写才有竞争力。
3. 升级时把原生侧落到 **Expo Prebuild + EAS**，之后逐屏现代化；这是对"全 AI + 上架"组合最省心的形态。
4. 工期：升级 **18–27 agent-day（全职 4–5 周 / 兼职 6–10 周）**；重写 **36–52 agent-day（全职 8–12 周 / 兼职 4–6 个月）**。
5. 上架：只上 Play **5–7 周日历、低风险**；只上 App Store **6–9 周日历、审核风险高且不可控**；两个都上 **6–8 周全职 / 3–4 个月兼职**。
6. 现在就能做的零成本动作：注册 Play 开发者账号并开封闭测试轨道（14 天计时越早开始越好）；确认你的 Mac 能装 Xcode 26；决定新的包名 / bundle id 和 App 名称（避开 pixiv 品牌）。
