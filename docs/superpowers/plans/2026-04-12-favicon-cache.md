# Favicon URL 缓存 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首次成功加载的 favicon URL 缓存到 `bm.favicon`，后续启动直接使用，消除重复的 fallback 探测请求。

**Architecture:** 修改 `faviconHtml(bm)` 函数，当 `bm.favicon` 非空时直接使用缓存 URL；无缓存时走现有 fallback 链，并在 `img.onload` 时将成功的 URL 写回 `bm.favicon` 并持久化。编辑书签时仅在 URL 变化时重置缓存。

**Tech Stack:** 纯 Vanilla JS，单文件 `app.js`，`localStorage` 持久化。

---

## 文件变更清单

| 文件 | 操作 | 变更内容 |
|---|---|---|
| `app.js` | Modify | `faviconHtml()` 增加缓存分支 |
| `app.js` | Modify | 新增 `window.faviconCacheOnLoad` 全局回调 |
| `app.js` | Modify | 编辑书签保存逻辑：URL 变化时才重置 `bm.favicon` |

---

### Task 1: 修改 `faviconHtml` — 有缓存时直接使用

**Files:**
- Modify: `app.js:290-308`（`faviconHtml` 函数）

**背景：** 当前 `faviconHtml(bm)` 始终向 Google favicon 服务发请求。`bm.favicon` 字段已存在但始终为 `""`。

- [ ] **Step 1: 替换 `faviconHtml` 函数**

将 `app.js` 第 290–308 行的 `faviconHtml` 替换为以下内容：

```js
function faviconHtml(bm) {
  const host = hostname(bm.url);
  const letter = (bm.title || host || '?')[0].toUpperCase();
  const color = hashColor(host || bm.id);

  // 有缓存：直接使用已验证的 URL，不挂 fallback 链
  if (bm.favicon) {
    return `
      <img
        class="card-favicon"
        src="${escHtml(bm.favicon)}"
        alt=""
        data-letter="${escHtml(letter)}"
        data-color="${escHtml(color)}"
        onerror="faviconFallback2(this)"
      />
    `;
  }

  // 无缓存：走完整 fallback 链，并在成功时缓存 URL
  return `
    <img
      class="card-favicon"
      src="https://www.google.com/s2/favicons?sz=32&domain=${escHtml(host)}"
      alt=""
      data-bm-id="${escHtml(bm.id)}"
      data-host="${escHtml(host)}"
      data-origin="${escHtml(origin(bm.url))}"
      data-letter="${escHtml(letter)}"
      data-color="${escHtml(color)}"
      onload="faviconCacheOnLoad(this)"
      onerror="faviconFallback1(this)"
    />
  `;
}
```

- [ ] **Step 2: 验证页面仍能正常渲染**

在浏览器打开 `index.html`，确认：
- 书签卡片正常显示（favicon 区域不空白、不报错）
- 控制台无 JS 错误

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: faviconHtml 支持缓存分支，有缓存直接用"
```

---

### Task 2: 新增 `faviconCacheOnLoad` — 加载成功时写入缓存

**Files:**
- Modify: `app.js:310-322`（`faviconFallback1` 之前）

**背景：** 需要一个全局回调，在 `img.onload` 时把成功的 URL 写入 `bm.favicon` 并持久化。

- [ ] **Step 1: 在 `faviconFallback1` 定义之前插入新函数**

在 `app.js` 第 310 行（`window.faviconFallback1 = ...` 之前）插入：

```js
window.faviconCacheOnLoad = function (img) {
  const bmId = img.dataset.bmId;
  if (!bmId) return;
  const bm = state.data.bookmarks.find(b => b.id === bmId);
  if (bm && !bm.favicon) {
    bm.favicon = img.src;
    saveData();
  }
};
```

- [ ] **Step 2: 验证缓存写入行为**

1. 清空 localStorage（DevTools → Application → Local Storage → 右键清除）
2. 刷新页面，等待 favicon 加载完成
3. DevTools → Application → Local Storage → `bookmark-app-data`
4. 展开 `bookmarks`，确认各书签的 `favicon` 字段已变为非空 URL（如 `https://www.google.com/s2/favicons?sz=32&domain=github.com`）

- [ ] **Step 3: 验证第二次加载使用缓存**

刷新页面，打开 DevTools → Network，筛选 `Img`：
- 预期：favicon 请求直接命中浏览器缓存，或完全不出现重复的 fallback 请求
- 控制台无 JS 错误

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: 新增 faviconCacheOnLoad，首次加载成功后缓存 URL"
```

---

### Task 3: 编辑书签时仅在 URL 变化时重置缓存

**Files:**
- Modify: `app.js:947-957`（编辑书签保存逻辑）

**背景：** 当前编辑书签时无论如何都会 `bm.favicon = ''`，导致每次编辑后缓存失效。应只在 URL 实际变化时才重置。

- [ ] **Step 1: 修改编辑保存逻辑**

找到 `app.js` 约第 947–957 行的以下代码：

```js
if (id) {
  // Edit — 只替换该卡片
  const bm = state.data.bookmarks.find(b => b.id === id);
  if (bm) {
    bm.url = urlVal;
    bm.title = titleVal;
    bm.description = description;
    bm.categoryId = categoryId;
    bm.tags = [...state.editingTags];
    bm.favicon = '';
    saveData();
```

替换为：

```js
if (id) {
  // Edit — 只替换该卡片
  const bm = state.data.bookmarks.find(b => b.id === id);
  if (bm) {
    if (bm.url !== urlVal) bm.favicon = '';
    bm.url = urlVal;
    bm.title = titleVal;
    bm.description = description;
    bm.categoryId = categoryId;
    bm.tags = [...state.editingTags];
    saveData();
```

- [ ] **Step 2: 验证 URL 未变化时缓存保留**

1. 等书签的 `favicon` 字段已缓存（见 Task 2 Step 2）
2. 点击编辑某个书签，**不修改 URL**，只改标题或描述，点击保存
3. DevTools → Application → Local Storage → `bookmark-app-data`
4. 确认该书签的 `favicon` 字段**仍为非空**（缓存保留）

- [ ] **Step 3: 验证 URL 变化时缓存重置**

1. 编辑同一书签，**修改 URL**（如改成 `https://example.com`），点击保存
2. 检查 Local Storage，确认该书签的 `favicon` 字段**变为空字符串**
3. 刷新页面，确认该书签重新触发 favicon 请求并重新缓存

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "fix: 编辑书签时仅 URL 变化才重置 favicon 缓存"
```

---

## 自查 Checklist

- [x] **Spec 覆盖**：数据模型（Task 1）、渲染分支（Task 1）、onload 回调（Task 2）、失效策略（Task 3）均已覆盖
- [x] **无占位符**：所有步骤含完整代码
- [x] **类型一致**：`bm.favicon`、`bmId`、`faviconCacheOnLoad`、`faviconFallback1/2` 在各 Task 中命名一致
- [x] **范围控制**：无计划外改动，不涉及 Base64/IndexedDB/TTL
