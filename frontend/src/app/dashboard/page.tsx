"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SmartPlanner } from "@/components/SmartPlanner";
import {
  saveCompany,
  fetchCompany,
  saveProject,
  fetchProjects,
  deleteProject,
  clearAllProjects,
  uploadProjectsFile,
  optimizePortfolio,
  fetchRunHistory,
} from "@/lib/api";
import {
  CompanyData,
  ProjectData,
  OptimizationResult,
  UserProfile,
} from "@/lib/types";

const DEFAULT_COMPANY_ID = "venture_company_01";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<CompanyData>({
    company_id: DEFAULT_COMPANY_ID,
    total_investment_budget: 2000000,
    min_cash_reserve: 200000,
    loan_facility: 500000,
    discount_rate: 0.12,
    planning_period_years: 5,
    max_acceptable_risk: "Medium",
    contingency_pct: 0,
  });

  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Initialize User
  useEffect(() => {
    const saved = localStorage.getItem("venturelens_user");
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setUser(u);
        setCompany((prev) => ({ ...prev, company_id: u.company_id || DEFAULT_COMPANY_ID }));
      } catch (e) {}
    } else {
      const demoUser: UserProfile = {
        user_id: "user_demo_01",
        email: "demo@venturelens.ai",
        name: "Venture Investor",
        company_id: DEFAULT_COMPANY_ID,
      };
      setUser(demoUser);
    }
  }, []);

  const loadData = useCallback(async () => {
    const compId = user?.company_id || DEFAULT_COMPANY_ID;
    try {
      const comp = await fetchCompany(compId).catch(() => null);
      if (comp) setCompany(comp);

      const projs = await fetchProjects(compId).catch(() => []);
      if (projs && projs.length > 0) {
        setProjects(projs);
      }
    } catch (err) {
      console.warn("Error loading dashboard data:", err);
    }
  }, [user?.company_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Company parameter update
  const handleSaveCompany = async (updated: Partial<CompanyData>) => {
    const compId = user?.company_id || company.company_id;
    try {
      const saved = await saveCompany({
        ...company,
        ...updated,
        company_id: compId,
      });
      setCompany(saved);
    } catch (err: any) {
      console.error("Save company error:", err);
    }
  };

  // Add Project
  const handleAddProject = async (proj: Partial<ProjectData>) => {
    setErrorBanner(null);
    const compId = user?.company_id || company.company_id;
    try {
      const saved = await saveProject({
        ...proj,
        company_id: compId,
      });
      setProjects((prev) => {
        const existingIdx = prev.findIndex(
          (p) => p.project_id === saved.project_id || (proj.project_id && p.project_id === proj.project_id)
        );
        if (existingIdx >= 0) {
          const clone = [...prev];
          clone[existingIdx] = saved;
          return clone;
        }
        return [...prev, saved];
      });
    } catch (err: any) {
      setErrorBanner(`Failed to save project: ${err.message}`);
      throw err;
    }
  };

  // Remove single project
  const handleRemoveProject = async (projectId: string) => {
    setErrorBanner(null);
    const compId = user?.company_id || company.company_id;
    try {
      await deleteProject(compId, projectId);
      setProjects((prev) => prev.filter((p) => p.project_id !== projectId));
    } catch (err: any) {
      setErrorBanner(`Failed to delete project: ${err.message}`);
    }
  };

  // Clear all candidate projects
  const handleClearAllProjects = async () => {
    if (!confirm("Are you sure you want to clear all candidate projects?")) return;
    setErrorBanner(null);
    const compId = user?.company_id || company.company_id;
    try {
      await clearAllProjects(compId);
      setProjects([]);
    } catch (err: any) {
      setErrorBanner(`Failed to clear projects: ${err.message}`);
    }
  };

  // Upload CSV
  const handleUploadCSV = async (file: File) => {
    setErrorBanner(null);
    const compId = user?.company_id || company.company_id;
    try {
      const res = await uploadProjectsFile(compId, file);
      if (res.projects) {
        setProjects((prev) => [...prev, ...res.projects]);
      }
    } catch (err: any) {
      setErrorBanner(`CSV Upload failed: ${err.message}`);
    }
  };

  // Load Spec 4 Projects without duplicates
  const handleLoadSpecDemo = async () => {
    setErrorBanner(null);
    const compId = user?.company_id || DEFAULT_COMPANY_ID;
    try {
      // 1. Clear any duplicate projects
      await clearAllProjects(compId).catch(() => {});

      const demoCompany: CompanyData = {
        company_id: compId,
        total_investment_budget: 2000000,
        min_cash_reserve: 200000,
        loan_facility: 500000,
        discount_rate: 0.12,
        planning_period_years: 5,
        max_acceptable_risk: "Medium",
        contingency_pct: 0,
      };
      await saveCompany(demoCompany);
      setCompany(demoCompany);

      const specProjects: Partial<ProjectData>[] = [
        {
          project_id: "proj_solar",
          name: "Solar installation",
          initial_cost: 800000,
          cash_flows: [300000, 300000, 300000, 300000, 300000],
          duration_years: 5,
          risk_category: "Medium",
          industry_category: "CleanTech",
        },
        {
          project_id: "proj_recycling",
          name: "Recycling unit",
          initial_cost: 600000,
          cash_flows: [250000, 250000, 250000, 250000, 250000],
          duration_years: 5,
          risk_category: "Medium",
          industry_category: "Environmental",
        },
        {
          project_id: "proj_software",
          name: "Software product",
          initial_cost: 500000,
          cash_flows: [240000, 240000, 240000, 240000, 240000],
          duration_years: 5,
          risk_category: "High",
          industry_category: "Software",
        },
        {
          project_id: "proj_energy",
          name: "Energy-efficient equipment",
          initial_cost: 400000,
          cash_flows: [180000, 180000, 180000, 180000, 180000],
          duration_years: 5,
          risk_category: "Low",
          industry_category: "Energy",
        },
      ];

      const savedList: ProjectData[] = [];
      for (const p of specProjects) {
        const saved = await saveProject({ ...p, company_id: compId });
        savedList.push(saved);
      }
      setProjects(savedList);
    } catch (err: any) {
      setErrorBanner(`Failed to load spec demo: ${err.message}`);
    }
  };

  // Run Optimization & Route to /results
  const handleAnalyze = async () => {
    setIsOptimizing(true);
    setErrorBanner(null);
    const compId = user?.company_id || company.company_id;
    try {
      const res = await optimizePortfolio(compId, {
        override_budget: company.total_investment_budget,
        override_max_risk: company.max_acceptable_risk,
        override_discount_rate: company.discount_rate,
        contingency_pct: company.contingency_pct,
      });

      // Save latest result in localStorage for /results page
      localStorage.setItem("venturelens_latest_result", JSON.stringify(res));

      // Redirect directly to dedicated /results page
      router.push("/results");
    } catch (err: any) {
      setErrorBanner(
        `Optimization failed: ${err.message || "Failed to reach backend"}. Please verify connection and retry.`
      );
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar user={user} />

      {errorBanner && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between shadow-sm">
            <span>{errorBanner}</span>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-slate-500 hover:text-slate-900 font-bold ml-4"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SmartPlanner
          company={company}
          setCompany={setCompany}
          projects={projects}
          onAddProject={handleAddProject}
          onRemoveProject={handleRemoveProject}
          onClearAllProjects={handleClearAllProjects}
          onLoadSpecDemo={handleLoadSpecDemo}
          onUploadCSV={handleUploadCSV}
          onAnalyze={handleAnalyze}
          isAnalyzing={isOptimizing}
          onSaveCompany={handleSaveCompany}
        />
      </main>

      <footer className="bg-white border-t border-slate-200 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-bold text-slate-700">VentureLens AI</span> — Multi-Project Capital Allocation
          </div>
          <div className="flex items-center gap-4">
            <span>FFM CIE-2</span>
            <span>•</span>
            <a href="https://github.com/Aryan010N/VentureLens_AI" target="_blank" rel="noreferrer" className="hover:underline">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

