(function () {
  window.BookmarkApp = window.BookmarkApp || {};
  const app = window.BookmarkApp;
  const { EMOJI_LIST, SEARCH_ENGINES } = app.config;
  const { escHtml, getCategoryMeta, getFilteredBookmarks, getNextBookmarkOrder, hostname, saveData, trimString, uid } = app.data;
  const { faviconHtml } = app.favicon;
  const { HOME_ID, UNCATEGORIZED_ID, UNCATEGORIZED_META, state } = app.state;

  let contextMenuTargetId = null;

  function renderHomeSearch() {
    const container = document.getElementById('home-search');
    if (!container) return;
    const engineId = state.data.settings.lastSearchEngine;
    const engine = SEARCH_ENGINES.find(item => item.id === engineId) || SEARCH_ENGINES[0];
    const optionsHtml = SEARCH_ENGINES.map(item => `
      <div class="search-engine-option ${item.id === engine.id ? 'active' : ''}" data-engine-id="${escHtml(item.id)}"><span>${escHtml(item.icon)}</span><span>${escHtml(item.name)}</span>${item.id === engine.id ? '<span class="option-check">✓</span>' : ''}</div>
    `).join('');
    container.style.display = '';
    container.innerHTML = `
      <div class="home-search-bar"><div class="search-engine-btn" id="engine-btn"><span>${escHtml(engine.icon)}</span><span>${escHtml(engine.name)}</span><span class="engine-arrow">▾</span></div><input class="home-search-input" id="home-search-input" type="text" placeholder="在 ${escHtml(engine.name)} 中搜索..." autocomplete="off" /><button class="home-search-submit" id="home-search-submit" title="搜索">↵</button><div class="search-engine-dropdown" id="engine-dropdown">${optionsHtml}</div></div>
    `;

    function doSearch() {
      const query = document.getElementById('home-search-input').value.trim();
      if (!query) return;
      const url = engine.url.replace('%s', encodeURIComponent(query));
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    document.getElementById('home-search-input').addEventListener('keydown', event => { if (event.key === 'Enter') doSearch(); });
    document.getElementById('home-search-submit').addEventListener('click', doSearch);
    const dropdown = document.getElementById('engine-dropdown');
    document.getElementById('engine-btn').addEventListener('click', event => {
      event.stopPropagation();
      const isOpen = dropdown.classList.toggle('open');
      if (isOpen) document.addEventListener('click', () => dropdown.classList.remove('open'), { once: true });
    });
    dropdown.querySelectorAll('.search-engine-option').forEach(element => {
      element.addEventListener('click', event => {
        event.stopPropagation();
        state.data.settings.lastSearchEngine = element.dataset.engineId;
        saveData();
        renderHomeSearch();
      });
    });
  }

  function render() {
    renderSidebar();
    renderBookmarks();
    const homeSearch = document.getElementById('home-search');
    if (state.activeCategory === HOME_ID && !trimString(state.searchQuery)) renderHomeSearch();
    else if (homeSearch) {
      homeSearch.style.display = 'none';
      homeSearch.innerHTML = '';
    }
  }

  function renderSidebar() {
    const { categories, bookmarks } = state.data;
    const hasSearchQuery = Boolean(trimString(state.searchQuery));
    document.getElementById('total-count').textContent = `${bookmarks.length} 个书签`;
    const nav = document.getElementById('categories-nav');
    const allCount = bookmarks.length;
    const uncategorizedCount = bookmarks.filter(bookmark => bookmark.categoryId === UNCATEGORIZED_ID).length;
    const allItem = makeItemHtml('all', '🗂', '全部', allCount, !hasSearchQuery && state.activeCategory === 'all', false);
    const catItems = categories.map(category => {
      const count = bookmarks.filter(bookmark => bookmark.categoryId === category.id).length;
      return makeItemHtml(category.id, category.emoji, category.name, count, !hasSearchQuery && state.activeCategory === category.id, true);
    }).join('');
    const uncategorizedItem = uncategorizedCount > 0 ? makeItemHtml(UNCATEGORIZED_ID, UNCATEGORIZED_META.emoji, UNCATEGORIZED_META.name, uncategorizedCount, !hasSearchQuery && state.activeCategory === UNCATEGORIZED_ID, false) : '';
    const homeItem = makeHomeItemHtml(state.data.settings.homePage.length, !hasSearchQuery && state.activeCategory === HOME_ID);
    nav.innerHTML = `${homeItem}<div class="cat-divider"></div>${allItem}<div class="cat-divider cat-divider--thin"></div>${catItems}${uncategorizedItem}<button class="btn-new-cat" id="btn-new-cat"><span>＋</span> 新建分类</button>`;
    nav.querySelectorAll('.cat-item').forEach(element => {
      element.addEventListener('click', event => {
        if (event.target.closest('.cat-delete')) return;
        state.activeCategory = element.dataset.catId;
        state.searchQuery = '';
        document.getElementById('search-input').value = '';
        updateSearchClear();
        render();
      });
    });
    nav.querySelectorAll('.cat-delete').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        deleteCategory(button.dataset.catId);
      });
    });
    document.getElementById('btn-new-cat').addEventListener('click', openCategoryModal);
  }

  function makeHomeItemHtml(count, active) {
    return `<div class="cat-item cat-item--home ${active ? 'active' : ''}" data-cat-id="${HOME_ID}"><span class="cat-emoji">🏠</span><span class="cat-name">首页</span><span class="cat-count">${count}</span></div>`;
  }

  function makeItemHtml(id, emoji, name, count, active, deletable) {
    const deleteBtn = deletable ? `<button class="cat-delete" data-cat-id="${escHtml(id)}" title="删除分类">✕</button>` : '';
    return `<div class="cat-item ${active ? 'active' : ''}" data-cat-id="${escHtml(id)}"><span class="cat-emoji">${emoji}</span><span class="cat-name">${escHtml(name)}</span><span class="cat-count">${count}</span>${deleteBtn}</div>`;
  }

  function renderBookmarks() {
    const list = getFilteredBookmarks();
    const grid = document.getElementById('bookmarks-grid');
    const emptyState = document.getElementById('empty-state');
    const headerTitle = document.getElementById('header-title');
    const headerSub = document.getElementById('header-subtitle');
    if (state.searchQuery) {
      headerTitle.textContent = '搜索结果';
      headerSub.textContent = `"${state.searchQuery}" — 找到 ${list.length} 个书签`;
    } else if (state.activeCategory === HOME_ID) {
      headerTitle.textContent = '🏠 首页';
      headerSub.textContent = `${list.length} 个书签`;
    } else if (state.activeCategory === 'all') {
      headerTitle.textContent = '全部书签';
      headerSub.textContent = `共 ${state.data.bookmarks.length} 个书签`;
    } else {
      const category = getCategoryMeta(state.activeCategory);
      if (category) {
        headerTitle.textContent = `${category.emoji} ${category.name}`;
        headerSub.textContent = `${list.length} 个书签`;
      }
    }
    if (list.length === 0) {
      grid.style.display = 'none';
      emptyState.style.display = 'flex';
      if (state.activeCategory === HOME_ID && !state.searchQuery) {
        document.querySelector('.empty-title').textContent = '还没有固定书签';
        document.querySelector('.empty-sub').textContent = '点击任意书签卡片右上角的 ☆ 将其固定到首页';
      } else {
        document.querySelector('.empty-title').textContent = '这里还没有书签';
        document.querySelector('.empty-sub').textContent = '点击右上角「添加书签」开始收藏';
      }
      return;
    }
    grid.style.display = 'grid';
    emptyState.style.display = 'none';
    grid.innerHTML = state.activeCategory === HOME_ID && !state.searchQuery ? `<div class="home-section-label">常用</div>${list.map(cardHtml).join('')}` : list.map(cardHtml).join('');
  }

  function cardHtml(bookmark) {
    const isPinned = state.data.settings.homePage.includes(bookmark.id);
    const category = getCategoryMeta(bookmark.categoryId);
    const catBadge = category ? `<span class="badge badge-cat">${category.emoji} ${escHtml(category.name)}</span>` : '';
    const tagBadges = (bookmark.tags || []).map(tag => `<span class="badge badge-tag">${escHtml(tag)}</span>`).join('');
    const desc = `<p class="card-desc">${escHtml(bookmark.description || '')}</p>`;
    const shortUrl = hostname(bookmark.url) || bookmark.url;
    return `<div class="bookmark-card" data-bm-id="${escHtml(bookmark.id)}" draggable="true"><div class="card-header">${faviconHtml(bookmark)}<a class="card-title-link" href="${escHtml(bookmark.url)}" target="_blank" rel="noopener noreferrer">${escHtml(bookmark.title)}</a><div class="card-actions"><button class="card-btn pin ${isPinned ? 'pinned' : ''}" data-bm-id="${escHtml(bookmark.id)}" title="${isPinned ? '从首页移除' : '固定到首页'}">${isPinned ? '★' : '☆'}</button><button class="card-btn edit" data-bm-id="${escHtml(bookmark.id)}" title="编辑">✏</button><button class="card-btn delete" data-bm-id="${escHtml(bookmark.id)}" title="删除">🗑</button></div></div>${desc}<div class="card-url" title="${escHtml(bookmark.url)}">${escHtml(shortUrl)}</div><div class="card-footer">${catBadge}${tagBadges}</div></div>`;
  }

  function createCardNode(bookmark) {
    const template = document.createElement('template');
    template.innerHTML = cardHtml(bookmark).trim();
    return template.content.firstElementChild;
  }

  function insertBookmarkCard(bookmark) {
    const grid = document.getElementById('bookmarks-grid');
    const emptyState = document.getElementById('empty-state');
    grid.style.display = 'grid';
    emptyState.style.display = 'none';
    grid.append(createCardNode(bookmark));
    updateSidebarCounts();
  }

  function replaceBookmarkCard(bookmark) {
    const existing = document.querySelector(`.bookmark-card[data-bm-id="${bookmark.id}"]`);
    if (!existing) {
      renderBookmarks();
      return;
    }
    const newCard = createCardNode(bookmark);
    newCard.style.animation = 'none';
    existing.replaceWith(newCard);
    updateSidebarCounts();
  }

  function updateSidebarCounts() {
    const { bookmarks, categories } = state.data;
    document.getElementById('total-count').textContent = `${bookmarks.length} 个书签`;
    const uncategorizedCount = bookmarks.filter(bookmark => bookmark.categoryId === UNCATEGORIZED_ID).length;
    const hasUncategorizedItem = Boolean(document.querySelector(`.cat-item[data-cat-id="${UNCATEGORIZED_ID}"]`));
    if (uncategorizedCount === 0 && state.activeCategory === UNCATEGORIZED_ID) {
      state.activeCategory = 'all';
      render();
      return;
    }
    if ((uncategorizedCount > 0) !== hasUncategorizedItem) {
      render();
      return;
    }
    const homeBadge = document.querySelector(`.cat-item[data-cat-id="${HOME_ID}"] .cat-count`);
    if (homeBadge) homeBadge.textContent = state.data.settings.homePage.length;
    const allBadge = document.querySelector('.cat-item[data-cat-id="all"] .cat-count');
    if (allBadge) allBadge.textContent = bookmarks.length;
    categories.forEach(category => {
      const badge = document.querySelector(`.cat-item[data-cat-id="${category.id}"] .cat-count`);
      if (badge) badge.textContent = bookmarks.filter(bookmark => bookmark.categoryId === category.id).length;
    });
    const uncategorizedBadge = document.querySelector(`.cat-item[data-cat-id="${UNCATEGORIZED_ID}"] .cat-count`);
    if (uncategorizedBadge) uncategorizedBadge.textContent = uncategorizedCount;
    const headerSub = document.getElementById('header-subtitle');
    if (!state.searchQuery) {
      if (state.activeCategory === HOME_ID) headerSub.textContent = `${state.data.settings.homePage.length} 个书签`;
      else if (state.activeCategory === 'all') headerSub.textContent = `共 ${bookmarks.length} 个书签`;
      else headerSub.textContent = `${bookmarks.filter(bookmark => bookmark.categoryId === state.activeCategory).length} 个书签`;
    }
  }

  function toggleHomePin(bookmarkId) {
    if (!state.data.bookmarks.some(bookmark => bookmark.id === bookmarkId)) return;
    const homePage = state.data.settings.homePage;
    state.data.settings.homePage = homePage.includes(bookmarkId) ? homePage.filter(id => id !== bookmarkId) : [...homePage, bookmarkId];
    hideContextMenu();
    saveData();
    render();
  }

  function deleteBookmark(id) {
    if (!confirm('确认删除这个书签？')) return;
    state.data.bookmarks = state.data.bookmarks.filter(bookmark => bookmark.id !== id);
    state.data.settings.homePage = state.data.settings.homePage.filter(homeId => homeId !== id);
    hideContextMenu();
    saveData();
    render();
  }

  function deleteCategory(id) {
    const count = state.data.bookmarks.filter(bookmark => bookmark.categoryId === id).length;
    const message = count > 0 ? `该分类下有 ${count} 个书签，删除后将归入"未分类"，确认继续？` : '确认删除该分类？';
    if (!confirm(message)) return;
    state.data.categories = state.data.categories.filter(category => category.id !== id);
    state.data.bookmarks.forEach(bookmark => { if (bookmark.categoryId === id) bookmark.categoryId = UNCATEGORIZED_ID; });
    if (state.activeCategory === id) state.activeCategory = count > 0 ? UNCATEGORIZED_ID : 'all';
    saveData();
    render();
  }

  function openBookmarkModal(editId) {
    const actualEditId = editId == null ? null : editId;
    const modal = document.getElementById('modal-bookmark');
    const title = document.getElementById('modal-bookmark-title');
    const form = document.getElementById('bookmark-form');
    form.reset();
    document.getElementById('bm-id').value = '';
    document.getElementById('bm-url-error').textContent = '';
    document.getElementById('bm-title-error').textContent = '';
    state.editingTags = [];
    renderTagChips();
    const select = document.getElementById('bm-category');
    const categories = state.data.categories;
    select.innerHTML = categories.map(category => `<option value="${escHtml(category.id)}">${category.emoji} ${escHtml(category.name)}</option>`).join('') + `<option value="${UNCATEGORIZED_ID}">${UNCATEGORIZED_META.emoji} ${UNCATEGORIZED_META.name}</option>`;
    if (actualEditId) {
      const bookmark = state.data.bookmarks.find(item => item.id === actualEditId);
      if (!bookmark) return;
      title.textContent = '编辑书签';
      document.getElementById('bm-id').value = bookmark.id;
      document.getElementById('bm-url').value = bookmark.url;
      document.getElementById('bm-title').value = bookmark.title;
      document.getElementById('bm-desc').value = bookmark.description || '';
      select.value = bookmark.categoryId;
      state.editingTags = [...(bookmark.tags || [])];
      renderTagChips();
    } else {
      title.textContent = '添加书签';
      if (state.activeCategory === UNCATEGORIZED_ID) select.value = UNCATEGORIZED_ID;
      else if (state.activeCategory !== 'all' && state.activeCategory !== HOME_ID && categories.find(category => category.id === state.activeCategory)) select.value = state.activeCategory;
    }
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('bm-url').focus(), 60);
  }

  function closeBookmarkModal() { document.getElementById('modal-bookmark').style.display = 'none'; }

  function renderTagChips() {
    const chips = document.getElementById('tags-chips');
    chips.innerHTML = state.editingTags.map((tag, index) => `<span class="tag-chip">${escHtml(tag)}<button type="button" class="tag-chip-remove" data-index="${index}">✕</button></span>`).join('');
    chips.querySelectorAll('.tag-chip-remove').forEach(button => {
      button.addEventListener('click', () => {
        state.editingTags.splice(Number(button.dataset.index), 1);
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

  function openCategoryModal() {
    const modal = document.getElementById('modal-category');
    document.getElementById('cat-name').value = '';
    document.getElementById('cat-name-error').textContent = '';
    document.getElementById('cat-emoji').value = '📁';
    const picker = document.getElementById('emoji-picker');
    picker.innerHTML = EMOJI_LIST.map(emoji => `<div class="emoji-option ${emoji === '📁' ? 'selected' : ''}" data-emoji="${emoji}">${emoji}</div>`).join('');
    picker.querySelectorAll('.emoji-option').forEach(option => {
      option.addEventListener('click', () => {
        picker.querySelectorAll('.emoji-option').forEach(item => { item.classList.remove('selected'); });
        option.classList.add('selected');
        document.getElementById('cat-emoji').value = option.dataset.emoji;
      });
    });
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('cat-name').focus(), 60);
  }

  function closeCategoryModal() { document.getElementById('modal-category').style.display = 'none'; }

  function updateSearchClear() {
    const button = document.getElementById('search-clear');
    if (state.searchQuery) button.classList.add('visible');
    else button.classList.remove('visible');
  }

  function hideContextMenu() {
    const menu = document.getElementById('context-menu');
    if (!menu) return;
    menu.style.display = 'none';
    contextMenuTargetId = null;
  }

  function showContextMenu(x, y, bookmarkId) {
    const bookmark = state.data.bookmarks.find(item => item.id === bookmarkId);
    const menu = document.getElementById('context-menu');
    if (!bookmark || !menu) return;
    contextMenuTargetId = bookmarkId;
    document.getElementById('ctx-pin').textContent = state.data.settings.homePage.includes(bookmarkId) ? '★ 从首页移除' : '⭐ 固定到首页';
    menu.style.display = 'block';
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const left = x + menuWidth > window.innerWidth ? x - menuWidth : x;
    const top = y + menuHeight > window.innerHeight ? y - menuHeight : y;
    menu.style.left = `${Math.max(8, left)}px`;
    menu.style.top = `${Math.max(8, top)}px`;
  }

  function getContextMenuTargetId() { return contextMenuTargetId; }

  function createBookmarkPayload() {
    return {
      id: uid(),
      title: document.getElementById('bm-title').value.trim(),
      url: document.getElementById('bm-url').value.trim(),
      description: document.getElementById('bm-desc').value.trim(),
      favicon: '',
      categoryId: document.getElementById('bm-category').value,
      tags: [...state.editingTags],
      createdAt: Date.now(),
      order: getNextBookmarkOrder(),
    };
  }

  app.ui = { renderHomeSearch, render, renderSidebar, renderBookmarks, insertBookmarkCard, replaceBookmarkCard, updateSidebarCounts, toggleHomePin, deleteBookmark, deleteCategory, openBookmarkModal, closeBookmarkModal, renderTagChips, addTag, openCategoryModal, closeCategoryModal, updateSearchClear, hideContextMenu, showContextMenu, getContextMenuTargetId, createBookmarkPayload };
}());
