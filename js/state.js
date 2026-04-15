(function () {
  window.BookmarkApp = window.BookmarkApp || {};
  const app = window.BookmarkApp;

  app.state = {
    UNCATEGORIZED_ID: 'uncategorized',
    HOME_ID: 'home',
    UNCATEGORIZED_META: {
      id: 'uncategorized',
      name: '未分类',
      emoji: '📂',
    },
    state: {
      data: null,
      activeCategory: 'home',
      searchQuery: '',
      dragSourceId: null,
      editingTags: [],
    },
  };
}());
