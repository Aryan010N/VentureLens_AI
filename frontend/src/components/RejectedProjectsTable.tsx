"use client";

import React from "react";
import { XCircle, AlertCircle, Info, ShieldAlert } from "lucide-react";
import { AllocationItem } from "@/lib/types";
import { formatINR } from "@/lib/utils";

interface RejectedProjectsTableProps {
  rejectedProjects: AllocationItem[];
}

export const RejectedProjectsTable: React.FC<RejectedProjectsTableProps> = ({
  rejectedProjects,
}) => {
  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-6 border border-rose-500/20 bg-slate-950/60 shadow-xl print:bg-white print:border-slate-300">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <h4 className="text-lg font-bold text-white print:text-black flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400">
              <XCircle className="w-5 h-5" />
            </span>
            Rejected Candidate Projects & Exclusion Justification
          </h4>
          <span className="text-xs text-rose-300/80 font-mono">
            {rejectedProjects.length} {rejectedProjects.length === 1 ? "project" : "projects"} excluded
          </span>
        </div>

        {rejectedProjects.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">
            All candidate projects were successfully accommodated within the capital budget and risk ceiling.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Project Name</th>
                  <th className="py-3 px-4 font-semibold">Cost</th>
                  <th className="py-3 px-4 font-semibold">Expected NPV</th>
                  <th className="py-3 px-4 font-semibold">ROI %</th>
                  <th className="py-3 px-4 font-semibold">Payback Period</th>
                  <th className="py-3 px-4 font-semibold">Rejection Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
                {rejectedProjects.map((p) => (
                  <tr key={p.project_id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 text-white font-bold">{p.name}</td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {formatINR(p.initial_cost)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-300">
                      {formatINR(p.npv)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {p.roi_percent !== null && p.roi_percent !== undefined
                        ? `${p.roi_percent.toFixed(1)}%`
                        : "N/A"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {p.simple_payback_years !== null && p.simple_payback_years !== undefined
                        ? `${p.simple_payback_years.toFixed(2)} yrs`
                        : "Never recovered"}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-rose-300/90 max-w-md">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20">
                        {p.rejection_reason || "Displaced by higher-yielding project combinations."}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Explanatory Paragraph */}
        <div className="mt-5 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-3">
          <Info className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-white block mb-0.5">Optimizer Selection Rationale:</strong>
            The VentureLens PuLP mathematical optimization engine selected the optimal subset of candidate projects
            that maximizes aggregate Portfolio Net Present Value (NPV) while strictly honoring your available capital
            budget, liquidity cash reserve floor, and risk ceiling. Projects listed above were excluded either due to
            non-positive returns, risk ceiling breaches, budget exhaustion, or because alternative project combinations
            generated superior cumulative economic yield for the enterprise.
          </div>
        </div>
      </div>
    </div>
  );
};

