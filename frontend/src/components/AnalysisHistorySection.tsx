"use client";

import React from "react";
import {
  History,
  TrendingUp,
  Calendar,
  Layers,
  ArrowRight,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { OptimizationResult } from "@/lib/types";
import { formatINR } from "@/lib/utils";

interface AnalysisHistorySectionProps {
  runs: OptimizationResult[];
  onSelectRun: (run: OptimizationResult) => void;
  activeRunId?: string;
  onRefresh: () => void;
}

export const AnalysisHistorySection: React.FC<AnalysisHistorySectionProps> = ({
  runs,
  onSelectRun,
  activeRunId,
  onRefresh,
}) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-teal-600" />
            Analysis History
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Audit trail of all previous PuLP mathematical optimization runs persisted in Firebase Firestore.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {runs.length === 0 ? (
        <div className="card-clean rounded-2xl p-10 text-center text-slate-500 space-y-2">
          <History className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold">No historical runs saved yet.</p>
          <p className="text-xs text-slate-400">
            Run an optimization from the Smart Planner tab to generate and save analysis records to Firestore.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {runs.map((r, idx) => {
            const isSelected = r.run_id === activeRunId;
            const dateStr = r.timestamp
              ? new Date(r.timestamp).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : `Run #${idx + 1}`;

            return (
              <div
                key={r.run_id || idx}
                className={`card-clean rounded-2xl p-5 flex flex-col justify-between transition-all ${
                  isSelected
                    ? "ring-2 ring-teal-600 bg-teal-50/20"
                    : "hover:border-slate-300"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">
                      {r.run_id}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {dateStr}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Portfolio NPV
                    </span>
                    <span className="text-xl font-black text-emerald-700">
                      {formatINR(r.total_npv_optimized)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Allocated</span>
                      <span className="font-bold text-slate-800">
                        {formatINR(r.allocated_budget)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Selected</span>
                      <span className="font-bold text-teal-800">
                        {r.selected_count} of {r.total_projects} Projects
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={() => onSelectRun(r)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                      isSelected
                        ? "bg-teal-700 text-white"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    <span>{isSelected ? "Active in Dashboard" : "Reopen Analysis"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

