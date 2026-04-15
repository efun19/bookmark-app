# AGENTS.md

## 项目性质

- 这是一个**纯静态 Vanilla JS** 项目：根目录核心文件是 `index.html`、`style.css`，业务逻辑拆分在 `js/*.js`。
- **没有** `package.json`、构建步骤、依赖安装、测试套件、lint、typecheck、CI。
- 不要先假设存在 `npm run dev`、`src/`、打包器或框架目录；真实入口就是根目录文件。

## 运行与验证

- 最直接运行方式：直接打开 `index.html`。
- 需要本地服务时可用：`npx serve .` 或 `python -m http.server 8080`。
- 这个仓库没有自动化测试。完成修改后，使用浏览器做最小手动验证，而不是编造不存在的校验命令。

## 文件职责

- `index.html`：静态骨架；带 `<!-- rendered by JS -->` 的区域由 JS 渲染；底部按顺序加载 `js/*.js`。
- `style.css`：所有样式、主题变量、密度样式。
- `js/config.js`：默认数据、主题预设、搜索引擎、emoji 等静态配置。
- `js/state.js`：全局运行时状态与保留常量（如 `HOME_ID`、`UNCATEGORIZED_ID`）。
- `js/data.js`：数据清洗、`localStorage`、导入导出、筛选与通用工具函数。
- `js/favicon.js`：favicon 渲染与三级回退逻辑。
- `js/theme.js`：主题、配色、密度、外观面板逻辑。
- `js/ui.js`：侧边栏、书签列表、弹窗、上下文菜单等渲染/UI 操作。
- `js/events.js`：事件绑定、表单提交、拖拽排序、交互流程。
- `js/main.js`：应用入口，负责初始化顺序。

## 代码修改约束

### HTML

- 保留现有 `id`。`js/ui.js` 与 `js/events.js` 仍大量通过 `getElementById(...)` 直接绑定节点。
- 不要把 JS 渲染区域改成静态内容后又指望它保留；`render()` 会覆盖这些区域。

### CSS

- 主题依赖 CSS 变量：亮色在 `:root`，暗色在 `[data-theme="dark"]`。
- 新增颜色/表面样式时，优先扩展变量，而不是写死单个颜色。
- 密度切换依赖 `#main[data-density="compact|default|large"]`；涉及卡片尺寸/间距时要同时检查三种密度。

### JavaScript

- 持久化 key 是 `bookmark-app-data`，数据都在 `localStorage`。
- 数据结构由 `normalizeDataShape()` 统一清洗；任何新增导入字段或持久化字段，都应补到归一化逻辑，而不是只改表单提交。
- `UNCATEGORIZED_ID = 'uncategorized'` 是**保留的虚拟分类 ID**：可出现在 bookmark 的 `categoryId`，但**不能**写入 `categories[]`。
- 任何改动数据的逻辑，别忘了 `saveData()`；否则刷新后会丢失。
- 渲染使用 `innerHTML`，插入用户可控文本时必须继续走 `escHtml()`，不要直接拼未经转义的字符串。
- favicon 回退链依赖挂在 `window` 上的 `faviconCacheOnLoad` / `faviconFallback1` / `faviconFallback2`，因为它们被内联 `onload` / `onerror` 调用；改名或收进局部作用域会直接失效。
- 事件模型不是全量事件代理：侧边栏分类项在 `renderSidebar()` 后重新绑定；网格区事件在 `wireGridEvents()` 中绑定。修改渲染逻辑时要同步检查事件是否仍然挂得上。

## 状态与行为速记

- 全局状态集中在 `js/state.js` 的 `state`：`data`、`activeCategory`、`searchQuery`、`dragSourceId`、`editingTags`。
- 初始化入口是 `js/main.js` 里的 `document.addEventListener('DOMContentLoaded', init)`。
- `init()` 顺序是：`initFaviconGlobals()` → `loadData()` → `wireEvents()` → `render()` → `applyTheme()` → `applyDensity()`。
- 搜索优先级高于分类过滤；修改筛选逻辑时要同时验证“搜索中 + 分类切换”场景。
- 书签新增/编辑有局部更新优化（不是每次都全量 `render()`）；改卡片结构时要一起检查 `renderBookmarks()`、`insertBookmarkCard()`、`replaceBookmarkCard()` 这类路径是否一致。

## 最小手动验证清单

没有测试命令时，至少验证这些真实用户路径：

- 打开页面无控制台报错。
- 添加一个书签并刷新，确认 `localStorage` 持久化正常。
- 编辑书签（尤其修改 URL），确认 favicon 仍能正常回退或刷新。
- 切换亮/暗主题，确认 `<html data-theme>` 生效。
- 切换三种密度，确认布局没有明显破坏。
- 拖拽排序后刷新，确认顺序保留。
- 导入/导出 JSON 至少走一遍 happy path。

## 参考说明文件

- `README.md` 主要是面向使用者的功能介绍。
- `CLAUDE.md` 含有更长的仓库说明；若这里的信息需要扩展，先核对两边是否一致。
