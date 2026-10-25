"use client";

import React from "react";
import { History, Clock, ArrowRight, CheckCircle2, DollarSign, TrendingUp } from "lucide-react";
import { OptimizationResult } from "@/lib/types";
import { formatINR } from "@/lib/utils";

interface RunHistoryProps {
  runs: OptimizationResult[];
  onSelectRun: (run: OptimizationResult) => void;
  selectedRunId?: string;
}

export const RunHistory: React.FC<RunHistoryProps> = ({
  runs,
  onSelectRun,
  selectedRunId,
}) => {
  if (!runs || runs.length === 0) {
    return null;
  }

  return (
    <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-teal-500/20 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Optimization Run History
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-teal-300 font-mono">
                {runs.length} Saved in Firestore
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Historical record of previous portfolio evaluations for scenario comparison.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        {runs.map((r) => {
          const isCurrent = r.run_id === selectedRunId;
          const dateStr = new Date(r.timestamp).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          });

          return (
            <div
              key={r.run_id}
              onClick={() => onSelectRun(r)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isCurrent
                  ? "bg-teal-500/10 border-teal-400 shadow-teal-sm"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-mono text-teal-300 font-semibold">{r.run_id}</span>
                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <Clock className="w-3 h-3" />
                  {dateStr}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Selected Projects:</span>
                  <span className="font-bold text-white">
                    {r.selected_count} of {r.total_projects}
                  </span>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Allocated Budget:</span>
                  <span className="font-semibold text-teal-400">
                    {formatINR(r.allocated_budget)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Total Portfolio NPV:</span>
                  <span className="font-bold text-emerald-400">
                    {formatINR(r.total_npv_optimized)}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  Reserve: {formatINR(r.unallocated_budget)}
                </span>
                <span className="inline-flex items-center gap-1 text-teal-400 font-semibold">
                  View Run <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
