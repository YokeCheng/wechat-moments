import { requestAuthedJson } from "./auth";
import type { Pagination } from "./discover";

export type LayoutFontFamily = "sans" | "serif" | "round";
export type LayoutTitleAlign = "left" | "center";
export type LayoutDraftStatus = "draft" | "published";
export type AssetType = "cover_image" | "content_image";

export type LayoutPayload = {
  title: string;
  article_id?: string | null;
  cover_asset_id?: string | null;
  content_md: string;
  theme_id: string;
  theme_color: string;
  font_family: LayoutFontFamily;
  font_size: number;
  line_height: number;
  title_align: LayoutTitleAlign;
  para_indent: boolean;
  round_image: boolean;
};

export type LayoutRenderResponse = {
  html: string;
};

export type LayoutDraft = {
  id: string;
  article_id: string | null;
  title: string;
  cover_asset_id: string | null;
  content_md: string;
  content_html: string;
  theme_id: string;
  theme_color: string;
  font_family: LayoutFontFamily;
  font_size: number;
  line_height: number;
  title_align: LayoutTitleAlign;
  para_indent: boolean;
  round_image: boolean;
  status: LayoutDraftStatus;
  created_at: string;
  updated_at: string;
};

export type LayoutDraftList = {
  items: LayoutDraft[];
  pagination: Pagination;
};

export type Asset = {
  id: string;
  asset_type: AssetType;
  file_name: string;
  mime_type: string;
  size: number;
  public_url: string;
};

export async function renderLayout(payload: LayoutPayload) {
  return requestAuthedJson<LayoutRenderResponse>("/api/v1/layout/render", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createLayoutDraft(payload: LayoutPayload) {
  return requestAuthedJson<LayoutDraft>("/api/v1/layout/drafts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateLayoutDraft(draftId: string, payload: LayoutPayload) {
  return requestAuthedJson<LayoutDraft>(`/api/v1/layout/drafts/${draftId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchLayoutDraft(draftId: string) {
  return requestAuthedJson<LayoutDraft>(`/api/v1/layout/drafts/${draftId}`);
}

export async function fetchLayoutDrafts(params: { page?: number; page_size?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) {
    searchParams.set("page", String(params.page));
  }
  if (params.page_size !== undefined) {
    searchParams.set("page_size", String(params.page_size));
  }
  const queryString = searchParams.toString();
  return requestAuthedJson<LayoutDraftList>(
    `/api/v1/layout/drafts${queryString ? `?${queryString}` : ""}`,
  );
}

export async function uploadAsset(file: File, assetType: AssetType) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("asset_type", assetType);

  return requestAuthedJson<Asset>("/api/v1/assets", {
    method: "POST",
    body: formData,
  });
}
