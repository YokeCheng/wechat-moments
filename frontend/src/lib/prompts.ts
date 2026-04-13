import { requestAuthedJson } from "./auth";
import type { Pagination } from "./discover";

export type PromptStatus = "draft" | "active" | "generating";

export type PromptCategoryItem = {
  id: string;
  name: string;
  count: number;
};

export type PromptCategoryList = {
  items: PromptCategoryItem[];
};

export type Prompt = {
  id: string;
  title: string;
  category_id: string | null;
  category_name: string | null;
  content: string;
  tags: string[];
  usage_count: number;
  status: PromptStatus;
  created_at: string;
};

export type PromptList = {
  items: Prompt[];
  pagination: Pagination;
};

export type PromptQuery = {
  category_id?: string;
  keyword?: string;
  status?: PromptStatus;
  page?: number;
  page_size?: number;
};

export type PromptCategoryPayload = {
  name: string;
};

export type PromptPayload = {
  title: string;
  category_id?: string | null;
  content: string;
  tags?: string[];
  status?: PromptStatus;
};

export type PromptUpdatePayload = {
  title?: string;
  category_id?: string | null;
  content?: string;
  tags?: string[];
  status?: PromptStatus;
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

export async function fetchPromptCategories() {
  return requestAuthedJson<PromptCategoryList>("/api/v1/prompt-categories");
}

export async function createPromptCategory(payload: PromptCategoryPayload) {
  return requestAuthedJson<PromptCategoryItem>("/api/v1/prompt-categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePromptCategory(categoryId: string, payload: PromptCategoryPayload) {
  return requestAuthedJson<PromptCategoryItem>(`/api/v1/prompt-categories/${categoryId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deletePromptCategory(categoryId: string) {
  return requestAuthedJson<{ message: string }>(`/api/v1/prompt-categories/${categoryId}`, {
    method: "DELETE",
  });
}

export async function fetchPrompts(query: PromptQuery) {
  const queryString = buildQueryString({
    category_id: query.category_id,
    keyword: query.keyword,
    status: query.status,
    page: query.page,
    page_size: query.page_size,
  });
  return requestAuthedJson<PromptList>(`/api/v1/prompts${queryString}`);
}

export async function createPrompt(payload: PromptPayload) {
  return requestAuthedJson<Prompt>("/api/v1/prompts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchPrompt(promptId: string) {
  return requestAuthedJson<Prompt>(`/api/v1/prompts/${promptId}`);
}

export async function updatePrompt(promptId: string, payload: PromptUpdatePayload) {
  return requestAuthedJson<Prompt>(`/api/v1/prompts/${promptId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deletePrompt(promptId: string) {
  return requestAuthedJson<{ message: string }>(`/api/v1/prompts/${promptId}`, {
    method: "DELETE",
  });
}
