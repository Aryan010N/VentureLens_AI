"use client";

import React, { useState, useEffect } from "react";
import { Hero } from "@/components/Hero";
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

  // Initialize data on mount
  useEffect(() => {
    async function init() {
      try {
        const meta = await fetchMetadata().catch(() => null);
        if (meta) setMetadata(meta);

        const existingComp = await fetchCompany(DEFAULT_COMPANY_ID).catch(() => null);
        if (existingComp) {
          setCompany(existingComp);
        } else {
          // Initialize in Firestore
          await saveCompany(company).catch(() => null);
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
      } catch (e) {
        console.error("Initialization error:", e);
      }
    }
    init();
  }, []);

  // Save company updates
  const handleSaveCompany = async (updated: Partial<CompanyData>) => {
    setLoadingCompany(true);
    try {
      const saved = await saveCompany(updated);
      setCompany(saved);
    } finally {
      setLoadingCompany(false);
    }
  };

  // Add individual project
  const handleAddProject = async (proj: Partial<ProjectData>) => {
    const saved = await saveProject({
      ...proj,
      company_id: company.company_id,
    });
    setProjects((prev) => [...prev, saved]);
  };

  // Upload CSV/Excel
  const handleUploadFile = async (file: File) => {
    const res = await uploadProjectsFile(company.company_id, file);
    if (res.projects && res.projects.length > 0) {
      setProjects((prev) => [...prev, ...res.projects]);
    }
  };

  // Run Financial + ML Analysis
  const handleTriggerAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await analyzeProjects(company.company_id);
      setAnalyzedProjects(res.projects);
    } catch (err: any) {
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run PuLP Portfolio Optimization
  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    try {
      const res = await optimizePortfolio(company.company_id);
      setOptimizationResult(res);
      // Refresh run history
      const runs = await fetchRunHistory(company.company_id);
      setRunHistory(runs);
    } catch (err: any) {
      alert(`Optimization failed: ${err.message}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Load Part 6/7 Spec 4-Project Worked Example
  const handleLoadSpecDemo = async () => {
    setLoadingCompany(true);
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
        const saved = await saveProject({
          ...p,
          company_id: DEFAULT_COMPANY_ID,
        });
        savedList.push(saved);
      }
      setProjects(savedList);

      // Automatically trigger analysis
      const analysisRes = await analyzeProjects(DEFAULT_COMPANY_ID);
      setAnalyzedProjects(analysisRes.projects);

      // Automatically trigger optimization
      const optRes = await optimizePortfolio(DEFAULT_COMPANY_ID);
      setOptimizationResult(optRes);

      const history = await fetchRunHistory(DEFAULT_COMPANY_ID);
      setRunHistory(history);
    } catch (e: any) {
      alert(`Failed to load demo: ${e.message}`);
    } finally {
      setLoadingCompany(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Hero
        onLoadSpecDemo={handleLoadSpecDemo}
        datasetSlug={metadata?.dataset_slug}
        r2Score={metadata?.revenue_confidence_model.r2_score}
        rocAuc={metadata?.risk_classifier_model.roc_auc}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-10 space-y-12">
        {/* Step 1: Company Parameters Setup */}
        <CompanySetup
          company={company}
          onSaveCompany={handleSaveCompany}
          loading={loadingCompany}
        />

        {/* Step 2: Project Proposals Builder & CSV Upload */}
        <ProjectBuilder
          companyId={company.company_id}
          projects={projects}
          onAddProject={handleAddProject}
          onUploadFile={handleUploadFile}
          onTriggerAnalysis={handleTriggerAnalysis}
          isAnalyzing={isAnalyzing}
        />

        {/* Step 3: Per-Project Financial Analysis & Scenario Visualizations */}
        <ProjectAnalysisCards projects={analyzedProjects} />

        {/* Step 4: PuLP Optimization Dashboard & Rejection Explanations */}
        <OptimizationDashboard
          result={optimizationResult}
          onRunOptimization={handleRunOptimization}
          isOptimizing={isOptimizing}
          totalCandidates={projects.length}
        />

        {/* Step 5: Historical Runs Tracked in Firestore */}
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
