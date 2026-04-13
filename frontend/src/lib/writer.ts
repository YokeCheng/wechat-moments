import { requestAuthedJson } from "./auth";
import type { Pagination } from "./discover";

export type WriterArticleStatus = "draft" | "generating" | "completed" | "failed";
export type GenerateTaskStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type WriterGroup = {
  id: string;
  name: string;
  article_count: number;
};

export type WriterGroupList = {
  items: WriterGroup[];
};

export type WriterArticle = {
  id: string;
  title: string;
  group_id: string | null;
  group_name: string | null;
  prompt_id: string | null;
  prompt_title: string | null;
  ref_url: string | null;
  image_count: number;
  word_count: number;
  status: WriterArticleStatus;
  content_md: string;
  created_at: string;
  updated_at: string;
};

export type WriterArticleList = {
  items: WriterArticle[];
  pagination: Pagination;
};

export type GenerateTask = {
  id: string;
  article_id: string;
  status: GenerateTaskStatus;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

export type WriterArticleQuery = {
  group_id?: string;
  keyword?: string;
  status?: WriterArticleStatus;
  page?: number;
  page_size?: number;
};

export type WriterGroupPayload = {
  name: string;
};

export type WriterArticlePayload = {
  title: string;
  group_id?: string | null;
  prompt_id?: string | null;
  ref_url?: string | null;
  image_count?: number;
  content_md?: string;
};

export type WriterArticleUpdatePayload = {
  title?: string;
  group_id?: string | null;
  prompt_id?: string | null;
  ref_url?: string | null;
  image_count?: number;
  status?: WriterArticleStatus;
  content_md?: string;
};

export type GenerateTaskPayload = {
  title: string;
  group_id?: string | null;
  prompt_id?: string | null;
  ref_url?: string | null;
  image_count?: number;
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

export async function fetchWriterGroups() {
  return requestAuthedJson<WriterGroupList>("/api/v1/writer/groups");
}

export async function createWriterGroup(payload: WriterGroupPayload) {
  return requestAuthedJson<WriterGroup>("/api/v1/writer/groups", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteWriterGroup(groupId: string) {
  return requestAuthedJson<{ message: string }>(`/api/v1/writer/groups/${groupId}`, {
    method: "DELETE",
  });
}

export async function fetchWriterArticles(query: WriterArticleQuery) {
  const queryString = buildQueryString({
    group_id: query.group_id,
    keyword: query.keyword,
    status: query.status,
    page: query.page,
    page_size: query.page_size,
  });
  return requestAuthedJson<WriterArticleList>(`/api/v1/writer/articles${queryString}`);
}

export async function createWriterArticle(payload: WriterArticlePayload) {
  return requestAuthedJson<WriterArticle>("/api/v1/writer/articles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchWriterArticle(articleId: string) {
  return requestAuthedJson<WriterArticle>(`/api/v1/writer/articles/${articleId}`);
}

export async function updateWriterArticle(articleId: string, payload: WriterArticleUpdatePayload) {
  return requestAuthedJson<WriterArticle>(`/api/v1/writer/articles/${articleId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteWriterArticle(articleId: string) {
  return requestAuthedJson<{ message: string }>(`/api/v1/writer/articles/${articleId}`, {
    method: "DELETE",
  });
}

export async function createGenerateTask(payload: GenerateTaskPayload) {
  return requestAuthedJson<GenerateTask>("/api/v1/writer/generate-tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchGenerateTask(taskId: string) {
  return requestAuthedJson<GenerateTask>(`/api/v1/writer/generate-tasks/${taskId}`);
}
