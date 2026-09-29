# PXView 小说排行榜检索：接口与实现研究

日期：2026-09-24。先做代码与公开资料研究；随后按用户要求在此隔离 worktree 做了移动端榜单入口实现。未构建/安装应用、未请求 Pixiv 接口。

## 本轮实现状态

已在 `src/common/constants/index.js`、`src/common/sagas/ranking.js`、`src/screens/Ranking/NovelRanking.js` 中把现有 App OAuth 小说榜单的 R-18 每日、本周、男性热门、女性热门，以及账户允许时的 R-18G 模式接到原生可滚动标签。账户 `x_restrict` 决定标签是否出现；切换账户限制时重建标签。`src/screens/Ranking/NovelRankingList.js` 刷新时保留历史日历选定的模式和日期。原有普通榜单与 `next_url` 翻页路径继续使用同一个客户端。

已对四个改动 JS 文件运行 Babel JSX/语法解析，并运行 `git diff --check`。未运行 Jest、Android 构建、安装或真机 API 验收：worktree 无 `node_modules`，当前没有可安全使用的 Pixiv 授权探测路径。AI 生成榜**没有**接入生产页面；公开网页资料有 `weekly_r18_ai`，但现有移动端客户端的对应模式与网页会话均未经验证。可见界面变化只能按代码核对，尚无前后截图或真机验收。

**关键未完成项：简体中文作品筛选。** 用户随后确认这是移植的必需条件。Pixiv [官方帮助](https://www.pixiv.help/hc/zh-cn/articles/4408928116761-%E5%A6%82%E4%BD%95%E5%B0%86%E5%B0%8F%E8%AF%B4%E6%8E%92%E8%A1%8C%E6%A6%9C%E7%9A%84%E4%BD%9C%E5%93%81%E4%BE%9D%E4%B8%8D%E5%90%8C%E8%AF%AD%E8%A8%80%E6%98%BE%E7%A4%BA)说明网页版榜单支持作品语言筛选，而官方 App 版不支持。[pixivpy 当前 `NovelInfo` 模型](https://github.com/upbit/pixivpy/blob/master/pixivpy3/models.py)列出 `text_length` 等移动端字段，却没有 `language`；本 worktree 也没有可验证该字段的真实响应。第三方 [Web AJAX 记录](https://github.com/FreeNowOrg/PixivNow/blob/master/docs/pixiv-web-api.md)列出榜单项的 `language`，但网页会话与实时响应未获验证，不能安全接成可用筛选。`lang=zh` 指界面语言，不能代替作品语言 `zh-cn`。因此当前代码只做了 R-18 模式入口，**不能称为用户要求的完整移植**；没有用标题、字形或正文猜测语言。

达到完整移植的验证与实现顺序：① 在合法已登录、无需提取 Cookie 的测试路径里，少量核对 Web 榜单对 `mode/date/p` 的响应、R-18 会话和 `language` 值，确认是否有服务端作品语言参数；② 若无服务端筛选，就在榜单摘要上仅保留明确 `language === 'zh-cn'` 的项，并把未知语言单独标记，按原始名次展示、缺屏时有界补页；③ 原生 UI 提供“全部语言／简体中文”选择，缓存键含账号、榜单模式、日期与作品语言；④ 网页会话不可用时显示来源错误，不把 App Bearer 发往网页域名，也不回退到标题猜测。AI 模式须走同一已验证的榜单来源。浏览器安全策略阻止本环境直接访问 Pixiv 网页，本轮不能完成第①步。

## 最终确认的移植目标

用户给出的目标是 Pixiv 网页 `https://www.pixiv.net/novel/ranking.php?mode=daily_r18`：在 PXView **原生列表**呈现小说榜单，能切换 R-18 今日、本周、AI 生成、男性热门、女性热门，并按日历选历史日期。这是 Pixiv 官方榜单的入口；之前讨论的“R-18 男性向原创分类全量人气榜”是另一个功能，不能混在同一数据源。

### 网页链接和可调用接口

`/novel/ranking.php?mode=daily_r18` 是网页入口，`mode` 选择榜单，不是一个承诺给第三方使用的公开 API 文档地址。第三方对 Pixiv 网站请求的记录指出，页面的小说榜单数据可通过 `GET /ajax/ranking/novel?mode=daily_r18&content=novel&p=1` 取得，响应封装为 `error/message/body`，条目据称位于 `body.display_a.rank_a`。网页模式名还包括 `weekly_r18`、`weekly_r18_ai`、`male_r18`、`female_r18`；这些是**第三方记录，非本次抓包实测**。[PixivSource 接口记录](https://github.com/DowneyRem/PixivSource/blob/main/doc/PixivWebApi.md)、[PixivNow 接口记录](https://github.com/FreeNowOrg/PixivNow/blob/master/docs/pixiv-web-api.md)。Pixiv 官方帮助确认网站/应用有这些类型的榜单，但在本次检索中未找到 Pixiv 对外发布的小说榜单 REST API 契约；不能把内部网页 AJAX 当成官方稳定开放接口。[官方榜单帮助](https://www.pixiv.help/hc/en-us/articles/230700147-What-types-of-rankings-are-there-available)。

**访问与验证边界**：直接打开用户给出的 Pixiv 网页被本环境的浏览器安全策略拒绝；遵守拒绝结果，未改用命令行、其他浏览器或应用绕过。因此无法确认当前网页实际的请求、日期参数、Cookie 行为、页数或响应字段。第三方资料认为 R-18 网页榜单需要网页会话及账户显示设置；PXView 已有的 App OAuth Bearer 不能直接当作网页 Cookie，也不能发往 `www.pixiv.net`。没有单独公开的 API key 可直接替代该会话。

2026-09-24 用户明确授权后，对**同一个网页地址**做了一次直接重试，仍被浏览器工具的站点安全策略拒绝，导航没有开始。工具明确指出没有用户许可提示、也没有自动审批尝试；它没有披露触发拦截的具体判定规则。因此只能确认“当前浏览器工具禁止访问这个 URL”，不能归因于用户授权、Pixiv 登录、R-18 设置、网络或文件系统权限。工具明确禁止改用其他方式绕过；本次未尝试绕过。

公开客户端源码进一步缩小了技术未知项：[PixivKit `RankingApi.get_novel_ranking_json`](https://github.com/zhy201810576/PixivKit/blob/main/src/pixivkit/web_apis/ranking.py) 把 `mode/content/p` 与可选 `date` 发送到 `/ajax/ranking/novel`；[PixivKit `WebClient`](https://github.com/zhy201810576/PixivKit/blob/main/src/pixivkit/web_client.py) 使用 `PHPSESSID` Cookie，并把 `lang` 单独作为界面语言加入查询。这是第三方实现所采用的契约，**不是 Pixiv 官方保证或当前服务端的实测响应**。尤其 `lang=zh` 不等于作品语言“简体中文”；是否能对榜单传作品语言参数，仍未证实。与此相比，PXView 的 OAuth/PKCE 流程走 `app-api.pixiv.net`，现有 App 小说模型没有可靠 `language` 字段。

### PXView 已有能力与缺口

| 网页目标 | PXView 已有路径 | 判断 |
| --- | --- | --- |
| R-18 今日／本周／男性热门／女性热门 | `src/screens/Ranking/PastRanking.js` 已把 `day_r18/week_r18/day_male_r18/day_female_r18` 交给现有 `pixiv.novelRanking({mode,date})`；仅在账户 `x_restrict > 0` 时提供选项 | 可复用 App OAuth、原生列表和 `next_url`，需要把这些模式显露为清楚的顶部入口；这些 App 模式名与网页模式名不同 |
| 历史日历 | 同一个 `PastRanking.js` 已有日期选择器，`src/common/sagas/ranking.js` 把 `date` 传给 App 排名 API | 已有代码路径；仍需真机确认可选日期及响应边界 |
| AI 生成榜 | 公开网页资料有 `weekly_r18_ai`；现有 `pixiv-api-client` 文档和 PXView 常量没有已验证的 App 小说 AI 榜单模式 | 不能直接宣称已接通；只有在已授权的网页会话或 App API 小样本证明可调用后，才能做原生 AI 标签 |
| 原生小说卡片 | `NovelRankingList`、`NovelList`、`NovelItem` 已有 | 移动端 App 响应直接适配；网页 `rank_a` 的 `user_id/url/tag_a/character_count` 需转为现有实体形状，不能原样写入 |

**建议实施顺序**：先用现成 App 榜单路径让 R-18 四个模式和日历在原生列表中容易找到；把 AI 模式作为独立待验证项。若要完全跟随网页版新增模式与摘要字段，再做单独的网页榜单适配与网页会话验证。筛选/翻页时保留 Pixiv 返回的名次；未验证网页 `date` 参数之前，不把移动端日期格式直接套给网页 AJAX。这个顺序不需要为了 R-18 四模式去批量读取小说正文。

## 结论

**确认后的目标：把现有“近半年/一年＋人气排序”的搜索体验扩展到无关键词的 Pixiv R-18 男性向小说作品池**，而不是生成一个“碧蓝航线”关键词专题榜，也不是“受男性用户欢迎”的普通榜单。现有 App 搜索必须提供 `word`，现有男女人气榜则是固定的榜单模式；公开资料中尚未确认一个同时支持“无关键词＋R-18 男性向分类＋半年/一年时间窗＋全量人气排序”的接口。因此不能承诺一键获取“所有 R-18 男性向作品的近一年人气总榜”。

还要区分 **“男性向类别”** 与 **“受男性用户欢迎”**：网页资料中的 `/ajax/genre/novel/male?mode=r18` 指 R-18 男性类别的发现页；App `day_male` 与网页榜单 `male` 是“受男性欢迎”的榜单模式。两者不是同一个作品集合。前者第三方资料只记录 `mode/lang`，没有日期窗口、全量翻页或热度排序契约，并将它归在“原创热门”之下，**可能不能覆盖同人小说**；后者可以按榜单日期看当期结果，但不是所有男性向作品的半年/一年总排序。[PixivSource 接口记录](https://github.com/DowneyRem/PixivSource/blob/main/doc/PixivWebApi.md)。Pixiv 官方的小说体裁搜索也要求先选择“仅原创”，不能把体裁筛选推广成全体小说的完整分类。[官方体裁搜索说明](https://www.pixiv.help/hc/en-us/articles/23176048504985-I-want-to-search-for-novels-by-genre)。

### 可以复用的现有搜索体验，以及它的边界

- 在 PXView 输入 `碧蓝航线` 后，筛选器可选“关键词”“半年内/一年内”“人气排序”，代码路径是 `src/screens/Shared/SearchFilterModal.js` → `SearchResultTabs.js` → `src/common/sagas/searchNovels.js`。这是**有关键词**的搜索；并不能直接把 `word` 去掉就得到全站作品。Pixiv 官方帮助确认搜索可扩展到标题和说明，并支持时间及收藏量筛选，但没有公布无关键词全量入口。[搜索帮助](https://www.pixiv.help/hc/en-us/articles/20084746751769-How-can-I-improve-my-search-results)。
- **Premium 账号**：PXView 把“人气排序”传给 App 搜索为 `popular_desc`，`next_url` 可继续翻页。**免费账号**：PXView 先取热门预览（代码注释写约前 30 条），再接日期降序搜索并继续翻页；后面很多条并不保证继续按人气排序。这份结果应标为“热门预览＋近期作品”，不能汇报为“全部作品的人气总榜”。
- 若要扩展无关键词浏览，有三个候选来源：① `day_male`/网页 `male`，真实 Pixiv 榜单但覆盖当期上榜者，无法代表半年/一年所有作品；② 网页 R-18 男性类别发现页，可做分类入口，但排序、时间窗与翻页未证实；③ 按多个日期/类别/标签收集候选后本地排序，可做“已收集作品热门列表”，但会遗漏未上榜或未命中者，也不能称 Pixiv 全站人气榜。用 `total_bookmarks` 排序只是自定义收藏数排序，不等于 Pixiv 的 `popular_desc` 算法。

Pixiv 官方帮助确认：网页版小说榜单可以按作品语言显示，而 Pixiv App 版目前不支持该榜单语言选项；官方帮助并未公布对应 HTTP 参数。[Pixiv 榜单语言帮助](https://www.pixiv.help/hc/en-us/articles/4408928116761-Can-I-sort-the-Novels-Rankings-by-language)。官方还说明榜单按日汇总发布，不能把搜索热度、收藏数重新排序称为官方排名。[榜单说明](https://www.pixiv.help/hc/en-us/articles/231286908-What-is-Rankings)、[榜单类型](https://www.pixiv.help/hc/en-us/articles/230700147-What-types-of-rankings-are-there-available)。

## 现有 PXView 路径（本 worktree 源码事实）

- `package.json` 声明依赖 `pixiv-api-client ^0.27.0`；`src/common/helpers/apiClient.js` 构造 App API 客户端。
- `src/common/sagas/ranking.js` 把小说 UI 模式映射为 `day/day_male/day_female/week_rookie/week`，调用 `pixiv.novelRanking(options)`；后续直接 `requestUrl(nextUrl)`；只保留 `visible && id` 的小说并归一化，传递 `next_url`。自定义的旧榜单模式还可传 `date`。没有榜单语言/体裁筛选，也没有逐篇获取正文。
- `src/screens/Ranking/NovelRankingList.js` 到 `src/components/NovelList.js` 用 `FlatList`、`onEndReached` 和 `loading/nextUrl` 加载下一页；`src/common/reducers/ranking.js` 追加、去重 ID。它没有“筛掉大量项目后继续填满屏幕”的补页控制、元数据未知态或榜单快照键。当前 `NovelItem/NovelListViewItem` 直接读取 `item.user.is_followed/name`、`image_urls.square_medium`、`tags[].name`、`text_length` 等；网页榜单的 `user_id/url/tag_a/character_count` 不能原样塞入现有实体，否则会显示错误或崩溃。
- `src/common/sagas/searchNovels.js` 使用 App 搜索，免费账户将热门预览与日期搜索结果拼接；这是搜索结果，不是榜单。`src/screens/Shared/NovelReader.js` 才触发正文加载；`src/common/sagas/novelText.js` 的网页 AJAX 详情会读取正文，不能作为批量筛选的廉价元数据入口。
- 未发现独立的、可复用的已授权只读探测脚本或测试入口。仓库源码只能证明调用路径，不能证明本机有可用登录态；没有读取应用私有存储、凭据或密钥。

## 接口对照

以下“记录”均指开源客户端源码或第三方逆向资料，**不是 Pixiv 官方接口文档，也不是本次 HTTP 实测**。`lang` 常是界面语言；作品语言筛选在搜索资料中写作 `work_lang`，两者不可混用。

| 接口 | 认证与参数 | 分页、数量 | 可用于筛选的字段；适配度 |
| --- | --- | --- | --- |
| App `GET /v1/novel/ranking` | PXView 客户端要求 OAuth；`mode`、`date`，后续用返回的 `next_url`（通常含 offset）。模式是 `day`、`week`、`day_male` 等，和网页 `daily` 不同。 | `novels[] + next_url`；每页实际条数及榜单总上限 **未测**，客户端文档不保证固定页大小。 | 列表有 `id/visible/title/caption/text_length/tags/user/total_bookmarks/total_view/restrict` 等；旧 App 模型资料没有可靠的 `language/genre/word_count` 契约。保留官方顺序最容易，语言/体裁需标为未知或做少量补充。[客户端 README](https://github.com/alphasp/pixiv-api-client)、[非官方 App 模型](https://gist.github.com/ZipFile/3ba99b47162c23f8aea5d5942bb557b1)。 |
| Web `GET /ajax/ranking/novel` | 第三方资料写 `mode=daily/weekly/monthly/rookie/male/female` 等、`p`，有记录附 `content=novel`；普通榜单据称可匿名，R-18 要网页账户会话和显示设置。App Bearer 不等于网页 Cookie。 | `body.display_a.rank_a[]`，条目有 `rank`；`p=1/2` 是第三方资料的声称，**非验证上限**；没有可靠 `next_url/total` 契约，实际每页条数 **未测**。 | 摘要据记录含 `language/genre/character_count/word_count/reading_time/tag_a/bookmark_count/restrict/ai_type`，无需正文即可筛选；最值得小样本验证。`lang=zh/ja` 不能据此认作作品语言过滤。[PixivNow 接口记录](https://github.com/FreeNowOrg/PixivNow/blob/master/docs/pixiv-web-api.md)、[PixivSource 接口记录](https://github.com/DowneyRem/PixivSource/blob/main/doc/PixivWebApi.md)。 |
| App `GET /v1/search/novel` | PXView OAuth；`word/search_target/sort/start_date/end_date`，热门排序是 Premium；开源客户端还记录 `offset/search_ai_type`。 | `novels[] + next_url`；每页条数和最大可达页 **未测**。 | `text_length/tags` 可用于搜索筛选；不是榜单，不能反推出官方 `rank`。PXView 免费用户的热门预览和日期列表拼接更不能充当完整热度排名。[客户端 README](https://github.com/alphasp/pixiv-api-client)、[pixivpy 搜索实现](https://github.com/upbit/pixivpy/blob/master/pixivpy3/aapi.py)。 |
| Web `GET /ajax/search/novels/{keyword}` | 第三方资料记录 `word/p/order/mode/s_mode/work_lang/gs`，另有 `scd/ecd/tlt/tgt/wlt/wgt/original_only/genre` 等筛选参数；年龄限制与高级范围可能要求网页会话/Premium。各参数组合需实测。 | `body.novel.data[]/total/lastPage`；`p` 从 1 开始；实际单页数量与 `lastPage` 截断规则 **未测**。 | 搜索结果摘要据记录可带 `language/genre/textCount/wordCount/readingTime`，可作独立搜索功能。`work_lang` 指作品语言，`lang` 多为界面语；搜索结果没有榜单 `rank`。[PixivNow 接口记录](https://github.com/FreeNowOrg/PixivNow/blob/master/docs/pixiv-web-api.md)、[PixivSource 接口记录](https://github.com/DowneyRem/PixivSource/blob/main/doc/PixivWebApi.md)。 |
| App `GET /v2/novel/detail` | OAuth，`novel_id`；PXView 的 `pixiv.novelDetail(id)` 已使用。 | 单篇；无分页。 | App 旧模型主要是 `text_length/tags/restrict` 等；可按需补字段，但不应每个榜单条目请求一次。[pixivpy 实现](https://github.com/upbit/pixivpy/blob/master/pixivpy3/aapi.py)、[非官方 App 模型](https://gist.github.com/ZipFile/3ba99b47162c23f8aea5d5942bb557b1)。 |
| Web `GET /ajax/novel/{id}` | 网页接口，可能受 Cookie/年龄/地区等限制；PXView 正文读取已有尝试与回退。 | 单篇；无分页。 | 记录中有 `textCount/wordCount/genre/tags`，但**同时包含完整 `content`**；不适合批量元数据补齐。详情页打开时才读取。[PixivNow 接口记录](https://github.com/FreeNowOrg/PixivNow/blob/master/docs/pixiv-web-api.md)。 |

另外，旧 `GET /ranking.php?format=json` 的 `content` 记录只含插画、漫画、动图；不能把 `content=novel` 当作小说榜单替代。`/ajax/top/novel`、`/ajax/genre/novel/{genre}` 是首页/体裁发现列表，不能冒充排名。[PixivNow 接口记录](https://github.com/FreeNowOrg/PixivNow/blob/master/docs/pixiv-web-api.md)、[PixivSource 接口记录](https://github.com/DowneyRem/PixivSource/blob/main/doc/PixivWebApi.md)。Pixiv 官方对小说“体裁”的定义仅适用于原创小说，并且同一系列不可为各篇分别设不同体裁；`genre` 为空要解释为未知/不适用。[体裁帮助](https://www.pixiv.help/hc/en-us/articles/360000653441-What-are-genres)。官方搜索支持按字数、词数或预计阅读时间筛选，但自定义范围是 Premium 功能，不能把 UI 能力直接推定为 AJAX 参数的免费可用性。[长度搜索帮助](https://www.pixiv.help/hc/en-us/articles/360000546942-How-do-I-search-novels-by-text-length)。

## 测量结果与限制

| 项目 | 状态码 | 延迟 | 返回条数 | 翻页观察 |
| --- | --- | --- | --- | --- |
| App 榜单 / App 搜索 / App 详情 | 未请求 | 未测 | 未测 | 仅代码/资料显示 `next_url` |
| Web 榜单 / Web 搜索 / Web 详情 | 未请求 | 未测 | 未测 | 仅第三方资料显示 `p`、`lastPage` 等 |

原因：本 worktree 没有已确认可安全调用的现成授权测试路径；按任务边界，不查看或复制私有凭据，也不以匿名请求替代受控已授权探测。**因此不能给出实测吞吐、P95、固定页大小、可靠的网页页数上限或成功率。**

后续若在现成授权测试路径中验证：先串行各取 1 个普通榜单页、1 个后续页、1 个普通搜索页和 1 篇已允许访问的详情，只记录状态码、耗时、数组长度、字段存在率及下一页标记；不记录正文/标题/令牌/Cookie。再用少量样本依次测试并发 2、4、6，任一 `429/503`、挑战页、鉴权/限制错误或明显延迟/错误率上升立即停止。测 `p=1/2/3` 前先确认第 2 页存在，绝不据第三方声称无限枚举。需要分别验证普通和年龄受限会话，且不能把 App OAuth 自动发送给网页域名。

## 推荐的可扩展设计

1. **来源与顺序**：建立 `RankingPage {source, mode, dateJst, page, entries[], next, observedAt}`；每项保留 `id + originalRank/absoluteIndex`。Web 只在会话、字段、模式映射验证后启用；否则走现有 App 排名。不同来源/日期不拼成同一张榜。筛选只隐藏条目，不重排或重编号；缺少 `rank` 时按原始页序号展示“榜单顺序”，不要编造排名名次。
2. **元数据与视图适配**：把 `language/genre/characterCount/wordCount/readingTime` 作为可空字段，同时保存来源和更新时间。`unknown`、`not_applicable`、已确认值要区分；`text_length` 与词数不是同一单位。网页榜单的 `user_id/url/tag_a/character_count` 先经明确映射和缺省值处理，核对头像/封面 URL 与书签、关注状态；在未核对前用独立轻量行模型展示，避免污染现有 `novels/users` 实体。网页列表字段足够时不取详情；仅对用户打开的作品或当前可视窗口里少量缺字段项补详情，且避免批量使用带正文的网页详情。
3. **屏幕与滚动缓冲**：以实际测得的可视行数 `V` 为基准，目标保留 `V + V` 到 `V + 2V` 个**已筛选可见项**；例如 `V=8` 时是 16–24 项。只有不足缓冲且确有下一页时继续取页。低命中率按观测命中率估计下一页需求，但设置每轮页数/请求数和时间预算；预算用完显示“已加载部分结果，继续加载”，不能把空屏误报为没有匹配项。
4. **缓存与并发**：榜单页按 `source + account/visibility + mode + JST date + page + filters affecting upstream + locale` 分键，短 TTL、刷新即新一代快照；作品元数据按 ID/来源/更新时间缓存，年龄受限结果按账户隔离，不缓存正文为榜单用途。首屏串行或最多 2 个请求；正式并发上限要由有授权的样本测量决定，不因研究计划写了 6 就在生产使用 6。
5. **失败行为**：请求设连接和总超时（建议起点 5s/8s，待实测调整）、可取消、单页重试至多一次且遵守 `Retry-After`；`429/503` 停止预取并退避，挑战/权限错误停止该来源。后续页失败保留已显示项和原始顺序，给继续按钮；切换来源时从第 1 页重新建立快照。不要将网页错误交给带 App Bearer 的通用 `requestUrl` 自动重试或跨域转发。

**对当前网页榜单移植需求的决定：复用现有 App OAuth 榜单实现已知的 R-18 模式和日期选择；AI 榜单及网页 AJAX 需实测后再声明可用。** 之前讨论的“R-18 男性向原创分类全量热门榜”仍无已证实的完整实现路径，应该作为独立需求。若以后验证网页来源，先确认分类/榜单含义、页数/顺序/日期窗口、会话行为、请求头不泄漏、延迟和错误率；不能为补齐数据而批量抓正文。Pixiv 官方把搜索结果的人气排序列为 Premium 功能，免费账号的现有热门预览不能承担全量排序。[Premium 官方说明](https://www.pixiv.help/hc/en-us/articles/235583788-What-sorts-of-benefits-are-available-to-pixiv-Premium-members)。
