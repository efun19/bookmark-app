# 书签收藏

一个纯前端网页书签管理应用，无需安装；既可以直接用浏览器打开，也可以通过本地静态服务访问。

## 快速开始

下载或克隆项目后，可以直接用浏览器打开 `index.html`。

如果你更习惯通过本地静态服务访问，也可以使用：

```bash
python -m http.server 8080
# 或
npx serve .
```

然后打开 `http://localhost:8080`（或命令输出中的本地地址）。

```
bookmark-app/
├── index.html        # 静态页面骨架与脚本加载顺序
├── style.css         # 全部样式、主题变量、密度样式
└── js/
    ├── config.js     # 默认数据、主题预设、搜索引擎、emoji 等静态配置
    ├── state.js      # 全局运行时状态与保留常量（如首页/未分类）
    ├── data.js       # 数据清洗、localStorage、导入导出、筛选与通用工具函数
    ├── favicon.js    # favicon 渲染与三级回退逻辑
    ├── theme.js      # 主题、配色、密度、外观面板逻辑
    ├── ui.js         # 侧边栏、书签列表、弹窗、上下文菜单等渲染/UI 操作
    ├── events.js     # 事件绑定、表单提交、拖拽排序、交互流程
    └── main.js       # 应用入口，负责初始化顺序
```

数据保存在浏览器 `localStorage`，清除浏览器缓存前数据不会丢失。

## 初始化流程

页面加载后，应用按下面顺序启动：

1. `initFaviconGlobals()`：注册 favicon 回退链依赖的全局回调
2. `loadData()`：从 `localStorage` 读取并归一化数据
3. `wireEvents()`：绑定静态节点事件
4. `render()`：渲染侧边栏、书签列表与首页搜索区
5. `applyTheme()`：应用当前主题与配色
6. `applyDensity()`：应用当前密度设置

## 功能

### 书签管理
- **添加书签**：填写网址、标题、描述（选填）、分类、标签
- **编辑书签**：点击卡片右上角 ✏ 按钮
- **删除书签**：点击卡片右上角 🗑 按钮，需二次确认
- **一键跳转**：点击标题在新标签页打开网址
- **Favicon 自动获取**：三层降级（Google 服务 → 站点根目录 → 首字母色块）

### 分类与标签
- 自定义分类，支持 emoji 图标
- 删除分类后，该分类下的书签自动归入「未分类」
- 书签支持多个标签，在表单中回车或逗号添加

### 搜索
- 侧边栏实时搜索，跨全库匹配
- 同时匹配标题、描述、网址、标签

### 视图密度
顶栏右侧三个按钮切换，选择会自动保存：

| 按钮 | 模式 | 适合场景 |
|---|---|---|
| ≡ | 紧凑列表 | 快速浏览大量书签 |
| ⊞ | 网格（默认）| 日常使用 |
| ☐ | 宽卡片 | 仔细查阅、描述较多时 |

### 拖拽排序
拖动卡片调整顺序，松手后自动保存。

### 导入 / 导出
- **导出**：将当前数据下载为 `bookmarks.json`
- **导入**：读取 JSON 文件，支持选择「覆盖」或「追加」

### 主题
侧边栏底部切换亮色 / 暗色模式，偏好自动保存。

## 数据格式

导出的 JSON 结构，可手动编辑后再导入：

```json
{
  "categories": [
    { "id": "cat-1", "name": "技术", "emoji": "💻" }
  ],
  "bookmarks": [
    {
      "id": "bm-1",
      "title": "GitHub",
      "url": "https://github.com",
      "description": "代码托管平台",
      "categoryId": "cat-1",
      "tags": ["开发", "git"],
      "createdAt": 1700000000000,
      "order": 0
    }
  ],
  "settings": {
    "theme": "dark",
    "density": "default"
  }
}
```

## 技术说明

- 纯 Vanilla JS，无框架，无依赖
- 数据存储：`localStorage`，key 为 `bookmark-app-data`
- 字体：DM Serif Display / Lora / JetBrains Mono（Google Fonts）
- 拖拽：HTML5 原生 Drag & Drop API
