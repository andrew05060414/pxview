# PXView Phase 2B：启动稳定性与 PXRead 分享准备

**日期：** 2026-09-11  
**状态：** 今天阶段完成；真实 PXRead PWA 分享仍待设备/部署条件  
**范围：** 构建护栏、启动闪退修复、分享语义；不做 RN/AGP 大版本升级

## 本阶段结果

- 发现并修复一个可复现的启动闪退：旧 AGP 在 NDK 26 上无法完成 native symbol strip；绕过 strip 会导致 APK 缺少 `libjsc.so`，启动时回退到 Hermes 并抛出 `UnsatisfiedLinkError`。
- 安装官方 NDK r21e（`21.4.7075529`）到本机 SDK，并在 `android/app/build.gradle` 显式锁定该版本；恢复正常 native strip。
- Jest Windows/Unix 脚本默认使用仓库内 `.jest-cache`，支持 `PXVIEW_JEST_CACHE_DIR` 覆写；`.jest-cache/` 已忽略，避免系统临时目录权限导致测试不可运行。
- Debug/Release 构建脚本都将 `clean` 与 `assemble` 分开；没有保留会产出空 native 库的 `-x strip*` workaround。
- PXRead 文案改为“分享链接到 PXRead”（各语言），明确当前实现是系统分享目标，不是假设 native 一键导入。

## 验证证据

- `pwsh -NoLogo -File .\scripts\test-jest.ps1`：36 个测试套件、215 项通过。
- `pwsh -NoLogo -File .\scripts\build-android-debug.ps1`：成功；Debug APK 生成。
- `pwsh -NoLogo -File .\scripts\build-android-release.ps1`：成功；Release APK 正常执行 `stripReleaseDebugSymbols`。
- Release APK 包含 `lib/arm64-v8a/libjsc.so` 与 `libjscexecutor.so`。
- 最终 Release APK：`android/app/build/outputs/apk/release/app-release.apk`；SHA-256 `A3F5E12DFE0E25544CB2870E39784BF2B1363927165D1CE3E14815F91C2343AC`。
- 小米设备 `ffd08f1`：`adb install -r` 成功，未卸载/清数据；启动后进程保持运行 30 秒，`MainActivity` resumed；该窗口无 `FATAL EXCEPTION`、`UnsatisfiedLinkError`、OOM 或 `root tag`。

## PXRead 桥接边界

- PXView 当前通过 `react-native-share` 分享标准 Pixiv novel URL；“分享到 PXRead”与普通分享共用系统分享面板。
- PXRead 已有 `POST /share/pixiv` Web Share Target、Service Worker ID 提取、`/import?source=pixiv&pixiv_id=...`、`pixiv-novel-preview` 和 `preview → confirm` 链路；没有发现需要在 PXView 新增 Cookie/native bridge 的缺口。
- 当前只传 URL/正文导入，不携带 `textEmbeddedImages`；PXRead 侧图片保真是后续独立能力。
- 未完成：真实部署 PWA 安装/刷新、系统分享面板选择 PXRead、有效 `PXREAD_PIXIV_SESSION_COOKIE`、手机端预览确认和重复导入 UAT。

## 工作区边界

- 没有 commit、push、merge、reset、clean 或卸载应用。
- 仓库原有大量用户 WIP 与生成文件仍保持原状；本阶段新增/修改的相关路径为测试/构建脚本、`android/app/build.gradle`、本地化文案及本阶段记录。
