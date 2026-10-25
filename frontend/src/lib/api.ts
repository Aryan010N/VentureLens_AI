import {
  CompanyData,
  ProjectData,
  ProjectFinancials,
  OptimizationResult,
  MLMetrics,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}

export async function fetchMetadata(): Promise<MLMetrics> {
  const res = await fetch(`${API_BASE}/api/metadata`);
  if (!res.ok) throw new Error("Failed to fetch ML metrics");
  return res.json();
}

export async function saveCompany(data: Partial<CompanyData>): Promise<CompanyData> {
  const res = await fetch(`${API_BASE}/api/company`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to save company" }));
    throw new Error(err.detail || "Failed to save company");
  }
  return res.json();
}

export async function fetchCompany(companyId: string): Promise<CompanyData> {
  const res = await fetch(`${API_BASE}/api/company/${companyId}`);
  if (!res.ok) throw new Error("Company not found");
  return res.json();
}

export async function saveProject(data: Partial<ProjectData>): Promise<ProjectData> {
  const res = await fetch(`${API_BASE}/api/project`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to save project" }));
    throw new Error(err.detail || "Failed to save project");
  }
  return res.json();
}

export async function fetchProjects(companyId: string): Promise<ProjectData[]> {
  const res = await fetch(`${API_BASE}/api/projects/${companyId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function uploadProjectsFile(
  companyId: string,
  file: File
): Promise<{ uploaded_count: number; projects: ProjectData[]; warnings?: string[] }> {
  const formData = new FormData();
  formData.append("company_id", companyId);
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/upload-projects`, {
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
  const res = await fetch(`${API_BASE}/api/analyze`, {
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
  }
): Promise<OptimizationResult> {
  const res = await fetch(`${API_BASE}/api/optimize`, {
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
  const res = await fetch(`${API_BASE}/api/runs/${companyId}`);
  if (!res.ok) return [];
  return res.json();
}
