# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

No build step, no package manager. You can open `index.html` directly in a browser:

```
# Windows
start index.html

# Or serve locally
npx serve .
python -m http.server 8080
```

There are no tests, no lint commands, and no CI configuration.

## Architecture

Pure Vanilla JS app split into multiple browser-loaded scripts. No framework, no dependencies, no bundler.

| File | Role |
|---|---|
| `index.html` | Static DOM skeleton and ordered `<script>` loading for the app |
| `style.css` | CSS variables for light/dark themes, density, layout, and all component styles |
| `js/config.js` | Default data, theme presets, search engines, emoji/static config |
| `js/state.js` | Shared runtime state and reserved IDs/constants |
| `js/data.js` | Persistence, normalization, import/export, filtering, utility helpers |
| `js/favicon.js` | Favicon rendering and three-tier fallback wiring |
| `js/theme.js` | Theme, color preset, density, appearance modal logic |
| `js/ui.js` | Sidebar, bookmark grid, modals, context menu, partial DOM updates |
| `js/events.js` | Event binding, form submit flows, drag-drop, interaction orchestration |
| `js/main.js` | App bootstrap and init order |

### Data Model

All data lives in `localStorage` under the key `bookmark-app-data`. Shape:

```js
{
  categories: [{ id, name, emoji }],
  bookmarks:  [{ id, title, url, description, favicon, categoryId, tags, createdAt, order }],
  settings:   { theme: 'dark'|'light', density: 'compact'|'default'|'large' }
}
```

`UNCATEGORIZED_ID = 'uncategorized'` is a reserved virtual category — never persisted in `categories[]`, only used as a `categoryId` on bookmarks whose category was deleted.

### Init Order

`js/main.js` starts the app in this exact order:

1. `initFaviconGlobals()`
2. `loadData()`
3. `wireEvents()`
4. `render()`
5. `applyTheme()`
6. `applyDensity()`

The favicon step must happen first because `js/favicon.js` exposes `faviconCacheOnLoad` / `faviconFallback1` / `faviconFallback2` on `window`, and those are called by inline `onload` / `onerror` attributes generated during render.

### Structure Notes

- **State** — single shared `state` object: `{ data, activeCategory, searchQuery, dragSourceId, editingTags }`
- **Persistence** — `loadData()` / `saveData()` live in `js/data.js`; `loadData` always passes through `normalizeDataShape()`
- **Normalization** — `normalizeDataShape()` is the canonical data sanitizer; called on load, import, and merge. `normalizeBookmark()` and `normalizeCategory()` are its building blocks.
- **Favicon Rendering** — three-tier fallback: Google S2 API → `origin/favicon.ico` → colored letter block. On first successful load, the URL is written back to `bm.favicon` via `faviconCacheOnLoad` so subsequent renders skip the fallback chain.
- **Render** — `render()` in `js/ui.js` calls `renderSidebar()` + `renderBookmarks()`. All rendering uses `innerHTML` with `escHtml()` for XSS safety. Sidebar item listeners are re-attached after render; grid interactions are delegated from `wireGridEvents()`.
- **Modal / Forms** — bookmark add/edit modal and category modal; tag chip input state is held in `state.editingTags`.
- **Drag & Drop** — HTML5 native API; `state.dragSourceId` tracks the dragged bookmark; `order` fields are rewritten on drop and persisted.

### Theme

Applied via `data-theme="dark"|"light"` attribute on `<html>`. CSS variables in `style.css` handle both themes via `[data-theme="dark"]` override block.
