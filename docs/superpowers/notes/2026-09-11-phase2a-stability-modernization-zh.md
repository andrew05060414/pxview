# PXView Phase 2A：稳定性硬化与受控现代化

**日期：** 2026-09-11  
**状态：** 首轮完成；真机与跨应用验证仍未完成  
**范围：** 不覆盖 React Native、AGP、Gradle、Firebase 或 React Navigation 的核心大版本升级

## 目标

在保留当前用户 WIP 的前提下，先处理有证据支持、可以独立回滚的小改动：

1. 保护 reader 内联图行为。
2. 减少同一 `illustId` 的并发 detail 请求。
3. 选择一个只影响开发工具、不进入运行时的依赖升级候选。
4. 为后续真机 UAT、PXRead 整合和更大范围迁移保留清晰边界。

## 本轮决策

- 不重写 reader，也不关闭 preload；性能改动限定为 in-flight 请求去重。
- `NovelInlineImage` 只共享尚未结束的 `pixiv.illustDetail(imageId)` Promise；成功或失败后立即清理，不建立永久缓存。
- 首个依赖候选选择 `prettier` `^2.0.1 -> ^2.8.8`。它是 dev-only，`prettier@2.8.8` 要求 Node `>=10.13.0`，现有 `eslint-plugin-prettier@3.1.3` 兼容 `prettier >=1.13.0`。
- 保持 npm lockfile 体系；安装需要 `--legacy-peer-deps`，因为现有 `react-native-elements@0.18.5` 与 `react-native-vector-icons@6.6.0` 存在历史 peer 冲突。该冲突被记录为后续依赖治理问题，没有在本轮掩盖或顺手修复。
- 当前脏工作区中的其它修改属于用户 WIP；本轮没有 reset、clean、merge、commit 或 push。

## 依赖升级分层

| 层级 | 范围 | 本轮决定 |
|---|---|---|
| A：开发工具 | Prettier、测试/格式化辅助包 | 可单独升级；本轮完成 Prettier 2.8.8 |
| B：纯 JavaScript 运行时库 | 不含 Android/iOS 原生代码的业务依赖 | 后续一次一个，先做 API/行为回归 |
| C：React Native 叶子库 | 图片、存储、导航周边和已迁移组织的库 | 需要逐库评估迁移成本，不在本轮批量替换 |
| D：核心平台栈 | React Native、React、Navigation、Firebase、AGP、Gradle、JDK | 单独迁移项目；本轮明确不动 |

当前最安全的下一候选仍是 A 层；B/C 层需要逐项建立调用面和真机验证证据，D 层保持独立路线。

## 实际改动

- `src/components/NovelInlineImage.js`
  - 增加同一图片 ID 的 in-flight detail 请求复用。
  - 删除因动态窗口宽度改动而遗留的未使用 `globalStyleVariables` import。
- `__tests__/components/NovelInlineImage.spec.js`
  - 增加并发请求只调用一次的回归测试。
  - 让原有 in-flight 测试在结束时释放 deferred 请求。
- `package.json` / `package-lock.json`
  - 将 dev-only `prettier` 更新到 `^2.8.8`。

## 验证证据

- `node scripts/verify-dependencies.js`：通过。
- focused reader tests：52 项通过。
- 主工作区全量 Jest：36 个测试套件、215 项通过。
- 隔离 Prettier worktree：实际安装 `prettier@2.8.8`，36 个测试套件、213 项通过。
- `git diff --check`：无实际空白错误；仓库仍会提示既有 LF/CRLF 转换警告。

## 未完成或未验证

- Android debug/release 构建和真实设备启动：本轮未声称完成。
- 真机内联图、折叠屏、冷启动内存和真实网络性能：`unverified`。
- PXView → PXRead 生产接线：因部署、设备和安全凭据前置条件未满足，保持 `blocked`。
- Multica/Gemini 派发：当前 Multica 连接受本机代理不可达影响，未声称派发成功。
- ESLint 全量干净：旧 CRLF 基线会产生大量格式噪声；当前 WIP 测试中仍有独立的风格问题，未扩大本轮范围。

## 下一步建议

1. 在隔离分支执行 Android debug 构建，并安装到实际设备。
2. 用真实 Pixiv fixture 验证内联图、reader 页面顺序和失败回退。
3. 重新评估低风险 devDependency，再考虑单类库的中风险替换。
4. PXRead 部署和真机条件具备后，只验证现有 URL 分享桥，不新增 native bridge。
