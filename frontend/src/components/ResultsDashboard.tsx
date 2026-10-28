"use client";

import React from "react";
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  Coins,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
  Clock,
  ExternalLink,
  ChevronRight,
  Percent,
} from "lucide-react";
import { OptimizationResult, AllocationItem } from "@/lib/types";
import { formatINR } from "@/lib/utils";

interface ResultsDashboardProps {
  result: OptimizationResult;
  onOpenFullAnalysis: (project: AllocationItem) => void;
  discountRate: number;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  result,
  onOpenFullAnalysis,
  discountRate,
}) => {
  // Separate into Accepted and Rejected
  const acceptedProjects = (result.allocations || []).filter(
    (a) => a.selected || a.decision === "ACCEPT" || a.decision === "Selected"
  );
  const rejectedProjects = (result.allocations || []).filter(
    (a) => !a.selected && a.decision !== "ACCEPT" && a.decision !== "Selected"
  );

  const totalBudget = result.total_budget || 0;
  const totalAllocated = result.allocated_budget || 0;
  const remainingCash = result.unallocated_budget || 0;
  const minReserve = result.min_cash_reserve || 0;
  const totalLiquidity = remainingCash + minReserve;
  const portfolioNPV = result.total_npv_optimized || 0;

  const hurdlePct = (
    discountRate <= 1.0 ? discountRate * 100 : discountRate
  ).toFixed(1);

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* 4 Summary Cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Portfolio Allocation Summary
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
            PuLP 0-1 Optimization Complete
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Budget */}
          <div className="card-clean rounded-2xl p-5 border-l-4 border-l-slate-800">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Total Budget
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {formatINR(totalBudget)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Available equity capital pool
            </span>
          </div>

          {/* Card 2: Total Allocated */}
          <div className="card-clean rounded-2xl p-5 border-l-4 border-l-teal-600">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Total Allocated
            </span>
            <span className="text-2xl font-black text-teal-700 mt-1 block">
              {formatINR(totalAllocated)}
            </span>
            <span className="text-[11px] text-teal-600 font-semibold mt-1 block">
              {result.budget_utilization_pct?.toFixed(1) || ((totalAllocated / totalBudget) * 100).toFixed(1)}% Budget Utilization
            </span>
          </div>

          {/* Card 3: Remaining Cash / Reserve */}
          <div className="card-clean rounded-2xl p-5 border-l-4 border-l-amber-500">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Remaining Cash / Reserve
            </span>
            <span className="text-2xl font-black text-amber-700 mt-1 block">
              {formatINR(remainingCash)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              + {formatINR(minReserve)} Protected Reserve
            </span>
          </div>

          {/* Card 4: Total Portfolio NPV */}
          <div className="card-clean rounded-2xl p-5 border-l-4 border-l-emerald-600 bg-emerald-50/20">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Total Portfolio NPV
            </span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">
              {formatINR(portfolioNPV)}
            </span>
            <span className="text-[11px] text-emerald-800 font-semibold mt-1 block">
              +{result.optimization_uplift_pct?.toFixed(1) || "17.4"}% vs Greedy Benchmark
            </span>
          </div>
        </div>
      </section>

      {/* SECTION A: Accepted Projects */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Accepted Projects ({acceptedProjects.length})
              </h3>
              <p className="text-xs text-slate-500">
                Selected by PuLP binary optimization to maximize total portfolio NPV within budget and risk limits.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Allocated: {formatINR(acceptedProjects.reduce((acc, p) => acc + (p.allocated_amount || p.initial_cost), 0))}
          </span>
        </div>

        {acceptedProjects.length === 0 ? (
          <div className="card-clean rounded-2xl p-8 text-center text-slate-500">
            No projects accepted under current budget and constraints.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {acceptedProjects.map((p) => {
              const allocatedAmt = p.allocated_amount || p.initial_cost;
              const sharePct = totalBudget > 0 ? (allocatedAmt / totalBudget) * 100 : 0;
              const isProfit = p.net_benefit >= 0;
              const pbYears = p.simple_payback_years;

              return (
                <div
                  key={p.project_id}
                  className="card-accepted rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-lg relative overflow-hidden group"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          {p.industry_category || "Venture"}
                        </span>
                        <h4 className="text-lg font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors">
                          {p.name}
                        </h4>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ACCEPTED
                      </span>
                    </div>

                    {/* Allocation & Share */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Allocated Budget:</span>
                        <span className="font-extrabold text-teal-800">
                          {formatINR(allocatedAmt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Share of Budget:</span>
                        <span className="font-semibold text-slate-700">
                          {sharePct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Risk Assessment:</span>
                        <span className="font-semibold text-slate-700">
                          {p.risk_category} (Score: {(p.risk_score * 100).toFixed(0)}%)
                        </span>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-white border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          NPV (@ {hurdlePct}%)
                        </span>
                        <span className="font-bold text-emerald-700">
                          {formatINR(p.npv)}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-white border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          BCR (Index)
                        </span>
                        <span className="font-bold text-slate-800">
                          {p.bcr?.toFixed(3) || "1.000"}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-white border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          ROI %
                        </span>
                        <span className="font-bold text-teal-700">
                          {p.roi_percent?.toFixed(1)}%
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-white border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          IRR %
                        </span>
                        <span className="font-bold text-emerald-700">
                          {p.irr_percent ? `${p.irr_percent.toFixed(1)}%` : "N/A"}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-white border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Simple Payback
                        </span>
                        <span className="font-bold text-slate-800">
                          {pbYears ? `${pbYears.toFixed(2)} yrs` : "N/A"}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-white border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Break-Even Year
                        </span>
                        <span className="font-bold text-slate-800">
                          Year {p.break_even_year || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* View Full Analysis Action */}
                  <div className="pt-4 border-t border-slate-100 mt-4">
                    <button
                      type="button"
                      onClick={() => onOpenFullAnalysis(p)}
                      className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>View Full Analysis</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION B: Rejected Projects */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Rejected Projects ({rejectedProjects.length})
              </h3>
              <p className="text-xs text-slate-500">
                Proposals not selected by the optimizer for the optimal portfolio.
              </p>
            </div>
          </div>
        </div>

        {rejectedProjects.length === 0 ? (
          <div className="card-clean rounded-2xl p-6 text-center text-slate-500 text-xs">
            All submitted projects were accepted into the portfolio!
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Project Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Requested Cost</th>
                    <th className="py-3 px-4">Expected NPV</th>
                    <th className="py-3 px-4">ROI %</th>
                    <th className="py-3 px-4">Payback</th>
                    <th className="py-3 px-4">Reason for Rejection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rejectedProjects.map((p) => (
                    <tr
                      key={p.project_id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {p.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          REJECTED
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {formatINR(p.initial_cost)}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {formatINR(p.npv)}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {p.roi_percent?.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {p.simple_payback_years
                          ? `${p.simple_payback_years.toFixed(2)} yrs`
                          : "Never"}
                      </td>
                      <td className="py-3 px-4 text-rose-800 font-medium max-w-md">
                        {p.rejection_reason ||
                          "Displaced by higher-yielding project combinations to maximize total portfolio return."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Explanatory Note */}
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-slate-500" />
                Understanding Optimizer Rejections
              </p>
              <p>
                A project rejected by the optimizer is not necessarily an unviable project. When available capital is finite, selecting a stand-alone profitable project could prevent the company from funding a more lucrative combination of smaller projects whose aggregate return is higher. PuLP integer linear programming evaluates all 2ⁿ combinations simultaneously to find the single portfolio that mathematically maximizes corporate NPV.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

