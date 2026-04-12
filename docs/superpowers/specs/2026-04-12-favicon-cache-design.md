# Favicon URL 缓存设计

**日期**: 2026-04-12  
**状态**: 已批准

## 背景

书签应用每次启动渲染卡片时，都会向 Google Favicon 服务发起网络请求（最多触发 2 次 fallback 探测），导致图标加载缓慢。`bm.favicon` 字段已存在于数据模型中但始终为空，本设计将其用于缓存已验证可用的 favicon URL。

## 目标

- 首次加载后将成功的 favicon URL 持久化，后续启动直接使用，跳过所有 fallback 探测
- 零额外基础设施，复用现有 `localStorage` 持久化机制
- 实现改动最小，不引入 CORS 风险

## 数据模型

`bm.favicon` 字段语义：

| 值 | 含义 |
|---|---|
| `""` (空字符串) | 未缓存，走完整加载流程 |
| 非空字符串 | 上次成功加载的 favicon URL，直接使用 |

现有 `saveData()` / `loadData()` 无需改动，缓存随书签数据一起持久化到 `localStorage`。

## 渲染逻辑

### `faviconHtml(bm)` 变更

**有缓存**（`bm.favicon` 非空）：
- 直接将 `bm.favicon` 作为 `img.src`
- 不挂载 `onerror` fallback 链
- 不挂载 `onload` 回调

**无缓存**（`bm.favicon` 为空）：
- 维持现有行为：Google favicon → `/favicon.ico` → 字母色块兜底
- 额外挂载 `img.onload` 回调，传入 `bm.id`

### 新增 `faviconCacheOnLoad(bmId)` 回调

```
window.faviconCacheOnLoad = function(bmId) {
  return function() {
    const bm = state.data.bookmarks.find(b => b.id === bmId);
    if (bm && !bm.favicon) {
      bm.favicon = this.src;
      saveData();
    }
  };
};
```

回调挂在 `img.onload` 上，仅在无缓存时生效，避免重复写入。

## 缓存失效策略

- **编辑书签，URL 发生变化**：将 `bm.favicon` 重置为 `""`，下次渲染重新探测并缓存新 URL
- **编辑书签，URL 未变化**：保留现有缓存，不重置
- **删除书签**：书签随数据一起删除，缓存自然消失
- **无主动清除 UI**：不需要额外操作，缓存跟随书签生命周期

## 受影响的代码位置

| 函数 | 改动 |
|---|---|
| `faviconHtml(bm)` | 分支：有缓存直接用，无缓存走现有逻辑 + onload 回调 |
| `window.faviconCacheOnLoad` | 新增全局回调函数 |
| 编辑书签保存逻辑（约第 947 行） | URL 变化时重置 `bm.favicon = ""` |

## 不在范围内

- Base64 data URL 缓存（CORS 风险，留待后续）
- 独立 favicon 缓存存储键
- 缓存过期/TTL 机制
- 手动刷新 favicon 的 UI 入口
