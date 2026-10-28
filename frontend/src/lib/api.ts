import {
  CompanyData,
  ProjectData,
  ProjectFinancials,
  OptimizationResult,
  MLMetrics,
} from "./types";

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("venturelens_api_url");
    if (saved && saved.trim()) return saved.trim().replace(/\/+$/, "");
  }
  return (process.env.NEXT_PUBLIC_API_URL || "https://ffm-cie-2.onrender.com").replace(/\/+$/, "");
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== "undefined") {
    if (url && url.trim()) {
      localStorage.setItem("venturelens_api_url", url.trim().replace(/\/+$/, ""));
    } else {
      localStorage.removeItem("venturelens_api_url");
    }
  }
}

export async function fetchHealth(): Promise<{ status: string; service: string; database?: string }> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/health`, { method: "GET" });
  if (!res.ok) throw new Error(`Health check failed with status ${res.status}`);
  return res.json();
}

export async function fetchMetadata(): Promise<MLMetrics> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/metadata`, { method: "GET" });
  if (!res.ok) throw new Error("Failed to fetch ML metrics from backend");
  return res.json();
}

export async function saveCompany(data: Partial<CompanyData>): Promise<CompanyData> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/company`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to save company" }));
    throw new Error(err.detail || "Failed to save company in Firestore");
  }
  return res.json();
}

export async function fetchCompany(companyId: string): Promise<CompanyData> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/company/${companyId}`);
  if (!res.ok) throw new Error("Company not found in Firestore");
  return res.json();
}

export async function saveProject(data: Partial<ProjectData>): Promise<ProjectData> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/project`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to save project" }));
    throw new Error(err.detail || "Failed to save project in Firestore");
  }
  return res.json();
}

export async function fetchProjects(companyId: string): Promise<ProjectData[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/projects/${companyId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function deleteProject(companyId: string, projectId: string): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/project/${companyId}/${projectId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to delete project" }));
    throw new Error(err.detail || "Failed to delete project from Firestore");
  }
}

export async function uploadProjectsFile(
  companyId: string,
  file: File
): Promise<{ uploaded_count: number; projects: ProjectData[]; warnings?: string[] }> {
  const base = getApiBaseUrl();
  const formData = new FormData();
  formData.append("company_id", companyId);
  formData.append("file", file);

  const res = await fetch(`${base}/api/upload-projects`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "File upload failed" }));
    throw new Error(typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail));
  }
  return res.json();
}

export async function analyzeProjects(
  companyId: string
): Promise<{ company: CompanyData; projects: ProjectFinancials[] }> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company_id: companyId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Analysis failed" }));
    throw new Error(err.detail || "Failed to analyze projects");
  }
  return res.json();
}

export async function optimizePortfolio(
  companyId: string,
  overrides?: {
    override_budget?: number;
    override_max_risk?: string;
    override_discount_rate?: number;
    contingency_pct?: number;
  }
): Promise<OptimizationResult> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company_id: companyId, ...overrides }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Optimization failed" }));
    throw new Error(err.detail || "Optimization failed");
  }
  return res.json();
}

export async function fetchRunHistory(companyId: string): Promise<OptimizationResult[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/runs/${companyId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchTestMetrics(): Promise<import("./types").TestMetricsResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/test-metrics`);
  if (!res.ok) {
    throw new Error(`Failed to execute test suite: ${res.statusText}`);
  }
  return res.json();
}

export async function trainMLModels(): Promise<{ status: string; message: string; metrics: MLMetrics }> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/train-models`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Training ML models failed with status ${res.status}`);
  }
  return res.json();
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  company_name?: string;
}): Promise<import("./types").UserProfile & { token: string; message?: string }> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Registration failed" }));
    throw new Error(err.detail || "Registration failed");
  }
  return res.json();
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<import("./types").UserProfile & { token: string; message?: string }> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(err.detail || "Login failed");
  }
  return res.json();
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Password reset request failed" }));
    throw new Error(err.detail || "Password reset request failed");
  }
  return res.json();
}

export async function getCurrentUser(userId?: string): Promise<import("./types").UserProfile> {
  const base = getApiBaseUrl();
  const url = userId ? `${base}/api/auth/me?user_id=${encodeURIComponent(userId)}` : `${base}/api/auth/me`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch user profile");
  return res.json();
}
