# Novel Reading Position Memory

**实现日期：** 2026-04-07  
**关联 commit：** 5e0be56, 2fbc93f, 42f0d25  
**影响文件：**
- `src/common/constants/actionTypes.js`
- `src/common/reducers/readingProgress.js`（新建）
- `src/common/reducers/index.js`
- `src/common/store/configureStore.js`
- `src/screens/Shared/NovelReader.js`

---

## 功能描述

用户翻到某页后退出（或进程被杀），下次再打开同一篇小说，自动跳回上次阅读的页码。新小说（无记录）行为不变：从第一页（LTR）或最后一页（RTL）开始。

---

## 架构概览

```
用户翻页
  └─▶ NovelReader.handleOnIndexChange
        ├─▶ setState({ index })          ← 更新当前 UI
        └─▶ dispatch READING_PROGRESS.SET(novelId, pageIndex)
              └─▶ readingProgress reducer
                    └─▶ state[novelId] = { pageIndex }
                          └─▶ redux-persist 写磁盘

下次打开同一篇小说
  └─▶ NovelReader.componentDidUpdate（parsedNovelText 从 null → 有值）
        └─▶ savedPageIndex = state.readingProgress[novelId].pageIndex
              ├─ 存在 且 < parsedNovelText.length → setState({ index: savedPageIndex })
              └─ 不存在 或 越界 → 原逻辑（LTR=0, RTL=length-1）
```

---

## 各文件改动说明

### `src/common/constants/actionTypes.js`

```js
export const READING_PROGRESS = createConstants('READING_PROGRESS', ['SET', 'CLEAR']);
```

- `READING_PROGRESS.SET` — 保存进度（每次翻页触发）
- `READING_PROGRESS.CLEAR` — 清除单篇进度（暂未调用，留作未来"阅读完成清除"用）

### `src/common/reducers/readingProgress.js`（新建）

```js
// state 结构
{
  "12345678": { pageIndex: 3 },
  "87654321": { pageIndex: 0 },
}
```

- key 是 novelId（字符串）
- value 是 `{ pageIndex: number }`（0-based，与 NovelReader.state.index 对齐）
- CLEAR 时将对应 key 设为 `undefined`（而非 delete，以维持 immutability 模式）

### `src/common/reducers/index.js`

```js
import readingProgress from './readingProgress';
// 加入 combineReducers
```

### `src/common/store/configureStore.js`

```js
const persistConfig = {
  whitelist: [
    ...,
    'readingProgress',   // ← 新增
  ],
};
```

加入 whitelist 后，redux-persist 会在每次 state 变化时把 readingProgress 序列化写到 filesystem storage，进程被杀后数据仍然存在。

### `src/screens/Shared/NovelReader.js`

**保存（每次翻页）：**
```js
handleOnIndexChange = (index) => {
  const { novelId, dispatch } = this.props;
  this.setState({ index });
  dispatch({ type: READING_PROGRESS.SET, payload: { novelId, pageIndex: index } });
};
```

**恢复（内容首次加载完成）：**
```js
componentDidUpdate(prevProps) {
  const { novelReadingDirection, parsedNovelText, savedPageIndex } = this.props;
  const { parsedNovelText: prevParsedNovelText } = prevProps;
  if (parsedNovelText && !prevParsedNovelText) {
    // parsedNovelText 刚从 null 变成有值 —— 内容首次到达
    let index;
    if (savedPageIndex != null && savedPageIndex > 0 && savedPageIndex < parsedNovelText.length) {
      index = savedPageIndex;
    } else {
      index = novelReadingDirection === READING_DIRECTION_TYPES.RIGHT_TO_LEFT
        ? parsedNovelText.length - 1
        : 0;
    }
    this.setState({ index });
  }
}
```

**读取（mapStateToProps）：**
```js
savedPageIndex: readingProgress[novelId] != null
  ? readingProgress[novelId].pageIndex
  : null,
```

---

## 关键设计决策与原因

| 决策 | 原因 |
|------|------|
| 只存 pageIndex，不存 scrollOffset | reader 是分页模式，pageIndex 已足够精确；scrollOffset 在字号改变后会失效 |
| 恢复在 componentDidUpdate 而非 componentDidMount | mount 时 parsedNovelText 尚未到达，直接 setState 无效；必须等内容来了再跳 |
| 边界检查 `savedPageIndex < parsedNovelText.length` | 小说更新后页数可能减少，防止跳到不存在的页 |
| `savedPageIndex > 0` 才恢复 | 第 0 页就是初始状态，不需要恢复，省一次 setState |
| dispatch 直接用 `dispatch` prop 而非 action creator | 改动面最小；READING_PROGRESS.SET 是简单对象，不需要 thunk |
| CLEAR action 暂不调用 | 预留给"阅读到底自动清除"或"手动清除全部进度"功能，现阶段不需要 |

---

## 调试指南

### 症状：每次打开都从第一页开始，没有恢复

**检查顺序：**

1. **persist 是否生效**
   ```js
   // 在 Redux DevTools 或 console 里查
   store.getState().readingProgress
   // 翻页后应该看到 { [novelId]: { pageIndex: N } }
   ```
   如果翻页后 state 没变化 → `handleOnIndexChange` 的 dispatch 没触发，检查 `dispatch` prop 是否注入（connect() 第二个参数只传了 action creators，`dispatch` 是自动注入的，前提是第二个参数不是 null）。

2. **whitelist 是否包含 readingProgress**
   ```js
   // src/common/store/configureStore.js
   // persistConfig.whitelist 里应该有 'readingProgress'
   ```
   没有的话 state 存在内存里但不写磁盘，重启后丢失。

3. **novelId 是否匹配**
   ```js
   // mapStateToProps 里
   const novelId = props.novelId || props.route.params.novelId;
   // dispatch 时用的 novelId 和 mapStateToProps 读取时用的必须一致
   ```
   如果 dispatch 时 novelId 是数字类型，读取时是字符串（或反过来），key 不匹配，savedPageIndex 永远是 null。

4. **componentDidUpdate 触发时机**
   恢复逻辑只在 `parsedNovelText` 从 falsy → truthy 的那一次更新里跑。如果小说文本已经在 Redux cache 里（上次打开过），`parsedNovelText` 在 mount 时就是有值的，`componentDidUpdate` 的条件 `parsedNovelText && !prevParsedNovelText` 永远不会成立。
   
   **修复方向：** 把恢复逻辑也加到 `componentDidMount` 里处理这种"已缓存"的情况：
   ```js
   componentDidMount() {
     const { parsedNovelText, savedPageIndex, novelReadingDirection } = this.props;
     if (parsedNovelText && savedPageIndex != null && savedPageIndex > 0
         && savedPageIndex < parsedNovelText.length) {
       this.setState({ index: savedPageIndex });
     }
     // ... 原有的 fetchNovelText 逻辑
   }
   ```

### 症状：翻页后 dispatch 了，但重启后 state 丢失

- 确认 `configureStore.js` 里 `persistConfig.whitelist` 包含 `'readingProgress'`
- 确认 `readingProgress` reducer 已加入 `combineReducers`（`src/common/reducers/index.js`）
- redux-persist 用的是 filesystem storage，确认设备存储空间未满

### 症状：恢复到了错误的页码

- 打印 `savedPageIndex` 和 `parsedNovelText.length`，确认边界检查数值正常
- 检查小说是否被作者修改过（页数减少），savedPageIndex 可能超出新的范围 → 正常会 fallback 到第一页

### 症状：想手动清除某篇的进度

直接 dispatch CLEAR：
```js
dispatch({ type: READING_PROGRESS.CLEAR, payload: { novelId } });
```
或清除全部（直接 reset reducer state）：
```js
// 目前没有 CLEAR_ALL action，可以临时通过清空 AsyncStorage/filesystem storage 里的 persist key 实现
```

---

## 已知限制

- **字号改变后位置准确性：** 仅记页码，字号改变不影响准确性（分页模式）
- **作者更新小说：** 页数变化后若 savedPageIndex 越界，自动 fallback 到第一页，进度丢失
- **缓存命中时恢复：** 如上述调试项 #4 所述，novelText 已缓存时当前实现可能不恢复——需要后续补 componentDidMount 逻辑
