"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { ProjectsSection } from "@/components/ProjectsSection";
import {
  fetchCompany,
  saveProject,
  fetchProjects,
  deleteProject,
  clearAllProjects,
  uploadProjectsFile,
  optimizePortfolio,
} from "@/lib/api";
import { CompanyData, ProjectData, UserProfile } from "@/lib/types";
import { Wallet, Layers, PieChart, ArrowLeft, ArrowRight } from "lucide-react";

const DEFAULT_COMPANY_ID = "venture_company_01";

export default function ProjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState<CompanyData>({
    company_id: "",
    total_investment_budget: 2000000,
    min_cash_reserve: 200000,
    loan_facility: 0,
    discount_rate: 0.12,
    planning_period_years: 5,
    max_acceptable_risk: "Medium",
    contingency_pct: 0,
  });

  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const loadProjectsData = useCallback(async (compId: string) => {
    if (!compId) return;
    setIsLoading(true);
    try {
      const comp = await fetchCompany(compId).catch(() => null);
      if (comp) setCompany(comp);

      const projs = await fetchProjects(compId).catch(() => []);
      setProjects(Array.isArray(projs) ? projs : []);
    } catch (err) {
      console.warn("Error loading projects data:", err);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("venturelens_user");
      if (!saved) {
        router.push("/login");
        return;
      }
      try {
        const u = JSON.parse(saved);
        if (!u || !u.user_id) {
          localStorage.removeItem("venturelens_user");
          router.push("/login");
          return;
        }
        setUser(u);
        const compId = u.company_id || DEFAULT_COMPANY_ID;
        setCompany((prev) => ({ ...prev, company_id: compId }));
        loadProjectsData(compId);
      } catch (e) {
        localStorage.removeItem("venturelens_user");
        router.push("/login");
      }
    }
  }, [router, loadProjectsData]);

  const handleAddProject = async (pData: Partial<ProjectData>) => {
    const compId = user?.company_id || company.company_id;
    try {
      const saved = await saveProject({
        ...pData,
        company_id: compId,
      });
      const updated = await fetchProjects(compId);
      setProjects(Array.isArray(updated) ? updated : []);
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to save project.");
    }
  };

  const handleRemoveProject = async (projectId: string) => {
    const compId = user?.company_id || company.company_id;
    try {
      await deleteProject(compId, projectId);
      setProjects((prev) => prev.filter((p) => p.project_id !== projectId));
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to remove project.");
    }
  };

  const handleClearAllProjects = async () => {
    const compId = user?.company_id || company.company_id;
    try {
      await clearAllProjects(compId);
      setProjects([]);
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to clear candidate portfolio.");
    }
  };

  const handleLoadSpecDemo = async () => {
    const compId = user?.company_id || company.company_id;
    const specProjects: Array<Partial<ProjectData>> = [
      {
        name: "Solar installation",
        industry_category: "CleanTech",
        initial_cost: 800000,
        cash_flows: [300000, 300000, 300000, 300000, 300000],
        duration_years: 5,
        company_id: compId,
      },
      {
        name: "Energy efficient equipment",
        industry_category: "Energy",
        initial_cost: 400000,
        cash_flows: [180000, 180000, 180000, 180000, 180000],
        duration_years: 5,
        company_id: compId,
      },
      {
        name: "Software product",
        industry_category: "Software",
        initial_cost: 500000,
        cash_flows: [240000, 240000, 240000, 240000, 240000],
        duration_years: 5,
        company_id: compId,
      },
      {
        name: "Recycling unit",
        industry_category: "Environmental",
        initial_cost: 600000,
        cash_flows: [250000, 250000, 250000, 250000, 250000],
        duration_years: 5,
        company_id: compId,
      },
    ];

    try {
      await clearAllProjects(compId);
      for (const p of specProjects) {
        await saveProject(p);
      }
      const updated = await fetchProjects(compId);
      setProjects(Array.isArray(updated) ? updated : []);
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to load demo portfolio.");
    }
  };

  const handleUploadCSV = async (file: File) => {
    const compId = user?.company_id || company.company_id;
    try {
      await uploadProjectsFile(compId, file);
      const updated = await fetchProjects(compId);
      setProjects(Array.isArray(updated) ? updated : []);
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to upload CSV projects.");
    }
  };

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

      localStorage.setItem("venturelens_latest_result", JSON.stringify(res));
      router.push("/results");
    } catch (err: any) {
      setErrorBanner(
        `Optimization failed: ${err.message || "Failed to reach backend"}. Please verify connection and retry.`
      );
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("venturelens_user");
    localStorage.removeItem("venturelens_latest_result");
    setUser(null);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar user={user} onLogout={handleLogout} />

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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Step-by-Step Workflow Breadcrumb */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Link
              href="/budget"
              className="px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5 text-slate-400" />
              <span>Step 1: Budget & Constraints (Part A)</span>
            </Link>
            <span>→</span>
            <span className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1.5 shadow-sm">
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              <span>Step 2: Candidate Projects (Part B)</span>
            </span>
            <span>→</span>
            <Link
              href="/results"
              className="px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <PieChart className="w-3.5 h-3.5 text-slate-400" />
              <span>Step 3: Results</span>
            </Link>
          </div>

          <Link
            href="/budget"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Back to Budget (Part A)</span>
          </Link>
        </div>

        {/* Section B Component */}
        <ProjectsSection
          projects={projects}
          onAddProject={handleAddProject}
          onRemoveProject={handleRemoveProject}
          onClearAllProjects={handleClearAllProjects}
          onLoadSpecDemo={handleLoadSpecDemo}
          onUploadCSV={handleUploadCSV}
          onAnalyze={handleAnalyze}
          isAnalyzing={isOptimizing}
          availableBudget={company.total_investment_budget - company.min_cash_reserve}
        />
      </main>

      <footer className="bg-white border-t border-slate-200 mt-16 py-8 text-center text-xs text-slate-500">
        VentureLens AI — Multi-Project Capital Allocation · Part B: Candidate Projects
      </footer>
    </div>
  );
}
