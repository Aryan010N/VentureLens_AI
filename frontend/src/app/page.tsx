"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { AuthModal } from "@/components/AuthModal";
import { SmartPlanner } from "@/components/SmartPlanner";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { ProjectFullAnalysisModal } from "@/components/ProjectFullAnalysisModal";
import { AnalysisHistorySection } from "@/components/AnalysisHistorySection";
import { AccountSection } from "@/components/AccountSection";
import {
  saveCompany,
  fetchCompany,
  saveProject,
  fetchProjects,
  deleteProject,
  uploadProjectsFile,
  optimizePortfolio,
  fetchRunHistory,
  fetchHealth,
} from "@/lib/api";
import {
  CompanyData,
  ProjectData,
  OptimizationResult,
  AllocationItem,
  UserProfile,
} from "@/lib/types";

const DEFAULT_COMPANY_ID = "venture_company_01";

export default function Home() {
  // Navigation & User State
  const [activeTab, setActiveTab] = useState<"planner" | "history" | "account">("planner");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);

  // Financial Planner State
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
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [runHistory, setRunHistory] = useState<OptimizationResult[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Full Analysis Modal State
  const [selectedAnalysisProject, setSelectedAnalysisProject] = useState<AllocationItem | null>(null);

  // Load User & Data on Mount
  useEffect(() => {
    // Check saved user session
    const savedUser = localStorage.getItem("venturelens_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.warn("Could not parse saved user:", e);
      }
    } else {
      // Set default demo investor session for smooth onboarding
      const demoUser: UserProfile = {
        user_id: "user_demo_01",
        email: "demo@venturelens.ai",
        name: "Venture Investor",
        company_id: DEFAULT_COMPANY_ID,
      };
      setUser(demoUser);
    }

    // Health check
    fetchHealth()
      .then(() => setBackendHealthy(true))
      .catch(() => setBackendHealthy(false));
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

      const runs = await fetchRunHistory(compId).catch(() => []);
      if (runs && runs.length > 0) {
        setRunHistory(runs);
        setOptimizationResult(runs[0]);
      } else if (!projs || projs.length === 0) {
        // Auto-load spec demo so initial page is fully populated
        handleLoadSpecDemo();
      }
    } catch (err) {
      console.warn("Error loading data:", err);
    }
  }, [user?.company_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auth Handlers
  const handleAuthSuccess = (u: UserProfile) => {
    setUser(u);
    localStorage.setItem("venturelens_user", JSON.stringify(u));
    setCompany((prev) => ({ ...prev, company_id: u.company_id }));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("venturelens_user");
  };

  // Company Parameter Save
  const handleSaveCompany = async (updated: Partial<CompanyData>) => {
    try {
      const saved = await saveCompany({
        ...company,
        ...updated,
        company_id: user?.company_id || company.company_id,
      });
      setCompany(saved);
    } catch (err: any) {
      console.error("Save company error:", err);
    }
  };

  // Project Add / Edit
  const handleAddProject = async (proj: Partial<ProjectData>) => {
    setErrorBanner(null);
    try {
      const saved = await saveProject({
        ...proj,
        company_id: user?.company_id || company.company_id,
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

  // Project Removal
  const handleRemoveProject = async (projectId: string) => {
    setErrorBanner(null);
    try {
      await deleteProject(user?.company_id || company.company_id, projectId);
      setProjects((prev) => prev.filter((p) => p.project_id !== projectId));
    } catch (err: any) {
      setErrorBanner(`Failed to delete project: ${err.message}`);
    }
  };

  // CSV Upload
  const handleUploadCSV = async (file: File) => {
    setErrorBanner(null);
    try {
      const res = await uploadProjectsFile(user?.company_id || company.company_id, file);
      if (res.projects) {
        setProjects((prev) => [...prev, ...res.projects]);
      }
    } catch (err: any) {
      setErrorBanner(`CSV Upload failed: ${err.message}`);
    }
  };

  // Load Spec Worked Example
  const handleLoadSpecDemo = async () => {
    setErrorBanner(null);
    const compId = user?.company_id || DEFAULT_COMPANY_ID;
    try {
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
          name: "Solar installation",
          initial_cost: 800000,
          cash_flows: [300000, 300000, 300000, 300000, 300000],
          duration_years: 5,
          risk_category: "Medium",
          industry_category: "CleanTech",
        },
        {
          name: "Recycling unit",
          initial_cost: 600000,
          cash_flows: [250000, 250000, 250000, 250000, 250000],
          duration_years: 5,
          risk_category: "Medium",
          industry_category: "Environmental",
        },
        {
          name: "Software product",
          initial_cost: 500000,
          cash_flows: [240000, 240000, 240000, 240000, 240000],
          duration_years: 5,
          risk_category: "High",
          industry_category: "Software",
        },
        {
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

      // Execute Optimization automatically
      const opt = await optimizePortfolio(compId);
      setOptimizationResult(opt);

      const runs = await fetchRunHistory(compId);
      setRunHistory(runs);
    } catch (err: any) {
      console.warn("Error running spec demo setup:", err);
    }
  };

  // Run Real PuLP Optimization
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
      setOptimizationResult(res);

      const runs = await fetchRunHistory(compId);
      setRunHistory(runs);

      // Scroll smoothly to results
      setTimeout(() => {
        const el = document.getElementById("results-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: any) {
      setErrorBanner(
        `Optimization failed: ${err.message || "Failed to fetch from backend"}. Please verify your connection or click Retry.`
      );
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        backendHealthy={backendHealthy}
      />

      {/* Global Error Notice */}
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {activeTab === "planner" && (
          <>
            {/* Step 1 & 2: Budget Setup and Project Entry Form */}
            <SmartPlanner
              company={company}
              setCompany={setCompany}
              projects={projects}
              onAddProject={handleAddProject}
              onRemoveProject={handleRemoveProject}
              onLoadSpecDemo={handleLoadSpecDemo}
              onUploadCSV={handleUploadCSV}
              onAnalyze={handleAnalyze}
              isAnalyzing={isOptimizing}
              onSaveCompany={handleSaveCompany}
            />

            {/* Step 3: Analysis Results (Accepted & Rejected) */}
            {optimizationResult && (
              <div id="results-section" className="pt-6 border-t border-slate-200">
                <ResultsDashboard
                  result={optimizationResult}
                  onOpenFullAnalysis={(proj) => setSelectedAnalysisProject(proj)}
                  discountRate={company.discount_rate}
                />
              </div>
            )}
          </>
        )}

        {activeTab === "history" && (
          <AnalysisHistorySection
            runs={runHistory}
            onSelectRun={(run) => {
              setOptimizationResult(run);
              setActiveTab("planner");
              setTimeout(() => {
                const el = document.getElementById("results-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
            activeRunId={optimizationResult?.run_id}
            onRefresh={loadData}
          />
        )}

        {activeTab === "account" && (
          <AccountSection
            user={user}
            company={company}
            onLogout={handleLogout}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}
      </main>

      {/* Full Financial Analysis Modal */}
      <ProjectFullAnalysisModal
        project={selectedAnalysisProject}
        onClose={() => setSelectedAnalysisProject(null)}
        discountRate={company.discount_rate}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Clean Modern Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-bold text-slate-700">VentureLens AI</span> — Simple Smart Capital Allocation System
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://venture-lens-ai-delta.vercel.app/testing"
              className="text-teal-700 hover:text-teal-800 font-semibold"
            >
              5/5 Hand-Checked Tests
            </a>
            <span>•</span>
            <a
              href="https://github.com/Aryan010N/VentureLens_AI"
              target="_blank"
              rel="noreferrer"
              className="text-slate-600 hover:text-slate-900 font-medium"
            >
              GitHub Repository
            </a>
            <span>•</span>
            <span>Course: FFM CIE-2</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
