import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/lib/auth";
import { fetchPrompts, type Prompt } from "@/lib/prompts";
import {
  createGenerateTask,
  createWriterGroup,
  deleteWriterArticle,
  deleteWriterGroup,
  fetchGenerateTask,
  fetchWriterArticle,
  fetchWriterArticles,
  fetchWriterGroups,
  updateWriterArticle,
  type WriterArticle,
  type WriterArticleStatus,
  type WriterGroup,
} from "@/lib/writer";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const ALL_GROUP_ID = "__all__";

type GenerateFormState = {
  title: string;
  group_id: string;
  prompt_id: string;
  ref_url: string;
  image_count: number;
};

function buildEmptyGenerateForm(): GenerateFormState {
  return {
    title: "",
    group_id: "",
    prompt_id: "",
    ref_url: "",
    image_count: 3,
  };
}

function formatWriterDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language.startsWith("en") ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function resolveApiMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

const WriterPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [groups, setGroups] = useState<WriterGroup[]>([]);
  const [promptOptions, setPromptOptions] = useState<Prompt[]>([]);
  const [articles, setArticles] = useState<WriterArticle[]>([]);
  const [articleTotal, setArticleTotal] = useState(0);
  const [allArticleTotal, setAllArticleTotal] = useState(0);
  const [activeGroupId, setActiveGroupId] = useState(ALL_GROUP_ID);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState<GenerateFormState>(buildEmptyGenerateForm);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<WriterArticle | null>(null);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);
  const [prefillApplied, setPrefillApplied] = useState(false);

  const language = i18n.resolvedLanguage || i18n.language || "zh";

  const statusMap = useMemo(
    () => ({
      completed: {
        label: t("writer.status.completed"),
        color: "text-green-600",
        bg: "bg-green-50",
        icon: "ri-checkbox-circle-line",
      },
      generating: {
        label: t("writer.status.generating"),
        color: "text-orange-500",
        bg: "bg-orange-50",
        icon: "ri-loader-4-line",
      },
      failed: {
        label: t("writer.status.failed"),
        color: "text-red-500",
        bg: "bg-red-50",
        icon: "ri-error-warning-line",
      },
      draft: {
        label: t("writer.status.draft"),
        color: "text-gray-500",
        bg: "bg-gray-100",
        icon: "ri-file-edit-line",
      },
    }),
    [t],
  );

  const currentGroupName =
    activeGroupId === ALL_GROUP_ID
      ? t("writer.sidebar.all")
      : groups.find((group) => group.id === activeGroupId)?.name ?? t("writer.sidebar.all");

  const totalPages = Math.max(1, Math.ceil(articleTotal / pageSize));

  async function loadAllArticleTotal() {
    try {
      const response = await fetchWriterArticles({ page: 1, page_size: 1 });
      setAllArticleTotal(response.pagination.total);
    } catch {
      // Keep the previous total if the background refresh fails.
    }
  }

  async function loadGroups() {
    try {
      setLoadingGroups(true);
      const response = await fetchWriterGroups();
      setGroups(response.items);
    } finally {
      setLoadingGroups(false);
    }
  }

  async function loadPromptOptions() {
    const response = await fetchPrompts({ page: 1, page_size: 100 });
    setPromptOptions(response.items);
  }

  async function loadArticles() {
    try {
      setLoadingArticles(true);
      setErrorMessage("");
      const response = await fetchWriterArticles({
        group_id: activeGroupId === ALL_GROUP_ID ? undefined : activeGroupId,
        keyword: searchText || undefined,
        page,
        page_size: pageSize,
      });
      setArticles(response.items);
      setArticleTotal(response.pagination.total);
    } catch (error) {
      setArticles([]);
      setArticleTotal(0);
      setErrorMessage(resolveApiMessage(error, t("writer.messages.requestFailed")));
    } finally {
      setLoadingArticles(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        await Promise.all([loadGroups(), loadPromptOptions(), loadAllArticleTotal()]);
      } catch (error) {
        setErrorMessage(resolveApiMessage(error, t("writer.messages.requestFailed")));
      }
    })();
  }, [t]);

  useEffect(() => {
    void loadArticles();
  }, [activeGroupId, searchText, page, pageSize, t]);

  useEffect(() => {
    if (prefillApplied) {
      return;
    }

    const title = searchParams.get("title") ?? "";
    const promptId = searchParams.get("promptId") ?? "";
    const refUrl = searchParams.get("ref") ?? "";
    if (!title && !promptId && !refUrl) {
      setPrefillApplied(true);
      return;
    }

    setGenerateForm({
      title,
      prompt_id: promptId,
      ref_url: refUrl,
      group_id: "",
      image_count: 3,
    });
    setShowGenerateModal(true);
    setPrefillApplied(true);
  }, [prefillApplied, searchParams]);

  async function handleCreateGroup() {
    const trimmedName = newGroupName.trim();
    if (!trimmedName) {
      setNotice(t("writer.messages.groupNameRequired"));
      return;
    }

    try {
      setSubmitting(true);
      await createWriterGroup({ name: trimmedName });
      setNewGroupName("");
      setShowAddGroupModal(false);
      setNotice(t("writer.messages.groupCreated"));
      await Promise.all([loadGroups(), loadAllArticleTotal()]);
    } catch (error) {
      setNotice(resolveApiMessage(error, t("writer.messages.requestFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteGroup(groupId: string) {
    try {
      setSubmitting(true);
      await deleteWriterGroup(groupId);
      if (activeGroupId === groupId) {
        setActiveGroupId(ALL_GROUP_ID);
        setPage(1);
      }
      setNotice(t("writer.messages.groupDeleted"));
      await Promise.all([loadGroups(), loadAllArticleTotal(), loadArticles()]);
    } catch (error) {
      setNotice(resolveApiMessage(error, t("writer.messages.requestFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  async function pollTask(taskId: string) {
    for (let index = 0; index < 30; index += 1) {
      try {
        const task = await fetchGenerateTask(taskId);
        if (task.status === "succeeded" || task.status === "failed" || task.status === "cancelled") {
          await Promise.all([loadArticles(), loadAllArticleTotal()]);
          if (task.status === "succeeded") {
            setNotice(t("writer.messages.generateSucceeded"));
          } else {
            setNotice(task.error_message || t("writer.messages.generateFailed"));
          }
          return;
        }
      } catch (error) {
        setNotice(resolveApiMessage(error, t("writer.messages.requestFailed")));
        return;
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, 500);
      });
    }

    await loadArticles();
  }

  async function handleGenerate() {
    if (!generateForm.title.trim()) {
      setNotice(t("writer.messages.titleRequired"));
      return;
    }

    try {
      setSubmitting(true);
      const task = await createGenerateTask({
        title: generateForm.title.trim(),
        group_id: generateForm.group_id || null,
        prompt_id: generateForm.prompt_id || null,
        ref_url: generateForm.ref_url || null,
        image_count: generateForm.image_count,
      });
      setShowGenerateModal(false);
      setGenerateForm(buildEmptyGenerateForm());
      setPage(1);
      setNotice(t("writer.messages.generateQueued"));
      await Promise.all([loadArticles(), loadAllArticleTotal()]);
      void pollTask(task.id);
    } catch (error) {
      setNotice(resolveApiMessage(error, t("writer.messages.requestFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdit() {
    if (!editingArticle) {
      return;
    }

    try {
      setSubmitting(true);
      await updateWriterArticle(editingArticle.id, {
        title: editingArticle.title,
        group_id: editingArticle.group_id,
        prompt_id: editingArticle.prompt_id,
        ref_url: editingArticle.ref_url,
        image_count: editingArticle.image_count,
        status: editingArticle.status,
      });
      setShowEditModal(false);
      setEditingArticle(null);
      setNotice(t("writer.messages.articleUpdated"));
      await Promise.all([loadArticles(), loadAllArticleTotal()]);
    } catch (error) {
      setNotice(resolveApiMessage(error, t("writer.messages.requestFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteArticle() {
    if (!deletingArticleId) {
      return;
    }

    try {
      setSubmitting(true);
      await deleteWriterArticle(deletingArticleId);
      setDeletingArticleId(null);
      setNotice(t("writer.messages.articleDeleted"));
      if (articles.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await Promise.all([loadArticles(), loadAllArticleTotal()]);
      }
    } catch (error) {
      setNotice(resolveApiMessage(error, t("writer.messages.requestFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoLayout(articleId: string) {
    try {
      const article = await fetchWriterArticle(articleId);
      if (article.status !== "completed") {
        setNotice(t("writer.messages.layoutOnlyCompleted"));
        return;
      }
      navigate(`/layout?articleId=${encodeURIComponent(article.id)}`);
    } catch (error) {
      setNotice(resolveApiMessage(error, t("writer.messages.requestFailed")));
    }
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#F7F8FA]">
      <div className="w-56 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-800">{t("writer.sidebar.title")}</span>
            <button
              onClick={() => setShowAddGroupModal(true)}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors cursor-pointer"
              title={t("writer.sidebar.newGroup")}
            >
              <i className="ri-add-line text-sm" />
            </button>
          </div>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          <button
            type="button"
            className={`w-full flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
              activeGroupId === ALL_GROUP_ID ? "bg-orange-50 border-r-2 border-orange-500" : "hover:bg-gray-50"
            }`}
            onClick={() => {
              setActiveGroupId(ALL_GROUP_ID);
              setPage(1);
            }}
          >
            <span className={`text-sm ${activeGroupId === ALL_GROUP_ID ? "text-orange-500 font-semibold" : "text-gray-600"}`}>
              {t("writer.sidebar.all")}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeGroupId === ALL_GROUP_ID ? "bg-orange-100 text-orange-500" : "bg-gray-100 text-gray-400"}`}>
              {allArticleTotal}
            </span>
          </button>

          {loadingGroups ? (
            <div className="px-4 py-6 text-xs text-gray-400">{t("writer.states.loadingGroups")}</div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                className={`group flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                  activeGroupId === group.id ? "bg-orange-50 border-r-2 border-orange-500" : "hover:bg-gray-50"
                }`}
                onClick={() => {
                  setActiveGroupId(group.id);
                  setPage(1);
                }}
              >
                <span className={`text-sm truncate ${activeGroupId === group.id ? "text-orange-500 font-semibold" : "text-gray-600"}`}>
                  {group.name}
                </span>
                <div className="flex items-center gap-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeGroupId === group.id ? "bg-orange-100 text-orange-500" : "bg-gray-100 text-gray-400"}`}>
                    {group.article_count}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDeleteGroup(group.id);
                    }}
                    className="hidden group-hover:flex w-5 h-5 items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    title={t("writer.actions.deleteGroup")}
                  >
                    <i className="ri-delete-bin-line text-xs" />
                  </button>
                </div>
              </div>
            ))
          )}
        </nav>

        <div className="px-4 py-3 border-t border-gray-50">
          <button
            onClick={() => setShowAddGroupModal(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400 hover:text-orange-500 hover:border-orange-300 hover:bg-orange-50/30 transition-all cursor-pointer"
          >
            <i className="ri-add-line text-xs" />
            {t("writer.sidebar.newGroup")}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <div>
            <div className="text-sm font-bold text-gray-800">{currentGroupName}</div>
            <div className="text-xs text-gray-400 mt-0.5">{t("writer.toolbar.summary", { count: articleTotal })}</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white w-64">
              <i className="ri-search-line text-gray-400 text-sm" />
              <input
                type="text"
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                  setPage(1);
                }}
                placeholder={t("writer.toolbar.searchPlaceholder")}
                className="flex-1 text-sm text-gray-600 placeholder-gray-300 outline-none bg-transparent"
              />
            </label>

            <label className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white">
              <span className="text-xs text-gray-400">{t("writer.toolbar.pageSize")}</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="bg-transparent outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors cursor-pointer"
            >
              <i className="ri-magic-line text-sm" />
              {t("writer.toolbar.generate")}
            </button>
          </div>
        </div>

        {notice ? (
          <div className="px-6 py-3 text-sm text-orange-600 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} className="text-orange-400 hover:text-orange-600">
              <i className="ri-close-line" />
            </button>
          </div>
        ) : null}

        <div className="flex-1 px-6 py-4 flex flex-col min-h-0 overflow-hidden">
          <div className="flex flex-col h-full bg-white rounded-xl border border-gray-100 overflow-hidden">
            {loadingArticles ? (
              <div className="flex flex-col items-center justify-center py-16 text-center flex-1">
                <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-orange-50 mb-3">
                  <i className="ri-loader-4-line text-2xl text-orange-400 animate-spin" />
                </div>
                <p className="text-sm text-gray-500">{t("writer.states.loadingArticles")}</p>
              </div>
            ) : errorMessage ? (
              <div className="flex flex-col items-center justify-center py-16 text-center flex-1">
                <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-50 mb-3">
                  <i className="ri-error-warning-line text-2xl text-red-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">{t("writer.states.errorTitle")}</p>
                <p className="text-xs text-gray-400 mt-1">{errorMessage}</p>
                <button
                  onClick={() => void loadArticles()}
                  className="mt-4 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm hover:bg-orange-600 transition-colors"
                >
                  {t("writer.common.retry")}
                </button>
              </div>
            ) : articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center flex-1">
                <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 mb-3">
                  <i className="ri-file-text-line text-2xl text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-600">{t("writer.states.emptyTitle")}</p>
                <p className="text-xs text-gray-400 mt-1">{t("writer.states.emptySubtitle")}</p>
              </div>
            ) : (
              <>
                <table className="w-full flex-shrink-0">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-400 font-medium">
                      <th className="text-left px-5 py-3 w-[30%]">{t("writer.columns.title")}</th>
                      <th className="text-left px-5 py-3 w-[12%]">{t("writer.columns.group")}</th>
                      <th className="text-left px-5 py-3 w-[18%]">{t("writer.columns.prompt")}</th>
                      <th className="text-left px-5 py-3 w-[12%]">{t("writer.columns.status")}</th>
                      <th className="text-left px-5 py-3 w-[8%]">{t("writer.columns.words")}</th>
                      <th className="text-left px-5 py-3 w-[12%]">{t("writer.columns.updatedAt")}</th>
                      <th className="text-center px-5 py-3 w-[120px]">{t("writer.columns.actions")}</th>
                    </tr>
                  </thead>
                </table>

                <div className="flex-1 overflow-y-auto min-h-0">
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-50">
                      {articles.map((article) => {
                        const status = statusMap[article.status as WriterArticleStatus];
                        const canGoLayout = article.status === "completed";
                        return (
                          <tr key={article.id} className="hover:bg-orange-50/30 transition-colors">
                            <td className="px-5 py-3 w-[30%]">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{article.title}</p>
                                {article.ref_url ? (
                                  <a
                                    href={article.ref_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-orange-500 hover:text-orange-600 truncate inline-flex items-center gap-1 mt-1"
                                  >
                                    <i className="ri-link text-xs" />
                                    {t("writer.actions.reference")}
                                  </a>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-5 py-3 w-[12%]">
                              <span className="text-xs text-gray-600">{article.group_name || t("writer.values.ungrouped")}</span>
                            </td>
                            <td className="px-5 py-3 w-[18%]">
                              <span className="text-xs text-gray-600">{article.prompt_title || t("writer.values.noPrompt")}</span>
                            </td>
                            <td className="px-5 py-3 w-[12%]">
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${status.bg} ${status.color}`}>
                                <i className={`${status.icon} ${article.status === "generating" ? "animate-spin" : ""}`} />
                                {status.label}
                              </span>
                            </td>
                            <td className="px-5 py-3 w-[8%] text-xs text-gray-500">{article.word_count}</td>
                            <td className="px-5 py-3 w-[12%] text-xs text-gray-400">{formatWriterDate(article.updated_at, language)}</td>
                            <td className="px-5 py-3 w-[120px]">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingArticle(article);
                                    setShowEditModal(true);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                  title={t("writer.actions.edit")}
                                >
                                  <i className="ri-edit-line text-sm" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleGoLayout(article.id)}
                                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                                    canGoLayout ? "text-gray-400 hover:text-orange-500 hover:bg-orange-50" : "text-gray-200 cursor-not-allowed"
                                  }`}
                                  title={canGoLayout ? t("writer.actions.layout") : t("writer.messages.layoutOnlyCompleted")}
                                >
                                  <i className="ri-layout-line text-sm" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingArticleId(article.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  title={t("writer.actions.delete")}
                                >
                                  <i className="ri-delete-bin-line text-sm" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>{t("writer.pagination.summary", { currentPage: page, totalPages, totalItems: articleTotal })}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="px-3 py-2 rounded-lg border border-gray-200 disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                {t("writer.pagination.previous")}
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => (current < totalPages ? current + 1 : current))}
                disabled={page >= totalPages}
                className="px-3 py-2 rounded-lg border border-gray-200 disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                {t("writer.pagination.next")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAddGroupModal ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowAddGroupModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-[360px] max-w-[90vw]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{t("writer.modal.newGroupTitle")}</h3>
              <button onClick={() => setShowAddGroupModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{t("writer.modal.groupNameLabel")}</label>
            <input
              type="text"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder={t("writer.modal.groupNamePlaceholder")}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleCreateGroup();
                }
              }}
            />
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAddGroupModal(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                {t("writer.common.cancel")}
              </button>
              <button
                onClick={() => void handleCreateGroup()}
                disabled={submitting}
                className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60"
              >
                {t("writer.actions.create")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showGenerateModal ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowGenerateModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-[520px] max-w-[92vw]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{t("writer.modal.generateTitle")}</h3>
              <button onClick={() => setShowGenerateModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{t("writer.modal.articleTitleLabel")}</label>
                <input
                  type="text"
                  value={generateForm.title}
                  onChange={(event) => setGenerateForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder={t("writer.modal.articleTitlePlaceholder")}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{t("writer.modal.groupLabel")}</label>
                <select
                  value={generateForm.group_id}
                  onChange={(event) => setGenerateForm((current) => ({ ...current, group_id: event.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors bg-white"
                >
                  <option value="">{t("writer.values.ungrouped")}</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{t("writer.modal.promptLabel")}</label>
                <select
                  value={generateForm.prompt_id}
                  onChange={(event) => setGenerateForm((current) => ({ ...current, prompt_id: event.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors bg-white"
                >
                  <option value="">{t("writer.values.noPrompt")}</option>
                  {promptOptions.map((prompt) => (
                    <option key={prompt.id} value={prompt.id}>
                      {prompt.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{t("writer.modal.referenceLabel")}</label>
                <input
                  type="text"
                  value={generateForm.ref_url}
                  onChange={(event) => setGenerateForm((current) => ({ ...current, ref_url: event.target.value }))}
                  placeholder={t("writer.modal.referencePlaceholder")}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700">{t("writer.modal.imageCountLabel")}</label>
                  <span className="text-xs text-orange-500 font-medium">{generateForm.image_count}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={generateForm.image_count}
                  onChange={(event) => setGenerateForm((current) => ({ ...current, image_count: Number(event.target.value) }))}
                  className="w-full accent-orange-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowGenerateModal(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                {t("writer.common.cancel")}
              </button>
              <button
                onClick={() => void handleGenerate()}
                disabled={submitting}
                className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60"
              >
                {t("writer.actions.generate")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showEditModal && editingArticle ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-[520px] max-w-[92vw]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{t("writer.modal.editArticleTitle")}</h3>
              <button onClick={() => setShowEditModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{t("writer.modal.articleTitleLabel")}</label>
                <input
                  type="text"
                  value={editingArticle.title}
                  onChange={(event) => setEditingArticle({ ...editingArticle, title: event.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{t("writer.modal.groupLabel")}</label>
                <select
                  value={editingArticle.group_id ?? ""}
                  onChange={(event) => {
                    const group = groups.find((item) => item.id === event.target.value);
                    setEditingArticle({
                      ...editingArticle,
                      group_id: event.target.value || null,
                      group_name: group?.name ?? null,
                    });
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors bg-white"
                >
                  <option value="">{t("writer.values.ungrouped")}</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{t("writer.modal.promptLabel")}</label>
                <select
                  value={editingArticle.prompt_id ?? ""}
                  onChange={(event) => {
                    const prompt = promptOptions.find((item) => item.id === event.target.value);
                    setEditingArticle({
                      ...editingArticle,
                      prompt_id: event.target.value || null,
                      prompt_title: prompt?.title ?? null,
                    });
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors bg-white"
                >
                  <option value="">{t("writer.values.noPrompt")}</option>
                  {promptOptions.map((prompt) => (
                    <option key={prompt.id} value={prompt.id}>
                      {prompt.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{t("writer.modal.statusLabel")}</label>
                <select
                  value={editingArticle.status}
                  onChange={(event) =>
                    setEditingArticle({
                      ...editingArticle,
                      status: event.target.value as WriterArticleStatus,
                    })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors bg-white"
                >
                  {(["draft", "generating", "completed", "failed"] as WriterArticleStatus[]).map((statusKey) => (
                    <option key={statusKey} value={statusKey}>
                      {statusMap[statusKey].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{t("writer.modal.referenceLabel")}</label>
                <input
                  type="text"
                  value={editingArticle.ref_url ?? ""}
                  onChange={(event) => setEditingArticle({ ...editingArticle, ref_url: event.target.value || null })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700">{t("writer.modal.imageCountLabel")}</label>
                  <span className="text-xs text-orange-500 font-medium">{editingArticle.image_count}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={editingArticle.image_count}
                  onChange={(event) => setEditingArticle({ ...editingArticle, image_count: Number(event.target.value) })}
                  className="w-full accent-orange-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                {t("writer.common.cancel")}
              </button>
              <button
                onClick={() => void handleSaveEdit()}
                disabled={submitting}
                className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60"
              >
                {t("writer.common.save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deletingArticleId ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setDeletingArticleId(null)}>
          <div className="bg-white rounded-2xl w-80 p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-50 mx-auto mb-4">
              <i className="ri-delete-bin-line text-red-500 text-xl" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">{t("writer.modal.deleteTitle")}</h3>
            <p className="text-sm text-gray-500 text-center mb-5">{t("writer.modal.deleteSubtitle")}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingArticleId(null)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
                {t("writer.common.cancel")}
              </button>
              <button
                onClick={() => void handleDeleteArticle()}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60"
              >
                {t("writer.actions.delete")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WriterPage;
