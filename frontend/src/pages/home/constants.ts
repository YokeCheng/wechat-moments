import type { TFunction } from "i18next";

import type { DiscoverTimeRange } from "@/lib/discover";

export type TabKey = "weixin" | "toutiao" | "hot";

export const ALL_FIELD_VALUE = "全部";
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export const FIELD_OPTIONS: Record<Exclude<TabKey, "hot">, string[]> = {
  weixin: [ALL_FIELD_VALUE, "情感", "健康", "财经", "教育", "科技", "旅游"],
  toutiao: [ALL_FIELD_VALUE, "国际", "体育", "财经", "科技", "健康", "汽车"],
};

export const TIME_OPTIONS: DiscoverTimeRange[] = ["all", "1d", "3d", "7d", "1m", "3m"];

export const VIEW_OPTIONS: Array<{ key: "any" | "10k" | "50k" | "100k"; value?: number }> = [
  { key: "any" },
  { key: "10k", value: 10000 },
  { key: "50k", value: 50000 },
  { key: "100k", value: 100000 },
];

const FIELD_TRANSLATION_KEYS: Record<string, string> = {
  全部: "all",
  情感: "emotion",
  健康: "health",
  财经: "finance",
  教育: "education",
  科技: "technology",
  旅游: "travel",
  国际: "international",
  体育: "sports",
  汽车: "auto",
  娱乐: "entertainment",
  房产: "housing",
  军事: "military",
};

export function isChineseLanguage(language: string) {
  return language.toLowerCase().startsWith("zh");
}

export function getLocale(language: string) {
  return isChineseLanguage(language) ? "zh-CN" : "en-US";
}

export function translateFieldLabel(t: TFunction, value: string) {
  const translationKey = FIELD_TRANSLATION_KEYS[value];
  if (!translationKey) {
    return value;
  }
  return t(`home.fields.${translationKey}`);
}

function trimTrailingZero(value: string) {
  return value.endsWith(".0") ? value.slice(0, -2) : value;
}

export function formatCompactNumber(value: number, language: string) {
  if (isChineseLanguage(language)) {
    if (value >= 100000000) {
      return `${trimTrailingZero((value / 100000000).toFixed(1))}亿`;
    }
    if (value >= 10000) {
      return `${trimTrailingZero((value / 10000).toFixed(1))}万`;
    }
    return value.toLocaleString("zh-CN");
  }

  if (value >= 1000000000) {
    return `${trimTrailingZero((value / 1000000000).toFixed(1))}B`;
  }
  if (value >= 1000000) {
    return `${trimTrailingZero((value / 1000000).toFixed(1))}M`;
  }
  if (value >= 1000) {
    return `${trimTrailingZero((value / 1000).toFixed(1))}K`;
  }
  return value.toLocaleString("en-US");
}

export function formatPublishTime(value: string, language: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  if (isChineseLanguage(language)) {
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
