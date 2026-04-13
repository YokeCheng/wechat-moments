import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type { DiscoverArticle, Pagination } from "@/lib/discover";
import {
  formatCompactNumber,
  formatPublishTime,
  getLocale,
  translateFieldLabel,
} from "../constants";

type DiscoverArticleTableProps = {
  items: DiscoverArticle[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onPageChange: (page: number) => void;
};

function buildPagination(currentPage: number, totalPages: number) {
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  pages.add(currentPage);
  pages.add(currentPage - 1);
  pages.add(currentPage + 1);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);
}

const DiscoverArticleTable = ({
  items,
  pagination,
  isLoading,
  error,
  onRetry,
  onPageChange,
}: DiscoverArticleTableProps) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const locale = getLocale(language);

  const totalPages = useMemo(() => {
    if (!pagination || pagination.page_size === 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(pagination.total / pagination.page_size));
  }, [pagination]);

  const visiblePages = useMemo(() => {
    return buildPagination(pagination?.page ?? 1, totalPages);
  }, [pagination, totalPages]);

  const showSampleNotice = useMemo(() => items.some((article) => article.is_sample), [items]);

  const handleWrite = (article: DiscoverArticle) => {
    const searchParams = new URLSearchParams({ title: article.title });
    if (article.source_url) {
      searchParams.set("ref", article.source_url);
    }
    navigate(`/writer?${searchParams.toString()}`);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white">
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">{t("home.article.header.title")}</p>
          <p className="text-xs text-gray-400">
            {pagination
              ? t("home.article.header.subtitle", {
                  totalCount: pagination.total.toLocaleString(locale),
                })
              : t("home.article.header.fallback")}
          </p>
        </div>
        <div className="ml-auto text-xs text-gray-400">{t("home.article.header.pending")}</div>
      </div>

      {!isLoading && !error && showSampleNotice && (
        <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-xs text-amber-700">
          {t("home.article.notice.sampleMode")}
        </div>
      )}

      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-sm text-orange-500">
            <i className="ri-loader-4-line animate-spin" />
            {t("home.article.loading")}
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="text-sm font-semibold text-red-600">{t("home.article.errorTitle")}</p>
            <p className="mt-2 text-sm text-red-500">{error}</p>
            <button
              onClick={onRetry}
              className="mt-4 cursor-pointer rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              {t("home.common.retry")}
            </button>
          </div>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
            <p className="text-sm font-semibold text-gray-700">{t("home.article.empty.title")}</p>
            <p className="mt-2 text-sm text-gray-500">{t("home.article.empty.subtitle")}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[980px]">
              <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">{t("home.article.columns.field")}</th>
                  <th className="px-5 py-3 text-left font-medium">{t("home.article.columns.publishTime")}</th>
                  <th className="px-5 py-3 text-left font-medium">{t("home.article.columns.author")}</th>
                  <th className="px-5 py-3 text-left font-medium">{t("home.article.columns.title")}</th>
                  <th className="px-5 py-3 text-right font-medium">{t("home.article.columns.views")}</th>
                  <th className="px-5 py-3 text-right font-medium">{t("home.article.columns.likes")}</th>
                  <th className="px-5 py-3 text-right font-medium">{t("home.article.columns.shares")}</th>
                  <th className="px-5 py-3 text-center font-medium">{t("home.article.columns.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((article) => (
                  <tr key={article.id} className="transition-colors hover:bg-orange-50/30">
                    <td className="px-5 py-4 text-sm text-gray-600">{translateFieldLabel(t, article.field)}</td>
                    <td className="px-5 py-4 text-sm text-gray-400">{formatPublishTime(article.publish_time, language)}</td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-700">{article.author}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {article.source_url ? (
                          <a
                            href={article.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="line-clamp-2 text-sm text-gray-800 transition-colors hover:text-orange-500"
                          >
                            {article.title}
                          </a>
                        ) : (
                          <p className="line-clamp-2 text-sm text-gray-800">{article.title}</p>
                        )}
                        {article.is_hot && (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-500">
                            {t("home.article.badges.hot")}
                          </span>
                        )}
                        {article.is_new && (
                          <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[11px] font-medium text-orange-500">
                            {t("home.article.badges.new")}
                          </span>
                        )}
                        {article.is_sample && (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-600">
                            {t("home.article.badges.sample")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-gray-800">
                      {formatCompactNumber(article.views, language)}
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-gray-600">
                      {formatCompactNumber(article.likes, language)}
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-gray-600">
                      {formatCompactNumber(article.shares, language)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          disabled
                          className="cursor-not-allowed rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-400"
                        >
                          {t("home.article.actions.favoritePending")}
                        </button>
                        {article.source_url ? (
                          <a
                            href={article.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                          >
                            {t("home.article.actions.original")}
                          </a>
                        ) : (
                          <span className="rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-400">
                            {t("home.article.actions.unavailable")}
                          </span>
                        )}
                        <button
                          onClick={() => handleWrite(article)}
                          className="cursor-pointer rounded-md bg-orange-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-orange-600"
                        >
                          {t("home.article.actions.write")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-400">
              {t("home.pagination.articles", {
                currentPage: pagination?.page ?? 1,
                totalPages,
                totalItems: (pagination?.total ?? items.length).toLocaleString(locale),
              })}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(Math.max(1, (pagination?.page ?? 1) - 1))}
                disabled={!pagination || pagination.page <= 1}
                className="cursor-pointer rounded-md px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
              >
                {t("home.pagination.previous")}
              </button>
              {visiblePages.map((page) => (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`h-8 w-8 cursor-pointer rounded-md text-xs transition-colors ${
                    page === (pagination?.page ?? 1)
                      ? "bg-orange-500 font-medium text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => onPageChange(Math.min(totalPages, (pagination?.page ?? 1) + 1))}
                disabled={!pagination || !pagination.has_more}
                className="cursor-pointer rounded-md px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
              >
                {t("home.pagination.next")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DiscoverArticleTable;
