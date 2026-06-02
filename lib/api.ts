export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  //"http://localhost:8000";
  "https://machine-backend-production.up.railway.app";

export const TOKEN_KEY = "element_elite_fleet_token";

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export type SummaryPoint = {
  name: string;
  value: number;
};

export type DashboardSummary = {
  total_reviews: number;
  high_churn_intent: number;
  likely_retention: number;
  by_category: SummaryPoint[];
  by_subcategory: SummaryPoint[];
  trend: SummaryPoint[];
};

export type Review = {
  id: number;
  year: number | null;
  quarter: string | null;
  date: string | null;
  month: string | null;
  source: string | null;
  external_id: string | null;
  comment: string | null;
  sentiment: string | null;
  category: string | null;
  subcategory: string | null;
  product: string | null;
  detail: string | null;
  original_classification: string | null;
  predicted_classification: string | null;
  prediction_confidence: number | null;
  employee_id: number | null;
  employee_name: string | null;
  employee_email: string | null;
  alert_sent: boolean;
  alert_sent_at: string | null;
  created_at: string;
};

export type ReviewsResponse = {
  items: Review[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  metrics: {
    total: number;
    abandonment: number;
    retention: number;
    alerts_sent: number;
  };
};

export type Employee = {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
};

export type CategoryOptions = {
  categories: string[];
  subcategories: string[];
  sentiments: string[];
  products: string[];
  classifications: string[];
  employees?: { id: number; name: string }[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers,
  });
  if (!response.ok) {
    let message = "Error de comunicacion con el backend";
    try {
      const body = await response.json();
      message =
        typeof body.detail === "string"
          ? body.detail
          : JSON.stringify(body.detail || body);
    } catch {
      message = await response.text();
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const api = {
  login: (payload: { email: string; password: string }) =>
    request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  me: () => request<Employee>("/auth/me"),
  registerEmployee: (payload: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) =>
    request<Employee>("/auth/register-employee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  employees: () => request<Employee[]>("/employees"),
  updateEmployee: (
    id: number,
    payload: { name?: string; email?: string; role?: string },
  ) =>
    request<Employee>(`/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  deleteEmployee: (id: number) =>
    request<{ message: string }>(`/employees/${id}`, {
      method: "DELETE",
    }),
  changePassword: (payload: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) =>
    request<{ message: string }>("/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  summary: () => request<DashboardSummary>("/dashboard-summary"),
  reviews: (query = "") => request<ReviewsResponse>(`/reviews${query}`),
  categories: () => request<CategoryOptions>("/categories"),
  predict: (payload: Record<string, string>) =>
    request<{
      predicted_classification: string;
      prediction_confidence: number | null;
      recommendation: string;
      alert_sent: boolean;
      alert_error: string | null;
    }>("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  uploadCsv: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{
      inserted: number;
      skipped: number;
      errors: number;
      error_details: string[];
      prediction_warnings: string[];
    }>("/upload-csv", {
      method: "POST",
      body: form,
    });
  },
};
