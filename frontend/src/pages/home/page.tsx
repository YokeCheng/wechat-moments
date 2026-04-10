import { useEffect, useState } from "react";

import type {
  DiscoverArticleList,
  DiscoverPlatform,
  DiscoverTimeRange,
  HotTopicList,
} from "@/lib/discover";
import { fetchDiscoverArticles, fetchHotTopics } from "@/lib/discover";
import DiscoverArticleTable from "./components/DiscoverArticleTable";
import DiscoverHotSearchList from "./components/DiscoverHotSearchList";

type TabKey = "weixin" | "toutiao" | "hot";

type Loadable<T> = {
  status: "idle" | "loading" | "success" | "error";
  data: T | null;
  error: string | null;
};

const ARTICLE_PAGE_SIZE = 5;
const HOT_TOPIC_PAGE_SIZE = 6;
const ALL_FIELD_LABEL = "全部";

const tabs: { key: TabKey; label: string }[] = [
  { key: "weixin", label: "微信文章" },
  { key: "toutiao", label: "头条文章" },
  { key: "hot", label: "热搜榜" },
];

const fieldOptions: Record<Exclude<TabKey, "hot">, string[]> = {
  weixin: [ALL_FIELD_LABEL, "情感", "健康", "财经", "教育", "科技", "旅游"],
  toutiao: [ALL_FIELD_LABEL, "国际", "体育", "财经", "科技", "健康", "汽车"],
};

const timeOptions: { label: string; value: DiscoverTimeRange }[] = [
  { label: "全部时间", value: "all" },
  { label: "1天内", value: "1d" },
  { label: "3天内", value: "3d" },
  { label: "7天内", value: "7d" },
  { label: "1个月内", value: "1m" },
  { label: "3个月内", value: "3m" },
];

const viewOptions: { label: string; value?: number }[] = [
  { label: "不限阅读" },
  { label: "1万+", value: 10000 },
  { label: "5万+", value: 50000 },
  { label: "10万+", value: 100000 },
];

const defaultArticlesState: Loadable<DiscoverArticleList> = {
  status: "loading",
  data: null,
  error: null,
};

const defaultHotTopicsState: Loadable<HotTopicList> = {
  status: "idle",
  data: null,
  error: null,
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "请求失败，请稍后重试";
}

const HomePage = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("weixin");
  const [activeField, setActiveField] = useState(ALL_FIELD_LABEL);
  const [activeTime, setActiveTime] = useState<DiscoverTimeRange>("all");
  const [activeViews, setActiveViews] = useState<number | undefined>(undefined);
  const [searchText, setSearchText] = useState("");
  const [filterExpanded, setFilterExpanded] = useState(true);
  const [articlePage, setArticlePage] = useState(1);
  const [hotTopicPage, setHotTopicPage] = useState(1);
  const [articleReloadKey, setArticleReloadKey] = useState(0);
  const [hotTopicReloadKey, setHotTopicReloadKey] = useState(0);
  const [articlesState, setArticlesState] = useState(defaultArticlesState);
  const [hotTopicsState, setHotTopicsState] = useState(defaultHotTopicsState);

  useEffect(() => {
    if (activeTab === "hot") {
      return;
    }

    let cancelled = false;
    setArticlesState((current) => ({
      status: "loading",
      data: current.data,
      error: null,
    }));

    fetchDiscoverArticles({
      platform: activeTab as DiscoverPlatform,
      keyword: searchText.trim() || undefined,
      field: activeField === ALL_FIELD_LABEL ? undefined : activeField,
      time_range: activeTime,
      views_min: activeViews,
      page: articlePage,
      page_size: ARTICLE_PAGE_SIZE,
    })
      .then((data) => {
        if (cancelled) {
          return;
        }
        setArticlesState({
          status: "success",
          data,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setArticlesState({
          status: "error",
          data: null,
          error: toErrorMessage(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeField, activeTab, activeTime, activeViews, articlePage, articleReloadKey, searchText]);

  useEffect(() => {
    if (activeTab !== "hot") {
      return;
    }

    let cancelled = false;
    setHotTopicsState((current) => ({
      status: "loading",
      data: current.data,
      error: null,
    }));

    fetchHotTopics({
      page: hotTopicPage,
      page_size: HOT_TOPIC_PAGE_SIZE,
    })
      .then((data) => {
        if (cancelled) {
          return;
        }
        setHotTopicsState({
          status: "success",
          data,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setHotTopicsState({
          status: "error",
          data: null,
          error: toErrorMessage(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, hotTopicPage, hotTopicReloadKey]);

  const activeFilterCount = [
    activeField !== ALL_FIELD_LABEL,
    activeTime !== "all",
    activeViews !== undefined,
    searchText.trim() !== "",
  ].filter(Boolean).length;

  const currentFieldOptions =
    activeTab === "hot" ? [] : fieldOptions[activeTab as Exclude<TabKey, "hot">];

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab === "hot") {
      setHotTopicPage(1);
      return;
    }

    setActiveField(ALL_FIELD_LABEL);
    setActiveTime("all");
    setActiveViews(undefined);
    setSearchText("");
    setArticlePage(1);
  };

  const handleReset = () => {
    setActiveField(ALL_FIELD_LABEL);
    setActiveTime("all");
    setActiveViews(undefined);
    setSearchText("");
    setArticlePage(1);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#F7F8FA]">
      <div className="flex-shrink-0 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3 px-6 py-3">
          <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`cursor-pointer whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-orange-500 text-white"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab !== "hot" && (
            <>
              <div className="flex max-w-sm flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
                <i className="ri-search-line text-sm text-gray-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(event) => {
                    setSearchText(event.target.value);
                    setArticlePage(1);
                  }}
                  placeholder="搜索标题或作者"
                  className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-300"
                />
                {searchText && (
                  <button
                    onClick={() => {
                      setSearchText("");
                      setArticlePage(1);
                    }}
                    className="cursor-pointer text-gray-300 transition-colors hover:text-gray-500"
                  >
                    <i className="ri-close-line text-xs" />
                  </button>
                )}
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={handleReset}
                  className="cursor-pointer whitespace-nowrap rounded-full bg-orange-50 px-2.5 py-1.5 text-xs text-orange-500 transition-colors hover:bg-orange-100"
                >
                  已启用 {activeFilterCount} 个筛选，重置
                </button>
              )}

              <div className="ml-auto">
                <button
                  onClick={() => setFilterExpanded((current) => !current)}
                  className="cursor-pointer whitespace-nowrap rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  {filterExpanded ? "收起筛选" : "展开筛选"}
                </button>
              </div>
            </>
          )}
        </div>

        {activeTab !== "hot" && filterExpanded && (
          <div className="space-y-3 border-t border-gray-50 px-6 pb-3 pt-3">
            <div className="flex items-start gap-2">
              <span className="mt-1.5 w-16 flex-shrink-0 text-xs text-gray-400">领域</span>
              <div className="flex flex-wrap gap-1">
                {currentFieldOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setActiveField(option);
                      setArticlePage(1);
                    }}
                    className={`cursor-pointer whitespace-nowrap rounded-full px-3 py-1 text-xs transition-all ${
                      activeField === option
                        ? "bg-orange-500 font-medium text-white"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-16 flex-shrink-0 text-xs text-gray-400">时间</span>
                <div className="flex flex-wrap items-center gap-1">
                  {timeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setActiveTime(option.value);
                        setArticlePage(1);
                      }}
                      className={`cursor-pointer whitespace-nowrap rounded-full px-3 py-1 text-xs transition-all ${
                        activeTime === option.value
                          ? "bg-orange-500 font-medium text-white"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-16 flex-shrink-0 text-xs text-gray-400">阅读量</span>
                <div className="flex flex-wrap items-center gap-1">
                  {viewOptions.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => {
                        setActiveViews(option.value);
                        setArticlePage(1);
                      }}
                      className={`cursor-pointer whitespace-nowrap rounded-full px-3 py-1 text-xs transition-all ${
                        activeViews === option.value
                          ? "bg-orange-500 font-medium text-white"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
        {activeTab === "hot" ? (
          <DiscoverHotSearchList
            items={hotTopicsState.data?.items ?? []}
            pagination={hotTopicsState.data?.pagination ?? null}
            isLoading={hotTopicsState.status === "loading"}
            error={hotTopicsState.error}
            onRetry={() => setHotTopicReloadKey((current) => current + 1)}
            onPageChange={setHotTopicPage}
          />
        ) : (
          <DiscoverArticleTable
            items={articlesState.data?.items ?? []}
            pagination={articlesState.data?.pagination ?? null}
            isLoading={articlesState.status === "loading"}
            error={articlesState.error}
            onRetry={() => setArticleReloadKey((current) => current + 1)}
            onPageChange={setArticlePage}
          />
        )}
      </div>
    </div>
  );
};

export default HomePage;
