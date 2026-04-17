(function () {
  window.BookmarkApp = window.BookmarkApp || {};
  const app = window.BookmarkApp;
  const { COLOR_FIELDS, PRESET_LABELS, THEME_PRESETS } = app.config;
  const { escHtml, saveData } = app.data;
  const { state } = app.state;

  function hexToRgb(hex) {
    const normalized = hex.replace('#', '');
    return [parseInt(normalized.slice(0, 2), 16), parseInt(normalized.slice(2, 4), 16), parseInt(normalized.slice(4, 6), 16)];
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('');
  }

  function lightenHex(hex, amount) {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r + amount, g + amount, b + amount);
  }

  function darkenHex(hex, amount) { return lightenHex(hex, -amount); }

  function mixHex(hex1, hex2, ratio) {
    const actualRatio = ratio == null ? 0.5 : ratio;
    const [r1, g1, b1] = hexToRgb(hex1);
    const [r2, g2, b2] = hexToRgb(hex2);
    return rgbToHex(r1 + (r2 - r1) * actualRatio, g1 + (g2 - g1) * actualRatio, b1 + (b2 - b1) * actualRatio);
  }

  function hexLuminance(hex) {
    const [r, g, b] = hexToRgb(hex).map(value => {
      const s = value / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function hexAlpha(hex, alpha) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function getCurrentColors() {
    const { activeThemePreset, customColors } = state.data.settings;
    if (activeThemePreset === 'custom' && customColors) return customColors;
    return THEME_PRESETS[activeThemePreset] || THEME_PRESETS.warm;
  }

  function applyColorTheme(colors) {
    const root = document.documentElement;
    const isDark = hexLuminance(colors.bg) < 0.18;
    root.style.setProperty('--bg', colors.bg);
    root.style.setProperty('--bg-sidebar', colors.bgSidebar);
    root.style.setProperty('--bg-card', colors.bgCard);
    root.style.setProperty('--bg-search', colors.bgSearch || (isDark ? darkenHex(colors.bgCard, 6) : darkenHex(colors.bgCard, 10)));
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--bg-card-hover', isDark ? lightenHex(colors.bgCard, 8) : darkenHex(colors.bgCard, 5));
    root.style.setProperty('--bg-modal', colors.bgCard);
    root.style.setProperty('--bg-input', colors.bg);
    root.style.setProperty('--bg-tag', isDark ? lightenHex(colors.bgCard, 14) : darkenHex(colors.bgCard, 8));
    root.style.setProperty('--bg-btn-footer', isDark ? lightenHex(colors.bgSidebar, 8) : darkenHex(colors.bgSidebar, 5));
    root.style.setProperty('--accent-hover', isDark ? lightenHex(colors.accent, 20) : darkenHex(colors.accent, 20));
    root.style.setProperty('--accent-dim', hexAlpha(colors.accent, 0.13));
    root.style.setProperty('--text-accent', isDark ? lightenHex(colors.accent, 15) : darkenHex(colors.accent, 10));
    root.style.setProperty('--text-on-accent', hexLuminance(colors.accent) > 0.35 ? colors.bgCard : colors.textPrimary);
    root.style.setProperty('--text-muted', mixHex(colors.textSecondary, colors.bg, 0.45));
    root.style.setProperty('--cat-active-bg', hexAlpha(colors.accent, 0.15));
    root.style.setProperty('--cat-active-border', colors.accent);
    if (isDark) {
      root.style.setProperty('--border', 'rgba(255,255,255,0.07)');
      root.style.setProperty('--border-strong', 'rgba(255,255,255,0.13)');
    } else {
      root.style.setProperty('--border', 'rgba(0,0,0,0.09)');
      root.style.setProperty('--border-strong', 'rgba(0,0,0,0.16)');
    }
  }

  function applyBackground() {
    const bg = state.data.settings.background;
    const el = document.getElementById('app-background');
    if (!el || !bg || !bg.source) {
      if (el) {
        el.style.backgroundImage = 'none';
        el.style.opacity = '0';
      }
      return;
    }

    let imageUrl = '';
    if (bg.source === 'upload' && bg.value) {
      imageUrl = bg.value;
    } else if ((bg.source === 'bing' || bg.source === 'url') && bg.url) {
      imageUrl = bg.url;
    }

    if (imageUrl) {
      el.style.backgroundImage = `url('${escHtml(imageUrl)}')`;
      el.style.opacity = String(1 - bg.opacity);
    } else {
      el.style.backgroundImage = 'none';
      el.style.opacity = '0';
    }

    // 设置尺寸模式
    el.classList.remove('size-cover', 'size-contain', 'size-stretch');
    el.classList.add(`size-${bg.size}`);
  }

  async function fetchBingWallpaper() {
    try {
      // 使用 CORS 代理访问 Bing API
      const bingUrl = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1';
      const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(bingUrl);
      const res = await fetch(proxyUrl);
      const data = await res.json();
      if (data && data.images && data.images[0] && data.images[0].url) {
        return 'https://www.bing.com' + data.images[0].url;
      }
    } catch (e) {
      console.warn('Failed to fetch Bing wallpaper:', e);
    }
    return null;
  }

  function renderBackgroundSection() {
    const bg = state.data.settings.background;
    const hasBg = bg && bg.source;

    let previewStyle = '';
    if (hasBg) {
      let imgUrl = '';
      if (bg.source === 'upload' && bg.value) imgUrl = bg.value;
      else if ((bg.source === 'bing' || bg.source === 'url') && bg.url) imgUrl = bg.url;
      if (imgUrl) previewStyle = `background-image:url('${escHtml(imgUrl)}')`;
    }

    return `
    <div class="appearance-section">
      <div class="appearance-label">背景图片</div>
      <div class="background-section">
        ${hasBg ? `<div class="bg-preview" style="${previewStyle}"></div>` : ''}
        <div class="bg-source-buttons">
          <label class="bg-source-btn${bg && bg.source === 'upload' ? ' active' : ''}" id="btn-bg-upload">
            📤 上传图片
          </label>
          <button type="button" class="bg-source-btn${bg && bg.source === 'bing' ? ' active' : ''}" id="btn-bg-bing">
            🌐 Bing壁纸
          </button>
        </div>
        <input type="text" class="bg-url-input" id="bg-url-input" placeholder="或输入图片 URL..." value="${bg && bg.url ? escHtml(bg.url) : ''}" />
        <div class="bg-slider-row">
          <span class="bg-slider-label">透明度</span>
          <div class="bg-slider-wrapper">
            <input type="range" class="bg-slider" id="bg-opacity" min="0" max="100" value="${Math.round((bg ? bg.opacity : 0.3) * 100)}" />
            <span class="bg-slider-value" id="bg-opacity-value">${Math.round((bg ? bg.opacity : 0.3) * 100)}%</span>
          </div>
        </div>
        <div class="bg-select-row">
          <span class="bg-select-label">尺寸</span>
          <select class="bg-select" id="bg-size">
            <option value="cover"${bg && bg.size === 'cover' ? ' selected' : ''}>覆盖</option>
            <option value="contain"${bg && bg.size === 'contain' ? ' selected' : ''}>适应</option>
            <option value="stretch"${bg && bg.size === 'stretch' ? ' selected' : ''}>拉伸</option>
          </select>
        </div>
        <div class="bg-select-row">
          <span class="bg-select-label">Bing 更新</span>
          <select class="bg-select" id="bg-bing-interval">
            <option value="daily"${bg && bg.bingInterval === 'daily' ? ' selected' : ''}>每天</option>
            <option value="weekly"${bg && bg.bingInterval === 'weekly' ? ' selected' : ''}>每周</option>
            <option value="manual"${bg && bg.bingInterval === 'manual' ? ' selected' : ''}>手动</option>
          </select>
        </div>
        <div class="bg-actions">
          <button type="button" class="btn-clear-bg" id="btn-clear-bg">清除背景</button>
        </div>
      </div>
    </div>
    <div class="appearance-divider"></div>
  `;
  }

  function wireBackgroundEvents() {
    const bg = state.data.settings.background;

    // 上传图片
    const uploadBtn = document.getElementById('btn-bg-upload');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        document.getElementById('bg-upload-file').click();
      });
    }

    // Bing 壁纸
    const bingBtn = document.getElementById('btn-bg-bing');
    if (bingBtn) {
      bingBtn.addEventListener('click', async () => {
        bingBtn.disabled = true;
        bingBtn.textContent = '加载中...';
        const url = await fetchBingWallpaper();
        bingBtn.disabled = false;
        bingBtn.textContent = '🌐 Bing壁纸';
        if (url) {
          state.data.settings.background = {
            ...bg,
            source: 'bing',
            url: url,
            value: null,
            bingLastUpdate: Date.now(),
          };
          saveData();
          applyBackground();
          renderAppearanceModal();
        } else {
          alert('获取 Bing 壁纸失败，请检查网络连接');
        }
      });
    }

    // URL 输入
    const urlInput = document.getElementById('bg-url-input');
    if (urlInput) {
      urlInput.addEventListener('change', () => {
        const url = urlInput.value.trim();
        if (url) {
          state.data.settings.background = {
            ...bg,
            source: 'url',
            url: url,
            value: null,
          };
          saveData();
          applyBackground();
          renderAppearanceModal();
        }
      });
    }

    // 透明度滑块
    const opacitySlider = document.getElementById('bg-opacity');
    const opacityValue = document.getElementById('bg-opacity-value');
    if (opacitySlider && opacityValue) {
      opacitySlider.addEventListener('input', () => {
        const val = parseInt(opacitySlider.value, 10);
        opacityValue.textContent = val + '%';
        state.data.settings.background.opacity = val / 100;
        saveData();
        applyBackground();
      });
    }

    // 尺寸选择
    const sizeSelect = document.getElementById('bg-size');
    if (sizeSelect) {
      sizeSelect.addEventListener('change', () => {
        state.data.settings.background.size = sizeSelect.value;
        saveData();
        applyBackground();
      });
    }

    // Bing 更新频率
    const intervalSelect = document.getElementById('bg-bing-interval');
    if (intervalSelect) {
      intervalSelect.addEventListener('change', () => {
        state.data.settings.background.bingInterval = intervalSelect.value;
        saveData();
      });
    }

    // 清除背景
    const clearBtn = document.getElementById('btn-clear-bg');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.data.settings.background = {
          source: null,
          value: null,
          url: null,
          opacity: 0.3,
          size: 'cover',
          bingInterval: 'daily',
          bingLastUpdate: null,
        };
        saveData();
        applyBackground();
        renderAppearanceModal();
      });
    }

    // 更新按钮状态
    document.querySelectorAll('.bg-source-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    if (bg && bg.source === 'upload') {
      const btn = document.getElementById('btn-bg-upload');
      if (btn) btn.classList.add('active');
    } else if (bg && bg.source === 'bing') {
      const btn = document.getElementById('btn-bg-bing');
      if (btn) btn.classList.add('active');
    }
  }

  function applyTheme() {
    const theme = state.data.settings.theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('theme-icon').textContent = theme === 'dark' ? '◑' : '◐';
    applyColorTheme(getCurrentColors());
    applyBackground();
  }

  function toggleTheme() {
    const newTheme = state.data.settings.theme === 'dark' ? 'light' : 'dark';
    state.data.settings.theme = newTheme;
    const preset = state.data.settings.activeThemePreset;
    if (preset !== 'custom') {
      if (newTheme === 'light') state.data.settings.activeThemePreset = 'light-warm';
      else if (preset === 'light-warm') state.data.settings.activeThemePreset = 'warm';
    }
    saveData();
    applyTheme();
  }

  function applyDensity() {
    const density = state.data.settings.density || 'default';
    document.getElementById('main').setAttribute('data-density', density);
    document.querySelectorAll('.density-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.density === density);
    });
  }

  function setDensity(value) {
    state.data.settings.density = value;
    saveData();
    applyDensity();
  }

  function openAppearanceModal() {
    renderAppearanceModal();
    document.getElementById('modal-appearance').style.display = 'flex';
  }

  function closeAppearanceModal() {
    document.getElementById('modal-appearance').style.display = 'none';
  }

  function renderAppearanceModal() {
    const { activeThemePreset } = state.data.settings;
    const colors = getCurrentColors();
    const presetsEl = document.getElementById('theme-presets');
    presetsEl.innerHTML = Object.keys(THEME_PRESETS).map(key => {
      const preset = THEME_PRESETS[key];
      const isActive = activeThemePreset === key;
      return `<div class="preset-swatch${isActive ? ' active' : ''}" data-preset="${escHtml(key)}" title="${escHtml(PRESET_LABELS[key])}"><div class="swatch-colors" style="background:linear-gradient(135deg,${escHtml(preset.bg)} 50%,${escHtml(preset.accent)} 50%)"></div><div class="swatch-label">${escHtml(PRESET_LABELS[key])}</div></div>`;
    }).join('');

    // 插入或更新背景区域
    const appearanceBody = document.querySelector('.appearance-body');
    let bgContainer = document.getElementById('bg-section-container');
    if (!bgContainer) {
      bgContainer = document.createElement('div');
      bgContainer.id = 'bg-section-container';
      const divider = appearanceBody.querySelector('.appearance-divider');
      if (divider) {
        divider.parentNode.insertBefore(bgContainer, divider);
      }
    }
    bgContainer.innerHTML = renderBackgroundSection();

    const pickersEl = document.getElementById('color-pickers');
    pickersEl.innerHTML = COLOR_FIELDS.map(({ key, label }) => `
      <div class="color-row"><span class="color-row-label">${escHtml(label)}</span><div class="color-row-right"><label class="color-swatch-btn" style="background:${escHtml(colors[key])}"><input type="color" class="color-picker-input" data-color-key="${escHtml(key)}" value="${escHtml(colors[key])}" /></label><code class="color-hex">${escHtml(colors[key])}</code></div></div>
    `).join('');

    presetsEl.querySelectorAll('.preset-swatch').forEach(element => {
      element.addEventListener('click', () => applyPreset(element.dataset.preset));
    });

    pickersEl.querySelectorAll('.color-picker-input').forEach(input => {
      input.addEventListener('input', event => {
        const key = event.target.dataset.colorKey;
        const value = event.target.value;
        if (state.data.settings.activeThemePreset !== 'custom') {
          state.data.settings.customColors = { ...getCurrentColors() };
          state.data.settings.activeThemePreset = 'custom';
          presetsEl.querySelectorAll('.preset-swatch').forEach(swatch => { swatch.classList.remove('active'); });
        }
        state.data.settings.customColors[key] = value;
        saveData();
        applyColorTheme(state.data.settings.customColors);
        event.target.closest('.color-swatch-btn').style.background = value;
        event.target.closest('.color-row').querySelector('.color-hex').textContent = value;
      });
    });

    wireBackgroundEvents();
  }

  function checkBingUpdate() {
    const bg = state.data.settings.background;
    if (!bg || bg.source !== 'bing' || bg.bingInterval === 'manual') return;

    const now = Date.now();
    const lastUpdate = bg.bingLastUpdate || 0;
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;

    const shouldUpdate = (bg.bingInterval === 'daily' && now - lastUpdate > oneDay) ||
                         (bg.bingInterval === 'weekly' && now - lastUpdate > oneWeek);

    if (shouldUpdate) {
      fetchBingWallpaper().then(url => {
        if (url) {
          state.data.settings.background.url = url;
          state.data.settings.background.bingLastUpdate = now;
          saveData();
          applyBackground();
        }
      });
    }
  }

  function applyPreset(presetKey) {
    const preset = THEME_PRESETS[presetKey];
    if (!preset) return;
    state.data.settings.activeThemePreset = presetKey;
    state.data.settings.customColors = null;
    state.data.settings.theme = presetKey === 'light-warm' ? 'light' : 'dark';
    saveData();
    applyTheme();
    renderAppearanceModal();
  }

  app.theme = { applyTheme, toggleTheme, applyDensity, setDensity, openAppearanceModal, closeAppearanceModal, renderAppearanceModal, applyPreset, applyBackground, fetchBingWallpaper, renderBackgroundSection, wireBackgroundEvents, checkBingUpdate };
}());
