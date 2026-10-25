"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Hero } from "@/components/Hero";
import { BackendStatusBanner } from "@/components/BackendStatusBanner";
import { CompanySetup } from "@/components/CompanySetup";
import { ProjectBuilder } from "@/components/ProjectBuilder";
import { ProjectAnalysisCards } from "@/components/ProjectAnalysisCards";
import { OptimizationDashboard } from "@/components/OptimizationDashboard";
import { RunHistory } from "@/components/RunHistory";
import { Footer } from "@/components/Footer";
import {
  saveCompany,
  fetchCompany,
  saveProject,
  fetchProjects,
  uploadProjectsFile,
  analyzeProjects,
  optimizePortfolio,
  fetchRunHistory,
  fetchMetadata,
} from "@/lib/api";
import {
  CompanyData,
  ProjectData,
  ProjectFinancials,
  OptimizationResult,
  MLMetrics,
} from "@/lib/types";

const DEFAULT_COMPANY_ID = "venture_company_01";

export default function Home() {
  const [company, setCompany] = useState<CompanyData>({
    company_id: DEFAULT_COMPANY_ID,
    total_investment_budget: 2000000,
    min_cash_reserve: 200000,
    loan_facility: 500000,
    discount_rate: 0.12,
    planning_period_years: 5,
    max_acceptable_risk: "Medium",
  });

  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [analyzedProjects, setAnalyzedProjects] = useState<ProjectFinancials[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [runHistory, setRunHistory] = useState<OptimizationResult[]>([]);
  const [metadata, setMetadata] = useState<MLMetrics | null>(null);

  const [loadingCompany, setLoadingCompany] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDataFromBackend = useCallback(async () => {
    setActionError(null);
    try {
      const meta = await fetchMetadata().catch(() => null);
      if (meta) setMetadata(meta);

      const existingComp = await fetchCompany(DEFAULT_COMPANY_ID).catch(() => null);
      if (existingComp) {
        setCompany(existingComp);
      }

      const existingProjects = await fetchProjects(DEFAULT_COMPANY_ID).catch(() => []);
      if (existingProjects && existingProjects.length > 0) {
        setProjects(existingProjects);
      }

      const pastRuns = await fetchRunHistory(DEFAULT_COMPANY_ID).catch(() => []);
      if (pastRuns && pastRuns.length > 0) {
        setRunHistory(pastRuns);
        setOptimizationResult(pastRuns[0]);
      }
    } catch (err: any) {
      console.warn("Could not fetch initial data from backend:", err);
    }
  }, []);

  useEffect(() => {
    loadDataFromBackend();
  }, [loadDataFromBackend]);

  // Real Backend: Save company updates to Firestore
  const handleSaveCompany = async (updated: Partial<CompanyData>) => {
    setLoadingCompany(true);
    setActionError(null);
    try {
      const saved = await saveCompany(updated);
      setCompany(saved);
    } catch (err: any) {
      setActionError(`Failed to save company in Firestore: ${err.message}`);
      throw err;
    } finally {
      setLoadingCompany(false);
    }
  };

  // Real Backend: Save project to Firestore under company
  const handleAddProject = async (proj: Partial<ProjectData>) => {
    setActionError(null);
    try {
      const saved = await saveProject({
        ...proj,
        company_id: company.company_id,
      });
      setProjects((prev) => [...prev, saved]);
    } catch (err: any) {
      setActionError(`Failed to register project in Firestore: ${err.message}`);
      throw err;
    }
  };

  // Real Backend: Upload CSV to Backend for pandas cleaning and bulk Firestore write
  const handleUploadFile = async (file: File) => {
    setActionError(null);
    try {
      const res = await uploadProjectsFile(company.company_id, file);
      if (res.projects && res.projects.length > 0) {
        setProjects((prev) => [...prev, ...res.projects]);
      }
    } catch (err: any) {
      setActionError(`CSV Upload and Preprocessing failed: ${err.message}`);
      throw err;
    }
  };

  // Real Backend: Execute financial analysis & ML inference on real models
  const handleTriggerAnalysis = async () => {
    setIsAnalyzing(true);
    setActionError(null);
    try {
      const res = await analyzeProjects(company.company_id);
      setAnalyzedProjects(res.projects);
    } catch (err: any) {
      setActionError(`Financial & ML Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Real Backend: Execute PuLP mathematical optimization and persist run in Firestore
  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    setActionError(null);
    try {
      const res = await optimizePortfolio(company.company_id);
      setOptimizationResult(res);
      // Refresh run history from Firestore
      const runs = await fetchRunHistory(company.company_id);
      setRunHistory(runs);
    } catch (err: any) {
      setActionError(`PuLP Optimization failed: ${err.message}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Real Backend: Populate the 4 spec projects into Firestore, then trigger real execution
  const handleLoadSpecDemo = async () => {
    setLoadingCompany(true);
    setActionError(null);
    try {
      const demoCompany: CompanyData = {
        company_id: DEFAULT_COMPANY_ID,
        total_investment_budget: 2000000,
        min_cash_reserve: 200000,
        loan_facility: 500000,
        discount_rate: 0.12,
        planning_period_years: 5,
        max_acceptable_risk: "Medium",
      };
      
      // 1. Real write to Firestore
      const savedComp = await saveCompany(demoCompany);
      setCompany(savedComp);

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

      // 2. Real write of all 4 candidate projects to Firestore
      const savedProjectsList: ProjectData[] = [];
      for (const p of specProjects) {
        const savedP = await saveProject({
          ...p,
          company_id: DEFAULT_COMPANY_ID,
        });
        savedProjectsList.push(savedP);
      }
      setProjects(savedProjectsList);

      // 3. Real live execution of Python financial engine and ML models on backend
      const analysisRes = await analyzeProjects(DEFAULT_COMPANY_ID);
      setAnalyzedProjects(analysisRes.projects);

      // 4. Real live execution of PuLP integer solver on backend
      const optRes = await optimizePortfolio(DEFAULT_COMPANY_ID);
      setOptimizationResult(optRes);

      // 5. Fetch real run history from Firestore
      const history = await fetchRunHistory(DEFAULT_COMPANY_ID);
      setRunHistory(history);
    } catch (err: any) {
      setActionError(`Backend request failed: ${err.message}. Please verify backend connection using the status banner above.`);
    } finally {
      setLoadingCompany(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Hero
        onLoadSpecDemo={handleLoadSpecDemo}
        datasetSlug={metadata?.dataset_slug || "manishkc06/startup-success-prediction"}
        r2Score={metadata?.revenue_confidence_model?.r2_score ?? 0.8678}
        rocAuc={metadata?.risk_classifier_model?.roc_auc ?? 0.8176}
      />

      {/* Real Live Backend Status & Configuration Banner */}
      <BackendStatusBanner onBackendReconnected={loadDataFromBackend} />

      {actionError && (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 pt-4">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <span>{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-slate-400 hover:text-white font-bold ml-4"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-12">
        {/* Step 1: Company Parameters Setup -> Firestore companies/{companyId} */}
        <CompanySetup
          company={company}
          onSaveCompany={handleSaveCompany}
          loading={loadingCompany}
        />

        {/* Step 2: Project Proposals Builder & CSV Upload -> Firestore companies/{companyId}/projects */}
        <ProjectBuilder
          companyId={company.company_id}
          projects={projects}
          onAddProject={handleAddProject}
          onUploadFile={handleUploadFile}
          onTriggerAnalysis={handleTriggerAnalysis}
          isAnalyzing={isAnalyzing}
        />

        {/* Step 3: Per-Project Financial Analysis & Real Scikit-Learn Model Predictions */}
        <ProjectAnalysisCards projects={analyzedProjects} />

        {/* Step 4: PuLP Optimization Dashboard -> Solved live via Python CBC/HiGHS Solver */}
        <OptimizationDashboard
          result={optimizationResult}
          onRunOptimization={handleRunOptimization}
          isOptimizing={isOptimizing}
          totalCandidates={projects.length}
        />

        {/* Step 5: Historical Runs Tracked Live in Firestore -> companies/{companyId}/runs */}
        <RunHistory
          runs={runHistory}
          onSelectRun={(run) => setOptimizationResult(run)}
          selectedRunId={optimizationResult?.run_id}
        />
      </main>

      <Footer />
    </div>
  );
}
