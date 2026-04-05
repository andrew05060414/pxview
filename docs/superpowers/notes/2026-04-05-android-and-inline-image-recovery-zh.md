# PXView Android 环境恢复 + 小说内联图片修复复盘（2026-04-05）

## 1. 目标与范围

本次工作有两个主目标：

1. 让这个老 React Native 工程重新能稳定产出可安装 APK（至少 debug 包可用）。
2. 修复 Pixiv 小说正文中的内联图片显示问题（`[loadedimage:*]` / `[uploadedimage:*]` 不再裸文本显示）。

这份文档按“排障流程”记录：问题现象 -> 假设 -> 验证 -> 结论 -> 落地修复。

---

## 2. 初始问题现象

### 2.1 Android 打包/运行侧

- 旧工程在当前机器/工具链下构建不稳定。
- 即使能出包，也出现“能安装但运行不稳/启动链路异常”的情况。
- 在部分会话中，`assembleDebug` 受本地环境影响失败（例如 socket 相关异常）。

### 2.2 小说内联图片侧

- 小说正文中存在内联图片标记：
  - `[loadedimage:24095674]`
  - `[uploadedimage:24115550]`
- 阅读器中无法在对应文本位置渲染图片，出现裸标记或 `Image unavailable`。

---

## 3. 排障流程（从环境到功能）

## 阶段 A：先恢复“可迭代环境”

### A-1. 修基础工具链兼容

- 清理旧 Gradle/JVM 配置中的过时参数（典型如 `MaxPermSize`）。
- 统一 Android 构建变量（`ANDROID_HOME` / `ANDROID_SDK_ROOT` / `JAVA_HOME` / `GRADLE_USER_HOME`）。

目的：先让工程具备“可构建、可运行、可重复”的基本前提。

### A-2. 处理调试环境不稳定

在当前机器环境下，完整 `assembleDebug` 并非每次都稳定，所以采用过渡策略：

1. 基于已可用包作为 base。
2. 重新生成 `index.android.bundle`。
3. 注入 APK。
4. `zipalign`。
5. `apksigner` 重签名。

这套流程适用于 **JS 主导变更** 的快速迭代，不等于永久替代原生全量构建。

### A-3. 最后回到标准构建验证

清理掉调试期间残留的重复资源（例如 `android/app/src/main/res` 下由 `bundle --assets-dest` 留下的文件），避免 `:app:mergeDebugResources` 的 Duplicate resources。

然后重新执行 `.\gradlew.bat assembleDebug --no-daemon`，确保最终环境可回到标准构建路径。

---

## 阶段 B：定位并修复“小说内联图片”

### B-1. 第一层修复：让渲染器“会画图片”

先补齐解析和渲染链路：

- 解析层识别 `loadedimage` / `uploadedimage` / `pixivimage`。
- 在 `NovelViewer` 中加入内联节点渲染，而不是把标记当纯文本。

这一阶段解决的是“组件能力”，不是数据源正确性。

### B-2. 第二层修复：确认“数据源给不给 metadata”

关键排查结论：

- 旧 `novelWebview` 路径（`/webview/v2/novel` + legacy `novel:` 对象解析）对 `uploadedimage` 元数据覆盖不足。
- 真正能稳定提供内联上传图片元数据的是：
  - `https://www.pixiv.net/ajax/novel/{id}`
  - 使用 `body.content` + `body.textEmbeddedImages`

### B-3. 最终方案

在 saga 中改为：

1. 优先请求 `ajax/novel/{id}`。
2. 正常解析 `body.content` 与 `body.textEmbeddedImages`。
3. 仅在 ajax 失败时回退旧 webview 路径。

这一步是“从能渲染”到“拿到正确图片数据”的决定性修复。

---

## 4. 关键代码落点

核心修复主要在：

- `src/common/sagas/novelText.js`
- `src/common/helpers/novelAjaxParser.js`
- `src/common/helpers/novelInlineImage.js`
- `src/common/helpers/novelTextParser.js`
- `src/components/NovelInlineImage.js`
- `src/components/NovelViewer.js`
- `src/screens/Shared/NovelReader.js`

辅助诊断与回退相关：

- `src/common/helpers/novelWebviewParser.js`
- `src/common/helpers/novelWebviewDebug.js`
- `src/common/helpers/novelWebviewImageCandidates.js`

---

## 5. 验证结果

- Jest：`9/9 suites, 85/85 tests` 通过（图片相关解析、saga、渲染链路均覆盖）。
- Android：最终可重新产出 `app-debug.apk`。
- 实机/模拟器验证：小说内联图片在正文位置渲染，不再是裸标记文本。

---

## 6. 分支整理与交付策略

后续为了可审查、可 PR，采用了分支分层：

- `codex/novel-inline-images-pr`：仅保留“内联图片支持”主线（推荐用于给主仓库提 PR）。
- `codex/novel-inline-images-ready`：整合版（包含环境/打包稳定性与文档等附加内容）。

建议：

- 对外 PR 走 `codex/novel-inline-images-pr`，变更最聚焦、review 成本最低。
- 环境恢复经验以文档沉淀，不把本地调试产物（`.gradle-hacks`、临时脚本、缓存目录）带入正式提交。

---

## 7. 这次问题的最终结论（TL;DR）

1. 图片显示失败并不只是 UI 问题，本质是 **旧数据源拿不到关键 metadata**。
2. Android 构建不稳并不代表功能不可交付，先通过可重复打包路径保持迭代速度，再回归标准构建校验。
3. 把“功能修复”和“环境救援”拆分成可审查分支，是这次能顺利收敛并可 PR 的关键。

