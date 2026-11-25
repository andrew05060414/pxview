# Issue #15：运行时叶子依赖矩阵与首个升级试点

> 创建：2026-09-27；按主分支复核：2026-11-25。

只将图片保存命名使用的 `sanitize-filename` 从锁定的 1.6.3 升到精确版本 1.6.4，不改变功能或应用数据。目标是验证单库升级可重复、可回滚；其他依赖只列为候选。

## 基线与已有工作

- 范围来自 [Issue #15](https://github.com/andrew05060414/pxview/issues/15)。沿用[已关闭的草稿 PR #20](https://github.com/andrew05060414/pxview/pull/20) 的分支 `chore/leaf-dependency-pilot-sanitize-filename`，在独立 worktree 合入 `main` 的 `5d5b69e`，合并前再合入 `068aa4a`（PR #36，小说排行榜）和 `205ae05`（PR #37，仅文档）。下方不沿用旧草稿的测试或 APK 结果。
- npm lockfile v3；Node 14.21.3 / npm 9.9.4，React 16.13.1 / React Native 0.63.5，JDK 11，AGP 3.5.3 / Gradle 6.2，Android SDK 29 / build-tools 29.0.2。不升级已有工具链。

## 候选矩阵

起始版本已与本次主分支的锁文件核对，候选版本来自 npm 官方 registry。排序按试点影响面与验证成本，不是漏洞治理优先级，也不是“全部升级到最新版”。只有首行实际升级；其余行需要各自补回归测试。没有 engine/peer 声明不等于任意环境兼容。

表中的 **T / D / R / I** 对应下节统一命令；**B(旧版本)** 对应回滚节。每个候选均须执行 T、D、R 和行内的专项验证，真机结果独立记录。JS 包无需修改 Java、Obj-C、Gradle、Pod 或权限；RN 包均含 Android/iOS 原生代码，Android 构建不能证明 iOS 可用。

| 排序 / 包：当前锁定 → 候选 | 已核对的业务调用面 | 原生影响与兼容条件 | 针对性验证 / 回滚 |
| --- | --- | --- | --- |
| 1 **sanitize-filename 1.6.3 → 1.6.4（本次）** | `src/components/HOC/enhanceSaveImage.js`：`getImageSavePath` 的作者/漫画目录、`getImageFileName`；均用 `{replacement:'_'}` | 纯 JS / CommonJS；唯一依赖仍为 `truncate-utf8-bytes ^1.0.0`。上游只将尾部点号/空格匹配改为线性扫描，API 保持。RN/JSC 不依赖 Node 新 API；仍须 Metro 和 APK 证明打包链 | T 的 `enhanceSaveImage.spec.js` 20 条，D/R；I 后保存单图/漫画并核对磁盘路径。B(1.6.3)，现有图片不用改名或清理 |
| 2 **prop-types 15.7.2 → 15.8.1** | 10 个组件/容器，包括 `BookmarkIllustButton`、`BookmarkNovelButton`、`IllustItem`、`UgoiraView.android`、各收藏/关注弹窗 | 纯 JS；registry **没有 peerDependencies**；依赖 `react-is ^16.13.1`、`loose-envify ^1.4.0`、`object-assign ^4.1.1`。需核对实际间接版本；`IllustItem` 的命名导入也须覆盖 | T/D/R；增加组件 mount 与 warning 断言，真机收藏/关注弹窗。B(15.7.2)，无持久化格式改变 |
| 3 **color 3.1.2 → 3.2.1** | `CommentList`、`NovelListViewItem`、`PXDropdown` 的主题颜色及 alpha 字符串 | 纯 JS/CommonJS；目标依赖 `color-string ^1.6.0`、`color-convert ^1.9.3`，可能扩大间接变化，必须逐项审查 lock；无 engine/peer 声明 | T/D/R；补 HEX/RGB/alpha 用例；深浅主题截图对比。B(3.1.2)，同时恢复相关间接锁定项 |
| 4 **qs 6.9.3 → 6.9.7** | `src/common/actions/` 的 25 个分页/排行/搜索 action，另有 `SearchFilterModal` 收藏数筛选，总计 26 个文件 | 纯 JS；Node `>=0.6`，无 runtime 依赖或 peer。小范围补丁候选，**不表示此版本解决所有当前安全问题**；解析边界可能影响分页与筛选 | T/D/R；补真实 `next_url`、重复键、空参数、收藏数/offset 和特殊键输入；真机翻页/搜索。B(6.9.3)，无存储迁移 |
| 5 **moment 2.24.0 → 2.29.4** | `searchPeriod`、`sagas/auth`；`CommentList`、`DetailFooter`、`DetailInfoModal`；`Backup`、`PastRanking`、`SearchFilterPeriodDateModal` 共 8 文件 | 纯 JS；Node `*`，无 runtime 依赖或 peer。跨度比首个试点大，日期解析/locale/时区与登录过期判断均须验证；不是最新版或完整安全治理结论 | T/D/R；补午夜/DST/日期边界与 token 过期用例；真机往期排行、筛选和备份命名。B(2.24.0)，不回写历史备份名 |
| 6 **react-native-localize 1.4.2 → 1.4.3** | `src/screens/MyPage/Feedback.js` 的 `getLocales()[0].languageTag` 和 `getCountry()` | 原生 Locale 桥；peer RN `>=0.56.0`。目标 Android 源码默认 AGP 3.5.3、SDK 29、build-tools 29.0.3，均须确认项目继承值（本项目 build-tools 29.0.2）。iOS Pod 另验 | T/D/R；补 Locale mock；I 后不同系统语言下打开反馈页，勿实际发送。B(1.4.2)，重新构建旧原生 APK，保留数据 |
| 7 **react-native-splash-screen 3.2.0 → 3.3.0** | `src/screens/App/App.js` 的 `hide()`；Android `MainActivity.java` 和 iOS `AppDelegate.m` 的 `show()` | peer RN `>=0.57.0`；发布包仍依赖 `com.android.support:appcompat-v7:26.1.0`，依赖既有 Jetifier/SDK override，不能只凭 peer 称 AndroidX 兼容 | T/D/R；I 后冷启动、后台恢复、闪屏消失，检查 native crash；iOS 启动另验。B(3.2.0)，重建覆盖安装，不能卸载 |
| 8 **react-native-linear-gradient 2.5.6 → 2.7.3** | `src/components/Tags.js` 的 `<LinearGradient colors=...>` | native View；React/RN peer `*`。包内 AGP 4.2.2 **只在独立打开 library 工程时启用**，作为 app 子模块不强制升级 AGP；SDK 默认 30 / min21，取 root ext 后仍须证明 AGP3.5/SDK29 编译 | T/D/R；I 后检查标签渐变边缘、主题切换，iOS 另验。B(2.5.6)，重建旧原生包 |
| 9 **react-native-device-info 7.0.2 → 7.4.0（暂缓）** | `apiClient.js` 启动时 `getModel/getSystemVersion`；`About`、`Backup`、`Feedback` 的版本、厂商、型号等，4 文件 | native；RN peer `*`。Android 有 installreferrer 和 Google IID / 可选 Firebase 分支；standalone AGP 默认4.1.1，app 子模块继承根工程。若需改变 Firebase/Google 组合，移交平台任务，不在 #15 推进 | T/D/R；I 后请求头/关于页/备份元数据/反馈设备信息，native smoke。B(7.0.2)，连同 native 解析结果回滚，不改历史备份数据 |

原始来源（元数据含精确 tarball URL，可核对原生候选的 `android/build.gradle`）：

- [sanitize-filename 1.6.4 registry](https://registry.npmjs.org/sanitize-filename/1.6.4)；[上游 v1.6.3…v1.6.4 diff](https://github.com/parshap/node-sanitize-filename/compare/v1.6.3...v1.6.4)。GitHub releases 页面无正式 release notes，依据代码差异。
- [prop-types 15.8.1](https://registry.npmjs.org/prop-types/15.8.1)、[color 3.2.1](https://registry.npmjs.org/color/3.2.1)、[qs 6.9.7](https://registry.npmjs.org/qs/6.9.7)、[moment 2.29.4](https://registry.npmjs.org/moment/2.29.4)。
- [localize 1.4.3](https://registry.npmjs.org/react-native-localize/1.4.3)、[splash-screen 3.3.0](https://registry.npmjs.org/react-native-splash-screen/3.3.0)、[linear-gradient 2.7.3](https://registry.npmjs.org/react-native-linear-gradient/2.7.3)、[device-info 7.4.0](https://registry.npmjs.org/react-native-device-info/7.4.0)。

明确排除：React、React Native、Node/JDK、AGP/Gradle/SDK/NDK 升级；全部 `@react-navigation/*`、navigation-backhandler 及手势/动画/screens/safe-area/viewpager 联动迁移；`@react-native-firebase/*` 平台迁移。Redux/saga/persist、AsyncStorage、文件存储、`rn-fetch-blob`、WebView、Pixiv API/parser 等接触全局状态、登录或数据格式的依赖不选首试。`bluebird`、lodash 单用途包等也没有因为“老”就自动升级或删除。

## 实施内容与验证命令

锁文件只改根依赖声明和 `sanitize-filename` 的版本、tarball 与完整性校验值。新增 20 条回归，用实际依赖验证中文、emoji、特殊字符、超长名称、命名设置及路径，不模拟文件名清理算法。Windows 独立 worktree 原先可能因路径分隔符混用发现不到测试；Jest 改用相对 glob，仓库脚本仍以 `--roots __tests__` 限定范围。没有修改业务代码、原生工程或界面。

在独立 worktree 的仓库根目录执行。Android 环境和 Windows 命令见[构建说明](../../../.agents/skills/pxview-build/SKILL.md)；如果没有自己的 Firebase 配置，可使用[已有 CI 工作流](../../../.github/workflows/android-release.yml) 中的占位配置，不要提交它。

```sh
npm ci --legacy-peer-deps
npm run verify:dependencies
# T：全量测试及试点专项
sh ./scripts/test-jest.sh
sh ./scripts/test-jest.sh --runTestsByPath __tests__/components/enhanceSaveImage.spec.js
./node_modules/.bin/eslint __tests__/components/enhanceSaveImage.spec.js

# D / R：分开构建，先把 Debug APK 复制到构建目录外，再执行 Release
sh ./scripts/build-android-debug.sh
sh ./scripts/build-android-release.sh
# 两个脚本目前在同一次 Gradle 调用里执行 clean 和 assemble，可能触发构建说明记录的
# “PackageList cannot find symbol”。本次复验是把 clean 与 assemble 拆成两次调用后通过的，
# 对应写法（在 android/ 下，先执行 sh ./scripts/bundle-android-release.sh 生成 bundle）：
#   ./gradlew clean --no-daemon
#   ./gradlew assembleDebug --no-daemon -x bundleDebugJsAndAssets
#   ./gradlew clean --no-daemon
#   ./gradlew assembleRelease --no-daemon -x bundleReleaseJsAndAssets   # 加脚本里的四个 -PPXVIEWR_RELEASE_* 签名参数
# 生成目录：android/app/build/outputs/apk/{debug,release}/
# 在设备覆盖安装前，先用 SDK 的 apksigner verify --print-certs 核对签名

# I：仅在目标设备上已有包的签名一致、且可覆盖安装时执行
adb install -r /path/to/app-debug.apk
adb install -r /path/to/app-release.apk
```

## 本次复验

| 层次 | 结果 |
| --- | --- |
| 自动测试和锁文件 | Node 14 / npm 9 干净安装及顶层依赖校验通过；合入 `068aa4a` 后 Jest 43 套件、280 条通过（合入前为 42 套件、275 条），其中 20 条命名回归在 1.6.3 和 1.6.4 下均通过；新增测试文件 ESLint 通过 |
| Android Debug APK | 基于 `5d5b69e` 已生成（合入 `068aa4a` 后未重新构建）；用仓库调试证书重签副本，签名和内置 JS 校验通过 |
| Android Release APK | 基于 `5d5b69e` 已生成（合入 `068aa4a` 后未重新构建）；用同一仓库证书构建，签名和内置 JS 校验通过 |
| Metro Android release bundle | 合入 `068aa4a` 后用 Node 14 重新打包通过（只验证 JS 打包，未重新生成 APK） |
| Android 真机 / iOS | 未验证；没有安装任何 APK 或改动设备数据 |

首次 Gradle 下载因 Maven Central 限流失败。改用官方镜像（仅本地 Gradle 配置），复用刚生成的 Metro bundle，按 CI 流程将 `clean` 与各自的 `assembleDebug` / `assembleRelease` 分开执行，跳过重复打包。两包均为 `com.utopia.pxviewr`，内置 JS 与构建这两个 APK 时（基于 `5d5b69e`）生成的 Metro bundle 逐字节一致；合入 `068aa4a` 之后重新生成的 bundle 没有打进任何 APK，也没有与这两个包比对。未提交或发布构建产物。

单元测试只证明命名和路径计算。写入权限、图库扫描和覆盖安装后数据是否保留，按下节在真机验证。现有超长名称可能截断扩展名；本次不改变该行为。

## 回滚 B 与真机待验

每个候选独立保存升级前的 manifest/lock。**B(旧版本)**：只逆转该包的 manifest 与 lock 差异（包括它引入的间接变化），恢复表中已锁版本，然后用 Node14/npm9 重跑 `npm ci --legacy-peer-deps`、T/D/R。不要对有后续工作或用户修改的仓库整文件 `git restore`、reset 或 clean。原生候选必须重建旧版 APK；仅回滚 JS bundle 不够。

本试点可在另一个基于 `5d5b69e` 的 worktree 重建旧 APK，不影响当前工作。精确逆向项：manifest 和 lock 根 `sanitize-filename` 声明恢复 `^1.6.1`，包 entry 恢复 1.6.3 及基线中的 tarball/integrity；其他依赖和数据不变。Jest 路径修复和行为测试可保留。安装回滚包仍只允许相同签名的 `adb install -r`，若出现 `INSTALL_FAILED_UPDATE_INCOMPATIBLE` 则停止核对签名，不能卸载绕过。

设备验收顺序（Debug 和 Release 分别记录设备型号、Android 版本、APK hash、结果）：

1. 覆盖安装前记录现有登录态、保存设置、图片目录；覆盖安装后确认三者保留。
2. 打开应用、登录/恢复既有会话、列表/详情/小说阅读与内联图作基本回归。
3. 分别选择作品 ID、标题、ID+标题命名；保存中文、emoji、斜杠/冒号标题单图，实际查看文件名和可打开性。
4. 作者名/ID+作者名目录以及漫画独立目录，连续保存多页；检查顺序、路径、图库可见性和重复保存行为。
5. 尾部点号/空格、很长名称、拒绝存储权限后重试，记录既有边界；不要清理旧图片或重置设置。
6. 如需回滚，覆盖安装同签名旧包并再次检查既有设置和图片。iOS 如要交付，另在 macOS 构建并验相册权限与保存。

本次没有连接设备；所有设备项均待验证，不用清数据、卸载或移除功能来绕过失败。
