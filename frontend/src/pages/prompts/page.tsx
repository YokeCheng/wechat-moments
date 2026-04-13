import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type { Prompt, PromptCategoryItem, PromptList, PromptStatus } from "@/lib/prompts";
import {
  createPrompt,
  createPromptCategory,
  deletePrompt,
  deletePromptCategory,
  fetchPromptCategories,
  fetchPrompts,
  updatePrompt,
  updatePromptCategory,
} from "@/lib/prompts";

type Loadable<T> = {
  status: "loading" | "success" | "error";
  data: T | null;
  error: string | null;
};

const ALL_CATEGORY_ID = "all";
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function parseTags(value: string) {
  const seen = new Set<string>();
  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    });
}

function formatPromptDate(value: string, language: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language.startsWith("en") ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const PromptsPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [categoriesState, setCategoriesState] = useState<Loadable<PromptCategoryItem[]>>({
    status: "loading",
    data: null,
    error: null,
  });
  const [promptsState, setPromptsState] = useState<Loadable<PromptList>>({
    status: "loading",
    data: null,
    error: null,
  });
  const [activeCategoryId, setActiveCategoryId] = useState(ALL_CATEGORY_ID);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [reloadKey, setReloadKey] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryMode, setCategoryMode] = useState<"create" | "edit">("create");
  const [editingCategory, setEditingCategory] = useState<PromptCategoryItem | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptMode, setPromptMode] = useState<"create" | "edit">("create");
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [promptTitle, setPromptTitle] = useState("");
  const [promptCategoryId, setPromptCategoryId] = useState("");
  const [promptStatusValue, setPromptStatusValue] = useState<PromptStatus>("draft");
  const [promptTags, setPromptTags] = useState("");
  const [promptContent, setPromptContent] = useState("");
  const [promptSaving, setPromptSaving] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  const [detailPrompt, setDetailPrompt] = useState<Prompt | null>(null);
  const requestFallbackMessage = t("prompts.messages.requestFailed");

  useEffect(() => {
    let cancelled = false;

    fetchPromptCategories()
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setCategoriesState({ status: "success", data: payload.items, error: null });
        if (
          activeCategoryId !== ALL_CATEGORY_ID &&
          !payload.items.some((item) => item.id === activeCategoryId)
        ) {
          setActiveCategoryId(ALL_CATEGORY_ID);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setCategoriesState({
          status: "error",
          data: null,
          error: toErrorMessage(error, requestFallbackMessage),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeCategoryId, reloadKey, requestFallbackMessage]);

  useEffect(() => {
    let cancelled = false;
    setPromptsState((current) => ({ status: "loading", data: current.data, error: null }));

    fetchPrompts({
      category_id: activeCategoryId === ALL_CATEGORY_ID ? undefined : activeCategoryId,
      keyword: searchText.trim() || undefined,
      page,
      page_size: pageSize,
    })
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setPromptsState({ status: "success", data: payload, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setPromptsState({
          status: "error",
          data: null,
          error: toErrorMessage(error, requestFallbackMessage),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeCategoryId, page, pageSize, reloadKey, requestFallbackMessage, searchText]);

  useEffect(() => {
    if (!copiedId) {
      return;
    }
    const timerId = window.setTimeout(() => setCopiedId(null), 1800);
    return () => window.clearTimeout(timerId);
  }, [copiedId]);

  const categories = categoriesState.data ?? [];
  const promptList = promptsState.data?.items ?? [];
  const pagination = promptsState.data?.pagination ?? null;
  const totalCount = categories.reduce((sum, item) => sum + item.count, 0);
  const activeCategory = categories.find((item) => item.id === activeCategoryId) ?? null;
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.page_size)) : 1;
  const activeCategoryLabel =
    activeCategoryId === ALL_CATEGORY_ID ? t("prompts.sidebar.all") : activeCategory?.name ?? "";

  const statusConfig: Record<PromptStatus, { label: string; badge: string; toggle: string }> = {
    active: {
      label: t("prompts.status.active"),
      badge: "bg-green-50 text-green-600",
      toggle: t("prompts.actions.deactivate"),
    },
    draft: {
      label: t("prompts.status.draft"),
      badge: "bg-gray-100 text-gray-500",
      toggle: t("prompts.actions.activate"),
    },
    generating: {
      label: t("prompts.status.generating"),
      badge: "bg-orange-50 text-orange-500",
      toggle: t("prompts.actions.markActive"),
    },
  };

  const reload = () => setReloadKey((current) => current + 1);

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setCategorySaving(false);
    setCategoryError(null);
  };

  const closePromptModal = () => {
    setShowPromptModal(false);
    setPromptSaving(false);
    setPromptError(null);
  };

  const openCreateCategoryModal = () => {
    setCategoryMode("create");
    setEditingCategory(null);
    setCategoryName("");
    setCategoryError(null);
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (category: PromptCategoryItem) => {
    setCategoryMode("edit");
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryError(null);
    setShowCategoryModal(true);
  };

  const openCreatePromptModal = () => {
    setPromptMode("create");
    setEditingPrompt(null);
    setPromptTitle("");
    setPromptCategoryId(activeCategoryId === ALL_CATEGORY_ID ? "" : activeCategoryId);
    setPromptStatusValue("draft");
    setPromptTags("");
    setPromptContent("");
    setPromptError(null);
    setShowPromptModal(true);
  };

  const openEditPromptModal = (prompt: Prompt) => {
    setPromptMode("edit");
    setEditingPrompt(prompt);
    setPromptTitle(prompt.title);
    setPromptCategoryId(prompt.category_id ?? "");
    setPromptStatusValue(prompt.status);
    setPromptTags(prompt.tags.join(", "));
    setPromptContent(prompt.content);
    setPromptError(null);
    setShowPromptModal(true);
  };

  const submitCategory = async () => {
    const name = categoryName.trim();
    if (!name) {
      setCategoryError(t("prompts.category.validation.required"));
      return;
    }

    setCategorySaving(true);
    setCategoryError(null);
    try {
      if (categoryMode === "create") {
        await createPromptCategory({ name });
        setBanner({ tone: "success", text: t("prompts.messages.categoryCreated") });
      } else if (editingCategory) {
        await updatePromptCategory(editingCategory.id, { name });
        setBanner({ tone: "success", text: t("prompts.messages.categoryUpdated") });
      }
      closeCategoryModal();
      reload();
    } catch (error: unknown) {
      setCategoryError(toErrorMessage(error, requestFallbackMessage));
    } finally {
      setCategorySaving(false);
    }
  };

  const deleteCategory = async (category: PromptCategoryItem) => {
    if (!window.confirm(t("prompts.category.deleteConfirm", { name: category.name }))) {
      return;
    }

    try {
      await deletePromptCategory(category.id);
      if (activeCategoryId === category.id) {
        setActiveCategoryId(ALL_CATEGORY_ID);
      }
      setBanner({ tone: "success", text: t("prompts.messages.categoryDeleted") });
      reload();
    } catch (error: unknown) {
      setBanner({ tone: "error", text: toErrorMessage(error, requestFallbackMessage) });
    }
  };

  const submitPrompt = async () => {
    const title = promptTitle.trim();
    const content = promptContent.trim();
    if (!title) {
      setPromptError(t("prompts.prompt.validation.titleRequired"));
      return;
    }
    if (!content) {
      setPromptError(t("prompts.prompt.validation.contentRequired"));
      return;
    }

    const payload = {
      title,
      category_id: promptCategoryId || null,
      content,
      tags: parseTags(promptTags),
      status: promptStatusValue,
    };

    setPromptSaving(true);
    setPromptError(null);
    try {
      if (promptMode === "create") {
        await createPrompt(payload);
        setPage(1);
        setBanner({ tone: "success", text: t("prompts.messages.promptCreated") });
      } else if (editingPrompt) {
        await updatePrompt(editingPrompt.id, payload);
        setBanner({ tone: "success", text: t("prompts.messages.promptUpdated") });
      }
      closePromptModal();
      reload();
    } catch (error: unknown) {
      setPromptError(toErrorMessage(error, requestFallbackMessage));
    } finally {
      setPromptSaving(false);
    }
  };

  const togglePromptStatus = async (prompt: Prompt) => {
    const nextStatus: PromptStatus = prompt.status === "active" ? "draft" : "active";
    try {
      await updatePrompt(prompt.id, { status: nextStatus });
      setBanner({ tone: "success", text: t("prompts.messages.statusUpdated") });
      reload();
    } catch (error: unknown) {
      setBanner({ tone: "error", text: toErrorMessage(error, requestFallbackMessage) });
    }
  };

  const removePrompt = async (prompt: Prompt) => {
    if (!window.confirm(t("prompts.prompt.deleteConfirm", { title: prompt.title }))) {
      return;
    }

    try {
      await deletePrompt(prompt.id);
      setBanner({ tone: "success", text: t("prompts.messages.promptDeleted") });
      if (promptList.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        reload();
      }
    } catch (error: unknown) {
      setBanner({ tone: "error", text: toErrorMessage(error, requestFallbackMessage) });
    }
  };

  const copyPrompt = async (prompt: Prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopiedId(prompt.id);
      setBanner({ tone: "success", text: t("prompts.messages.copied") });
    } catch {
      setBanner({ tone: "error", text: t("prompts.messages.copyFailed") });
    }
  };

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-[#F7F8FA]">
      <aside className="flex w-56 flex-shrink-0 flex-col overflow-hidden border-r border-gray-100 bg-white">
        <div className="border-b border-gray-50 px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-800">{t("prompts.sidebar.title")}</span>
            <button
              onClick={openCreateCategoryModal}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-orange-50 text-orange-500 transition-colors hover:bg-orange-100"
              title={t("prompts.sidebar.new")}
            >
              <i className="ri-add-line text-sm" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          <button
            onClick={() => {
              setActiveCategoryId(ALL_CATEGORY_ID);
              setPage(1);
            }}
            className={`flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left ${
              activeCategoryId === ALL_CATEGORY_ID
                ? "border-r-2 border-orange-500 bg-orange-50"
                : "hover:bg-gray-50"
            }`}
          >
            <span
              className={`text-sm ${
                activeCategoryId === ALL_CATEGORY_ID ? "font-semibold text-orange-500" : "text-gray-600"
              }`}
            >
              {t("prompts.sidebar.all")}
            </span>
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{totalCount}</span>
          </button>

          {categoriesState.status === "loading" && !categories.length && (
            <p className="px-4 py-4 text-xs text-gray-400">{t("prompts.states.loadingCategories")}</p>
          )}

          {categoriesState.status === "error" && !categories.length && (
            <div className="space-y-2 px-4 py-4">
              <p className="text-xs text-red-500">{categoriesState.error}</p>
              <button
                onClick={reload}
                className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                {t("prompts.common.retry")}
              </button>
            </div>
          )}

          {categories.map((category) => (
            <div
              key={category.id}
              className={`group flex items-center justify-between px-4 py-2.5 ${
                activeCategoryId === category.id
                  ? "border-r-2 border-orange-500 bg-orange-50"
                  : "hover:bg-gray-50"
              }`}
            >
              <button
                onClick={() => {
                  setActiveCategoryId(category.id);
                  setPage(1);
                }}
                className="min-w-0 flex-1 cursor-pointer text-left"
              >
                <span
                  className={`block truncate text-sm ${
                    activeCategoryId === category.id
                      ? "font-semibold text-orange-500"
                      : "text-gray-600"
                  }`}
                >
                  {category.name}
                </span>
              </button>
              <div className="flex items-center gap-1">
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{category.count}</span>
                <div className="hidden gap-0.5 group-hover:flex">
                  <button
                    onClick={() => openEditCategoryModal(category)}
                    className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-gray-400 hover:bg-orange-50 hover:text-orange-500"
                  >
                    <i className="ri-edit-line text-xs" />
                  </button>
                  <button
                    onClick={() => void deleteCategory(category)}
                    className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <i className="ri-delete-bin-line text-xs" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-white px-6 py-3">
          <div>
            <span className="text-sm font-bold text-gray-800">{activeCategoryLabel}</span>
            <span className="ml-2 text-xs text-gray-400">
              {pagination?.total ?? promptList.length} {t("prompts.toolbar.countUnit")}
            </span>
          </div>

          <div className="ml-auto flex w-64 items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
            <i className="ri-search-line text-sm text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setPage(1);
              }}
              placeholder={t("prompts.toolbar.searchPlaceholder")}
              className="flex-1 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-300"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{t("prompts.toolbar.pageSize")}</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={openCreatePromptModal}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            <i className="ri-add-line text-sm" />
            {t("prompts.toolbar.newPrompt")}
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
          {banner && (
            <div
              className={`mb-3 rounded-xl border px-4 py-3 text-sm ${
                banner.tone === "error"
                  ? "border-red-100 bg-red-50 text-red-500"
                  : "border-green-100 bg-green-50 text-green-600"
              }`}
            >
              {banner.text}
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-100 bg-white">
            {promptsState.status === "loading" && !promptsState.data ? (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
                {t("prompts.states.loadingPrompts")}
              </div>
            ) : promptsState.status === "error" ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-sm font-medium text-gray-800">{t("prompts.states.errorTitle")}</p>
                <p className="text-sm text-gray-500">{promptsState.error}</p>
                <button
                  onClick={reload}
                  className="cursor-pointer rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                >
                  {t("prompts.common.retry")}
                </button>
              </div>
            ) : promptList.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <p className="text-sm text-gray-500">{t("prompts.states.emptyTitle")}</p>
                <p className="mt-1 text-xs text-gray-400">{t("prompts.states.emptySubtitle")}</p>
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="w-full min-w-[920px]">
                    <thead>
                      <tr className="bg-gray-50 text-xs font-medium text-gray-400">
                        <th className="px-5 py-3 text-left">{t("prompts.columns.title")}</th>
                        <th className="w-28 px-5 py-3 text-left">{t("prompts.columns.category")}</th>
                        <th className="w-24 px-5 py-3 text-left">{t("prompts.columns.status")}</th>
                        <th className="w-40 px-5 py-3 text-left">{t("prompts.columns.tags")}</th>
                        <th className="w-24 px-5 py-3 text-right">{t("prompts.columns.usage")}</th>
                        <th className="w-28 px-5 py-3 text-left">{t("prompts.columns.createdAt")}</th>
                        <th className="w-72 px-5 py-3 text-center">{t("prompts.columns.actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {promptList.map((prompt) => (
                        <tr key={prompt.id} className="hover:bg-orange-50/20">
                          <td className="max-w-0 px-5 py-3">
                            <p className="truncate text-sm font-medium text-gray-800">{prompt.title}</p>
                            <p className="mt-0.5 truncate text-xs text-gray-400">{prompt.content}</p>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-600">
                            {prompt.category_name ?? t("prompts.prompt.uncategorized")}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusConfig[prompt.status].badge}`}>
                              {statusConfig[prompt.status].label}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1">
                              {prompt.tags.length > 0 ? (
                                prompt.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-300">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right text-sm font-mono text-gray-700">{prompt.usage_count}</td>
                          <td className="px-5 py-3 text-xs text-gray-400">
                            {formatPromptDate(prompt.created_at, i18n.resolvedLanguage || i18n.language || "zh")}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setDetailPrompt(prompt)} className="rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-orange-50 hover:text-orange-500">
                                {t("prompts.actions.view")}
                              </button>
                              <button onClick={() => openEditPromptModal(prompt)} className="rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-orange-50 hover:text-orange-500">
                                {t("prompts.actions.edit")}
                              </button>
                              <button onClick={() => void copyPrompt(prompt)} className="rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-orange-50 hover:text-orange-500">
                                {copiedId === prompt.id ? t("prompts.actions.copied") : t("prompts.actions.copy")}
                              </button>
                              <button onClick={() => void togglePromptStatus(prompt)} className="rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-orange-50 hover:text-orange-500">
                                {statusConfig[prompt.status].toggle}
                              </button>
                              <button onClick={() => void removePrompt(prompt)} className="rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500">
                                {t("prompts.actions.delete")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pagination && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                    <span className="text-xs text-gray-400">
                      {t("prompts.pagination.summary", {
                        currentPage: pagination.page,
                        totalPages,
                        totalItems: pagination.total,
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={pagination.page <= 1}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
                      >
                        {t("prompts.pagination.previous")}
                      </button>
                      <button
                        onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                        disabled={!pagination.has_more}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
                      >
                        {t("prompts.pagination.next")}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={closeCategoryModal}>
          <div className="w-[360px] max-w-[90vw] rounded-2xl bg-white p-6" onClick={(event) => event.stopPropagation()}>
            <h3 className="mb-5 text-base font-bold text-gray-900">
              {categoryMode === "create" ? t("prompts.category.createTitle") : t("prompts.category.editTitle")}
            </h3>
            <input
              type="text"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder={t("prompts.category.namePlaceholder")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
            />
            {categoryError && <p className="mt-2 text-xs text-red-500">{categoryError}</p>}
            <div className="mt-5 flex gap-2">
              <button onClick={closeCategoryModal} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50">
                {t("prompts.common.cancel")}
              </button>
              <button
                onClick={() => void submitCategory()}
                disabled={categorySaving}
                className="flex-1 rounded-lg bg-orange-500 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
              >
                {categoryMode === "create" ? t("prompts.category.create") : t("prompts.common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={closePromptModal}>
          <div className="w-[560px] max-w-[92vw] rounded-2xl bg-white p-6" onClick={(event) => event.stopPropagation()}>
            <h3 className="mb-5 text-base font-bold text-gray-900">
              {promptMode === "create" ? t("prompts.prompt.createTitle") : t("prompts.prompt.editTitle")}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                value={promptTitle}
                onChange={(event) => setPromptTitle(event.target.value)}
                placeholder={t("prompts.prompt.titlePlaceholder")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <select
                  value={promptCategoryId}
                  onChange={(event) => setPromptCategoryId(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400"
                >
                  <option value="">{t("prompts.prompt.uncategorized")}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <select
                  value={promptStatusValue}
                  onChange={(event) => setPromptStatusValue(event.target.value as PromptStatus)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400"
                >
                  <option value="draft">{t("prompts.status.draft")}</option>
                  <option value="active">{t("prompts.status.active")}</option>
                  <option value="generating">{t("prompts.status.generating")}</option>
                </select>
              </div>
              <input
                type="text"
                value={promptTags}
                onChange={(event) => setPromptTags(event.target.value)}
                placeholder={t("prompts.prompt.tagsPlaceholder")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              />
              <textarea
                value={promptContent}
                onChange={(event) => setPromptContent(event.target.value)}
                placeholder={t("prompts.prompt.contentPlaceholder")}
                className="h-40 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              />
            </div>
            {promptError && <p className="mt-2 text-xs text-red-500">{promptError}</p>}
            <div className="mt-5 flex gap-2">
              <button onClick={closePromptModal} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50">
                {t("prompts.common.cancel")}
              </button>
              <button
                onClick={() => void submitPrompt()}
                disabled={promptSaving}
                className="flex-1 rounded-lg bg-orange-500 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
              >
                {t("prompts.common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setDetailPrompt(null)}>
          <div className="w-[680px] max-w-[92vw] rounded-2xl bg-white p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">{detailPrompt.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span>{detailPrompt.category_name ?? t("prompts.prompt.uncategorized")}</span>
                  <span>{t("prompts.prompt.usage", { count: detailPrompt.usage_count })}</span>
                </div>
              </div>
              <button onClick={() => setDetailPrompt(null)} className="text-gray-400 hover:text-gray-600">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="mb-4 max-h-[400px] min-h-[240px] overflow-y-auto rounded-xl bg-gray-50 p-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{detailPrompt.content}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => void copyPrompt(detailPrompt)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                {copiedId === detailPrompt.id ? t("prompts.actions.copied") : t("prompts.actions.copy")}
              </button>
              <button
                onClick={() => navigate(`/writer?promptId=${encodeURIComponent(detailPrompt.id)}`)}
                className="flex-1 rounded-lg bg-orange-500 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
              >
                {t("prompts.actions.write")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptsPage;
