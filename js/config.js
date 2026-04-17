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
      // 暗色主题 - 高对比度
      warm: { bg: '#12100c', bgSidebar: '#0a0908', bgCard: '#1c1914', bgSearch: '#0e0c0a', accent: '#e8a030', textPrimary: '#faf6f0', textSecondary: '#c8b8a0' },
      ocean: { bg: '#0c1420', bgSidebar: '#060a10', bgCard: '#141e30', bgSearch: '#080e18', accent: '#50b0e8', textPrimary: '#f0f8ff', textSecondary: '#a0c8e0' },
      forest: { bg: '#0c140e', bgSidebar: '#060a08', bgCard: '#141e18', bgSearch: '#080e0a', accent: '#50c870', textPrimary: '#f0fff4', textSecondary: '#a0d0b0' },
      purple: { bg: '#140c18', bgSidebar: '#0a060c', bgCard: '#1e1424', bgSearch: '#100a14', accent: '#b080e8', textPrimary: '#f8f0ff', textSecondary: '#c0a8d8' },
      slate: { bg: '#101214', bgSidebar: '#080a0c', bgCard: '#181c22', bgSearch: '#0c0e12', accent: '#70a8d8', textPrimary: '#f4f8fc', textSecondary: '#a8c0d4' },
      midnight: { bg: '#0c0c0c', bgSidebar: '#060606', bgCard: '#161616', bgSearch: '#0a0a0a', accent: '#80b8f8', textPrimary: '#f8f8f8', textSecondary: '#b0b0b0' },
      rose: { bg: '#140c10', bgSidebar: '#0a0608', bgCard: '#1e1418', bgSearch: '#100a0e', accent: '#e870a0', textPrimary: '#fff0f4', textSecondary: '#d0a0b8' },
      coffee: { bg: '#14100c', bgSidebar: '#0a0806', bgCard: '#1e1810', bgSearch: '#100e08', accent: '#d8a850', textPrimary: '#faf8f0', textSecondary: '#c8b890' },
      // 亮色主题 - 柔和不刺眼
      'light-warm': { bg: '#ebe6de', bgSidebar: '#ddd6ca', bgCard: '#f8f6f2', bgSearch: '#ddd4c4', accent: '#b86a20', textPrimary: '#2a241e', textSecondary: '#605848' },
      'light-ocean': { bg: '#e0eaf0', bgSidebar: '#c8dce8', bgCard: '#f4f8fa', bgSearch: '#d0e2ec', accent: '#2070a8', textPrimary: '#182838', textSecondary: '#486078' },
      'light-forest': { bg: '#e4f0e6', bgSidebar: '#cce4d0', bgCard: '#f6faf6', bgSearch: '#d4e8d8', accent: '#288048', textPrimary: '#182818', textSecondary: '#486850' },
      'light-purple': { bg: '#eeeaf2', bgSidebar: '#ddd8e6', bgCard: '#f8f6fa', bgSearch: '#e0daea', accent: '#7848a8', textPrimary: '#201828', textSecondary: '#584868' },
      'light-slate': { bg: '#e6e8ec', bgSidebar: '#d4d8de', bgCard: '#f6f8fa', bgSearch: '#d8dce2', accent: '#4070a0', textPrimary: '#181c20', textSecondary: '#485868' },
    },
    PRESET_LABELS: {
      // 暗色主题
      warm: '原版暖棕',
      ocean: '深海蓝',
      forest: '森林绿',
      purple: '星夜紫',
      slate: '暗灰蓝',
      midnight: '午夜黑',
      rose: '玫瑰红',
      coffee: '咖啡棕',
      // 亮色主题
      'light-warm': '亮色暖棕',
      'light-ocean': '亮色海洋',
      'light-forest': '亮色森林',
      'light-purple': '亮色紫罗兰',
      'light-slate': '亮色灰蓝',
    },
    COLOR_FIELDS: [
      { key: 'bg', label: '主背景' },
      { key: 'bgSidebar', label: '侧边栏背景' },
      { key: 'bgCard', label: '卡片背景' },
      { key: 'bgSearch', label: '搜索栏背景' },
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
