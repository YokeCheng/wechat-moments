export type UsageSummary = {
  generate_daily_used: number;
  generate_daily_limit: number;
  prompt_count: number;
  channel_count: number;
  export_monthly_used: number;
  export_monthly_limit: number;
};

export type CurrentUser = {
  id: string;
  username: string;
  display_name: string;
  plan_code: "free" | "basic" | "pro" | "enterprise";
  usage: UsageSummary;
};

type DevLoginResponse = {
  token: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    plan_code: CurrentUser["plan_code"];
  };
};

const TOKEN_STORAGE_KEY = "wm_dev_token";
const DEV_USERNAME = "creator";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getApiBaseUrl() {
  if (import.meta.env.DEV) {
    return window.location.origin.replace(/\/$/, "");
  }
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw && raw.trim()) {
    return raw.replace(/\/$/, "");
  }
  return window.location.origin.replace(/\/$/, "");
}

export function clearDevToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function requestJson<T>(path: string, init: RequestInit = {}) {
  const isFormDataBody = typeof FormData !== "undefined" && init.body instanceof FormData;
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detail = `request failed with status ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.detail) {
        detail = payload.detail;
      }
    } catch {
      // Keep the HTTP-derived detail.
    }
    throw new ApiError(response.status, detail);
  }

  return (await response.json()) as T;
}

export async function ensureDevToken() {
  const existing = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const payload = await requestJson<DevLoginResponse>("/api/v1/auth/dev-login", {
    method: "POST",
    body: JSON.stringify({ username: DEV_USERNAME }),
  });
  window.localStorage.setItem(TOKEN_STORAGE_KEY, payload.token);
  return payload.token;
}

export async function fetchCurrentUser(token: string) {
  return requestJson<CurrentUser>("/api/v1/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function requestAuthedJson<T>(path: string, init: RequestInit = {}) {
  let token = await ensureDevToken();
  try {
    return await requestJson<T>(path, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }

    clearDevToken();
    token = await ensureDevToken();
    return requestJson<T>(path, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

export async function resolveCurrentUser() {
  return requestAuthedJson<CurrentUser>("/api/v1/me");
}
