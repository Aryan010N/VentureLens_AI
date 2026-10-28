"use client";

import React, { useMemo } from "react";
import {
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Bot,
  Layers,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { OptimizationResult } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { SelectedProjectCard } from "./SelectedProjectCard";
import { PortfolioSummarySection } from "./PortfolioSummarySection";
import { RejectedProjectsTable } from "./RejectedProjectsTable";

interface OptimizationDashboardProps {
  result: OptimizationResult | null;
  onRunOptimization: () => Promise<void>;
  isOptimizing: boolean;
  totalCandidates: number;
}

export const OptimizationDashboard: React.FC<OptimizationDashboardProps> = ({
  result,
  onRunOptimization,
  isOptimizing,
  totalCandidates,
}) => {
  // Separate into Selected and Rejected projects
  const selectedProjects = useMemo(() => {
    if (!result?.allocations) return [];
    return result.allocations.filter((a) => a.selected);
  }, [result]);

  const rejectedProjects = useMemo(() => {
    if (!result?.allocations) return [];
    return result.allocations.filter((a) => !a.selected);
  }, [result]);

  return (
    <section className="space-y-10">
      {/* Trigger Header */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-teal-500/20 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              Portfolio Optimization Engine (PuLP / HiGHS)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Solves 0-1 binary integer linear programming: Maximize Σ NPV subject to available budget,
            minimum cash reserve, and portfolio risk tolerance.
          </p>
        </div>

        <button
          onClick={onRunOptimization}
          disabled={isOptimizing || totalCandidates === 0}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:brightness-110 text-slate-950 font-extrabold text-sm shadow-teal-glow active:scale-95 transition-all disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 ${isOptimizing ? "animate-spin" : ""}`} />
          {isOptimizing ? "Solving 0-1 Integer Model..." : "Find Optimal Portfolio"}
        </button>
      </div>

      {/* Results Dashboard Display */}
      {result && (
        <div className="space-y-10 animate-in fade-in duration-300">
          {/* Section 1: Above the Project Cards — Portfolio Summary */}
          <PortfolioSummarySection
            summary={result.portfolio_summary}
            selectedProjects={selectedProjects}
            totalBudget={result.total_budget}
            allocatedBudget={result.allocated_budget}
            unallocatedBudget={result.unallocated_budget}
            minCashReserve={result.min_cash_reserve}
            loanFacility={result.portfolio_summary?.loan_facility ?? result.constraints_summary?.loan_facility ?? 500000}
            totalNpv={result.total_npv_optimized}
          />

          {/* Section 2: Selected Project Cards with ACCEPT badge */}
          <div className="space-y-6">
            <div className="border-b border-teal-500/20 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold">
                    2
                  </span>
                  Selected Investment Cards (ACCEPT)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Individual financial cards for each initiative accepted by the optimizer. Includes metrics grid,
                  break-even cash flow line chart, year-by-year cash flow table, and worked substitutions.
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                {selectedProjects.length} Selected Projects
              </span>
            </div>

            {selectedProjects.length === 0 ? (
              <div className="p-8 text-center text-slate-400 glass-panel rounded-2xl border border-slate-800">
                No projects met the capital budget and risk criteria.
              </div>
            ) : (
              <div className="space-y-8">
                {selectedProjects.map((proj) => (
                  <SelectedProjectCard
                    key={proj.project_id}
                    project={proj}
                    discountRate={result.constraints_summary?.discount_rate || 0.12}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Below the Cards — Rejected Projects Table */}
          <div className="space-y-6">
            <div className="border-b border-rose-500/20 pb-3">
              <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold">
                  3
                </span>
                Rejected Candidate Projects
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Detailed audit trail explaining why individual candidate projects were not accommodated in the portfolio.
              </p>
            </div>

            <RejectedProjectsTable rejectedProjects={rejectedProjects} />
          </div>

          {/* Section 4: Naive Greedy Benchmark vs PuLP Solver Uplift */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-teal-500/20 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-400" />
                  PuLP Optimizer vs. Naive Greedy Benchmark
                </h4>
                {result.optimization_uplift_pct > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                    +{result.optimization_uplift_pct}% NPV Uplift
                  </span>
                )}
              </div>

              <div className="h-60 w-full bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "Naive Greedy (Highest-NPV First)",
                        NPV: result.total_npv_naive,
                      },
                      {
                        name: "VentureLens PuLP Optimal",
                        NPV: result.total_npv_optimized,
                      },
                    ]}
                    margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#14b8a6",
                        borderRadius: "0.75rem",
                        fontSize: "12px",
                      }}
                      formatter={(val: any) => [formatINR(Number(val)), "Total Portfolio NPV"]}
                    />
                    <Bar dataKey="NPV" radius={[6, 6, 0, 0]}>
                      <Cell fill="#64748b" />
                      <Cell fill="#14b8a6" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Efficiency Summary */}
            <div className="glass-panel rounded-2xl p-6 border border-teal-500/20 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Mathematical Guarantee
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Unlike greedy heuristic selection which funds the largest single projects first and exhausts budget,
                  VentureLens AI solves the binary knapsack problem to find the global maximum NPV combination that preserves
                  your liquidity floor.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Optimized Portfolio NPV:</span>
                  <span className="font-bold text-teal-400">
                    {formatINR(result.total_npv_optimized)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Naive Heuristic NPV:</span>
                  <span className="font-medium text-slate-400">
                    {formatINR(result.total_npv_naive)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                  <span>Unallocated Buffer:</span>
                  <span className="font-bold text-emerald-400">
                    {formatINR(result.unallocated_budget)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: AI Advisor Narrative */}
          <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-teal-500/20 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Bot className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  AI-Generated Recommendation & Trade-Off Analysis
                </h4>
                <p className="text-xs text-slate-400">
                  Plain-language synthesis of optimization results, capital trade-offs, and constraint satisfaction.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-950/70 border border-teal-500/15 text-slate-300 text-sm leading-relaxed whitespace-pre-line font-normal">
              {result.ai_recommendation}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
