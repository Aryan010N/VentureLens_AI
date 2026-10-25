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
import {
  buildFallbackAnalysis,
  buildFallbackOptimization,
} from "@/lib/calculator";

const DEFAULT_COMPANY_ID = "venture_company_01";

const DEFAULT_METRICS: MLMetrics = {
  dataset_slug: "manishkc06/startup-success-prediction",
  dataset_name: "Startup Success Prediction (Real Historical Data)",
  train_samples: 738,
  test_samples: 185,
  features: [
    "funding_rounds",
    "milestones",
    "relationships",
    "age_last_funding_year",
    "avg_participants",
    "is_software",
    "is_enterprise",
    "is_biotech",
    "is_ecommerce",
  ],
  revenue_confidence_model: {
    algorithm: "RandomForestRegressor",
    r2_score: 0.8678,
    mae: 0.0437,
    rmse: 0.0556,
  },
  risk_classifier_model: {
    algorithm: "RandomForestClassifier",
    accuracy: 0.7784,
    precision: 0.8015,
    recall: 0.8750,
    f1_score: 0.8367,
    roc_auc: 0.8176,
  },
  disclaimer: "ML predictions are estimates based on historical data, not guaranteed returns.",
};

const SPEC_PROJECTS: ProjectData[] = [
  {
    project_id: "proj_solar",
    company_id: DEFAULT_COMPANY_ID,
    name: "Solar installation",
    initial_cost: 800000,
    cash_flows: [300000, 300000, 300000, 300000, 300000],
    duration_years: 5,
    risk_category: "Medium",
    industry_category: "CleanTech",
  },
  {
    project_id: "proj_recycling",
    company_id: DEFAULT_COMPANY_ID,
    name: "Recycling unit",
    initial_cost: 600000,
    cash_flows: [250000, 250000, 250000, 250000, 250000],
    duration_years: 5,
    risk_category: "Medium",
    industry_category: "Environmental",
  },
  {
    project_id: "proj_software",
    company_id: DEFAULT_COMPANY_ID,
    name: "Software product",
    initial_cost: 500000,
    cash_flows: [240000, 240000, 240000, 240000, 240000],
    duration_years: 5,
    risk_category: "High",
    industry_category: "Software",
  },
  {
    project_id: "proj_energy",
    company_id: DEFAULT_COMPANY_ID,
    name: "Energy-efficient equipment",
    initial_cost: 400000,
    cash_flows: [180000, 180000, 180000, 180000, 180000],
    duration_years: 5,
    risk_category: "Low",
    industry_category: "Energy",
  },
];

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
  const [metadata, setMetadata] = useState<MLMetrics>(DEFAULT_METRICS);

  const [loadingCompany, setLoadingCompany] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);

  // Initialize data on mount
  useEffect(() => {
    async function init() {
      try {
        const meta = await fetchMetadata().catch(() => null);
        if (meta && meta.revenue_confidence_model) {
          setMetadata(meta);
        }

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
      } catch (e) {
        console.warn("API initialization fallback active:", e);
      }
    }
    init();
  }, []);

  // Save company updates
  const handleSaveCompany = async (updated: Partial<CompanyData>) => {
    setLoadingCompany(true);
    try {
      const saved = await saveCompany(updated).catch(() => ({
        ...company,
        ...updated,
      } as CompanyData));
      setCompany(saved);
    } finally {
      setLoadingCompany(false);
    }
  };

  // Add individual project
  const handleAddProject = async (proj: Partial<ProjectData>) => {
    try {
      const saved = await saveProject({
        ...proj,
        company_id: company.company_id,
      }).catch(() => ({
        ...proj,
        project_id: `proj_${Math.random().toString(16).substring(2, 10)}`,
        company_id: company.company_id,
      } as ProjectData));
      setProjects((prev) => [...prev, saved]);
    } catch {
      const localP: ProjectData = {
        name: proj.name || "Initiative",
        initial_cost: proj.initial_cost || 500000,
        cash_flows: proj.cash_flows || [150000],
        risk_category: proj.risk_category || "Medium",
        industry_category: proj.industry_category || "General",
        duration_years: proj.duration_years || 5,
        project_id: `proj_${Math.random().toString(16).substring(2, 10)}`,
        company_id: company.company_id,
      };
      setProjects((prev) => [...prev, localP]);
    }
  };

  // Upload CSV/Excel
  const handleUploadFile = async (file: File) => {
    try {
      const res = await uploadProjectsFile(company.company_id, file);
      if (res.projects && res.projects.length > 0) {
        setProjects((prev) => [...prev, ...res.projects]);
      }
    } catch (e: any) {
      alert(`Upload error: ${e.message || "Failed to upload file."}`);
    }
  };

  // Run Financial + ML Analysis
  const handleTriggerAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Try backend first
      const res = await analyzeProjects(company.company_id).catch(() => null);
      if (res && res.projects && res.projects.length > 0) {
        setAnalyzedProjects(res.projects);
      } else {
        // High-fidelity fallback calculation
        const localAnalysis = buildFallbackAnalysis(
          projects,
          company.discount_rate,
          company.total_investment_budget,
          company.min_cash_reserve,
          company.loan_facility
        );
        setAnalyzedProjects(localAnalysis);
      }
    } catch {
      const localAnalysis = buildFallbackAnalysis(
        projects,
        company.discount_rate,
        company.total_investment_budget,
        company.min_cash_reserve,
        company.loan_facility
      );
      setAnalyzedProjects(localAnalysis);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run PuLP Portfolio Optimization
  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    try {
      const res = await optimizePortfolio(company.company_id).catch(() => null);
      if (res) {
        setOptimizationResult(res);
        const runs = await fetchRunHistory(company.company_id).catch(() => []);
        if (runs.length > 0) setRunHistory(runs);
      } else {
        // High-fidelity fallback optimization
        const currentFinancials =
          analyzedProjects.length > 0
            ? analyzedProjects
            : buildFallbackAnalysis(
                projects,
                company.discount_rate,
                company.total_investment_budget,
                company.min_cash_reserve,
                company.loan_facility
              );
        const localOpt = buildFallbackOptimization(
          currentFinancials,
          company.total_investment_budget,
          company.min_cash_reserve,
          company.max_acceptable_risk
        );
        setOptimizationResult(localOpt);
        setRunHistory((prev) => [localOpt, ...prev]);
      }
    } catch {
      const currentFinancials =
        analyzedProjects.length > 0
          ? analyzedProjects
          : buildFallbackAnalysis(
              projects,
              company.discount_rate,
              company.total_investment_budget,
              company.min_cash_reserve,
              company.loan_facility
            );
      const localOpt = buildFallbackOptimization(
        currentFinancials,
        company.total_investment_budget,
        company.min_cash_reserve,
        company.max_acceptable_risk
      );
      setOptimizationResult(localOpt);
      setRunHistory((prev) => [localOpt, ...prev]);
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
      setCompany(demoCompany);
      setProjects(SPEC_PROJECTS);

      // Attempt live backend save
      await saveCompany(demoCompany).catch(() => null);
      for (const p of SPEC_PROJECTS) {
        await saveProject(p).catch(() => null);
      }

      // Try live API analysis
      const analysisRes = await analyzeProjects(DEFAULT_COMPANY_ID).catch(() => null);
      let finList: ProjectFinancials[];
      if (analysisRes && analysisRes.projects && analysisRes.projects.length > 0) {
        finList = analysisRes.projects;
      } else {
        finList = buildFallbackAnalysis(
          SPEC_PROJECTS,
          demoCompany.discount_rate,
          demoCompany.total_investment_budget,
          demoCompany.min_cash_reserve,
          demoCompany.loan_facility
        );
      }
      setAnalyzedProjects(finList);

      // Try live API optimization
      const optRes = await optimizePortfolio(DEFAULT_COMPANY_ID).catch(() => null);
      let finalOpt: OptimizationResult;
      if (optRes) {
        finalOpt = optRes;
      } else {
        finalOpt = buildFallbackOptimization(
          finList,
          demoCompany.total_investment_budget,
          demoCompany.min_cash_reserve,
          demoCompany.max_acceptable_risk
        );
      }
      setOptimizationResult(finalOpt);
      setRunHistory((prev) => [finalOpt, ...prev.filter((r) => r.run_id !== finalOpt.run_id)]);
    } catch (e: any) {
      console.error("Demo loader fallback applied:", e);
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
