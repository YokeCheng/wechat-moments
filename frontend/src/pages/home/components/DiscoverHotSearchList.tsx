import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import type { HotTopic, Pagination } from "@/lib/discover";

type DiscoverHotSearchListProps = {
  items: HotTopic[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onPageChange: (page: number) => void;
};

const rankColors = [
  "text-red-500 font-black",
  "text-orange-500 font-black",
  "text-yellow-500 font-black",
];

function formatHeat(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 10000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toLocaleString();
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

const DiscoverHotSearchList = ({
  items,
  pagination,
  isLoading,
  error,
  onRetry,
  onPageChange,
}: DiscoverHotSearchListProps) => {
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

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
        <i className="ri-fire-line text-sm text-orange-500" />
        <span className="text-sm font-semibold text-gray-800">Hot Topics</span>
        <span className="text-xs text-gray-400">Latest snapshot from backend</span>
      </div>

      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-sm text-orange-500">
            <i className="ri-loader-4-line animate-spin" />
            Loading hot topics
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="text-sm font-semibold text-red-600">Hot topic request failed</p>
            <p className="mt-2 text-sm text-red-500">{error}</p>
            <button
              onClick={onRetry}
              className="mt-4 cursor-pointer rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
            <p className="text-sm font-semibold text-gray-700">No hot topics in the current snapshot</p>
            <p className="mt-2 text-sm text-gray-500">Seed data or upstream collection has not filled this list yet.</p>
          </div>
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <>
          <div className="min-h-0 flex-1 divide-y divide-gray-50 overflow-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-orange-50/20"
              >
                <span className={`w-6 text-center text-sm ${rankColors[item.rank - 1] || "text-gray-400 font-medium"}`}>
                  {item.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-800 transition-colors group-hover:text-orange-500">
                    {item.title}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                    <span>{item.field}</span>
                    <span className="text-gray-300">/</span>
                    <span>Heat {formatHeat(item.heat)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {item.trend === "up" && (
                    <span className="flex items-center gap-0.5 text-xs text-red-500">
                      <i className="ri-arrow-up-s-line text-sm" />
                      Up
                    </span>
                  )}
                  {item.trend === "down" && (
                    <span className="flex items-center gap-0.5 text-xs text-green-500">
                      <i className="ri-arrow-down-s-line text-sm" />
                      Down
                    </span>
                  )}
                  {item.trend === "stable" && <span className="text-xs text-gray-400">Stable</span>}
                  <button
                    onClick={() => navigate(`/writer?title=${encodeURIComponent(item.title)}`)}
                    className="cursor-pointer rounded-md bg-orange-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-orange-600"
                  >
                    Write
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-400">
              Page {pagination?.page ?? 1} of {totalPages}, total {pagination?.total ?? items.length} hot topics
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(Math.max(1, (pagination?.page ?? 1) - 1))}
                disabled={!pagination || pagination.page <= 1}
                className="cursor-pointer rounded-md px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
              >
                Previous
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
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DiscoverHotSearchList;
