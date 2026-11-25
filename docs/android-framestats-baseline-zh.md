# Android 阅读器帧耗时：离线复算

这是 [#14](https://github.com/andrew05060414/pxview/issues/14) 的测量工具，不是 PXView 实机基线。已有一份 `dumpsys gfxinfo com.utopia.pxviewr framestats` 的 UTF-8 文本就能用；不需要连接设备、构建 app 或 `npm install`。

```sh
# 在仓库根目录运行；60 是本轮记录的固定刷新率（整数 Hz），不是默认值
node scripts/analyze-gfxinfo.js reader-run-01.txt 60
# 仅验证解析器；输入为合成数据，不可用于评估 PXView
node scripts/test-gfxinfo.js
```

## 如何读结果

- `frames` 只计成对 `---PROFILEDATA---` 内的有效窗口帧记录。列按表头名称识别，不取 dump 顶部的累计 `Janky frames`。多个窗口块合并计数（`profile_blocks`），同一屏幕刷新可能有多个窗口记录；每个文件只放**一轮的一次 dump**。
- 单帧耗时 = `FrameCompleted − IntendedVsync`（原始时间戳单位 ns，1 ms = 1,000,000 ns）。`p95_ms` 是有效耗时升序中第 `ceil(0.95 × frames)` 个值。它描述 HWUI 帧完成时间，不是画面实际呈现时间、触摸延迟或 FPS。
- `over_budget_frames` 只计耗时**严格大于** `1000 / refresh_hz` ms 的有效帧，在整数纳秒上比较。60 Hz 约为 16.667 ms，120 Hz 约为 8.333 ms。这是固定预算指标，**不是** Android 的 jank 判定或掉帧数；动态刷新率场景不能直接这样比较。
- 行宽或必需数值无效、时间戳为零/逆序/相等、完成时间为未完成哨兵值（有符号 64 位最大值）的记录不参与统计。`excluded_flagged` 单列格式可读但 `Flags ≠ 0` 的记录，其余排除行计入 `excluded_invalid`。缺表头、文件截断未闭合或没有有效帧时命令失败，不输出误导性的零值。

## 怎样留下可比的实机样本

以下是**以后获准采样时**的人工流程，分析脚本不会执行任何 `adb` 命令。

1. 记录设备型号、Android 版本、固定刷新率、release APK 的 commit、作品/章节、字号和网络/缓存状态。例：选同一已加载的纯文字小说，固定竖屏、字号，回到同一阅读起点；先预热一遍。不清 app 数据。
2. 每轮从静止的同一界面开始。人工运行 `adb shell dumpsys gfxinfo com.utopia.pxviewr reset` **只重置图形诊断统计**，不是清除应用存储。做一次相同手势（例如在阅读页用 300 ms 从屏高 80% 滑到 30%），待滚动停止后立刻运行 `adb shell dumpsys gfxinfo com.utopia.pxviewr framestats > reader-run-01.txt`。每轮用新文件名；窗口历史是有限缓冲区，不能用一份长会话的末尾倒推全部操作。
3. 同一条件至少重复 3 轮；逐轮保留原始文本、`frames`、排除计数、`over_budget_frames / frames` 和 `p95_ms`。若窗口集合、刷新率或操作不一致，或日志截断/排除异常，重新采样，不比较。候选改动只改一个变量，以相同流程采对照，不能从一次高值断言原因。

本切片不测冷启动、首屏、图片请求或内存；无真实输入时没有实机跑分，也没有优化结论。
