# Issue #15：运行时叶子依赖矩阵与首个升级试点

> 创建日期：2026-09-27  
> 最后更新：2026-09-27  
> 版本：1.1（本地验证完成，真机待验）

本次只把图片保存命名使用的 `sanitize-filename` 从锁定的 1.6.3 升到精确版本 1.6.4，保留全部功能和应用数据。37 个套件 / 235 条测试、Debug/Release 构建和 APK 签名/内置 bundle 核对均通过，真机尚未连接。目标是先证明单库升级可重复、可回滚，再决定后续升级；下表其他版本只是候选，未安装或宣称已兼容。

## 基线与已有工作

- 范围来自 [Issue #15](https://github.com/andrew05060414/pxview/issues/15)。2026-09-27 通过 `gh issue view` 和全部 PR 列表核对：无 #15 的在途 PR；开放的 [PR #19](https://github.com/andrew05060414/pxview/pull/19) 是排行榜功能。
- 独立 worktree：`C:/Users/Andrew/.codex/worktrees/be3f/pxview`；分支：`codex/issue-15-leaf-dependency-pilot`。开始时工作区干净，基线 `834c1a23ca6ff939f5782d501544414dc59ed44d`。
- 仓库与子目录没有 `AGENTS.md`；遵守任务中提供的 AGENTS 规则和 `.agents/skills/pxview-build/SKILL.md`。
- 远端 `origin/main` 当时为 `e76aa5c39ecf6ef853188babe9e7843285887d13`，与本地基线分叉。本地包含阅读器去重、构建修复和 Prettier 更新；远端包含 [依赖树检查 PR #10](https://github.com/andrew05060414/pxview/pull/10)、排行榜及 iOS 工作。`git merge --ff-only origin/main` 拒绝快进，未产生合并。本试点保留本地历史；将来开 PR 前须单独整合分叉并重跑验证，不能直接把当前分支全部差异当作依赖试点。
- PR #10 的检查脚本从合并提交 `49efdc5fda8102efd55e4fa8b19ae4351b2f7746` 读取到本地证据目录，用 `vm` 将 `__dirname` 指向当前 `scripts/` 执行，未覆盖当前源码。它在两次安装后都确认 manifest、lock 与实际顶层依赖一致。
- 保持 npm lockfile v3；Node 14.21.3 + npm 9.9.4，React 16.13.1 / RN 0.63.5，JDK 11.0.27.6，AGP 3.5.3 / Gradle 6.2，SDK 29 / build-tools 29.0.2 / NDK 21.4.7075529。

## 候选矩阵

版本取自当前锁文件和 npm 官方 registry 的精确版本元数据（2026-09-27 查询）。这是一组经过调用面筛选的九个候选，排序按试点影响面与验证成本，不是漏洞治理优先级，也不是“全部升级到最新版”。没有 engine/peer 声明不等于任意环境兼容。只有首行实际升级；其余行需要补充各自回归测试后才能执行。

表中的 **T / D / R / I** 对应下节统一命令；**B(旧版本)** 对应回滚节。每个候选均须执行 T、D、R，真机验收独立记录。JS 包无需修改 Java、Obj-C、Gradle、Pod 或权限；RN 包均含 Android/iOS 原生代码，Android 构建不能证明 iOS 可用。

| 排序 / 包：当前锁定 → 候选 | 已核对的业务调用面 | 原生影响与兼容条件 | 针对性验证 / 回滚 |
| --- | --- | --- | --- |
| 1 **sanitize-filename 1.6.3 → 1.6.4（本次）** | `src/components/HOC/enhanceSaveImage.js`：`getImageSavePath` 的作者/漫画目录、`getImageFileName`；均用 `{replacement:'_'}` | 纯 JS / CommonJS；唯一依赖仍为 `truncate-utf8-bytes ^1.0.0`。上游只将尾部点号/空格匹配改为线性扫描，API 保持。RN/JSC 不依赖 Node 新 API；仍须 Metro 和 APK 证明打包链 | T 的 `enhanceSaveImage.spec.js` 20 条，D/R；I 后保存单图/漫画并核对磁盘路径。B(1.6.3)，现有图片不用改名或清理 |
| 2 **prop-types 15.7.2 → 15.8.1** | 10 个组件/容器，包括 `BookmarkIllustButton`、`BookmarkNovelButton`、`IllustItem`、`UgoiraView.android`、各收藏/关注弹窗 | 纯 JS；registry **没有 peerDependencies**；依赖 `react-is ^16.13.1`、`loose-envify ^1.4.0`、`object-assign ^4.1.1`。需核对实际间接版本；`IllustItem` 的命名导入也须覆盖 | T/D/R；增加组件 mount 与 warning 断言，真机收藏/关注弹窗。B(15.7.2)，无持久化格式改变 |
| 3 **color 3.1.2 → 3.2.1** | `CommentList`、`NovelListViewItem`、`PXDropdown` 的主题颜色及 alpha 字符串 | 纯 JS/CommonJS；目标依赖 `color-string ^1.6.0`、`color-convert ^1.9.3`，可能扩大间接变化，必须逐项审查 lock；无 engine/peer 声明 | T/D/R；补 HEX/RGB/alpha 用例；深浅主题截图对比。B(3.1.2)，同时恢复相关间接锁定项 |
| 4 **qs 6.9.3 → 6.9.7** | `src/common/actions/` 的 25 个分页/排行/搜索 action，另有 `SearchFilterModal` 收藏数筛选，总计 26 个文件 | 纯 JS；Node `>=0.6`，无 runtime 依赖或 peer。小范围补丁候选，**不表示此版本解决所有当前安全问题**；解析边界可能影响分页与筛选 | T/D/R；补真实 `next_url`、重复键、空参数、收藏数/offset 和特殊键输入；真机翻页/搜索。B(6.9.3)，无存储迁移 |
| 5 **moment 2.24.0 → 2.29.4** | `searchPeriod`、`sagas/auth`；`CommentList`、`DetailFooter`、`DetailInfoModal`；`Backup`、`PastRanking`、`SearchFilterPeriodDateModal` 共 8 文件 | 纯 JS；Node `*`，无 runtime 依赖或 peer。跨度比首个试点大，日期解析/locale/时区与登录过期判断均须验证；不是最新版或完整安全治理结论 | T/D/R；补午夜/DST/日期边界与 token 过期用例；真机往期排行、筛选和备份命名。B(2.24.0)，不回写历史备份名 |
| 6 **react-native-localize 1.4.2 → 1.4.3** | `src/screens/MyPage/Feedback.js:115` 的 `getLocales()[0].languageTag` 和 `getCountry()` | 原生 Locale 桥；peer RN `>=0.56.0`。目标 Android 源码默认 AGP 3.5.3、SDK 29、build-tools 29.0.3，均须确认项目继承值（本项目 build-tools 29.0.2）。iOS Pod 另验 | T/D/R；补 Locale mock；I 后不同系统语言下打开反馈页，勿实际发送。B(1.4.2)，重新构建旧原生 APK，保留数据 |
| 7 **react-native-splash-screen 3.2.0 → 3.3.0** | `src/screens/App/App.js:140` 的 `hide()`；Android `MainActivity.java` 和 iOS `AppDelegate.m` 的 `show()` | peer RN `>=0.57.0`；发布包仍依赖 `com.android.support:appcompat-v7:26.1.0`，依赖既有 Jetifier/SDK override，不能只凭 peer 称 AndroidX 兼容 | T/D/R；I 后冷启动、后台恢复、闪屏消失，检查 native crash；iOS 启动另验。B(3.2.0)，重建覆盖安装，不能卸载 |
| 8 **react-native-linear-gradient 2.5.6 → 2.7.3** | `src/components/Tags.js` 的 `<LinearGradient colors=...>` | native View；React/RN peer `*`。包内 AGP 4.2.2 **只在独立打开 library 工程时启用**，作为 app 子模块不强制升级 AGP；SDK 默认 30 / min21，取 root ext 后仍须证明 AGP3.5/SDK29 编译 | T/D/R；I 后检查标签渐变边缘、主题切换，iOS 另验。B(2.5.6)，重建旧原生包 |
| 9 **react-native-device-info 7.0.2 → 7.4.0（暂缓）** | `apiClient.js` 启动时 `getModel/getSystemVersion`；`About`、`Backup`、`Feedback` 的版本、厂商、型号等，4 文件 | native；RN peer `*`。Android 有 installreferrer 和 Google IID / 可选 Firebase 分支；standalone AGP 默认4.1.1，app 子模块继承根工程。若需改变 Firebase/Google 组合，移交平台任务，不在 #15 推进 | T/D/R；I 后请求头/关于页/备份元数据/反馈设备信息，native smoke。B(7.0.2)，连同 native 解析结果回滚，不改历史备份数据 |

原始来源（元数据含精确 tarball URL；本地已解包核对四个 RN 候选的 `android/build.gradle`）：

- [sanitize-filename 1.6.4 registry](https://registry.npmjs.org/sanitize-filename/1.6.4)；[上游 v1.6.3…v1.6.4 diff](https://github.com/parshap/node-sanitize-filename/compare/v1.6.3...v1.6.4)。GitHub releases 页面无正式 release notes，依据代码差异。
- [prop-types 15.8.1](https://registry.npmjs.org/prop-types/15.8.1)、[color 3.2.1](https://registry.npmjs.org/color/3.2.1)、[qs 6.9.7](https://registry.npmjs.org/qs/6.9.7)、[moment 2.29.4](https://registry.npmjs.org/moment/2.29.4)。
- [localize 1.4.3](https://registry.npmjs.org/react-native-localize/1.4.3)、[splash-screen 3.3.0](https://registry.npmjs.org/react-native-splash-screen/3.3.0)、[linear-gradient 2.7.3](https://registry.npmjs.org/react-native-linear-gradient/2.7.3)、[device-info 7.4.0](https://registry.npmjs.org/react-native-device-info/7.4.0)。

明确排除：React、React Native、Node/JDK、AGP/Gradle/SDK/NDK 升级；全部 `@react-navigation/*`、navigation-backhandler 及手势/动画/screens/safe-area/viewpager 联动迁移；`@react-native-firebase/*` 平台迁移。Redux/saga/persist、AsyncStorage、文件存储、`rn-fetch-blob`、WebView、Pixiv API/parser 等接触全局状态、登录或数据格式的依赖不选首试。`bluebird`、lodash 单用途包等也没有因为“老”就自动升级或删除。

## 实施内容与验证命令

变更只有：manifest 精确锁定 1.6.4、lock 对应 tarball/integrity、20 条图片命名回归，以及修复旧 Jest 在 Windows `.codex` worktree 中的测试发现模式。没有修改 `src/` 或原生工程。没有可见界面变化；不制作无意义的 UI 前后截图。

Jest 原先使用 `<rootDir>/__tests__/**`，本环境展开为混合分隔符 `C:/Users/Andrew\\.codex/...`，结果 `37 files checked / 0 matches / No tests found`。改成 `**/__tests__/**` 后，仓库脚本仍通过 `--roots __tests__` 限定范围，且原有 `.worktrees` / `.pnpm-store` 排除保留。没有使用 `--passWithNoTests`。

在仓库根目录、PowerShell 7 执行：

```powershell
# npm 必须是 9.x，Node 必须是 14.21.3；本次工具隔离安装在 .dashboard/tooling/
. ./scripts/use-node14.ps1
& $env:PXVIEW_NODE .dashboard/tooling/package/bin/npm-cli.js ci --legacy-peer-deps --no-audit --no-fund

# T：全部 Jest；针对试点可追加 --runTestsByPath __tests__/components/enhanceSaveImage.spec.js
pwsh -NoLogo -NoProfile -File scripts/test-jest.ps1
& $env:PXVIEW_NODE node_modules/eslint/bin/eslint.js __tests__/components/enhanceSaveImage.spec.js
git diff --check

# D / R：按构建技能，串行执行；两者各自包含 T、Metro、独立 clean、assemble
# 本次复用已有 Gradle 缓存和 init.d 镜像；node_modules 属于独立 worktree
$env:GRADLE_USER_HOME = 'D:/Andrew/Code/Github/pxview/.gradle-user-home'
pwsh -NoLogo -NoProfile -File scripts/build-android-debug.ps1
# Release 的 clean 会删除 Debug 输出，先复制 Debug APK 到证据目录
Copy-Item android/app/build/outputs/apk/debug/app-debug.apk .dashboard/evidence/pxview-issue15-debug.apk
pwsh -NoLogo -NoProfile -File scripts/build-android-release.ps1

# I：只有设备连接且签名一致时才覆盖安装；本次尚未执行
pwsh -NoLogo -NoProfile -File scripts/install-android-release.ps1
```

升级使用 npm 9.9.4 的 `install sanitize-filename@1.6.4 --save-exact --legacy-peer-deps --package-lock-only --ignore-scripts --no-audit --no-fund`，随后完整 `npm ci`（包含 postinstall Jetifier）。锁文件共 1741 个 package entry，仅根依赖声明和 `node_modules/sanitize-filename` entry 变化；没有间接包变化。

本地 `google-services.json` 从原仓库复制到独立 worktree，保持 gitignored，没有输出其内容或创建新 Firebase 配置。Release 使用仓库 `android/app/debug.keystore`；产物是验证 APK，不是正式发布。

Debug 脚本的既有默认行为会用机器上的 debug key（证书 SHA256 `56c06d…cc3a30`）。本次未更改原生构建配置，而是在保存 APK 后使用 SDK 29.0.2 的 `apksigner` 重新签为仓库证书，再做 `verify --verbose --print-certs`。最终 Debug 证书 SHA256 是 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`，v1/v2/v3 验证通过。上面的 D 命令只会生成原始 Debug 包；重现本次可安装身份需追加：

```powershell
. ./scripts/use-android-jdk11.ps1
& "$env:JAVA_HOME/bin/java.exe" -jar "$env:ANDROID_HOME/build-tools/29.0.2/lib/apksigner.jar" sign --ks android/app/debug.keystore --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --out .dashboard/evidence/pxview-issue15-debug-reposigned.apk .dashboard/evidence/pxview-issue15-debug.apk
Copy-Item .dashboard/evidence/pxview-issue15-debug-reposigned.apk .dashboard/evidence/pxview-issue15-debug.apk
& "$env:JAVA_HOME/bin/java.exe" -jar "$env:ANDROID_HOME/build-tools/29.0.2/lib/apksigner.jar" verify --verbose --print-certs .dashboard/evidence/pxview-issue15-debug.apk
```

## 证据与边界

本地完整日志和 APK 存于 `.dashboard/evidence/`（不提交）。命令与最终结果在此保留，以下状态截至 2026-09-27 04:03 EDT。

| 层次 | 结果 | 证据 |
| --- | --- | --- |
| 原始 lock 干净安装 | 通过：1730 packages，Jetifier 1441 files | `npm-ci-baseline.log`；Node14 / npm9 |
| 原始业务测试 | 原有 36 suites / 215 tests 通过 | `jest-baseline.log`；当时新测试 mock 尚待修复，故该轮整体 exit1，不称全绿 |
| 新命名用例对旧版 | 20/20 通过 | `jest-naming-baseline.log`；用 moduleNameMapper 指向安装时留存的真实 1.6.3 源码，不 mock 算法 |
| 升级 lock 干净安装 | 通过：1730 packages，Jetifier 1441 files | `npm-ci-pilot.log` |
| 顶层依赖树 | 两次安装后均通过 | PR #10 原脚本经 `vm` 映射执行，当前安装为 1.6.4 |
| 升级全量测试、Metro、Debug | 通过：37 suites / 235 tests；assemble 760 tasks / 2m43s；exit0 | `build-debug.log`；APK已复制保留 |
| Release | 通过：再次 37 suites / 235 tests；Metro；assemble 815 tasks / 5m31s；exit0 | `build-release.log` |
| APK 签名 / SHA256 / 内置 JS | 通过；两包同仓库证书、同 bundle hash，包含四 ABI 的 libjsc.so | `debug-signature.log`、`release-signature.log`、`apk-integrity.json` |
| ESLint 新测试 / diff whitespace | 通过 | 定向 ESLint、`git diff --check` |
| 真机 / iOS | **待验** | ADB devices 列表为空；没有执行安装、清数据、卸载或 iOS 构建 |
| 远端 CI / commit / push / PR / merge | **未执行** | 本任务不包含这些发布操作 |
| 独立审查 | 无阻塞问题 | `smart_reviewer` 429失败；改用独立 `gemini_worker` 审查单库diff、测试mock/glob、矩阵与回滚；APK内bundle hash建议纳入收尾 |

最终产物（Debug 是已重新签名副本；不要把原始机器证书的 Debug 包当作该产物）：

| 文件（相对仓库） | 大小 bytes | SHA-256 |
| --- | ---: | --- |
| `.dashboard/evidence/pxview-issue15-debug.apk` | 49,981,279 | `5b4dbc2dd6be85a447884804fa2488386cebb032657646bfdd75b8cf99234c5e` |
| `.dashboard/evidence/pxview-issue15-release.apk` | 35,761,735 | `857007566b553a127602a7439511461066508bccea1a483a2d2a5e8d523d36d6` |

二者 `assets/index.android.bundle` SHA-256 均为 `362c4a18e49016c3336854ff414952bb5b306c39a3eb2ca3a61b1c5695865f0f`，与打包输入逐字节一致；签名证书 SHA-256 均为 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`。Debug v1/v2/v3、Release v1/v2 验证通过。APK 覆盖 arm64-v8a、armeabi-v7a、x86、x86_64 的 JSC 库，但不代表四种设备已测试。

排除 CRLF/LF 差异后，生成 bundle 对比基线只有第 1312 行模块改变，包含 1.6.4 的反向线性扫描实现。升级 bundle 保存为 `.dashboard/evidence/pilot-index.android.bundle`。核对完两包后，仅用开工时留存的 `baseline-index.android.bundle` 恢复 tracked bundle，避免提交构建产物；没有撤回用户工作。之后重建必须运行上述仓库脚本重新 bundle，不能直接打包仓库内旧 bundle 或用 `-x bundle...` 单独绕过脚本。

新增用例覆盖三种命名模式、作者目录、漫画目录、中文/emoji、非法/控制字符、Windows 保留名、尾部空格/点号、UTF-8 255-byte 截断和 iOS 路径选择。它只证明路径计算；native 文件写入、权限、图库扫描、下载与真实 JSC 性能必须通过设备验证。

现有长名称语义保留：255-byte 截断可能切掉扩展名，截断后的纯点号/空格目录可能被再次清理为空，不应把这些既有边界解释为本次新修复；未为了试点改变保存策略或重命名用户文件。

## 回滚 B 与真机待验

每个候选独立保存升级前的 manifest/lock。**B(旧版本)**：只逆转该包的 manifest 与 lock 差异（包括它引入的间接变化），恢复表中已锁版本，然后用 Node14/npm9 重跑 `npm ci --legacy-peer-deps`、T/D/R。不要对有后续工作或用户修改的仓库整文件 `git restore`、reset 或 clean。原生候选必须重建旧版 APK；仅回滚 JS bundle 不够。

本试点可在另一个基于 `834c1a2` 的 worktree 重建旧 APK，不影响当前工作。精确逆向项：manifest 和 lock 根 `sanitize-filename` 声明恢复 `^1.6.1`，包 entry 恢复 1.6.3 及基线中的 tarball/integrity；其他依赖和数据不变。Jest 路径修复和行为测试可保留。安装回滚包仍只允许相同签名的 `adb install -r`，若出现 `INSTALL_FAILED_UPDATE_INCOMPATIBLE` 则停止核对签名，不能卸载绕过。

设备验收顺序（Debug 和 Release 分别记录设备型号、Android 版本、APK hash、结果）：

1. 覆盖安装前记录现有登录态、保存设置、图片目录；覆盖安装后确认三者保留。
2. 打开应用、登录/恢复既有会话、列表/详情/小说阅读与内联图作基本回归。
3. 分别选择作品 ID、标题、ID+标题命名；保存中文、emoji、斜杠/冒号标题单图，实际查看文件名和可打开性。
4. 作者名/ID+作者名目录以及漫画独立目录，连续保存多页；检查顺序、路径、图库可见性和重复保存行为。
5. 尾部点号/空格、很长名称、拒绝存储权限后重试，记录既有边界；不要清理旧图片或重置设置。
6. 如需回滚，覆盖安装同签名旧包并再次检查既有设置和图片。iOS 如要交付，另在 macOS 构建并验相册权限与保存。

所有设备项当前都未勾选。满足构建/测试不等于 Issue 完成真机验收；当前分支需先整合历史再进入另行授权的 PR 流程。
