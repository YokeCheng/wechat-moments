import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import type { DiscoverArticle, Pagination } from "@/lib/discover";

type DiscoverArticleTableProps = {
  items: DiscoverArticle[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onPageChange: (page: number) => void;
};

function formatCompactNumber(value: number) {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}亿`;
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)}万`;
  }
  return value.toLocaleString("zh-CN");
}

function formatPublishTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

  const totalPages = useMemo(() => {
    if (!pagination || pagination.page_size === 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(pagination.total / pagination.page_size));
  }, [pagination]);

  const visiblePages = useMemo(() => {
    return buildPagination(pagination?.page ?? 1, totalPages);
  }, [pagination, totalPages]);

  const handleWrite = (article: DiscoverArticle) => {
    navigate(
      `/writer?title=${encodeURIComponent(article.title)}&ref=${encodeURIComponent(article.source_url)}`,
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white">
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">发现文章</p>
          <p className="text-xs text-gray-400">
            {pagination ? `来自后端的 ${pagination.total.toLocaleString("zh-CN")} 条记录` : "后端真实列表"}
          </p>
        </div>
        <div className="ml-auto text-xs text-gray-400">收藏和导出能力将在后续切片接入</div>
      </div>

      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-sm text-orange-500">
            <i className="ri-loader-4-line animate-spin" />
            正在加载文章
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="text-sm font-semibold text-red-600">文章请求失败</p>
            <p className="mt-2 text-sm text-red-500">{error}</p>
            <button
              onClick={onRetry}
              className="mt-4 cursor-pointer rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              重试
            </button>
          </div>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
            <p className="text-sm font-semibold text-gray-700">当前筛选下暂无文章</p>
            <p className="mt-2 text-sm text-gray-500">请尝试调整关键词、领域、时间范围或阅读量阈值。</p>
          </div>
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[980px]">
              <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">领域</th>
                  <th className="px-5 py-3 text-left font-medium">发布时间</th>
                  <th className="px-5 py-3 text-left font-medium">作者</th>
                  <th className="px-5 py-3 text-left font-medium">标题</th>
                  <th className="px-5 py-3 text-right font-medium">阅读</th>
                  <th className="px-5 py-3 text-right font-medium">点赞</th>
                  <th className="px-5 py-3 text-right font-medium">分享</th>
                  <th className="px-5 py-3 text-center font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((article) => (
                  <tr key={article.id} className="transition-colors hover:bg-orange-50/30">
                    <td className="px-5 py-4 text-sm text-gray-600">{article.field}</td>
                    <td className="px-5 py-4 text-sm text-gray-400">{formatPublishTime(article.publish_time)}</td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-700">{article.author}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={article.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-2 text-sm text-gray-800 transition-colors hover:text-orange-500"
                        >
                          {article.title}
                        </a>
                        {article.is_hot && (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-500">
                            热
                          </span>
                        )}
                        {article.is_new && (
                          <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[11px] font-medium text-orange-500">
                            新
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-gray-800">
                      {formatCompactNumber(article.views)}
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-gray-600">
                      {formatCompactNumber(article.likes)}
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-gray-600">
                      {formatCompactNumber(article.shares)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          disabled
                          className="cursor-not-allowed rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-400"
                        >
                          收藏待接入
                        </button>
                        <a
                          href={article.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                        >
                          原文
                        </a>
                        <button
                          onClick={() => handleWrite(article)}
                          className="cursor-pointer rounded-md bg-orange-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-orange-600"
                        >
                          去生文
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
              第 {pagination?.page ?? 1} 页，共 {totalPages} 页，累计 {pagination?.total ?? items.length} 篇文章
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(Math.max(1, (pagination?.page ?? 1) - 1))}
                disabled={!pagination || pagination.page <= 1}
                className="cursor-pointer rounded-md px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
              >
                上一页
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
                下一页
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DiscoverArticleTable;
