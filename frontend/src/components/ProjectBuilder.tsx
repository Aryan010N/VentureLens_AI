"use client";

import React, { useState, useRef } from "react";
import {
  FolderPlus,
  UploadCloud,
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  AlertCircle,
  PlayCircle,
  Activity,
  Layers,
} from "lucide-react";
import { ProjectData } from "@/lib/types";
import { formatINR } from "@/lib/utils";

interface ProjectBuilderProps {
  companyId: string;
  projects: ProjectData[];
  onAddProject: (proj: Partial<ProjectData>) => Promise<void>;
  onUploadFile: (file: File) => Promise<void>;
  onTriggerAnalysis: () => Promise<void>;
  isAnalyzing: boolean;
}

export const ProjectBuilder: React.FC<ProjectBuilderProps> = ({
  companyId,
  projects,
  onAddProject,
  onUploadFile,
  onTriggerAnalysis,
  isAnalyzing,
}) => {
  const [activeTab, setActiveTab] = useState<"form" | "upload">("form");

  // Form State
  const [name, setName] = useState<string>("");
  const [cost, setCost] = useState<number>(500000);
  const [duration, setDuration] = useState<number>(5);
  const [cashFlows, setCashFlows] = useState<number[]>([150000, 150000, 150000, 150000, 150000]);
  const [riskCategory, setRiskCategory] = useState<"Low" | "Medium" | "High">("Medium");
  const [industryCategory, setIndustryCategory] = useState<string>("Software");

  // Upload State
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize cash flow array length when duration changes
  const handleDurationChange = (newDur: number) => {
    const val = Math.max(1, Math.min(15, newDur));
    setDuration(val);
    if (cashFlows.length < val) {
      const last = cashFlows[cashFlows.length - 1] || cost * 0.25;
      const addition = Array(val - cashFlows.length).fill(last);
      setCashFlows([...cashFlows, ...addition]);
    } else if (cashFlows.length > val) {
      setCashFlows(cashFlows.slice(0, val));
    }
  };

  const handleCashFlowChange = (index: number, val: number) => {
    const updated = [...cashFlows];
    updated[index] = val;
    setCashFlows(updated);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onAddProject({
      company_id: companyId,
      name: name.trim(),
      initial_cost: cost,
      duration_years: duration,
      cash_flows: cashFlows,
      risk_category: riskCategory,
      industry_category: industryCategory,
    });

    // Reset form for next entry
    setName("");
    setCost(500000);
    setCashFlows(Array(duration).fill(150000));
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setUploadError(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processUpload(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await processUpload(file);
    }
  };

  const processUpload = async (file: File) => {
    setUploadLoading(true);
    try {
      await onUploadFile(file);
    } catch (err: any) {
      setUploadError(err.message || "Failed to parse and upload file.");
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <section className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-teal-500/20 shadow-xl space-y-6">
        {/* Header and Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Project Portfolio Builder
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-teal-300 font-mono">
                  {projects.length} Registered
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Propose individual capital projects or upload a structured CSV / Excel schedule.
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center rounded-xl bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => setActiveTab("form")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "form"
                  ? "bg-teal-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "upload"
                  ? "bg-teal-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              CSV / Excel Upload
            </button>
          </div>
        </div>

        {/* Tab 1: Manual Project Form */}
        {activeTab === "form" ? (
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Project Name */}
              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-xs font-semibold text-slate-300">
                  Project Title / Initiative
                </label>
                <input
                  type="text"
                  placeholder="e.g. Solar rooftop installation, AI Automation suite"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-teal-500 text-white text-sm"
                  required
                />
              </div>

              {/* Initial Outlay */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Initial Cost / Outlay (₹)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="10000"
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-teal-500 text-white text-sm"
                  required
                />
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Lifespan (Years)
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={duration}
                  onChange={(e) => handleDurationChange(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-teal-500 text-white text-sm"
                  required
                />
              </div>

              {/* Industry Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Industry / Sector
                </label>
                <select
                  value={industryCategory}
                  onChange={(e) => setIndustryCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-teal-500 text-white text-sm"
                >
                  <option value="CleanTech">CleanTech / Renewable</option>
                  <option value="Software">Software & SaaS</option>
                  <option value="Environmental">Environmental & Recycling</option>
                  <option value="Energy">Energy Efficiency</option>
                  <option value="Manufacturing">Manufacturing & Hardware</option>
                  <option value="Biotech">Biotech & Healthcare</option>
                  <option value="Services">Enterprise Services</option>
                </select>
              </div>

              {/* Risk Tier */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Estimated Risk Tier
                </label>
                <select
                  value={riskCategory}
                  onChange={(e) => setRiskCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-teal-500 text-white text-sm"
                >
                  <option value="Low">Low Risk</option>
                  <option value="Medium">Medium Risk</option>
                  <option value="High">High Risk</option>
                </select>
              </div>
            </div>

            {/* Dynamic Year-by-Year Cash Flows */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Year-by-Year Expected Net Inflows (₹)</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Enter annual net receipts [Year 1 to Year {duration}]
                </span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {cashFlows.map((cf, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="text-[11px] text-teal-400 font-mono font-medium">
                      Year {idx + 1}
                    </span>
                    <input
                      type="number"
                      step="5000"
                      value={cf}
                      onChange={(e) => handleCashFlowChange(idx, Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 focus:border-teal-500 text-white text-xs font-mono"
                      required
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-teal-sm active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Project to Portfolio
              </button>
            </div>
          </form>
        ) : (
          /* Tab 2: Drag & Drop CSV / Excel */
          <div className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragOver
                  ? "border-teal-400 bg-teal-500/10"
                  : "border-slate-700 bg-slate-900/40 hover:border-teal-500/50"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
              />
              <UploadCloud className="w-12 h-12 text-teal-400 mb-3 animate-pulse" />
              <h3 className="text-base font-bold text-white mb-1">
                Drop your CSV or Excel file here
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Upload historical project schedules. The system automatically reconciles cash flow arrays,
                cleans missing fields, and populates Firestore.
              </p>
              <span className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 hover:bg-slate-700 transition-colors">
                {uploadLoading ? "Processing File..." : "Browse Local Files (.csv, .xlsx)"}
              </span>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {uploadError}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Need the standardized schema structure?
              </span>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/sample-template`}
                download
                className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV Spec Template
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Projects List Overview */}
      {projects.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-400" />
              Candidate Investment Proposals ({projects.length})
            </h3>

            <button
              onClick={onTriggerAnalysis}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:brightness-110 text-slate-950 font-bold text-sm shadow-teal-glow active:scale-95 transition-all disabled:opacity-50"
            >
              <Activity className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} />
              {isAnalyzing ? "Executing Financial & ML Models..." : "Run Multi-Project Analysis"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {projects.map((p, idx) => (
              <div
                key={p.project_id || idx}
                className="glass-panel rounded-xl p-4 border border-teal-500/15 space-y-3 hover:border-teal-500/40 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-white text-sm line-clamp-1">{p.name}</h4>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      p.risk_category === "Low"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : p.risk_category === "Medium"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {p.risk_category}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Initial Cost:</span>
                    <span className="font-bold text-white">{formatINR(p.initial_cost)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Lifespan:</span>
                    <span className="font-medium text-slate-200">{p.duration_years} Years</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Industry:</span>
                    <span className="font-medium text-slate-200">{p.industry_category}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-teal-400 font-mono">
                  <span>Avg Annual Inflow:</span>
                  <span>
                    {formatINR(
                      p.cash_flows.reduce((a, b) => a + b, 0) / (p.cash_flows.length || 1)
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
