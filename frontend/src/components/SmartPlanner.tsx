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
} from "lucide-react";
import { CompanyData, ProjectData } from "@/lib/types";
import { formatINR } from "@/lib/utils";

interface SmartPlannerProps {
  company: CompanyData;
  setCompany: (c: CompanyData) => void;
  projects: ProjectData[];
  onAddProject: (p: Partial<ProjectData>) => Promise<void>;
  onRemoveProject: (projectId: string) => Promise<void>;
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
  onLoadSpecDemo,
  onUploadCSV,
  onAnalyze,
  isAnalyzing,
  onSaveCompany,
}) => {
  // New Project Form State
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("CleanTech");
  const [cost, setCost] = useState("");
  const [annualInflow, setAnnualInflow] = useState("");
  const [duration, setDuration] = useState("5");
  const [risk, setRisk] = useState<"Low" | "Medium" | "High">("Medium");

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

  const handleAddOrUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const costNum = parseFloat(cost);
    const inflowNum = parseFloat(annualInflow);
    const durationNum = parseInt(duration) || 5;

    if (!name.trim()) {
      setFormError("Project Name is required.");
      return;
    }
    if (isNaN(costNum) || costNum <= 0) {
      setFormError("Initial Investment Cost must be greater than ₹0.");
      return;
    }
    if (isNaN(inflowNum) || inflowNum <= 0) {
      setFormError("Expected Annual Cash Inflow must be greater than ₹0.");
      return;
    }
    if (durationNum < 1) {
      setFormError("Project duration must be at least 1 year.");
      return;
    }

    setIsAdding(true);
    try {
      const flows = Array(durationNum).fill(inflowNum);
      await onAddProject({
        project_id: editingId || undefined,
        name: name.trim(),
        industry_category: industry,
        initial_cost: costNum,
        cash_flows: flows,
        duration_years: durationNum,
        risk_category: risk,
      });

      // Reset Form
      setName("");
      setCost("");
      setAnnualInflow("");
      setDuration("5");
      setRisk("Medium");
      setEditingId(null);
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
    const firstInflow = p.cash_flows?.[0] || 0;
    setAnnualInflow(firstInflow.toString());
    setDuration((p.duration_years || 5).toString());
    setRisk(p.risk_category || "Medium");
    window.scrollTo({ top: 300, behavior: "smooth" });
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
    <div className="space-y-8 animate-fadeIn">
      {/* Page Title & Subtitle */}
      <div className="text-center max-w-3xl mx-auto space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Smart Investment Planner
        </h1>
        <p className="text-sm sm:text-base text-slate-600 font-medium">
          Enter your budget and projects. VentureLens AI will identify the most valuable investment opportunities.
        </p>
      </div>

      {/* SECTION A: Enter Your Budget */}
      <section className="card-clean rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                A. Enter Your Budget
              </h2>
              <p className="text-xs text-slate-500">
                Define your corporate investment capital, risk appetite, and liquidity floor.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLoadSpecDemo}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            Load Spec Example (₹20L)
          </button>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Budget */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Total Budget (₹)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="50000"
                value={company.total_investment_budget}
                onChange={(e) =>
                  handleBudgetChange(
                    "total_investment_budget",
                    parseFloat(e.target.value) || 0
                  )
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-900 bg-white"
              />
            </div>
            <span className="text-[11px] text-teal-700 font-semibold mt-1 block">
              {formatINR(company.total_investment_budget)}
            </span>
          </div>

          {/* Min Cash Reserve */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Minimum Cash Reserve (₹)
            </label>
            <input
              type="number"
              min="0"
              step="50000"
              value={company.min_cash_reserve}
              onChange={(e) =>
                handleBudgetChange(
                  "min_cash_reserve",
                  parseFloat(e.target.value) || 0
                )
              }
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-900 bg-white"
            />
            <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
              {formatINR(company.min_cash_reserve)} (Protected)
            </span>
          </div>

          {/* Discount Rate */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Cost of Capital / Hurdle (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="50"
                step="0.5"
                value={
                  company.discount_rate <= 1.0
                    ? Number((company.discount_rate * 100).toFixed(1))
                    : company.discount_rate
                }
                onChange={(e) =>
                  handleBudgetChange(
                    "discount_rate",
                    (parseFloat(e.target.value) || 12) / 100.0
                  )
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-900 bg-white"
              />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Default 12% WACC
            </span>
          </div>

          {/* Planning Horizon */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Planning Horizon (Years)
            </label>
            <select
              value={company.planning_period_years}
              onChange={(e) =>
                handleBudgetChange(
                  "planning_period_years",
                  parseInt(e.target.value) || 5
                )
              }
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-900 bg-white"
            >
              <option value={3}>3 Years</option>
              <option value={5}>5 Years (Standard)</option>
              <option value={7}>7 Years</option>
              <option value={10}>10 Years</option>
            </select>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Multi-year lifespan
            </span>
          </div>

          {/* Risk Level */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Max Portfolio Risk
            </label>
            <select
              value={company.max_acceptable_risk}
              onChange={(e) =>
                handleBudgetChange(
                  "max_acceptable_risk",
                  e.target.value as "Low" | "Medium" | "High"
                )
              }
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-900 bg-white"
            >
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
            </select>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Tolerance ceiling
            </span>
          </div>
        </div>

        {/* Clear Capital Breakdown Indicator */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Total Budget:</span>
              <span className="font-extrabold text-slate-900">
                {formatINR(totalBudget)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">Minimum Cash Reserve:</span>
              <span className="font-extrabold text-amber-700">
                {formatINR(minReserve)}
              </span>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
              <span className="font-semibold text-emerald-700">
                Available for Investment:
              </span>
              <span className="font-black text-emerald-800 text-sm sm:text-base">
                {formatINR(availableForInvestment)}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              The minimum cash reserve of {formatINR(minReserve)} is protected as a corporate liquidity floor and is not counted as investable capital.
            </span>
          </p>
        </div>
      </section>

      {/* SECTION B: Add Your Projects */}
      <section className="card-clean rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                B. Add Your Projects
              </h2>
              <p className="text-xs text-slate-500">
                Register candidate initiatives with basic costs and expected annual inflows.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLoadSpecDemo}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Load Spec 4 Projects</span>
            </button>

            <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1.5">
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
        <form onSubmit={handleAddOrUpdateProject} className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Project Name */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Solar installation"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-slate-900 bg-white"
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
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-slate-900 bg-white"
              >
                <option value="CleanTech">CleanTech</option>
                <option value="Software">Software</option>
                <option value="Energy">Energy</option>
                <option value="Environmental">Environmental</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="FinTech">FinTech</option>
              </select>
            </div>

            {/* Initial Investment Cost */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Initial Cost (₹)
              </label>
              <input
                type="number"
                required
                min="1000"
                step="10000"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="800000"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-slate-900 bg-white"
              />
            </div>

            {/* Expected Annual Inflow */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Annual Inflow (₹)
              </label>
              <input
                type="number"
                required
                min="1000"
                step="10000"
                value={annualInflow}
                onChange={(e) => setAnnualInflow(e.target.value)}
                placeholder="300000"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-slate-900 bg-white"
              />
            </div>

            {/* Duration & Risk */}
            <div className="flex gap-2">
              <div className="w-1/2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Years
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-2 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-slate-900 bg-white text-center"
                />
              </div>

              <div className="w-1/2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Risk
                </label>
                <select
                  value={risk}
                  onChange={(e) =>
                    setRisk(e.target.value as "Low" | "Medium" | "High")
                  }
                  className="w-full px-1 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-slate-900 bg-white text-center"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Med</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">
              {editingId ? "Editing existing project" : "Ready to add to candidate list"}
            </span>

            <div className="flex items-center gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setName("");
                    setCost("");
                    setAnnualInflow("");
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={isAdding}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
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
            <h3 className="text-sm font-bold text-slate-800">
              Candidate Projects ({projects.length})
            </h3>
            <span className="text-xs text-slate-500">
              Total Requested: {formatINR(projects.reduce((acc, p) => acc + p.initial_cost, 0))}
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold">
                No projects added yet.
              </p>
              <p className="text-[11px] text-slate-400">
                Use the form above to add projects, upload a CSV, or click "Load Spec 4 Projects" for instant setup.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Project Name</th>
                    <th className="py-3 px-4">Sector</th>
                    <th className="py-3 px-4">Investment Cost</th>
                    <th className="py-3 px-4">Annual Cash Inflow</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Risk Level</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {projects.map((p, idx) => (
                    <tr
                      key={p.project_id || idx}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {p.industry_category || "General"}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatINR(p.initial_cost)}
                      </td>
                      <td className="py-3 px-4 text-teal-700 font-medium">
                        {formatINR(p.cash_flows?.[0] || 0)} / yr
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {p.duration_years || p.cash_flows?.length || 5} Years
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            p.risk_category === "Low"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : p.risk_category === "High"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {p.risk_category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditClick(p)}
                            title="Edit"
                            className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              p.project_id && onRemoveProject(p.project_id)
                            }
                            title="Remove"
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
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
          className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-base sm:text-lg font-black text-white bg-gradient-to-r from-slate-900 via-teal-800 to-slate-900 hover:from-slate-800 hover:to-slate-800 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
