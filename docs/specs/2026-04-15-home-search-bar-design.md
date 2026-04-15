# 首页搜索栏设计文档

**日期：** 2026-04-15  
**状态：** 已批准

---

## 概述

在书签应用的"首页"视图（`HOME_ID`）顶部添加一个 Hero 风格的搜索栏，支持多搜索引擎切换，选择结果在新标签页打开，上次选择的引擎持久化到 localStorage。

---

## 数据模型变更

### settings 新增字段

```js
settings: {
  theme: 'dark' | 'light',
  density: 'compact' | 'default' | 'large',
  homePage: [...],
  lastSearchEngine: 'google'   // 新增，默认值 'google'
}
```

`lastSearchEngine` 存储引擎 id 字符串，通过现有 `saveData()` / `loadData()` 机制持久化。`normalizeDataShape` 中需补充默认值回退逻辑。

### 搜索引擎常量（不持久化）

```js
const SEARCH_ENGINES = [
  { id: 'google', name: 'Google', icon: '🔍', url: 'https://www.google.com/search?q=%s' },
  { id: 'bing',   name: 'Bing',   icon: '🔷', url: 'https://www.bing.com/search?q=%s'  },
  { id: 'baidu',  name: '百度',   icon: '🔴', url: 'https://www.baidu.com/s?wd=%s'     },
];
```

`%s` 在执行搜索时替换为 `encodeURIComponent(query)`。

---

## 界面设计

### 布局

搜索栏仅在 `activeCategory === HOME_ID` 时显示，位于主内容区 Header 下方、书签网格上方，横跨整个主内容区宽度。

### 结构

```
div#home-search
  └── div.home-search-bar
        ├── div.search-engine-btn      ← 当前引擎图标 + 名称 + ▾，点击展开下拉
        ├── input.home-search-input    ← 搜索输入框，placeholder 随引擎变化
        ├── button.home-search-submit  ← ↵ 提交按钮
        └── div.search-engine-dropdown ← 下拉菜单（默认隐藏）
              每个引擎一行：图标 + 名称 + 勾（当前选中）
```

`index.html` 在 `<div class="bookmarks-grid">` 前静态插入 `<div id="home-search"></div>` 作为渲染挂载点。

### 视觉风格

- 搜索栏：圆角矩形，蓝紫色边框（`#5c6bc0`），聚焦时发光阴影
- 引擎切换区：左侧，竖线分隔，点击切换下拉
- 下拉菜单：绝对定位，跟随搜索栏左侧对齐，当前引擎行高亮 + 勾选
- 深色/浅色主题均需适配（通过 CSS 变量）

---

## 渲染逻辑

### 新增函数：`renderHomeSearch()`

- 读取 `state.data.settings.lastSearchEngine`，找到对应引擎配置
- 生成搜索栏 HTML（含下拉菜单），写入 `#home-search` 的 `innerHTML`
- 挂载事件监听（引擎切换、搜索提交、点击外部关闭下拉）

### 调用位置

在现有 `render()` 函数中调用 `renderHomeSearch()`：
- `activeCategory === HOME_ID`：显示 `#home-search`，调用渲染
- 其他视图：隐藏 `#home-search`，跳过渲染

---

## 交互行为

| 操作 | 行为 |
|---|---|
| 点击 `.search-engine-btn` | 切换下拉菜单显示/隐藏 |
| 点击下拉中的引擎项 | 更新 `lastSearchEngine`，`saveData()`，重渲染搜索栏 |
| 输入框按 Enter | 用当前引擎搜索，`window.open(url, '_blank')` |
| 点击 ↵ 按钮 | 同上 |
| 点击页面其他区域 | 关闭下拉菜单 |
| 输入框为空时搜索 | 不执行，忽略 |

---

## 数据规范化

`normalizeDataShape` 中的 `createDefaultSettings` 需补充：

```js
lastSearchEngine: SEARCH_ENGINES.some(e => e.id === settings.lastSearchEngine)
  ? settings.lastSearchEngine
  : 'google',
```

确保从旧数据加载或导入时字段始终合法。

---

## 文件改动范围

| 文件 | 改动 |
|---|---|
| `app.js` | 新增 `SEARCH_ENGINES` 常量、`renderHomeSearch()` 函数；修改 `render()`、`createDefaultSettings()` |
| `index.html` | 在 bookmarks-grid 前插入 `<div id="home-search"></div>` |
| `style.css` | 新增 `.home-search-bar`、`.search-engine-btn`、`.search-engine-dropdown` 等样式，适配深色/浅色主题 |
