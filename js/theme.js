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

  function applyTheme() {
    const theme = state.data.settings.theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('theme-icon').textContent = theme === 'dark' ? '◑' : '◐';
    applyColorTheme(getCurrentColors());
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

  app.theme = { applyTheme, toggleTheme, applyDensity, setDensity, openAppearanceModal, closeAppearanceModal, renderAppearanceModal, applyPreset };
}());
