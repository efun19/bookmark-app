(function () {
  window.BookmarkApp = window.BookmarkApp || {};
  const app = window.BookmarkApp;
  const { loadData } = app.data;
  const { wireEvents } = app.events;
  const { initFaviconGlobals } = app.favicon;
  const { applyDensity, applyTheme, checkBingUpdate } = app.theme;
  const { state } = app.state;
  const { render } = app.ui;

  function init() {
    initFaviconGlobals();
    state.data = loadData();
    if (!state.data.settings) state.data.settings = { theme: 'dark' };
    const sidebarToggle = document.getElementById('btn-sidebar-toggle');
    if (state.data.settings.sidebarCollapsed) {
      document.getElementById('sidebar').classList.add('sidebar--collapsed');
      sidebarToggle.textContent = '›';
      sidebarToggle.title = '展开侧边栏';
      sidebarToggle.setAttribute('aria-label', '展开侧边栏');
    }
    wireEvents();
    render();
    applyTheme();
    applyDensity();
    checkBingUpdate();
  }

  document.addEventListener('DOMContentLoaded', init);
  app.main = { init };
}());
