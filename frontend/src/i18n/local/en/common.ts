export default {
  topbar: {
    brand: {
      subtitle: "AI Content Workspace",
    },
    nav: {
      discover: "Discover",
      prompts: "Prompts",
      writer: "Writer",
      layout: "Layout",
      channels: "Channels",
      tutorial: "Tutorial",
      contact: "Contact",
      vip: "Membership",
    },
    actions: {
      startWriting: "Start Writing",
    },
    language: {
      zh: "中文",
      en: "EN",
    },
    user: {
      fallback: "Creator",
      profile: "Profile",
      favorites: "Favorites",
      settings: "Settings",
      logout: "Sign Out",
    },
  },
  home: {
    tabs: {
      weixin: "WeChat Articles",
      toutiao: "Toutiao Articles",
      hot: "Trending Topics",
    },
    search: {
      placeholder: "Search title or author",
    },
    filters: {
      resetWithCount: "{{selectedCount}} filters active, reset",
      expand: "Expand Filters",
      collapse: "Collapse Filters",
      field: "Category",
      time: "Time",
      views: "Views",
    },
    pageSize: {
      label: "Per page",
    },
    fields: {
      all: "All",
      emotion: "Emotion",
      health: "Health",
      finance: "Finance",
      education: "Education",
      technology: "Technology",
      travel: "Travel",
      international: "International",
      sports: "Sports",
      auto: "Auto",
      entertainment: "Entertainment",
      housing: "Housing",
      military: "Military",
    },
    time: {
      all: "All Time",
      "1d": "1 Day",
      "3d": "3 Days",
      "7d": "7 Days",
      "1m": "1 Month",
      "3m": "3 Months",
    },
    views: {
      any: "Any Views",
      "10k": "10K+",
      "50k": "50K+",
      "100k": "100K+",
    },
    error: {
      requestFailed: "Request failed. Please try again later.",
    },
    common: {
      retry: "Retry",
    },
    article: {
      header: {
        title: "Discover Articles",
        subtitle: "{{totalCount}} records from backend",
        fallback: "Live backend list",
        pending: "Favorite and export will be added in a follow-up slice.",
      },
      loading: "Loading articles",
      errorTitle: "Article request failed",
      empty: {
        title: "No articles match the current filters",
        subtitle: "Try adjusting keyword, category, time range, or minimum views.",
      },
      columns: {
        field: "Category",
        publishTime: "Published",
        author: "Author",
        title: "Title",
        views: "Views",
        likes: "Likes",
        shares: "Shares",
        actions: "Actions",
      },
      badges: {
        hot: "Hot",
        new: "New",
      },
      actions: {
        favoritePending: "Favorite Later",
        original: "Source",
        write: "Write",
      },
    },
    hot: {
      header: {
        title: "Trending List",
        subtitle: "Latest backend snapshot",
      },
      loading: "Loading trends",
      errorTitle: "Trending request failed",
      empty: {
        title: "No trending topics in the current snapshot",
        subtitle: "Seed data or upstream collection has not filled this list yet.",
      },
      heat: "Heat {{heatValue}}",
      trend: {
        up: "Rising",
        down: "Falling",
        stable: "Stable",
      },
      actions: {
        write: "Write",
      },
    },
    pagination: {
      articles: "Page {{currentPage}} of {{totalPages}}, {{totalItems}} articles total",
      hotTopics: "Page {{currentPage}} of {{totalPages}}, {{totalItems}} topics total",
      previous: "Previous",
      next: "Next",
    },
  },
};
