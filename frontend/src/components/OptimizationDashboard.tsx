"use client";

import React from "react";
import {
  Sparkles,
  PieChart,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ShieldCheck,
  AlertOctagon,
  ArrowUpRight,
  FileText,
  DollarSign,
  Layers,
  ChevronRight,
  Bot,
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
import { formatINR, formatPct } from "@/lib/utils";

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
  return (
    <section className="space-y-8">
      {/* Trigger Header */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-teal-500/20 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              Portfolio Optimization Engine (PuLP)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Solves 0-1 binary integer linear programming: Maximize Σ NPV subject to capital ceiling,
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
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Section Banner */}
          <div className="border-b border-teal-500/20 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-2xl font-black text-white">
                  Investment Decision Dashboard
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Optimized portfolio results for{" "}
                  <span className="text-teal-400 font-semibold">
                    {formatINR(result.total_budget)}
                  </span>{" "}
                  investment budget.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                Run ID: {result.run_id} | {new Date(result.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* 4 Core KPI Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Allocated Budget */}
            <div className="glass-panel rounded-2xl p-5 border border-teal-500/25 space-y-2 relative overflow-hidden">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Investment Allocated
              </span>
              <div className="text-3xl font-black text-teal-300">
                {formatINR(result.allocated_budget)}
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                <span className="text-slate-400">Budget Utilization:</span>
                <span className="font-bold text-teal-400">
                  {result.budget_utilization_pct.toFixed(1)}% of budget
                </span>
              </div>
            </div>

            {/* KPI 2: Unallocated Budget */}
            <div className="glass-panel rounded-2xl p-5 border border-teal-500/25 space-y-2 relative overflow-hidden">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Unallocated Budget
              </span>
              <div className="text-3xl font-black text-slate-100">
                {formatINR(result.unallocated_budget)}
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-emerald-400">Available Reserve</span>
              </div>
            </div>

            {/* KPI 3: Projects Selected */}
            <div className="glass-panel rounded-2xl p-5 border border-teal-500/25 space-y-2 relative overflow-hidden">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Projects Selected
              </span>
              <div className="text-3xl font-black text-white">
                {result.selected_count}{" "}
                <span className="text-base font-normal text-slate-400">
                  of {result.total_projects}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                <span className="text-slate-400">Selection Method:</span>
                <span className="font-bold text-teal-400">Subject to Optimisation</span>
              </div>
            </div>

            {/* KPI 4: Total Portfolio NPV */}
            <div className="glass-panel rounded-2xl p-5 border border-teal-500/25 space-y-2 relative overflow-hidden">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Total Portfolio NPV
              </span>
              <div className="text-3xl font-black text-emerald-400">
                {formatINR(result.total_npv_optimized)}
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                <span className="text-slate-400">Risk Assessment:</span>
                <span className="font-bold text-teal-300">
                  Evaluated (Score: {(result.portfolio_risk_score * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>

          {/* 1. Recommended Investment Allocation Table */}
          <div className="glass-panel rounded-2xl p-6 border border-teal-500/20 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold">
                  1
                </span>
                Recommended Investment Allocation
              </h4>
              <span className="text-xs text-slate-400">
                Calculated by PuLP binary integer allocator
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Project</th>
                    <th className="py-3 px-4 font-semibold">Investment</th>
                    <th className="py-3 px-4 font-semibold">Expected NPV</th>
                    <th className="py-3 px-4 font-semibold">Decision</th>
                    <th className="py-3 px-4 font-semibold">Decision Rationale / Trade-Off</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {result.allocations.map((a) => {
                    const isSel = a.decision === "Selected";
                    return (
                      <tr
                        key={a.project_id}
                        className={`transition-colors ${
                          isSel ? "bg-teal-500/5 hover:bg-teal-500/10" : "hover:bg-slate-900/50"
                        }`}
                      >
                        <td className="py-3.5 px-4 text-white font-bold">{a.name}</td>
                        <td className="py-3.5 px-4 text-slate-200">{formatINR(a.initial_cost)}</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-400">
                          {formatINR(a.npv)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                              isSel
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                            }`}
                          >
                            {isSel ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" /> Not selected
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-400 max-w-md">
                          {isSel ? (
                            <span className="text-teal-300/90 font-medium">
                              Approved: Optimal financial yield within capital and risk limits.
                            </span>
                          ) : (
                            <span className="text-rose-300/80">{a.rejection_reason}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Naive vs. Optimized Benchmark Comparison */}
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

            {/* Quick Summary Card */}
            <div className="glass-panel rounded-2xl p-6 border border-teal-500/20 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Allocation Efficiency
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Unlike greedy heuristic selection which blindly funds the largest single projects first,
                  VentureLens AI solves the binary knapsack problem to find the global maximum NPV
                  combination that preserves your liquidity floor.
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

          {/* 3. AI-Generated Recommendation & Trade-Off Analysis */}
          <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-teal-500/20 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Bot className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold">
                    3
                  </span>
                  AI-Generated Recommendation & Narrative
                </h4>
                <p className="text-xs text-slate-400">
                  Plain-language synthesis of optimization results, capital trade-offs, and constraint satisfaction.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-950/70 border border-teal-500/15 text-slate-300 text-sm leading-relaxed whitespace-pre-line font-normal">
              {result.ai_recommendation}
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 space-y-2">
              <h5 className="font-bold text-white">VentureLens AI Decision Summary:</h5>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 list-disc list-inside">
                <li>Selected {result.selected_count} high-return initiatives fitting budget.</li>
                <li>Allocated ₹{(result.allocated_budget / 100000).toFixed(2)} Lakh safely within capital pool.</li>
                <li>Retains ₹{(result.unallocated_budget / 100000).toFixed(2)} Lakh reserve cushion.</li>
                <li>Satisfies portfolio risk tolerance constraint.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
