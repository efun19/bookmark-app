(function () {
  window.BookmarkApp = window.BookmarkApp || {};
  const app = window.BookmarkApp;

  app.config = {
    STORAGE_KEY: 'bookmark-app-data',
    DEFAULT_DATA: {
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
    },
    SEARCH_ENGINES: [
      { id: 'google', name: 'Google', icon: '🔍', url: 'https://www.google.com/search?q=%s' },
      { id: 'bing', name: 'Bing', icon: '🔷', url: 'https://www.bing.com/search?q=%s' },
      { id: 'baidu', name: '百度', icon: '🔴', url: 'https://www.baidu.com/s?wd=%s' },
    ],
    THEME_PRESETS: {
      warm: { bg: '#19160f', bgSidebar: '#100e09', bgCard: '#211d16', accent: '#d4952a', textPrimary: '#f0ebe0', textSecondary: '#a0957f' },
      ocean: { bg: '#0f1b2d', bgSidebar: '#071220', bgCard: '#162234', accent: '#3a8fbf', textPrimary: '#d0e8f8', textSecondary: '#7a9ab8' },
      forest: { bg: '#0d1f12', bgSidebar: '#061209', bgCard: '#142018', accent: '#3a9a52', textPrimary: '#d0f0d8', textSecondary: '#7ab888' },
      purple: { bg: '#12101e', bgSidebar: '#0a0814', bgCard: '#1c1a2e', accent: '#9a72d4', textPrimary: '#e8e0f8', textSecondary: '#9888c8' },
      slate: { bg: '#0f1217', bgSidebar: '#080b0e', bgCard: '#161c24', accent: '#5a8aaa', textPrimary: '#d0dce8', textSecondary: '#7a9aaa' },
      'light-warm': { bg: '#f5f0e8', bgSidebar: '#ede8de', bgCard: '#ffffff', accent: '#c8721e', textPrimary: '#1a1712', textSecondary: '#6b6356' },
    },
    PRESET_LABELS: {
      warm: '原版暖棕',
      ocean: '深海蓝',
      forest: '森林绿',
      purple: '星夜紫',
      slate: '暗灰蓝',
      'light-warm': '亮色暖棕',
    },
    COLOR_FIELDS: [
      { key: 'bg', label: '主背景' },
      { key: 'bgSidebar', label: '侧边栏背景' },
      { key: 'bgCard', label: '卡片背景' },
      { key: 'accent', label: '强调色' },
      { key: 'textPrimary', label: '主文字色' },
      { key: 'textSecondary', label: '次要文字色' },
    ],
    EMOJI_LIST: [
      '📁', '💻', '🎨', '🔧', '📚', '🎵', '🎮', '🌐', '📰', '💡',
      '🔬', '📊', '🛒', '✈️', '🍕', '🏠', '💼', '🔐', '📱', '🎯',
      '🚀', '⭐', '💎', '🎭', '📷', '🎬', '📝', '🗂', '🔖', '🌟',
    ],
  };
}());
