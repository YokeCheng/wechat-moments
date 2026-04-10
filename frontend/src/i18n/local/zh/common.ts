export default {
  topbar: {
    brand: {
      subtitle: "内容智能工作台",
    },
    nav: {
      discover: "发现热榜",
      prompts: "提示词库",
      writer: "智能生文",
      layout: "排版工作台",
      channels: "发布渠道",
      tutorial: "使用教程",
      contact: "联系我们",
      vip: "会员中心",
    },
    actions: {
      startWriting: "开始生文",
    },
    language: {
      zh: "中文",
      en: "EN",
    },
    user: {
      fallback: "创作者",
      profile: "个人资料",
      favorites: "我的收藏",
      settings: "账号设置",
      logout: "退出登录",
    },
  },
  home: {
    tabs: {
      weixin: "微信文章",
      toutiao: "头条文章",
      hot: "热搜榜",
    },
    search: {
      placeholder: "搜索标题或作者",
    },
    filters: {
      resetWithCount: "已启用 {{selectedCount}} 个筛选，重置",
      expand: "展开筛选",
      collapse: "收起筛选",
      field: "领域",
      time: "时间",
      views: "阅读量",
    },
    pageSize: {
      label: "每页",
    },
    fields: {
      all: "全部",
      emotion: "情感",
      health: "健康",
      finance: "财经",
      education: "教育",
      technology: "科技",
      travel: "旅游",
      international: "国际",
      sports: "体育",
      auto: "汽车",
      entertainment: "娱乐",
      housing: "房产",
      military: "军事",
    },
    time: {
      all: "全部时间",
      "1d": "1天内",
      "3d": "3天内",
      "7d": "7天内",
      "1m": "1个月内",
      "3m": "3个月内",
    },
    views: {
      any: "不限阅读",
      "10k": "1万+",
      "50k": "5万+",
      "100k": "10万+",
    },
    error: {
      requestFailed: "请求失败，请稍后重试",
    },
    common: {
      retry: "重试",
    },
    article: {
      header: {
        title: "发现文章",
        subtitle: "来自后端的 {{totalCount}} 条记录",
        fallback: "后端真实列表",
        pending: "收藏和导出能力将在后续切片接入",
      },
      loading: "正在加载文章",
      errorTitle: "文章请求失败",
      empty: {
        title: "当前筛选下暂无文章",
        subtitle: "请尝试调整关键词、领域、时间范围或阅读量阈值。",
      },
      columns: {
        field: "领域",
        publishTime: "发布时间",
        author: "作者",
        title: "标题",
        views: "阅读",
        likes: "点赞",
        shares: "分享",
        actions: "操作",
      },
      badges: {
        hot: "热",
        new: "新",
      },
      actions: {
        favoritePending: "收藏待接入",
        original: "原文",
        write: "去生文",
      },
    },
    hot: {
      header: {
        title: "热搜榜",
        subtitle: "来自后端的最新快照",
      },
      loading: "正在加载热搜",
      errorTitle: "热搜请求失败",
      empty: {
        title: "当前快照暂无热搜",
        subtitle: "种子数据或上游采集结果尚未填充这份列表。",
      },
      heat: "热度 {{heatValue}}",
      trend: {
        up: "上升",
        down: "下降",
        stable: "持平",
      },
      actions: {
        write: "去生文",
      },
    },
    pagination: {
      articles: "第 {{currentPage}} 页，共 {{totalPages}} 页，累计 {{totalItems}} 篇文章",
      hotTopics: "第 {{currentPage}} 页，共 {{totalPages}} 页，累计 {{totalItems}} 条热搜",
      previous: "上一页",
      next: "下一页",
    },
  },
};
