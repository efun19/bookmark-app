'use strict';

/* ─────────────────────────────────────────
   Storage & Default Data
   ───────────────────────────────────────── */
const STORAGE_KEY = 'bookmark-app-data';

const DEFAULT_DATA = {
  categories: [
    { id: 'cat-tech', name: '技术', emoji: '💻' },
    { id: 'cat-design', name: '设计', emoji: '🎨' },
    { id: 'cat-tools', name: '工具', emoji: '🔧' },
  ],
  bookmarks: [
    {
      id: 'bm-demo-1',
      title: 'GitHub',
      url: 'https://github.com',
      description: '代码托管与协作平台',
      favicon: '',
      categoryId: 'cat-tech',
      tags: ['开发', 'git'],
      createdAt: Date.now() - 86400000,
      order: 0,
    },
    {
      id: 'bm-demo-2',
      title: 'MDN Web Docs',
      url: 'https://developer.mozilla.org',
      description: 'Web 技术权威文档',
      favicon: '',
      categoryId: 'cat-tech',
      tags: ['文档', 'web'],
      createdAt: Date.now() - 43200000,
      order: 1,
    },
    {
      id: 'bm-demo-3',
      title: 'Figma',
      url: 'https://www.figma.com',
      description: '协作设计工具',
      favicon: '',
      categoryId: 'cat-design',
      tags: ['UI', '协作'],
      createdAt: Date.now() - 21600000,
      order: 0,
    },
  ],
  settings: { theme: 'dark' },
};

/* ─────────────────────────────────────────
   State
   ───────────────────────────────────────── */
const state = {
  data: null,
  activeCategory: 'all',
  searchQuery: '',
  dragSourceId: null,
  editingTags: [],
};

/* ─────────────────────────────────────────
   Persistence
   ───────────────────────────────────────── */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // basic shape check
      if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.bookmarks)) {
        return parsed;
      }
    }
  } catch {
    /* corrupted — fall through to default */
  }
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

/* ─────────────────────────────────────────
   Helpers
   ───────────────────────────────────────── */
function uid() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
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

/** Deterministic color from string hash (for favicon fallback) */
function hashColor(str) {
  const palette = [
    '#b5651d','#6a8e7f','#7b6ea8','#c47c5a','#5e8fa2',
    '#a06b87','#7c9e68','#c46a4e','#5e7ba2','#8e6a5e',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

/* ─────────────────────────────────────────
   Favicon Rendering
   ───────────────────────────────────────── */
function faviconHtml(bm) {
  const host = hostname(bm.url);
  const letter = (bm.title || host || '?')[0].toUpperCase();
  const color = hashColor(host || bm.id);
  const fallbackStyle = `background:${color};`;

  return `
    <img
      class="card-favicon"
      src="https://www.google.com/s2/favicons?sz=32&domain=${escHtml(host)}"
      alt=""
      data-host="${escHtml(host)}"
      data-origin="${escHtml(origin(bm.url))}"
      data-letter="${escHtml(letter)}"
      data-color="${escHtml(color)}"
      onerror="faviconFallback1(this)"
    />
  `;
}

window.faviconFallback1 = function (img) {
  img.onerror = window.faviconFallback2;
  img.src = img.dataset.origin + '/favicon.ico';
};

window.faviconFallback2 = function (img) {
  img.onerror = null;
  const el = document.createElement('div');
  el.className = 'favicon-fallback';
  el.style.cssText = `background:${img.dataset.color};`;
  el.textContent = img.dataset.letter;
  img.replaceWith(el);
};

/* ─────────────────────────────────────────
   Filtered Bookmarks
   ───────────────────────────────────────── */
function getFilteredBookmarks() {
  const { bookmarks } = state.data;
  const q = state.searchQuery.trim().toLowerCase();

  let list = [...bookmarks];

  if (q) {
    list = list.filter(bm =>
      bm.title.toLowerCase().includes(q) ||
      (bm.description || '').toLowerCase().includes(q) ||
      bm.url.toLowerCase().includes(q) ||
      (bm.tags || []).some(t => t.toLowerCase().includes(q))
    );
  } else if (state.activeCategory !== 'all') {
    list = list.filter(bm => bm.categoryId === state.activeCategory);
  }

  list.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
  return list;
}

/* ─────────────────────────────────────────
   Render
   ───────────────────────────────────────── */
function render() {
  renderSidebar();
  renderBookmarks();
}

function renderSidebar() {
  const { categories, bookmarks } = state.data;

  // total count
  document.getElementById('total-count').textContent = `${bookmarks.length} 个书签`;

  // categories
  const nav = document.getElementById('categories-nav');
  const allCount = bookmarks.length;

  const allItem = makeItemHtml('all', '🗂', '全部', allCount, state.activeCategory === 'all', false);

  const catItems = categories.map(cat => {
    const count = bookmarks.filter(b => b.categoryId === cat.id).length;
    return makeItemHtml(cat.id, cat.emoji, cat.name, count, state.activeCategory === cat.id, true);
  }).join('');

  nav.innerHTML = `
    ${allItem}
    <div class="cat-divider"></div>
    ${catItems}
    <button class="btn-new-cat" id="btn-new-cat">
      <span>＋</span> 新建分类
    </button>
  `;

  nav.querySelectorAll('.cat-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('.cat-delete')) return;
      state.activeCategory = el.dataset.catId;
      state.searchQuery = '';
      document.getElementById('search-input').value = '';
      updateSearchClear();
      render();
    });
  });

  nav.querySelectorAll('.cat-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteCategory(btn.dataset.catId);
    });
  });

  document.getElementById('btn-new-cat').addEventListener('click', openCategoryModal);
}

function makeItemHtml(id, emoji, name, count, active, deletable) {
  const activeClass = active ? 'active' : '';
  const deleteBtn = deletable
    ? `<button class="cat-delete" data-cat-id="${escHtml(id)}" title="删除分类">✕</button>`
    : '';
  return `
    <div class="cat-item ${activeClass}" data-cat-id="${escHtml(id)}">
      <span class="cat-emoji">${emoji}</span>
      <span class="cat-name">${escHtml(name)}</span>
      <span class="cat-count">${count}</span>
      ${deleteBtn}
    </div>
  `;
}

function renderBookmarks() {
  const list = getFilteredBookmarks();
  const grid = document.getElementById('bookmarks-grid');
  const emptyState = document.getElementById('empty-state');
  const headerTitle = document.getElementById('header-title');
  const headerSub = document.getElementById('header-subtitle');

  // Header
  if (state.searchQuery) {
    headerTitle.textContent = '搜索结果';
    headerSub.textContent = `"${state.searchQuery}" — 找到 ${list.length} 个书签`;
  } else if (state.activeCategory === 'all') {
    headerTitle.textContent = '全部书签';
    headerSub.textContent = `共 ${state.data.bookmarks.length} 个书签`;
  } else {
    const cat = state.data.categories.find(c => c.id === state.activeCategory);
    if (cat) {
      headerTitle.textContent = `${cat.emoji} ${cat.name}`;
      headerSub.textContent = `${list.length} 个书签`;
    }
  }

  if (list.length === 0) {
    grid.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  grid.style.display = 'grid';
  emptyState.style.display = 'none';

  grid.innerHTML = list.map(bm => cardHtml(bm)).join('');
}

function cardHtml(bm) {
  const cat = state.data.categories.find(c => c.id === bm.categoryId);
  const catBadge = cat
    ? `<span class="badge badge-cat">${cat.emoji} ${escHtml(cat.name)}</span>`
    : '';
  const tagBadges = (bm.tags || []).map(t => `<span class="badge badge-tag">${escHtml(t)}</span>`).join('');
  const desc = bm.description ? `<p class="card-desc">${escHtml(bm.description)}</p>` : '';
  const shortUrl = hostname(bm.url) || bm.url;

  return `
    <div class="bookmark-card" data-bm-id="${escHtml(bm.id)}" draggable="true">
      <div class="card-header">
        ${faviconHtml(bm)}
        <a class="card-title-link" href="${escHtml(bm.url)}" target="_blank" rel="noopener noreferrer">${escHtml(bm.title)}</a>
        <div class="card-actions">
          <button class="card-btn edit" data-bm-id="${escHtml(bm.id)}" title="编辑">✏</button>
          <button class="card-btn delete" data-bm-id="${escHtml(bm.id)}" title="删除">🗑</button>
        </div>
      </div>
      ${desc}
      <div class="card-url" title="${escHtml(bm.url)}">${escHtml(shortUrl)}</div>
      <div class="card-footer">
        ${catBadge}
        ${tagBadges}
      </div>
    </div>
  `;
}

/** 将 HTML 字符串解析为单个 DOM 节点 */
function createCardNode(bm) {
  const tpl = document.createElement('template');
  tpl.innerHTML = cardHtml(bm).trim();
  return tpl.content.firstElementChild;
}

/** 添加书签后只插入新卡片，不重建整个 grid */
function insertBookmarkCard(bm) {
  const grid = document.getElementById('bookmarks-grid');
  const emptyState = document.getElementById('empty-state');
  grid.style.display = 'grid';
  emptyState.style.display = 'none';
  grid.prepend(createCardNode(bm));
  updateSidebarCounts();
}

/** 编辑书签后只替换对应卡片 */
function replaceBookmarkCard(bm) {
  const existing = document.querySelector(`.bookmark-card[data-bm-id="${bm.id}"]`);
  if (!existing) { renderBookmarks(); return; }
  const newCard = createCardNode(bm);
  // 编辑时不需要入场动画
  newCard.style.animation = 'none';
  existing.replaceWith(newCard);
  updateSidebarCounts();
}

/** 只更新侧边栏的数字徽章和总数，不重建整个侧边栏 */
function updateSidebarCounts() {
  const { bookmarks, categories } = state.data;
  document.getElementById('total-count').textContent = `${bookmarks.length} 个书签`;

  // 全部
  const allBadge = document.querySelector('.cat-item[data-cat-id="all"] .cat-count');
  if (allBadge) allBadge.textContent = bookmarks.length;

  // 各分类
  categories.forEach(cat => {
    const badge = document.querySelector(`.cat-item[data-cat-id="${cat.id}"] .cat-count`);
    if (badge) badge.textContent = bookmarks.filter(b => b.categoryId === cat.id).length;
  });

  // 更新 header subtitle
  const headerSub = document.getElementById('header-subtitle');
  if (!state.searchQuery) {
    if (state.activeCategory === 'all') {
      headerSub.textContent = `共 ${bookmarks.length} 个书签`;
    } else {
      const count = bookmarks.filter(b => b.categoryId === state.activeCategory).length;
      headerSub.textContent = `${count} 个书签`;
    }
  }
}

/* ─────────────────────────────────────────
   Theme
   ───────────────────────────────────────── */
function applyTheme() {
  const theme = state.data.settings.theme;
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('theme-icon').textContent = theme === 'dark' ? '◑' : '◐';
}

function toggleTheme() {
  state.data.settings.theme = state.data.settings.theme === 'dark' ? 'light' : 'dark';
  saveData();
  applyTheme();
}

/* ─────────────────────────────────────────
   Density
   ───────────────────────────────────────── */
function applyDensity() {
  const density = state.data.settings.density || 'default';
  document.getElementById('main').setAttribute('data-density', density);
  document.querySelectorAll('.density-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.density === density);
  });
}

function setDensity(value) {
  state.data.settings.density = value;
  saveData();
  applyDensity();
}

/* ─────────────────────────────────────────
   Search
   ───────────────────────────────────────── */
function updateSearchClear() {
  const btn = document.getElementById('search-clear');
  if (state.searchQuery) {
    btn.classList.add('visible');
  } else {
    btn.classList.remove('visible');
  }
}

/* ─────────────────────────────────────────
   Drag & Drop（通过事件代理绑定在 grid 上）
   ───────────────────────────────────────── */
function wireGridEvents() {
  const grid = document.getElementById('bookmarks-grid');

  grid.addEventListener('click', e => {
    const editBtn = e.target.closest('.card-btn.edit');
    const deleteBtn = e.target.closest('.card-btn.delete');
    if (editBtn) openBookmarkModal(editBtn.dataset.bmId);
    else if (deleteBtn) deleteBookmark(deleteBtn.dataset.bmId);
  });

  grid.addEventListener('dragstart', e => {
    const card = e.target.closest('.bookmark-card');
    if (!card) return;
    state.dragSourceId = card.dataset.bmId;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  grid.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const card = e.target.closest('.bookmark-card');
    if (!card || card.dataset.bmId === state.dragSourceId) return;
    grid.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    card.classList.add('drag-over');
  });

  grid.addEventListener('dragleave', e => {
    const card = e.target.closest('.bookmark-card');
    if (card && !card.contains(e.relatedTarget)) {
      card.classList.remove('drag-over');
    }
  });

  grid.addEventListener('drop', e => {
    e.preventDefault();
    const card = e.target.closest('.bookmark-card');
    if (!card) return;
    const targetId = card.dataset.bmId;
    card.classList.remove('drag-over');
    if (!state.dragSourceId || state.dragSourceId === targetId) return;

    const list = getFilteredBookmarks();
    const sourceIdx = list.findIndex(b => b.id === state.dragSourceId);
    const targetIdx = list.findIndex(b => b.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const reordered = [...list];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    reordered.forEach((bm, i) => {
      const idx = state.data.bookmarks.findIndex(b => b.id === bm.id);
      if (idx !== -1) state.data.bookmarks[idx].order = i;
    });

    saveData();
    renderBookmarks();
  });

  grid.addEventListener('dragend', e => {
    const card = e.target.closest('.bookmark-card');
    if (card) card.classList.remove('dragging');
    grid.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    state.dragSourceId = null;
  });
}

/* ─────────────────────────────────────────
   Bookmark CRUD
   ───────────────────────────────────────── */
function deleteBookmark(id) {
  if (!confirm('确认删除这个书签？')) return;
  state.data.bookmarks = state.data.bookmarks.filter(b => b.id !== id);
  saveData();
  render();
}

/* ─────────────────────────────────────────
   Category CRUD
   ───────────────────────────────────────── */
function deleteCategory(id) {
  const count = state.data.bookmarks.filter(b => b.categoryId === id).length;
  const msg = count > 0
    ? `该分类下有 ${count} 个书签，删除后将归入"未分类"，确认继续？`
    : '确认删除该分类？';
  if (!confirm(msg)) return;

  state.data.categories = state.data.categories.filter(c => c.id !== id);
  state.data.bookmarks.forEach(bm => {
    if (bm.categoryId === id) bm.categoryId = 'uncategorized';
  });

  if (state.activeCategory === id) state.activeCategory = 'all';
  saveData();
  render();
}

/* ─────────────────────────────────────────
   Bookmark Modal
   ───────────────────────────────────────── */
function openBookmarkModal(editId = null) {
  const modal = document.getElementById('modal-bookmark');
  const title = document.getElementById('modal-bookmark-title');
  const form = document.getElementById('bookmark-form');

  // Reset
  form.reset();
  document.getElementById('bm-id').value = '';
  document.getElementById('bm-url-error').textContent = '';
  document.getElementById('bm-title-error').textContent = '';
  state.editingTags = [];
  renderTagChips();

  // Populate category select
  const select = document.getElementById('bm-category');
  const cats = state.data.categories;
  select.innerHTML = cats.map(c =>
    `<option value="${escHtml(c.id)}">${c.emoji} ${escHtml(c.name)}</option>`
  ).join('') + `<option value="uncategorized">📂 未分类</option>`;

  if (editId) {
    const bm = state.data.bookmarks.find(b => b.id === editId);
    if (!bm) return;
    title.textContent = '编辑书签';
    document.getElementById('bm-id').value = bm.id;
    document.getElementById('bm-url').value = bm.url;
    document.getElementById('bm-title').value = bm.title;
    document.getElementById('bm-desc').value = bm.description || '';
    select.value = bm.categoryId;
    state.editingTags = [...(bm.tags || [])];
    renderTagChips();
  } else {
    title.textContent = '添加书签';
    // Default to active category
    if (state.activeCategory !== 'all' && cats.find(c => c.id === state.activeCategory)) {
      select.value = state.activeCategory;
    }
  }

  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('bm-url').focus(), 60);
}

function closeBookmarkModal() {
  document.getElementById('modal-bookmark').style.display = 'none';
}

/* ─────────────────────────────────────────
   Tags in Modal
   ───────────────────────────────────────── */
function renderTagChips() {
  const chips = document.getElementById('tags-chips');
  chips.innerHTML = state.editingTags.map((tag, i) => `
    <span class="tag-chip">
      ${escHtml(tag)}
      <button type="button" class="tag-chip-remove" data-index="${i}">✕</button>
    </span>
  `).join('');

  chips.querySelectorAll('.tag-chip-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      state.editingTags.splice(Number(btn.dataset.index), 1);
      renderTagChips();
    });
  });
}

function addTag(value) {
  const tag = value.trim();
  if (tag && !state.editingTags.includes(tag)) {
    state.editingTags.push(tag);
    renderTagChips();
  }
}

/* ─────────────────────────────────────────
   Category Modal
   ───────────────────────────────────────── */
const EMOJI_LIST = [
  '📁','💻','🎨','🔧','📚','🎵','🎮','🌐','📰','💡',
  '🔬','📊','🛒','✈️','🍕','🏠','💼','🔐','📱','🎯',
  '🚀','⭐','💎','🎭','📷','🎬','📝','🗂','🔖','🌟',
];

function openCategoryModal() {
  const modal = document.getElementById('modal-category');
  document.getElementById('cat-name').value = '';
  document.getElementById('cat-name-error').textContent = '';
  document.getElementById('cat-emoji').value = '📁';

  // Render emoji picker
  const picker = document.getElementById('emoji-picker');
  picker.innerHTML = EMOJI_LIST.map(e => `
    <div class="emoji-option ${e === '📁' ? 'selected' : ''}" data-emoji="${e}">${e}</div>
  `).join('');

  picker.querySelectorAll('.emoji-option').forEach(opt => {
    opt.addEventListener('click', () => {
      picker.querySelectorAll('.emoji-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      document.getElementById('cat-emoji').value = opt.dataset.emoji;
    });
  });

  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('cat-name').focus(), 60);
}

function closeCategoryModal() {
  document.getElementById('modal-category').style.display = 'none';
}

/* ─────────────────────────────────────────
   Import / Export
   ───────────────────────────────────────── */
function exportData() {
  const json = JSON.stringify(state.data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bookmarks.json';
  a.click();
  URL.revokeObjectURL(url);
}

function handleImport(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.bookmarks)) {
        alert('文件格式不正确，请检查 JSON 结构。');
        return;
      }
      const choice = confirm('选择导入方式：\n\n确定 → 覆盖当前数据\n取消 → 追加到当前数据');
      if (choice) {
        state.data = parsed;
        if (!state.data.settings) state.data.settings = { theme: state.data.settings?.theme || 'dark' };
      } else {
        // Append — merge categories by id, append bookmarks
        const existingCatIds = new Set(state.data.categories.map(c => c.id));
        parsed.categories.forEach(c => {
          if (!existingCatIds.has(c.id)) state.data.categories.push(c);
        });
        const existingBmIds = new Set(state.data.bookmarks.map(b => b.id));
        parsed.bookmarks.forEach(b => {
          if (!existingBmIds.has(b.id)) state.data.bookmarks.push(b);
        });
      }
      saveData();
      state.activeCategory = 'all';
      render();
    } catch {
      alert('文件解析失败，请确认文件是有效的 JSON。');
    }
  };
  reader.readAsText(file);
}

/* ─────────────────────────────────────────
   Event Wiring
   ───────────────────────────────────────── */
function wireEvents() {
  wireGridEvents();

  // Search
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', () => {
    state.searchQuery = searchInput.value;
    updateSearchClear();
    renderBookmarks();
    // Update sidebar highlight
    document.querySelectorAll('.cat-item').forEach(el => {
      el.classList.toggle('active', !state.searchQuery && el.dataset.catId === state.activeCategory);
    });
  });

  document.getElementById('search-clear').addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    updateSearchClear();
    renderBookmarks();
  });

  // Density
  document.getElementById('density-toggle').addEventListener('click', e => {
    const btn = e.target.closest('.density-btn');
    if (btn) setDensity(btn.dataset.density);
  });

  // Theme
  document.getElementById('btn-theme').addEventListener('click', toggleTheme);

  // Add bookmark
  document.getElementById('btn-add-bookmark').addEventListener('click', () => openBookmarkModal());

  // Bookmark modal close
  document.getElementById('modal-bookmark-close').addEventListener('click', closeBookmarkModal);
  document.getElementById('modal-bookmark-cancel').addEventListener('click', closeBookmarkModal);
  document.getElementById('modal-bookmark').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeBookmarkModal();
  });

  // Bookmark form submit
  document.getElementById('bookmark-form').addEventListener('submit', e => {
    e.preventDefault();
    const urlVal = document.getElementById('bm-url').value.trim();
    const titleVal = document.getElementById('bm-title').value.trim();
    let valid = true;

    document.getElementById('bm-url-error').textContent = '';
    document.getElementById('bm-title-error').textContent = '';

    if (!urlVal) {
      document.getElementById('bm-url-error').textContent = '请输入网址';
      valid = false;
    } else if (!isValidUrl(urlVal)) {
      document.getElementById('bm-url-error').textContent = '网址格式不正确（需以 http:// 或 https:// 开头）';
      valid = false;
    }

    if (!titleVal) {
      document.getElementById('bm-title-error').textContent = '请输入标题';
      valid = false;
    }

    if (!valid) return;

    const id = document.getElementById('bm-id').value;
    const categoryId = document.getElementById('bm-category').value;
    const description = document.getElementById('bm-desc').value.trim();

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
        closeBookmarkModal();
        // 分类变了且当前在某个分类视图下，需要从列表移除
        const inCurrentView =
          state.activeCategory === 'all' ||
          state.activeCategory === bm.categoryId ||
          state.searchQuery;
        if (inCurrentView) {
          replaceBookmarkCard(bm);
        } else {
          // 卡片不该出现在当前视图，移除它
          const existing = document.querySelector(`.bookmark-card[data-bm-id="${bm.id}"]`);
          if (existing) existing.remove();
          updateSidebarCounts();
          const grid = document.getElementById('bookmarks-grid');
          if (!grid.children.length) {
            grid.style.display = 'none';
            document.getElementById('empty-state').style.display = 'flex';
          }
        }
      }
    } else {
      // Add — 只插入新卡片
      const maxOrder = state.data.bookmarks.reduce((m, b) => Math.max(m, b.order), -1);
      const newBm = {
        id: uid(),
        title: titleVal,
        url: urlVal,
        description,
        favicon: '',
        categoryId,
        tags: [...state.editingTags],
        createdAt: Date.now(),
        order: maxOrder + 1,
      };
      state.data.bookmarks.push(newBm);
      saveData();
      closeBookmarkModal();
      // 只在当前视图能显示时才插入卡片
      if (state.activeCategory === 'all' || state.activeCategory === categoryId || state.searchQuery) {
        insertBookmarkCard(newBm);
      } else {
        updateSidebarCounts();
      }
      return; // 跳过下面的 render()
    }
    return;
  });

  // Tags input
  document.getElementById('bm-tags-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(e.target.value);
      e.target.value = '';
    } else if (e.key === 'Backspace' && !e.target.value && state.editingTags.length) {
      state.editingTags.pop();
      renderTagChips();
    }
  });

  document.getElementById('tags-input-wrapper').addEventListener('click', () => {
    document.getElementById('bm-tags-input').focus();
  });

  // Category modal close
  document.getElementById('modal-category-close').addEventListener('click', closeCategoryModal);
  document.getElementById('modal-category-cancel').addEventListener('click', closeCategoryModal);
  document.getElementById('modal-category').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeCategoryModal();
  });

  // Category form submit
  document.getElementById('category-form').addEventListener('submit', e => {
    e.preventDefault();
    const nameVal = document.getElementById('cat-name').value.trim();
    document.getElementById('cat-name-error').textContent = '';

    if (!nameVal) {
      document.getElementById('cat-name-error').textContent = '请输入分类名称';
      return;
    }

    const emoji = document.getElementById('cat-emoji').value;
    state.data.categories.push({ id: uid(), name: nameVal, emoji });
    saveData();
    closeCategoryModal();
    render();
  });

  // Export
  document.getElementById('btn-export').addEventListener('click', exportData);

  // Import
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleImport(file);
    e.target.value = ''; // reset so same file can be re-imported
  });

  // Keyboard: Escape closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeBookmarkModal();
      closeCategoryModal();
    }
  });
}

/* ─────────────────────────────────────────
   Init
   ───────────────────────────────────────── */
function init() {
  state.data = loadData();
  if (!state.data.settings) state.data.settings = { theme: 'dark' };
  wireEvents();
  render();
  applyTheme();
  applyDensity();
}

document.addEventListener('DOMContentLoaded', init);
