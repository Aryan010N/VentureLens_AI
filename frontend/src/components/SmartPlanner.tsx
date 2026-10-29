"use client";

import React, { useState } from "react";
import {
  Wallet,
  Shield,
  Coins,
  Percent,
  Calendar,
  PlusCircle,
  Trash2,
  Edit2,
  UploadCloud,
  FileSpreadsheet,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Info,
  Layers,
  TrendingUp,
} from "lucide-react";
import { CompanyData, ProjectData } from "@/lib/types";
import { formatINR } from "@/lib/utils";

interface SmartPlannerProps {
  company: CompanyData;
  setCompany: (c: CompanyData) => void;
  projects: ProjectData[];
  onAddProject: (p: Partial<ProjectData>) => Promise<void>;
  onRemoveProject: (projectId: string) => Promise<void>;
  onClearAllProjects?: () => Promise<void>;
  onLoadSpecDemo: () => Promise<void>;
  onUploadCSV: (file: File) => Promise<void>;
  onAnalyze: () => Promise<void>;
  isAnalyzing: boolean;
  onSaveCompany: (c: Partial<CompanyData>) => Promise<void>;
}

export const SmartPlanner: React.FC<SmartPlannerProps> = ({
  company,
  setCompany,
  projects,
  onAddProject,
  onRemoveProject,
  onClearAllProjects,
  onLoadSpecDemo,
  onUploadCSV,
  onAnalyze,
  isAnalyzing,
  onSaveCompany,
}) => {
  // New Project Form State (Clean Slate & Dynamic Inputs)
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("CleanTech");
  const [cost, setCost] = useState("");
  const [annualInflow, setAnnualInflow] = useState("");
  const [duration, setDuration] = useState("5");
  const [isYearlyDynamic, setIsYearlyDynamic] = useState(false);
  const [yearlyInflows, setYearlyInflows] = useState<string[]>(["", "", "", "", ""]);

  const [formError, setFormError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Available for investment calculation
  const totalBudget = Number(company.total_investment_budget) || 0;
  const minReserve = Number(company.min_cash_reserve) || 0;
  const availableForInvestment = Math.max(0, totalBudget - minReserve);

  const handleBudgetChange = (field: keyof CompanyData, value: any) => {
    const updated = { ...company, [field]: value };
    setCompany(updated);
    onSaveCompany({ [field]: value }).catch((err) =>
      console.warn("Could not auto-save company parameter:", err)
    );
  };

  const handleDurationChange = (newDurStr: string) => {
    setDuration(newDurStr);
    const durNum = Math.max(1, Math.min(25, parseInt(newDurStr) || 5));
    setYearlyInflows((prev) => {
      const next = [...prev];
      while (next.length < durNum) {
        next.push(annualInflow || "");
      }
      return next.slice(0, durNum);
    });
  };

  const handleUniformInflowChange = (val: string) => {
    setAnnualInflow(val);
    const durNum = Math.max(1, parseInt(duration) || 5);
    setYearlyInflows(Array(durNum).fill(val));
  };

  const handleYearlyInflowChange = (index: number, val: string) => {
    setYearlyInflows((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const resetForm = () => {
    setName("");
    setCost("");
    setAnnualInflow("");
    setDuration("5");
    setIsYearlyDynamic(false);
    setYearlyInflows(["", "", "", "", ""]);
    setEditingId(null);
    setFormError(null);
  };

  const handleAddOrUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const costNum = parseFloat(cost);
    const durationNum = Math.max(1, parseInt(duration) || 5);

    if (!name.trim()) {
      setFormError("Project Name is required.");
      return;
    }
    if (isNaN(costNum) || costNum <= 0) {
      setFormError("Initial Investment Cost (Outflow) must be greater than ₹0.");
      return;
    }

    let flows: number[] = [];
    if (isYearlyDynamic) {
      flows = yearlyInflows.slice(0, durationNum).map((val) => parseFloat(val) || 0);
      if (flows.length === 0 || flows.every((cf) => cf <= 0)) {
        setFormError("Please enter positive cash inflows in at least one year.");
        return;
      }
    } else {
      const inflowNum = parseFloat(annualInflow);
      if (isNaN(inflowNum) || inflowNum <= 0) {
        setFormError("Expected Annual Cash Inflow must be greater than ₹0.");
        return;
      }
      flows = Array(durationNum).fill(inflowNum);
    }

    if (durationNum < 1) {
      setFormError("Project duration must be at least 1 year.");
      return;
    }

    // Deduplication check
    const duplicate = projects.find(
      (p) =>
        p.name.trim().toLowerCase() === name.trim().toLowerCase() &&
        p.project_id !== editingId
    );
    if (duplicate) {
      setFormError(
        `A project named "${name.trim()}" is already registered. Please edit the existing entry or choose a unique name.`
      );
      return;
    }

    setIsAdding(true);
    try {
      await onAddProject({
        project_id: editingId || undefined,
        name: name.trim(),
        industry_category: industry,
        initial_cost: costNum,
        cash_flows: flows,
        duration_years: durationNum,
      });

      // Reset Form to clean state
      resetForm();
    } catch (err: any) {
      setFormError(err.message || "Failed to save project.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditClick = (p: ProjectData) => {
    setEditingId(p.project_id || null);
    setName(p.name);
    setIndustry(p.industry_category || "Software");
    setCost(p.initial_cost.toString());
    const dur = p.duration_years || p.cash_flows?.length || 5;
    setDuration(dur.toString());

    const existingFlows = p.cash_flows || [];
    const isVarying =
      existingFlows.length > 1 && existingFlows.some((cf) => cf !== existingFlows[0]);

    if (isVarying) {
      setIsYearlyDynamic(true);
      setYearlyInflows(existingFlows.map(String));
      const avg = existingFlows.reduce((a, b) => a + b, 0) / existingFlows.length;
      setAnnualInflow(avg.toFixed(0));
    } else {
      setIsYearlyDynamic(false);
      const singleFlow = (existingFlows[0] || 0).toString();
      setAnnualInflow(singleFlow);
      setYearlyInflows(Array(dur).fill(singleFlow));
    }
    window.scrollTo({ top: 320, behavior: "smooth" });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        await onUploadCSV(e.target.files[0]);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header with Subtle Micro-Badge */}
      <div className="text-center max-w-3xl mx-auto space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-teal-300 text-xs font-semibold tracking-wide shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
          <span>VentureLens AI · Mathematical Knapsack & Machine Learning</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
          Smart Investment{" "}
          <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            Planner
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 font-medium max-w-xl mx-auto">
          Enter your budget and project proposals. Our PuLP binary optimizer identifies the combination that maximizes shareholder value.
        </p>
      </div>

      {/* SECTION A: Enter Your Budget */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 transition-all duration-300 hover:border-slate-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-teal-800 text-white flex items-center justify-center shadow-md">
              <Wallet className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                A. Investment Budget & Constraints
              </h2>
              <p className="text-xs text-slate-500">
                Define your capital ceiling, liquidity reserve, and hurdle rate.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLoadSpecDemo}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 hover:border-teal-300 transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Load Spec Example (₹20L)</span>
          </button>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Budget */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Total Budget (₹)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                value={company.total_investment_budget > 0 ? company.total_investment_budget : ""}
                onChange={(e) =>
                  handleBudgetChange(
                    "total_investment_budget",
                    parseFloat(e.target.value) || 0
                  )
                }
                placeholder="e.g. 2000000"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-900 bg-white transition-all shadow-sm placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>
            <span className="text-[11px] text-teal-700 font-semibold mt-1 block">
              {company.total_investment_budget > 0 ? formatINR(company.total_investment_budget) : "Enter investment capital"}
            </span>
          </div>

          {/* Min Cash Reserve */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Minimum Reserve (₹)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={company.min_cash_reserve > 0 ? company.min_cash_reserve : ""}
              onChange={(e) =>
                handleBudgetChange(
                  "min_cash_reserve",
                  parseFloat(e.target.value) || 0
                )
              }
              placeholder="e.g. 200000 (optional)"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-900 bg-white transition-all shadow-sm placeholder:text-slate-400 placeholder:font-normal"
            />
            <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
              {company.min_cash_reserve > 0 ? `${formatINR(company.min_cash_reserve)} (Protected)` : "Optional liquidity buffer"}
            </span>
          </div>

          {/* Discount Rate */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Hurdle Rate / WACC (%)
            </label>
            <input
              type="number"
              min="0.1"
              max="100"
              step="any"
              value={
                company.discount_rate <= 1.0
                  ? Number((company.discount_rate * 100).toFixed(2))
                  : company.discount_rate
              }
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                handleBudgetChange(
                  "discount_rate",
                  isNaN(val) ? 0.12 : val / 100.0
                );
              }}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-900 bg-white transition-all shadow-sm"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Dynamic cost of capital (e.g. 12%)
            </span>
          </div>

          {/* Planning Horizon */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Planning Horizon (Years)
            </label>
            <input
              type="number"
              min="1"
              max="25"
              step="1"
              value={company.planning_period_years || 5}
              onChange={(e) =>
                handleBudgetChange(
                  "planning_period_years",
                  Math.max(1, parseInt(e.target.value) || 5)
                )
              }
              placeholder="e.g. 5"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-900 bg-white transition-all shadow-sm"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Horizon: {company.planning_period_years || 5} years
            </span>
          </div>

          {/* Risk Ceiling */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Max Portfolio Risk
            </label>
            <select
              value={company.max_acceptable_risk || "Medium"}
              onChange={(e) =>
                handleBudgetChange(
                  "max_acceptable_risk",
                  e.target.value as "Low" | "Medium" | "High"
                )
              }
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-900 bg-white transition-all shadow-sm"
            >
              <option value="Low">Low Risk Only</option>
              <option value="Medium">Medium Risk (Balanced)</option>
              <option value="High">High Risk (Growth)</option>
            </select>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Portfolio risk constraint ceiling
            </span>
          </div>
        </div>

        {/* Sleek Live Capital Allocation Ribbon */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Total Capital:</span>
              <span className="font-extrabold text-slate-900 text-sm">
                {formatINR(totalBudget)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Protected Reserve:</span>
              <span className="font-bold text-amber-700 text-sm">
                {formatINR(minReserve)}
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-emerald-700">Available for Investment:</span>
            <span className="font-black text-emerald-900 text-sm">
              {formatINR(availableForInvestment)}
            </span>
          </div>
        </div>
      </section>

      {/* SECTION B: Add Your Projects */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 transition-all duration-300 hover:border-slate-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-teal-800 text-white flex items-center justify-center shadow-md">
              <Coins className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                B. Add Your Projects
              </h2>
              <p className="text-xs text-slate-500">
                Register candidate initiatives with required capital and expected annual returns.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLoadSpecDemo}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Load Spec 4 Projects</span>
            </button>

            <label className="cursor-pointer px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm">
              <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
              <span>Upload CSV</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Project Entry Form */}
        <form onSubmit={handleAddOrUpdateProject} className="space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Row 1: Project Metadata & Capital Outlay */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Project Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Solar installation"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-semibold text-slate-900 bg-white shadow-sm placeholder:text-slate-400"
              />
            </div>

            {/* Industry / Sector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Industry / Sector
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-semibold text-slate-900 bg-white shadow-sm"
              >
                <option value="CleanTech">CleanTech</option>
                <option value="Software">Software</option>
                <option value="Energy">Energy</option>
                <option value="Environmental">Environmental</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="FinTech">FinTech</option>
                <option value="Biotech">Biotech</option>
                <option value="Services">Services</option>
                <option value="General">General</option>
              </select>
            </div>

            {/* Initial Investment Outlay (Cost) - 100% Dynamic */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Initial Cost / Outflow (₹)
                </label>
                {cost && (
                  <span className="text-[10px] font-bold text-teal-700">
                    {formatINR(parseFloat(cost) || 0)}
                  </span>
                )}
              </div>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="e.g. 131000"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-semibold text-slate-900 bg-white shadow-sm placeholder:text-slate-400"
              />
            </div>

            {/* Duration (Years) - 100% Dynamic */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project Duration (Years)
              </label>
              <input
                type="number"
                required
                min="1"
                max="25"
                step="1"
                value={duration}
                onChange={(e) => handleDurationChange(e.target.value)}
                placeholder="e.g. 5"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-semibold text-slate-900 bg-white shadow-sm"
              />
            </div>
          </div>

          {/* Row 2: Inflow Mode Selection & Dynamic Inflows */}
          <div className="pt-2 border-t border-slate-200/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-700">
                Expected Cash Inflows (₹)
              </label>

              {/* Mode Toggle Pills */}
              <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setIsYearlyDynamic(false)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    !isYearlyDynamic
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Uniform Annual Inflow
                </button>
                <button
                  type="button"
                  onClick={() => setIsYearlyDynamic(true)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    isYearlyDynamic
                      ? "bg-white text-teal-800 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Dynamic Multi-Year Inflows
                </button>
              </div>
            </div>

            {!isYearlyDynamic ? (
              /* Uniform Mode: Single Input with Live Total */
              <div className="space-y-1.5">
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={annualInflow}
                    onChange={(e) => handleUniformInflowChange(e.target.value)}
                    placeholder="e.g. 81000"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-semibold text-slate-900 bg-white shadow-sm placeholder:text-slate-400"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>
                    Generates <strong>{annualInflow ? formatINR(parseFloat(annualInflow) || 0) : "₹0"}</strong> each year for {duration || 5} years.
                  </span>
                  <span className="text-teal-700 font-bold">
                    Total Inflows: {formatINR((parseFloat(annualInflow) || 0) * (parseInt(duration) || 5))}
                  </span>
                </div>
              </div>
            ) : (
              /* Dynamic Multi-Year Breakdown Mode: Grid for Year 1 to Year N */
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
                  {Array.from({ length: Math.max(1, parseInt(duration) || 5) }).map((_, idx) => (
                    <div key={`dynamic-year-${idx}`} className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">
                          Year {idx + 1}
                        </span>
                        {yearlyInflows[idx] && (
                          <span className="text-[10px] text-teal-700 font-bold">
                            {formatINR(parseFloat(yearlyInflows[idx]) || 0)}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={yearlyInflows[idx] ?? ""}
                        onChange={(e) => handleYearlyInflowChange(idx, e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-semibold text-slate-900"
                      />
                    </div>
                  ))}
                </div>

                {/* Summary calculation for Dynamic Mode */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 bg-teal-50/60 p-2.5 rounded-xl border border-teal-200/60">
                  <span>
                    Dynamic multi-year cash flow profile ({Math.max(1, parseInt(duration) || 5)} operating periods).
                  </span>
                  <div className="flex items-center gap-3 font-semibold text-teal-900">
                    <span>
                      Avg: {formatINR(
                        yearlyInflows.slice(0, Math.max(1, parseInt(duration) || 5)).reduce((acc, v) => acc + (parseFloat(v) || 0), 0) /
                        Math.max(1, parseInt(duration) || 5)
                      )} / yr
                    </span>
                    <span>•</span>
                    <span className="font-extrabold text-teal-950">
                      Total: {formatINR(
                        yearlyInflows.slice(0, Math.max(1, parseInt(duration) || 5)).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60 mt-1">
            <span className="text-[11px] text-teal-800 flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Project Risk is automatically predicted by Machine Learning based on industry sector, duration, and outlay.</span>
            </span>

            <div className="flex items-center gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={isAdding}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-teal-700 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 btn-premium"
              >
                <PlusCircle className="w-4 h-4 text-teal-400" />
                <span>{editingId ? "Save Changes" : "Add Project"}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Added Projects Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>Candidate Projects ({projects.length})</span>
            </h3>
            <div className="flex items-center gap-3">
              {projects.length > 0 && (
                <span className="text-xs text-slate-500">
                  Total Requested: <strong>{formatINR(projects.reduce((acc, p) => acc + p.initial_cost, 0))}</strong>
                </span>
              )}
              {projects.length > 0 && onClearAllProjects && (
                <button
                  type="button"
                  onClick={onClearAllProjects}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {projects.length === 0 ? (
            /* Clean Slate for New Users */
            <div className="p-10 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-white space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto shadow-sm">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-sm font-bold text-slate-900">
                  No Candidate Projects Registered Yet
                </h4>
                <p className="text-xs text-slate-500">
                  Your candidate portfolio is clean. Use the entry form above to register projects, or click below to load the textbook worked example.
                </p>
              </div>
              <button
                type="button"
                onClick={onLoadSpecDemo}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-teal-700 transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>Load Spec 4 Projects (₹20L Demo)</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Project Name</th>
                    <th className="py-3 px-4">Sector</th>
                    <th className="py-3 px-4">Investment Cost</th>
                    <th className="py-3 px-4">Annual Cash Inflow</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">AI Risk Assessment</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {projects.map((p, idx) => (
                    <tr
                      key={p.project_id || idx}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {p.industry_category || "General"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatINR(p.initial_cost)}
                      </td>
                      <td className="py-3 px-4 text-teal-700 font-bold">
                        {(() => {
                          const flows = p.cash_flows || [];
                          if (flows.length === 0) return "₹0 / yr";
                          const isVarying = flows.length > 1 && flows.some((f) => f !== flows[0]);
                          if (isVarying) {
                            const minF = Math.min(...flows);
                            const maxF = Math.max(...flows);
                            const avg = flows.reduce((a, b) => a + b, 0) / flows.length;
                            return (
                              <div>
                                <span>{formatINR(avg)} / yr (avg)</span>
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  Dynamic: {formatINR(minF)} – {formatINR(maxF)}
                                </span>
                              </div>
                            );
                          }
                          return `${formatINR(flows[0])} / yr`;
                        })()}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {p.duration_years || p.cash_flows?.length || 5} Years
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            p.risk_category === "Low"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : p.risk_category === "High"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-teal-50 text-teal-800 border border-teal-200"
                          }`}
                        >
                          <Sparkles className="w-2.5 h-2.5 text-teal-600" />
                          <span>AI: {p.risk_category || "Inferred"}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditClick(p)}
                            title="Edit"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              p.project_id && onRemoveProject(p.project_id)
                            }
                            title="Remove"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* SECTION C: Analyze Projects Prominent Button */}
      <section className="text-center pt-2">
        <button
          type="button"
          disabled={isAnalyzing || projects.length === 0}
          onClick={onAnalyze}
          className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl text-base sm:text-lg font-black text-white bg-gradient-to-r from-slate-950 via-teal-900 to-slate-900 hover:from-teal-900 hover:to-slate-900 shadow-xl hover:shadow-2xl hover:shadow-teal-500/20 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isAnalyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Analyzing & Optimizing Capital Allocation...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-teal-400" />
              <span>Analyze & Allocate Budget</span>
              <ArrowRight className="w-5 h-5 text-teal-300" />
            </>
          )}
        </button>
        <p className="text-xs text-slate-500 mt-2">
          Runs PuLP 0-1 Binary Integer Programming, deterministic textbook capital budgeting, and machine learning risk confidence.
        </p>
      </section>
    </div>
  );
};
