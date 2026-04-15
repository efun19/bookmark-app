(function () {
  window.BookmarkApp = window.BookmarkApp || {};
  const app = window.BookmarkApp;
  const { state } = app.state;
  const { escHtml, hashColor, hostname, origin, saveData } = app.data;

  function faviconHtml(bookmark) {
    const host = hostname(bookmark.url);
    const letter = (bookmark.title || host || '?')[0].toUpperCase();
    const color = hashColor(host || bookmark.id);

    if (bookmark.favicon) {
      return `
        <img class="card-favicon" src="${escHtml(bookmark.favicon)}" alt="" data-bm-id="${escHtml(bookmark.id)}" data-letter="${escHtml(letter)}" data-color="${escHtml(color)}" onerror="faviconFallback2(this)" />
      `;
    }

    return `
      <img class="card-favicon" src="https://www.google.com/s2/favicons?sz=32&domain=${escHtml(host)}" alt="" data-bm-id="${escHtml(bookmark.id)}" data-host="${escHtml(host)}" data-origin="${escHtml(origin(bookmark.url))}" data-letter="${escHtml(letter)}" data-color="${escHtml(color)}" onload="faviconCacheOnLoad(this)" onerror="faviconFallback1(this)" />
    `;
  }

  function faviconCacheOnLoad(img) {
    const bookmarkId = img.dataset.bmId;
    if (!bookmarkId) return;
    const bookmark = state.data.bookmarks.find(item => item.id === bookmarkId);
    if (bookmark && !bookmark.favicon) {
      bookmark.favicon = img.src;
      saveData();
    }
  }

  function faviconFallback1(img) {
    img.onerror = window.faviconFallback2;
    img.onload = window.faviconCacheOnLoad;
    img.src = img.dataset.origin + '/favicon.ico';
  }

  function faviconFallback2(img) {
    img.onerror = null;
    const bookmarkId = img.dataset.bmId;
    if (bookmarkId) {
      const bookmark = state.data.bookmarks.find(item => item.id === bookmarkId);
      if (bookmark && bookmark.favicon) {
        bookmark.favicon = '';
        saveData();
      }
    }
    const fallback = document.createElement('div');
    fallback.className = 'favicon-fallback';
    fallback.style.cssText = `background:${img.dataset.color};`;
    fallback.textContent = img.dataset.letter;
    img.replaceWith(fallback);
  }

  function initFaviconGlobals() {
    window.faviconCacheOnLoad = faviconCacheOnLoad;
    window.faviconFallback1 = faviconFallback1;
    window.faviconFallback2 = faviconFallback2;
  }

  app.favicon = { faviconHtml, initFaviconGlobals };
}());
