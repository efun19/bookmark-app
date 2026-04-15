# 首页搜索栏 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在首页（HOME_ID 视图）顶部添加 Hero 风格搜索栏，支持 Google / Bing / 百度切换，回车在新标签页搜索，上次选择持久化到 localStorage。

**Architecture:** 新增 `SEARCH_ENGINES` 常量和 `renderHomeSearch()` 函数；`render()` 在首页视图时调用它，写入静态占位 `#home-search` 容器；引擎选择存入 `settings.lastSearchEngine`，通过现有 `saveData()` 机制持久化。

**Tech Stack:** 纯 Vanilla JS + CSS Variables，无构建步骤，无测试框架，直接在浏览器中打开 index.html 验证。

---

## 文件改动

| 文件 | 改动 |
|---|---|
| `app.js` | 新增 `SEARCH_ENGINES` 常量；`createDefaultSettings()` 加 `lastSearchEngine`；新增 `renderHomeSearch()`；修改 `render()` |
| `index.html` | `<div class="bookmarks-grid">` 前插入 `<div id="home-search"></div>` |
| `style.css` | 新增 `#home-search`、`.home-search-bar`、`.search-engine-btn`、`.home-search-input`、`.home-search-submit`、`.search-engine-dropdown`、`.search-engine-option` 样式 |

---

## Task 1: 常量与数据模型

**Files:**
- Modify: `app.js` — State 区块和 `createDefaultSettings()`

- [ ] **Step 1: 在 `HOME_ID` 常量后添加 `SEARCH_ENGINES` 常量**

在 `app.js` 第 56 行（`const HOME_ID = 'home';`）后插入：

```js
const SEARCH_ENGINES = [
  { id: 'google', name: 'Google', icon: '🔍', url: 'https://www.google.com/search?q=%s' },
  { id: 'bing',   name: 'Bing',   icon: '🔷', url: 'https://www.bing.com/search?q=%s'  },
  { id: 'baidu',  name: '百度',   icon: '🔴', url: 'https://www.baidu.com/s?wd=%s'      },
];
```

- [ ] **Step 2: 在 `createDefaultSettings()` 中加入 `lastSearchEngine` 字段**

找到 `app.js` 中的 `createDefaultSettings` 函数（当前约第 134 行），将返回值改为：

```js
function createDefaultSettings(settings = {}) {
  return {
    theme: settings.theme === 'light' ? 'light' : 'dark',
    density: normalizeDensity(settings.density),
    homePage: Array.isArray(settings.homePage) ? settings.homePage : [],
    lastSearchEngine: SEARCH_ENGINES.some(e => e.id === settings.lastSearchEngine)
      ? settings.lastSearchEngine
      : 'google',
  };
}
```

- [ ] **Step 3: 在浏览器打开 index.html，打开 DevTools Console，执行以下命令验证**

```js
// 清空旧数据以触发 DEFAULT_DATA 加载
localStorage.removeItem('bookmark-app-data');
location.reload();
// 重载后执行：
console.log(state.data.settings.lastSearchEngine); // 期望输出: "google"
```

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: 新增 SEARCH_ENGINES 常量，settings 加 lastSearchEngine 字段"
```

---

## Task 2: HTML 占位容器

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 在 `index.html` 的 `<div class="bookmarks-grid">` 前插入占位 div**

找到第 65 行：
```html
    <div class="bookmarks-grid" id="bookmarks-grid">
```
在它前面插入一行：
```html
    <div id="home-search"></div>
```

完整上下文应为：
```html
    <div id="home-search"></div>
    <div class="bookmarks-grid" id="bookmarks-grid">
      <!-- rendered by JS -->
    </div>
```

- [ ] **Step 2: 刷新浏览器，DevTools Elements 面板确认 `#home-search` 存在于 DOM 中**

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: index.html 加入 #home-search 占位容器"
```

---

## Task 3: CSS 样式

**Files:**
- Modify: `style.css`

- [ ] **Step 1: 在 `style.css` 末尾追加以下样式块**

```css
/* ─────────────────────────────────────────
   Home Search Bar
   ───────────────────────────────────────── */
#home-search {
  padding: 24px 28px 16px;
  border-bottom: 1px solid var(--border);
}

.home-search-bar {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--bg-input);
  border: 1.5px solid var(--border-strong);
  border-radius: var(--radius);
  transition: border-color var(--transition), box-shadow var(--transition);
  overflow: visible;
}

.home-search-bar:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}

.search-engine-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-right: 1px solid var(--border);
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  color: var(--text-secondary);
  font-size: 13px;
  font-family: var(--font-mono);
  transition: color var(--transition);
  white-space: nowrap;
}

.search-engine-btn:hover {
  color: var(--text-primary);
}

.search-engine-btn .engine-arrow {
  font-size: 10px;
  color: var(--text-muted);
  margin-left: 2px;
}

.home-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 14px;
  font-family: var(--font-mono);
  padding: 10px 14px;
  min-width: 0;
}

.home-search-input::placeholder {
  color: var(--text-muted);
}

.home-search-submit {
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-left: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 15px;
  cursor: pointer;
  transition: color var(--transition);
  flex-shrink: 0;
  line-height: 1;
}

.home-search-submit:hover {
  color: var(--accent);
}

.search-engine-dropdown {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: var(--bg-modal);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-modal);
  min-width: 140px;
  z-index: 200;
  overflow: hidden;
}

.search-engine-dropdown.open {
  display: block;
}

.search-engine-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  cursor: pointer;
  font-size: 13px;
  font-family: var(--font-mono);
  color: var(--text-secondary);
  transition: background var(--transition), color var(--transition);
}

.search-engine-option:hover {
  background: var(--accent-dim);
  color: var(--text-primary);
}

.search-engine-option.active {
  color: var(--text-accent);
  background: var(--accent-dim);
}

.search-engine-option .option-check {
  margin-left: auto;
  font-size: 11px;
  color: var(--accent);
}
```

- [ ] **Step 2: 刷新浏览器，CSS 无报错（DevTools Console 为空）**

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: 新增首页搜索栏 CSS 样式"
```

---

## Task 4: renderHomeSearch() 实现与接入

**Files:**
- Modify: `app.js` — Render 区块

- [ ] **Step 1: 在 `render()` 函数前（约第 405 行的 Render 区块开头）插入 `renderHomeSearch()` 函数**

```js
function renderHomeSearch() {
  const container = document.getElementById('home-search');
  if (!container) return;

  const engineId = state.data.settings.lastSearchEngine;
  const engine = SEARCH_ENGINES.find(e => e.id === engineId) || SEARCH_ENGINES[0];

  const optionsHtml = SEARCH_ENGINES.map(e => `
    <div class="search-engine-option ${e.id === engine.id ? 'active' : ''}" data-engine-id="${escHtml(e.id)}">
      <span>${escHtml(e.icon)}</span>
      <span>${escHtml(e.name)}</span>
      ${e.id === engine.id ? '<span class="option-check">✓</span>' : ''}
    </div>
  `).join('');

  container.style.display = '';
  container.innerHTML = `
    <div class="home-search-bar">
      <div class="search-engine-btn" id="engine-btn">
        <span>${escHtml(engine.icon)}</span>
        <span>${escHtml(engine.name)}</span>
        <span class="engine-arrow">▾</span>
      </div>
      <input
        class="home-search-input"
        id="home-search-input"
        type="text"
        placeholder="在 ${escHtml(engine.name)} 中搜索..."
        autocomplete="off"
      />
      <button class="home-search-submit" id="home-search-submit" title="搜索">↵</button>
      <div class="search-engine-dropdown" id="engine-dropdown">
        ${optionsHtml}
      </div>
    </div>
  `;

  // 执行搜索
  function doSearch() {
    const q = document.getElementById('home-search-input').value.trim();
    if (!q) return;
    const url = engine.url.replace('%s', encodeURIComponent(q));
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // 回车搜索
  document.getElementById('home-search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
  });

  // 按钮搜索
  document.getElementById('home-search-submit').addEventListener('click', doSearch);

  // 切换下拉
  const dropdown = document.getElementById('engine-dropdown');
  document.getElementById('engine-btn').addEventListener('click', e => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  // 选择引擎
  dropdown.querySelectorAll('.search-engine-option').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      state.data.settings.lastSearchEngine = el.dataset.engineId;
      saveData();
      renderHomeSearch();
    });
  });

  // 点击外部关闭下拉（once: true 自动移除，避免多次渲染叠加监听器）
  document.addEventListener('click', () => dropdown.classList.remove('open'), { once: true });
}
```

- [ ] **Step 2: 修改 `render()` 函数，根据当前视图控制 `#home-search` 显隐**

将现有 `render()` 函数（约第 408 行）改为：

```js
function render() {
  renderSidebar();
  renderBookmarks();

  const homeSearch = document.getElementById('home-search');
  if (state.activeCategory === HOME_ID && !trimString(state.searchQuery)) {
    renderHomeSearch();
  } else if (homeSearch) {
    homeSearch.style.display = 'none';
    homeSearch.innerHTML = '';
  }
}
```

- [ ] **Step 3: 打开浏览器验证以下行为**

  1. 点击侧边栏「首页」→ 顶部出现搜索栏，显示当前引擎图标和名称
  2. 点击引擎名称区域 → 下拉菜单展开，显示三个引擎，当前引擎有勾选
  3. 点击「Bing」→ 下拉关闭，搜索栏切换为 Bing，placeholder 更新
  4. 刷新页面 → 仍然显示 Bing（持久化生效）
  5. 输入「hello」按回车 → 新标签页打开 Bing 搜索结果
  6. 在搜索框输入内容，点击 ↵ 按钮 → 同上
  7. 输入框为空按回车 → 无反应
  8. 点击「全部」或其他分类 → 搜索栏隐藏
  9. 再切回「首页」→ 搜索栏重新出现
  10. 侧边栏搜索书签 → 搜索栏隐藏（searchQuery 非空时）
  11. 切换深色/浅色主题 → 搜索栏样式随主题切换

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: 实现首页搜索栏，支持多引擎切换与持久化"
```

---

## Task 5: 收尾推送

- [ ] **Step 1: 整体回归检查**

  - 书签的增删改查是否正常
  - 首页固定书签的拖拽排序是否正常
  - 导入/导出 JSON 后 `lastSearchEngine` 字段是否被正确保留或回退到 `'google'`

- [ ] **Step 2: 推送到远端**

```bash
git push
```
