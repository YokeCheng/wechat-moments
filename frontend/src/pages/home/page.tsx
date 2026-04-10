import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  DiscoverArticleList,
  DiscoverPlatform,
  DiscoverTimeRange,
  HotTopicList,
} from "@/lib/discover";
import { fetchDiscoverArticles, fetchHotTopics } from "@/lib/discover";
import {
  ALL_FIELD_VALUE,
  DEFAULT_PAGE_SIZE,
  FIELD_OPTIONS,
  PAGE_SIZE_OPTIONS,
  TIME_OPTIONS,
  VIEW_OPTIONS,
  type TabKey,
  translateFieldLabel,
} from "./constants";
import DiscoverArticleTable from "./components/DiscoverArticleTable";
import DiscoverHotSearchList from "./components/DiscoverHotSearchList";

type Loadable<T> = {
  status: "idle" | "loading" | "success" | "error";
  data: T | null;
  error: string | null;
};

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

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

const HomePage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("weixin");
  const [activeField, setActiveField] = useState(ALL_FIELD_VALUE);
  const [activeTime, setActiveTime] = useState<DiscoverTimeRange>("all");
  const [activeViews, setActiveViews] = useState<number | undefined>(undefined);
  const [searchText, setSearchText] = useState("");
  const [filterExpanded, setFilterExpanded] = useState(true);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [articlePage, setArticlePage] = useState(1);
  const [hotTopicPage, setHotTopicPage] = useState(1);
  const [articleReloadKey, setArticleReloadKey] = useState(0);
  const [hotTopicReloadKey, setHotTopicReloadKey] = useState(0);
  const [articlesState, setArticlesState] = useState(defaultArticlesState);
  const [hotTopicsState, setHotTopicsState] = useState(defaultHotTopicsState);
  const requestFallbackMessage = t("home.error.requestFailed");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "weixin", label: t("home.tabs.weixin") },
    { key: "toutiao", label: t("home.tabs.toutiao") },
    { key: "hot", label: t("home.tabs.hot") },
  ];

  const timeOptions: { label: string; value: DiscoverTimeRange }[] = TIME_OPTIONS.map((value) => ({
    label: t(`home.time.${value}`),
    value,
  }));

  const viewOptions: { key: string; label: string; value?: number }[] = VIEW_OPTIONS.map((option) => ({
    key: option.key,
    label: t(`home.views.${option.key}`),
    value: option.value,
  }));

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
      field: activeField === ALL_FIELD_VALUE ? undefined : activeField,
      time_range: activeTime,
      views_min: activeViews,
      page: articlePage,
      page_size: pageSize,
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
          error: toErrorMessage(error, requestFallbackMessage),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeField,
    activeTab,
    activeTime,
    activeViews,
    articlePage,
    articleReloadKey,
    pageSize,
    requestFallbackMessage,
    searchText,
  ]);

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
      page_size: pageSize,
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
          error: toErrorMessage(error, requestFallbackMessage),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, hotTopicPage, hotTopicReloadKey, pageSize, requestFallbackMessage]);

  const activeFilterCount = [
    activeField !== ALL_FIELD_VALUE,
    activeTime !== "all",
    activeViews !== undefined,
    searchText.trim() !== "",
  ].filter(Boolean).length;

  const currentFieldOptions =
    activeTab === "hot" ? [] : FIELD_OPTIONS[activeTab as Exclude<TabKey, "hot">];

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab === "hot") {
      setHotTopicPage(1);
      return;
    }

    setActiveField(ALL_FIELD_VALUE);
    setActiveTime("all");
    setActiveViews(undefined);
    setSearchText("");
    setArticlePage(1);
  };

  const handleReset = () => {
    setActiveField(ALL_FIELD_VALUE);
    setActiveTime("all");
    setActiveViews(undefined);
    setSearchText("");
    setArticlePage(1);
  };

  const handlePageSizeChange = (nextValue: string) => {
    const nextPageSize = Number(nextValue);
    if (Number.isNaN(nextPageSize)) {
      return;
    }
    setPageSize(nextPageSize);
    setArticlePage(1);
    setHotTopicPage(1);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#F7F8FA]">
      <div className="flex-shrink-0 border-b border-gray-100 bg-white">
        <div className="flex flex-wrap items-center gap-3 px-6 py-3">
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
                  placeholder={t("home.search.placeholder")}
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
                  {t("home.filters.resetWithCount", { selectedCount: activeFilterCount })}
                </button>
              )}
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400">{t("home.pageSize.label")}</span>
            <select
              value={pageSize}
              onChange={(event) => handlePageSizeChange(event.target.value)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 outline-none transition-colors hover:border-gray-300"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            {activeTab !== "hot" && (
              <button
                onClick={() => setFilterExpanded((current) => !current)}
                className="cursor-pointer whitespace-nowrap rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                {filterExpanded ? t("home.filters.collapse") : t("home.filters.expand")}
              </button>
            )}
          </div>
        </div>

        {activeTab !== "hot" && filterExpanded && (
          <div className="space-y-3 border-t border-gray-50 px-6 pb-3 pt-3">
            <div className="flex items-start gap-2">
              <span className="mt-1.5 w-16 flex-shrink-0 text-xs text-gray-400">{t("home.filters.field")}</span>
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
                    {translateFieldLabel(t, option)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-16 flex-shrink-0 text-xs text-gray-400">{t("home.filters.time")}</span>
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
                <span className="w-16 flex-shrink-0 text-xs text-gray-400">{t("home.filters.views")}</span>
                <div className="flex flex-wrap items-center gap-1">
                  {viewOptions.map((option) => (
                    <button
                      key={option.key}
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
