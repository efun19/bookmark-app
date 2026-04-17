(function () {
  window.BookmarkApp = window.BookmarkApp || {};
  const app = window.BookmarkApp;
  const { exportData, getFilteredBookmarks, handleImport, isBookmarkVisibleInCurrentView, isValidUrl, saveData, uid, compressImage } = app.data;
  const { applyTheme, closeAppearanceModal, openAppearanceModal, renderAppearanceModal, setDensity, toggleTheme, applyBackground } = app.theme;
  const { HOME_ID, state } = app.state;
  const { addTag, closeBookmarkModal, closeCategoryModal, createBookmarkPayload, deleteBookmark, getContextMenuTargetId, hideContextMenu, insertBookmarkCard, openBookmarkModal, render, renderBookmarks, renderTagChips, replaceBookmarkCard, showContextMenu, toggleHomePin, updateSearchClear, updateSidebarCounts } = app.ui;

  function wireGridEvents() {
    const grid = document.getElementById('bookmarks-grid');
    grid.addEventListener('click', event => {
      hideContextMenu();
      const pinBtn = event.target.closest('.card-btn.pin');
      const editBtn = event.target.closest('.card-btn.edit');
      const deleteBtn = event.target.closest('.card-btn.delete');
      if (pinBtn) toggleHomePin(pinBtn.dataset.bmId);
      else if (editBtn) openBookmarkModal(editBtn.dataset.bmId);
      else if (deleteBtn) deleteBookmark(deleteBtn.dataset.bmId);
    });
    grid.addEventListener('contextmenu', event => {
      const card = event.target.closest('.bookmark-card');
      if (!card) return;
      event.preventDefault();
      showContextMenu(event.clientX, event.clientY, card.dataset.bmId);
    });
    grid.addEventListener('dragstart', event => {
      if (state.searchQuery) {
        event.preventDefault();
        return;
      }
      const card = event.target.closest('.bookmark-card');
      if (!card) return;
      state.dragSourceId = card.dataset.bmId;
      card.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
    });
    grid.addEventListener('dragover', event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const card = event.target.closest('.bookmark-card');
      if (!card || card.dataset.bmId === state.dragSourceId) return;
      grid.querySelectorAll('.drag-over').forEach(element => { element.classList.remove('drag-over'); });
      card.classList.add('drag-over');
    });
    grid.addEventListener('dragleave', event => {
      const card = event.target.closest('.bookmark-card');
      if (card && !card.contains(event.relatedTarget)) card.classList.remove('drag-over');
    });
    grid.addEventListener('drop', event => {
      event.preventDefault();
      const card = event.target.closest('.bookmark-card');
      if (!card) return;
      const targetId = card.dataset.bmId;
      card.classList.remove('drag-over');
      if (!state.dragSourceId || state.dragSourceId === targetId) return;
      const list = getFilteredBookmarks();
      const sourceIdx = list.findIndex(bookmark => bookmark.id === state.dragSourceId);
      const targetIdx = list.findIndex(bookmark => bookmark.id === targetId);
      if (sourceIdx === -1 || targetIdx === -1) return;
      const reordered = [...list];
      const moved = reordered.splice(sourceIdx, 1)[0];
      reordered.splice(targetIdx, 0, moved);
      if (state.activeCategory === HOME_ID) state.data.settings.homePage = reordered.map(bookmark => bookmark.id);
      else {
        reordered.forEach((bookmark, index) => {
          const dataIndex = state.data.bookmarks.findIndex(item => item.id === bookmark.id);
          if (dataIndex !== -1) state.data.bookmarks[dataIndex].order = index;
        });
      }
      saveData();
      renderBookmarks();
    });
    grid.addEventListener('dragend', event => {
      const card = event.target.closest('.bookmark-card');
      if (card) card.classList.remove('dragging');
      grid.querySelectorAll('.drag-over').forEach(element => { element.classList.remove('drag-over'); });
      state.dragSourceId = null;
    });
  }

  function wireEvents() {
    wireGridEvents();
    document.getElementById('ctx-pin').addEventListener('click', () => {
      const bookmarkId = getContextMenuTargetId();
      if (!bookmarkId) return;
      hideContextMenu();
      toggleHomePin(bookmarkId);
    });
    document.getElementById('ctx-edit').addEventListener('click', () => {
      const bookmarkId = getContextMenuTargetId();
      if (!bookmarkId) return;
      hideContextMenu();
      openBookmarkModal(bookmarkId);
    });
    document.getElementById('ctx-delete').addEventListener('click', () => {
      const bookmarkId = getContextMenuTargetId();
      if (!bookmarkId) return;
      hideContextMenu();
      deleteBookmark(bookmarkId);
    });
    document.addEventListener('click', event => { if (!event.target.closest('#context-menu')) hideContextMenu(); });
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', () => {
      state.searchQuery = searchInput.value;
      updateSearchClear();
      renderBookmarks();
      document.querySelectorAll('.cat-item').forEach(element => { element.classList.toggle('active', !state.searchQuery && element.dataset.catId === state.activeCategory); });
    });
    document.getElementById('search-clear').addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      updateSearchClear();
      renderBookmarks();
      document.querySelectorAll('.cat-item').forEach(element => { element.classList.toggle('active', element.dataset.catId === state.activeCategory); });
    });
    document.getElementById('density-toggle').addEventListener('click', event => {
      const button = event.target.closest('.density-btn');
      if (button) setDensity(button.dataset.density);
    });
    document.getElementById('btn-theme').addEventListener('click', toggleTheme);
    document.getElementById('btn-add-bookmark').addEventListener('click', () => openBookmarkModal());
    document.getElementById('modal-bookmark-close').addEventListener('click', closeBookmarkModal);
    document.getElementById('modal-bookmark-cancel').addEventListener('click', closeBookmarkModal);
    document.getElementById('modal-bookmark').addEventListener('click', event => { if (event.target === event.currentTarget) closeBookmarkModal(); });
    document.getElementById('bookmark-form').addEventListener('submit', event => {
      event.preventDefault();
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
        const bookmark = state.data.bookmarks.find(item => item.id === id);
        if (bookmark) {
          if (bookmark.url !== urlVal) bookmark.favicon = '';
          bookmark.url = urlVal;
          bookmark.title = titleVal;
          bookmark.description = description;
          bookmark.categoryId = categoryId;
          bookmark.tags = [...state.editingTags];
          saveData();
          closeBookmarkModal();
          if (state.searchQuery) {
            renderBookmarks();
            return;
          }
          if (isBookmarkVisibleInCurrentView(bookmark)) replaceBookmarkCard(bookmark);
          else {
            const existing = document.querySelector(`.bookmark-card[data-bm-id="${bookmark.id}"]`);
            if (existing) existing.remove();
            updateSidebarCounts();
            const grid = document.getElementById('bookmarks-grid');
            if (!grid.children.length) {
              grid.style.display = 'none';
              document.getElementById('empty-state').style.display = 'flex';
            }
          }
        }
        return;
      }
      const newBookmark = createBookmarkPayload();
      newBookmark.id = uid();
      state.data.bookmarks.push(newBookmark);
      saveData();
      closeBookmarkModal();
      if (state.searchQuery) renderBookmarks();
      else if (isBookmarkVisibleInCurrentView(newBookmark)) insertBookmarkCard(newBookmark);
      else updateSidebarCounts();
    });
    document.getElementById('bm-tags-input').addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        addTag(event.target.value);
        event.target.value = '';
      } else if (event.key === 'Backspace' && !event.target.value && state.editingTags.length) {
        state.editingTags.pop();
        renderTagChips();
      }
    });
    document.getElementById('tags-input-wrapper').addEventListener('click', () => { document.getElementById('bm-tags-input').focus(); });
    document.getElementById('modal-category-close').addEventListener('click', closeCategoryModal);
    document.getElementById('modal-category-cancel').addEventListener('click', closeCategoryModal);
    document.getElementById('modal-category').addEventListener('click', event => { if (event.target === event.currentTarget) closeCategoryModal(); });
    document.getElementById('category-form').addEventListener('submit', event => {
      event.preventDefault();
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
    document.getElementById('btn-export').addEventListener('click', exportData);
    document.getElementById('btn-import').addEventListener('click', () => { document.getElementById('import-file').click(); });
    document.getElementById('import-file').addEventListener('change', event => {
      const file = event.target.files[0];
      if (file) handleImport(file, () => {
        document.getElementById('search-input').value = '';
        render();
      });
      event.target.value = '';
    });
    document.getElementById('btn-appearance').addEventListener('click', openAppearanceModal);
    document.getElementById('modal-appearance-close').addEventListener('click', closeAppearanceModal);
    document.getElementById('modal-appearance').addEventListener('click', event => { if (event.target === event.currentTarget) closeAppearanceModal(); });
    document.getElementById('btn-reset-theme').addEventListener('click', () => {
      const preset = state.data.settings.activeThemePreset;
      if (preset === 'custom' || !['warm', 'ocean', 'forest', 'purple', 'slate', 'light-warm'].includes(preset)) state.data.settings.activeThemePreset = 'warm';
      state.data.settings.customColors = null;
      state.data.settings.theme = state.data.settings.activeThemePreset === 'light-warm' ? 'light' : 'dark';
      saveData();
      applyTheme();
      renderAppearanceModal();
    });
    // 背景图片上传
    const bgUploadFile = document.getElementById('bg-upload-file');
    if (bgUploadFile) {
      bgUploadFile.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        try {
          const base64 = await compressImage(file, 1920, 0.8);
          state.data.settings.background = {
            ...state.data.settings.background,
            source: 'upload',
            value: base64,
            url: null,
          };
          saveData();
          applyBackground();
          renderAppearanceModal();
        } catch (e) {
          console.error('Failed to upload background image:', e);
          alert('图片上传失败，请重试');
        }
        event.target.value = '';
      });
    }
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        hideContextMenu();
        closeBookmarkModal();
        closeCategoryModal();
        closeAppearanceModal();
      }
    });
  }

  app.events = { wireEvents };
}());
