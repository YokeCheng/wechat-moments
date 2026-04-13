import { requestAuthedJson } from "./auth";

export type DiscoverPlatform = "weixin" | "toutiao";
export type DiscoverTimeRange = "all" | "1d" | "3d" | "7d" | "1m" | "3m";
export type HotTopicTrend = "up" | "down" | "stable";
export type HotTopicPlatform = "weibo" | "baidu" | "toutiao" | "global";

export type Pagination = {
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
};

export type DiscoverArticle = {
  id: string;
  platform: DiscoverPlatform;
  field: string;
  title: string;
  author: string;
  publish_time: string;
  views: number;
  likes: number;
  shares: number;
  source_url?: string | null;
  is_sample: boolean;
  is_hot: boolean;
  is_new: boolean;
};

export type HotTopic = {
  id: string;
  rank: number;
  platform: HotTopicPlatform;
  title: string;
  heat: number;
  trend: HotTopicTrend;
  field: string;
  source_url?: string | null;
};

export type DiscoverArticleList = {
  items: DiscoverArticle[];
  pagination: Pagination;
  synced_at?: string | null;
};

export type DiscoverArticleRefreshResult = {
  total: number;
  synced_at?: string | null;
};

export type HotTopicList = {
  items: HotTopic[];
  pagination: Pagination;
  synced_at?: string | null;
};

export type HotTopicRefreshResult = {
  total: number;
  synced_at?: string | null;
};

export type DiscoverArticleQuery = {
  platform?: DiscoverPlatform;
  keyword?: string;
  field?: string;
  time_range?: DiscoverTimeRange;
  views_min?: number;
  page?: number;
  page_size?: number;
};

function buildQueryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function fetchDiscoverArticles(query: DiscoverArticleQuery) {
  const queryString = buildQueryString({
    platform: query.platform,
    keyword: query.keyword,
    field: query.field,
    time_range: query.time_range,
    views_min: query.views_min,
    page: query.page,
    page_size: query.page_size,
  });
  return requestAuthedJson<DiscoverArticleList>(`/api/v1/discover/articles${queryString}`);
}

export async function refreshDiscoverArticlesSnapshot() {
  return requestAuthedJson<DiscoverArticleRefreshResult>("/api/v1/discover/articles", {
    method: "POST",
  });
}

export async function fetchHotTopics(params: { page?: number; page_size?: number }) {
  const queryString = buildQueryString({
    page: params.page,
    page_size: params.page_size,
  });
  return requestAuthedJson<HotTopicList>(`/api/v1/discover/hot-topics${queryString}`);
}

export async function refreshHotTopicsSnapshot() {
  return requestAuthedJson<HotTopicRefreshResult>("/api/v1/discover/hot-topics", {
    method: "POST",
  });
}
