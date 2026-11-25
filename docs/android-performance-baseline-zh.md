# PX-204：Android release 性能基线（未登录）

对应 [#14](https://github.com/andrew05060414/pxview/issues/14)。这轮只测到未登录路径，不代表登录后的首页或阅读器，不包含应用优化。

## 固定条件

- 2026-11-25 UTC；Linux x86_64，Intel Xeon，KVM；Android Emulator 37.3.10（16970787），Android 10 / API 29 默认 x86_64 系统镜像（r08，QSR1.210820.001），2 vCPU，2 GiB RAM，SwiftShader，720 × 1280、320 dpi、竖屏、60 Hz。
- 安装 [v5.3.5 release APK](https://github.com/andrew05060414/pxview/releases/tag/v5.3.5)（versionCode 408、x86_64；标签提交 `f18a76fa4201fa07f01a88683a15b3c4dfce652a`；APK SHA-256 `1db614f1f18d6c40c861243fb8e1d73a3d9d2a1ed3482f84718163bc01071fe7`）。标签之后的代码不在这份基线内。
- 模拟器 Wi-Fi 在线，无代理；新装后正常启动一次预热，未登录，五轮之间不清数据、不清磁盘缓存。启动样本是同一安装实例的登录页；登录页推荐图由服务端提供，不是固定的单图样本。

## 复测命令

先等模拟器完成启动并解锁，装 APK、确认版本，按上述条件预热。不要并行运行构建或测试。只有一台设备时可省略 `ANDROID_SERIAL`。

```sh
export ANDROID_SERIAL=emulator-5556
app=com.utopia.pxviewr
mkdir -p px204-captures
for n in 01 02 03 04 05; do
  adb shell input keyevent KEYCODE_HOME
  adb shell am force-stop "$app"
  test -z "$(adb shell pidof "$app" || :)" || exit 1
  sleep 5
  adb shell am start -W -n "$app/.MainActivity" \
    -a android.intent.action.MAIN -c android.intent.category.LAUNCHER \
    > "px204-captures/$n-start.txt"
  sleep 5
  adb shell dumpsys meminfo "$app" > "px204-captures/$n-memory-05.txt"
  sleep 25
  adb shell dumpsys meminfo "$app" > "px204-captures/$n-memory-30.txt"
  adb shell dumpsys gfxinfo "$app" framestats > "px204-captures/$n-gfxinfo.txt"
  node scripts/analyze-gfxinfo.js "px204-captures/$n-gfxinfo.txt" 60
  sleep 10
done
```

- `am start -W` 必须为 `Status: ok`、`LaunchState: COLD`。`TotalTime` 是 Android 记录的 Activity 首次绘制耗时（TTID 口径），用作冷启动/首绘指标；`WaitTime` 还包括命令等待开销，两者都不是已登录内容加载完成时间。预热和第 04 轮的画面层级均确认出现了 `LOGIN`，其余采样轮的 UI dump 等不到空闲。复测时用等待代替 UI dump，不拿它计首个可操作画面的耗时。
- 内存取 `dumpsys meminfo` 的 `TOTAL` PSS（KiB）。约 5 秒和约 30 秒从 `am start -W` 返回开始计，第二次加上首次采样耗时；两次快照不测峰值，也不能证明有或没有泄漏。
- 帧统计用 [离线解析器](android-framestats-baseline-zh.md)；这是约 30 秒后还在 HWUI 缓冲区里的窗口帧，不是整个启动区间、屏幕呈现帧或阅读器帧。报告有效帧、超 60 Hz 预算帧和逐轮 P95，不把五轮的 P95 当作合并样本的 P95。

## 五轮实测

所有轮次都是进程冷启动，帧样本各一个窗口，无排除帧。

| 轮次 | 首绘（ms） | WaitTime（ms） | 约 5 秒 PSS（KiB） | 约 30 秒 PSS（KiB） | 超预算帧 / 有效帧 | 帧耗时 P95（ms） |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 01 | 402 | 403 | 179133 | 195309 | 2/120 | 11.685 |
| 02 | 362 | 369 | 179079 | 194736 | 70/120 | 21.675 |
| 03 | 399 | 400 | 177234 | 197432 | 120/120 | 22.103 |
| 04 | 431 | 433 | 178365 | 194337 | 90/120 | 22.194 |
| 05 | 397 | 399 | 180058 | 189071 | 5/120 | 10.180 |

首绘中位数 **399 ms**，范围 362–431 ms；约 5 秒和约 30 秒的 PSS 中位数分别为 **179079 KiB** 和 **194736 KiB**。窗口帧的逐轮 P95 相差 10.180–22.194 ms，三轮高于 60 Hz 的 16.667 ms 预算。这里没有线程归因，且软件 GPU 和模拟器宿主负载会影响帧时间，不能据此选择产品代码优化点。

额外一轮在启动前用模拟器的 `adb emu network capture start px204-unauth-start.pcap` 开始抓包，启动后约 30 秒执行 `adb emu network capture stop`。DNS 记录观察到 `i.pximg.net`，TLS 握手中观察到 `app-api.pixiv.net`、`i.pximg.net`。这只验证未登录路径有图片 CDN 网络活动；抓包是设备级的，HTTPS 下不能从包数推导图片请求数、状态、耗时或缓存命中。这一轮不计入五轮启动结果。

## 阅读器和图片的正式采样

当前没有可用的已授权 Pixiv 测试会话。`src/screens/App/App.js` 在没有 `auth.user` 时挂载 `AuthNavigator`，其中没有阅读器或登录后首页。因此阅读器进入/切换、逐图请求、登录后首屏和长时间内存变化没有可报告的数值，不能用登录页或合成数据代替。

下一轮使用同一设备和一套有授权的测试账号。采样前登记默认首页标签、两篇可读小说的作品 ID（纯文字一篇、含内嵌图一篇）、目标章节/切换位置、内嵌图 ID 和顺序、字号、主题及缓存状态；全程锁定，不混合登录/未登录数据。

1. **登录后首屏**：在不清凭据的前提下强停并按同样步骤冷启；记录 Activity 首绘，并另外用相同埋点记录目标首页首个列表项可见时间。
2. **阅读器**：每轮从同一作品详情静止状态开始；点「阅读」到正文首块可见；按固定手势序列滚到固定位置，再从同一入口切换到另一篇并等首个正文块可见。分别记录输入至可见耗时，并按 [帧采样流程](android-framestats-baseline-zh.md) 独立记录进入、切换、滚动三段。每段同条件至少五轮。
3. **图片与内存**：同一序列分开记录首次加载和复访缓存命中。用相同的 release 诊断配置在图片加载边界记录匿名样本 ID、缓存结果、请求开始/结束、结果码及字节；不记录请求头或账号数据。启动后占用、进入阅读器后的 PSS、固定序列往返后的 PSS、退出后 30 秒的 PSS 分开记录。

## 候选优化

不修改启动、阅读器或图片加载逻辑。未登录基线只用于以后回归对比，不能归因于某一个模块。阅读器的渲染、内嵌图预取和缓存都等待上述同条件的测量；当前路径不执行这些代码，改动不会验证所针对的热点。若重复采样显示可归因的回归，在独立提交中只改一个变量；保留改动前后五轮数据及同一操作序列的功能检查，以该提交为回滚点。
