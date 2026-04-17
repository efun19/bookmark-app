(function () {
  window.BookmarkApp = window.BookmarkApp || {};
  const app = window.BookmarkApp;
  const { STORAGE_KEY, DEFAULT_DATA, SEARCH_ENGINES, THEME_PRESETS } = app.config;
  const { HOME_ID, UNCATEGORIZED_ID, UNCATEGORIZED_META, state } = app.state;

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return normalizeDataShape(parsed);
      }
    } catch {
      /* corrupted */
    }
    return normalizeDataShape(DEFAULT_DATA);
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  }

  function uid() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function trimString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function normalizeDensity(value) {
    return ['compact', 'default', 'large'].includes(value) ? value : 'default';
  }

  function getCategoryMeta(categoryId) {
    if (categoryId === UNCATEGORIZED_ID) return UNCATEGORIZED_META;
    return state.data.categories.find(category => category.id === categoryId) || null;
  }

  function matchesSearchQuery(bookmark, query) {
    const q = trimString(query == null ? state.searchQuery : query).toLowerCase();
    if (!q) return true;
    return bookmark.title.toLowerCase().includes(q)
      || (bookmark.description || '').toLowerCase().includes(q)
      || bookmark.url.toLowerCase().includes(q)
      || (bookmark.tags || []).some(tag => tag.toLowerCase().includes(q));
  }

  function isBookmarkVisibleInCurrentView(bookmark) {
    if (trimString(state.searchQuery)) return matchesSearchQuery(bookmark, state.searchQuery);
    if (state.activeCategory === HOME_ID) return state.data.settings.homePage.includes(bookmark.id);
    if (state.activeCategory === 'all') return true;
    return bookmark.categoryId === state.activeCategory;
  }

  function getNextBookmarkOrder(bookmarks) {
    const list = bookmarks || state.data.bookmarks;
    return list.reduce((max, bookmark) => Math.max(max, Number.isFinite(bookmark.order) ? bookmark.order : -1), -1) + 1;
  }

  function createDefaultSettings(settings) {
    const source = settings || {};
    const validPresets = Object.keys(THEME_PRESETS);
    const activeThemePreset = validPresets.includes(source.activeThemePreset) ? source.activeThemePreset : 'warm';

    let customColors = null;
    if (activeThemePreset === 'custom' && source.customColors && typeof source.customColors === 'object') {
      const colors = source.customColors;
      const keys = ['bg', 'bgSidebar', 'bgCard', 'accent', 'textPrimary', 'textSecondary'];
      if (keys.every(key => typeof colors[key] === 'string' && /^#[0-9a-fA-F]{6}$/.test(colors[key]))) {
        customColors = { ...colors };
      }
    }

    // 归一化 background 字段
    let background = null;
    if (source.background && typeof source.background === 'object') {
      const bg = source.background;
      const validSources = ['upload', 'bing', 'url'];
      const validSizes = ['cover', 'contain', 'stretch'];
      const validIntervals = ['daily', 'weekly', 'manual'];
      background = {
        source: validSources.includes(bg.source) ? bg.source : null,
        value: typeof bg.value === 'string' ? bg.value : null,
        url: typeof bg.url === 'string' ? bg.url : null,
        opacity: typeof bg.opacity === 'number' && bg.opacity >= 0 && bg.opacity <= 1 ? bg.opacity : 0.3,
        size: validSizes.includes(bg.size) ? bg.size : 'cover',
        bingInterval: validIntervals.includes(bg.bingInterval) ? bg.bingInterval : 'daily',
        bingLastUpdate: typeof bg.bingLastUpdate === 'number' ? bg.bingLastUpdate : null,
      };
      // 校验：source 和对应值必须匹配
      if (background.source === 'upload' && !background.value) background.source = null;
      if ((background.source === 'bing' || background.source === 'url') && !background.url) background.source = null;
    }

    return {
      theme: source.theme === 'light' ? 'light' : 'dark',
      density: normalizeDensity(source.density),
      homePage: Array.isArray(source.homePage) ? source.homePage : [],
      lastSearchEngine: SEARCH_ENGINES.some(engine => engine.id === source.lastSearchEngine) ? source.lastSearchEngine : 'google',
      activeThemePreset,
      customColors,
      background: background || {
        source: null,
        value: null,
        url: null,
        opacity: 0.3,
        size: 'cover',
        bingInterval: 'daily',
        bingLastUpdate: null,
      },
    };
  }

  function normalizeCategory(raw, fallbackId) {
    if (!raw || typeof raw !== 'object') return null;
    const name = trimString(raw.name);
    if (!name) return null;
    return {
      id: trimString(raw.id) || fallbackId,
      name,
      emoji: trimString(raw.emoji) || '📁',
    };
  }

  function normalizeBookmark(raw, index, validCategoryIds) {
    if (!raw || typeof raw !== 'object') return null;
    const title = trimString(raw.title);
    const url = trimString(raw.url);
    if (!title || !isValidUrl(url)) return null;

    const tags = Array.isArray(raw.tags) ? [...new Set(raw.tags.map(trimString).filter(Boolean))] : [];
    const categoryId = trimString(raw.categoryId);
    const createdAt = Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now() + index;
    const order = Number.isFinite(raw.order) ? raw.order : index;

    return {
      id: trimString(raw.id) || uid(),
      title,
      url,
      description: typeof raw.description === 'string' ? raw.description.trim() : '',
      favicon: typeof raw.favicon === 'string' ? raw.favicon : '',
      categoryId: validCategoryIds.has(categoryId) ? categoryId : UNCATEGORIZED_ID,
      tags,
      createdAt,
      order,
    };
  }

  function normalizeDataShape(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const rawCategories = Array.isArray(source.categories) ? source.categories : [];
    const rawBookmarks = Array.isArray(source.bookmarks) ? source.bookmarks : [];
    const categories = [];
    const categoryIds = new Set();

    rawCategories.forEach((category, index) => {
      const normalized = normalizeCategory(category, `cat-${index + 1}`);
      if (normalized && !categoryIds.has(normalized.id) && normalized.id !== UNCATEGORIZED_ID) {
        categoryIds.add(normalized.id);
        categories.push(normalized);
      }
    });

    const bookmarks = [];
    const bookmarkIds = new Set();
    rawBookmarks.forEach((bookmark, index) => {
      const normalized = normalizeBookmark(bookmark, index, categoryIds);
      if (normalized && !bookmarkIds.has(normalized.id)) {
        bookmarkIds.add(normalized.id);
        bookmarks.push(normalized);
      }
    });

    bookmarks.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt).forEach((bookmark, index) => {
      bookmark.order = index;
    });

    const settings = createDefaultSettings(source.settings);
    const bookmarkIdSet = new Set(bookmarks.map(bookmark => bookmark.id));
    settings.homePage = settings.homePage.filter(id => bookmarkIdSet.has(id));

    return { categories, bookmarks, settings };
  }

  function mergeImportedData(currentData, importedData) {
    const mergedCategories = [...currentData.categories];
    const existingCatIds = new Set(mergedCategories.map(category => category.id));
    const orderOffset = getNextBookmarkOrder(currentData.bookmarks);

    importedData.categories.forEach(category => {
      if (!existingCatIds.has(category.id)) {
        existingCatIds.add(category.id);
        mergedCategories.push(category);
      }
    });

    const mergedBookmarks = [...currentData.bookmarks];
    const existingBookmarkIds = new Set(mergedBookmarks.map(bookmark => bookmark.id));
    importedData.bookmarks.forEach(bookmark => {
      if (!existingBookmarkIds.has(bookmark.id)) {
        existingBookmarkIds.add(bookmark.id);
        mergedBookmarks.push({ ...bookmark, order: orderOffset + bookmark.order });
      }
    });

    const mergedBookmarkIds = new Set(mergedBookmarks.map(bookmark => bookmark.id));
    const importedSettings = createDefaultSettings(importedData.settings);
    const mergedHomePage = [...currentData.settings.homePage, ...importedSettings.homePage]
      .filter((id, index, all) => mergedBookmarkIds.has(id) && all.indexOf(id) === index);

    return normalizeDataShape({
      categories: mergedCategories,
      bookmarks: mergedBookmarks,
      settings: { ...currentData.settings, homePage: mergedHomePage },
    });
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isValidUrl(str) {
    try { return ['http:', 'https:'].includes(new URL(str).protocol); }
    catch { return false; }
  }

  function hostname(url) {
    try { return new URL(url).hostname; }
    catch { return ''; }
  }

  function origin(url) {
    try { return new URL(url).origin; }
    catch { return ''; }
  }

  function hashColor(str) {
    const palette = ['#b5651d', '#6a8e7f', '#7b6ea8', '#c47c5a', '#5e8fa2', '#a06b87', '#7c9e68', '#c46a4e', '#5e7ba2', '#8e6a5e'];
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) hash = (hash * 31 + str.charCodeAt(i)) | 0;
    return palette[Math.abs(hash) % palette.length];
  }

  function getFilteredBookmarks() {
    const { bookmarks } = state.data;
    const { homePage } = state.data.settings;
    const q = trimString(state.searchQuery).toLowerCase();
    let list = [...bookmarks];

    if (q) {
      list = list.filter(bookmark => matchesSearchQuery(bookmark, q));
      list.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
    } else if (state.activeCategory === HOME_ID) {
      const homeSet = new Set(homePage);
      list = list.filter(bookmark => homeSet.has(bookmark.id));
      const homeIndexMap = new Map(homePage.map((id, index) => [id, index]));
      list.sort((a, b) => homeIndexMap.get(a.id) - homeIndexMap.get(b.id));
    } else if (state.activeCategory !== 'all') {
      list = list.filter(bookmark => bookmark.categoryId === state.activeCategory);
      list.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
    } else {
      list.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
    }

    return list;
  }

  function compressImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(function(blob) {
            const reader2 = new FileReader();
            reader2.onload = function(e) {
              resolve(e.target.result);
            };
            reader2.onerror = reject;
            reader2.readAsDataURL(blob);
          }, 'image/jpeg', quality);
        };
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function exportData() {
    const json = JSON.stringify(state.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'bookmarks.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(file, onDone) {
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed || typeof parsed !== 'object') {
          alert('文件格式不正确，请检查 JSON 结构。');
          return;
        }
        const normalized = normalizeDataShape(parsed);
        const choice = confirm('选择导入方式：\n\n确定 → 覆盖当前数据\n取消 → 追加到当前数据');
        if (choice) state.data = normalized;
        else state.data = mergeImportedData(state.data, normalized);
        saveData();
        state.activeCategory = 'all';
        state.searchQuery = '';
        onDone();
      } catch {
        alert('文件解析失败，请确认文件是有效的 JSON。');
      }
    };
    reader.readAsText(file);
  }

  app.data = {
    loadData,
    saveData,
    uid,
    trimString,
    normalizeDensity,
    getCategoryMeta,
    matchesSearchQuery,
    isBookmarkVisibleInCurrentView,
    getNextBookmarkOrder,
    createDefaultSettings,
    normalizeCategory,
    normalizeBookmark,
    normalizeDataShape,
    mergeImportedData,
    escHtml,
    isValidUrl,
    hostname,
    origin,
    hashColor,
    getFilteredBookmarks,
    exportData,
    handleImport,
    compressImage,
  };
}());
