"use client";

import React, { useState, useMemo } from "react";
import {
  Wallet,
  CheckCircle2,
  PieChart as PieChartIcon,
  ArrowUpDown,
  Award,
  Printer,
  TrendingUp,
  Percent,
  Clock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { AllocationItem, PortfolioSummary } from "@/lib/types";
import { formatINR, formatPct } from "@/lib/utils";

interface PortfolioSummarySectionProps {
  summary?: PortfolioSummary;
  selectedProjects: AllocationItem[];
  totalBudget: number;
  allocatedBudget: number;
  unallocatedBudget: number;
  minCashReserve: number;
  loanFacility: number;
  totalNpv: number;
}

const PIE_COLORS = ["#14b8a6", "#10b981", "#06b6d4", "#6366f1", "#f59e0b", "#ec4899"];

export const PortfolioSummarySection: React.FC<PortfolioSummarySectionProps> = ({
  summary,
  selectedProjects,
  totalBudget,
  allocatedBudget,
  unallocatedBudget,
  minCashReserve,
  loanFacility,
  totalNpv,
}) => {
  const [sortField, setSortField] = useState<"npv" | "roi_percent" | "irr_percent" | "simple_payback_years">("npv");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Compute portfolio metrics if summary object is not fully populated
  const portfolioMetrics = useMemo(() => {
    const totInv = selectedProjects.reduce((acc, p) => acc + (p.total_investment || p.initial_cost), 0);
    const totNet = selectedProjects.reduce((acc, p) => acc + (p.net_benefit || 0), 0);
    const totPv = selectedProjects.reduce((acc, p) => acc + (p.pv_of_benefits || 0), 0);

    const roi = summary?.portfolio_roi_percent ?? (totInv > 0 ? (totNet / totInv) * 100 : 0);
    const bcr = summary?.portfolio_bcr ?? (totInv > 0 ? totPv / totInv : 0);

    const validPb = selectedProjects.filter((p) => p.simple_payback_years !== null && p.simple_payback_years !== undefined);
    const weightedPb =
      summary?.weighted_average_payback ??
      (validPb.length > 0
        ? validPb.reduce((acc, p) => acc + (p.simple_payback_years! * p.total_investment), 0) /
          validPb.reduce((acc, p) => acc + p.total_investment, 0)
        : null);

    return {
      budget: summary?.total_budget ?? totalBudget,
      allocated: summary?.total_allocated ?? allocatedBudget,
      unallocated: summary?.unallocated_cash ?? unallocatedBudget,
      minReserve: summary?.min_cash_reserve ?? minCashReserve,
      loanFacility: summary?.loan_facility ?? loanFacility,
      loanUsed: summary?.loan_facility_used ?? 0,
      npv: summary?.portfolio_npv ?? totalNpv,
      roi: roi,
      bcr: bcr,
      weightedPayback: weightedPb,
    };
  }, [summary, selectedProjects, totalBudget, allocatedBudget, unallocatedBudget, minCashReserve, loanFacility, totalNpv]);

  // Budget Split Chart Data
  const pieData = useMemo(() => {
    const data = selectedProjects.map((p) => ({
      name: p.name,
      value: p.allocated_amount || p.initial_cost,
    }));
    if (portfolioMetrics.unallocated > 0) {
      data.push({
        name: "Unallocated Cash Reserve",
        value: portfolioMetrics.unallocated,
      });
    }
    return data;
  }, [selectedProjects, portfolioMetrics.unallocated]);

  // Identify Best Values for Highlighting
  const bestValues = useMemo(() => {
    if (selectedProjects.length === 0) return { npv: 0, roi: 0, irr: 0, payback: 0 };
    const maxNpv = Math.max(...selectedProjects.map((p) => p.npv));
    const maxRoi = Math.max(...selectedProjects.map((p) => p.roi_percent));
    const validIrrs = selectedProjects.map((p) => p.irr_percent).filter((v): v is number => v !== null && v !== undefined);
    const maxIrr = validIrrs.length > 0 ? Math.max(...validIrrs) : -Infinity;
    const validPbs = selectedProjects.map((p) => p.simple_payback_years).filter((v): v is number => v !== null && v !== undefined);
    const minPb = validPbs.length > 0 ? Math.min(...validPbs) : Infinity;

    return {
      npv: maxNpv,
      roi: maxRoi,
      irr: maxIrr,
      payback: minPb,
    };
  }, [selectedProjects]);

  // Sorted Selected Projects Table
  const sortedProjects = useMemo(() => {
    return [...selectedProjects].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA === null || valA === undefined) valA = sortAsc ? Infinity : -Infinity;
      if (valB === null || valB === undefined) valB = sortAsc ? Infinity : -Infinity;
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [selectedProjects, sortField, sortAsc]);

  const toggleSort = (field: "npv" | "roi_percent" | "irr_percent" | "simple_payback_years") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Header with Print Button */}
      <div className="glass-panel rounded-2xl p-6 border border-teal-500/25 bg-gradient-to-r from-slate-950 via-[#0B1220] to-slate-900 shadow-2xl flex flex-wrap items-center justify-between gap-4 print:border-slate-400">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400">
              <Wallet className="w-5 h-5" />
            </span>
            <h3 className="text-2xl font-black text-white print:text-black tracking-tight">
              Executive Portfolio Summary
            </h3>
          </div>
          <p className="text-xs text-slate-400 print:text-slate-600">
            Optimal capital allocation solving binary integer programming under capital, reserve, and risk limits.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-teal-500/30 text-teal-300 font-bold text-xs shadow-md transition-all active:scale-95 print:hidden"
        >
          <Printer className="w-4 h-4" />
          Print / Export PDF Report
        </button>
      </div>

      {/* Row 1: Capital & Liquidity Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="glass-panel rounded-xl p-4 border border-slate-800 bg-slate-950/60 print:bg-slate-50 print:border-slate-300">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Budget
          </span>
          <div className="text-2xl font-black text-white print:text-black my-1">
            {formatINR(portfolioMetrics.budget)}
          </div>
          <span className="text-[10px] text-teal-400">Available Capital</span>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-teal-500/30 bg-slate-950/60 print:bg-slate-50 print:border-slate-300">
          <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider block">
            Total Allocated
          </span>
          <div className="text-2xl font-black text-teal-300 print:text-black my-1">
            {formatINR(portfolioMetrics.allocated)}
          </div>
          <span className="text-[10px] text-slate-400">
            {((portfolioMetrics.allocated / portfolioMetrics.budget) * 100).toFixed(1)}% Deployed
          </span>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-800 bg-slate-950/60 print:bg-slate-50 print:border-slate-300">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Unallocated Cash
          </span>
          <div className="text-2xl font-black text-emerald-400 print:text-black my-1">
            {formatINR(portfolioMetrics.unallocated)}
          </div>
          <span className="text-[10px] text-emerald-300">Available Cushion</span>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-800 bg-slate-950/60 print:bg-slate-50 print:border-slate-300">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Min Cash Reserve Kept
          </span>
          <div className="text-2xl font-black text-slate-200 print:text-black my-1">
            {formatINR(portfolioMetrics.minReserve)}
          </div>
          <span className="text-[10px] text-amber-400">Preserved Liquidity Floor</span>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-800 bg-slate-950/60 print:bg-slate-50 print:border-slate-300">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Loan Facility Used
          </span>
          <div className="text-2xl font-black text-slate-300 print:text-black my-1">
            {formatINR(portfolioMetrics.loanUsed)}
          </div>
          <span className="text-[10px] text-slate-400">
            Facility: {formatINR(portfolioMetrics.loanFacility)}
          </span>
        </div>
      </div>

      {/* Row 2: Portfolio Return & Health Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="glass-panel rounded-xl p-4 border border-emerald-500/30 bg-slate-950/70 print:bg-slate-50 print:border-slate-300">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
            Portfolio Total NPV
          </span>
          <div className="text-2xl font-black text-emerald-300 print:text-black my-1">
            {formatINR(portfolioMetrics.npv)}
          </div>
          <span className="text-[10px] text-slate-400">Total Discounted Value Created</span>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-teal-500/30 bg-slate-950/70 print:bg-slate-50 print:border-slate-300">
          <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider block">
            Portfolio ROI %
          </span>
          <div className="text-2xl font-black text-teal-300 print:text-black my-1">
            {portfolioMetrics.roi.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400">Cumulative Return on Outlay</span>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-800 bg-slate-950/70 print:bg-slate-50 print:border-slate-300">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Portfolio BCR (Index)
          </span>
          <div className="text-2xl font-black text-white print:text-black my-1">
            {portfolioMetrics.bcr.toFixed(3)}
          </div>
          <span className="text-[10px] text-teal-400">Benefit-to-Cost Ratio</span>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-800 bg-slate-950/70 print:bg-slate-50 print:border-slate-300">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Weighted Avg Payback
          </span>
          <div className="text-2xl font-black text-amber-300 print:text-black my-1">
            {portfolioMetrics.weightedPayback !== null ? `${portfolioMetrics.weightedPayback.toFixed(2)} yrs` : "N/A"}
          </div>
          <span className="text-[10px] text-slate-400">Capital-Weighted Recovery</span>
        </div>
      </div>

      {/* Row 3: Budget Split Pie Chart & Comparison Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pie Chart (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 border border-teal-500/20 bg-slate-950/60 print:bg-slate-50 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
            <h4 className="text-xs font-bold text-white print:text-black uppercase tracking-wider flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-teal-400" />
              Budget Allocation Split
            </h4>
            <span className="text-[11px] text-teal-300 font-mono">
              {formatINR(portfolioMetrics.allocated)} committed
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.name.includes("Unallocated") ? "#475569" : PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#14b8a6",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [formatINR(Number(val)), "Allocation"]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sortable Comparison Table with Best Values Highlighted (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 border border-teal-500/20 bg-slate-950/60 print:bg-slate-50 flex flex-col justify-between overflow-x-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
            <h4 className="text-xs font-bold text-white print:text-black uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Selected Projects Comparison (Sortable)
            </h4>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Best value highlighted in green
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider">
                  <th className="py-2 px-3 font-semibold">Project</th>
                  <th className="py-2 px-3 font-semibold">Cost</th>
                  <th
                    onClick={() => toggleSort("npv")}
                    className="py-2 px-3 font-semibold cursor-pointer hover:text-teal-300 transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      NPV <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleSort("roi_percent")}
                    className="py-2 px-3 font-semibold cursor-pointer hover:text-teal-300 transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      ROI % <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleSort("irr_percent")}
                    className="py-2 px-3 font-semibold cursor-pointer hover:text-teal-300 transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      IRR % <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleSort("simple_payback_years")}
                    className="py-2 px-3 font-semibold cursor-pointer hover:text-teal-300 transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      Payback <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="py-2 px-3 font-semibold">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
                {sortedProjects.map((p) => {
                  const isBestNpv = p.npv === bestValues.npv;
                  const isBestRoi = p.roi_percent === bestValues.roi;
                  const isBestIrr = p.irr_percent !== null && p.irr_percent === bestValues.irr;
                  const isBestPayback = p.simple_payback_years !== null && p.simple_payback_years === bestValues.payback;

                  return (
                    <tr key={p.project_id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-3 px-3 text-white font-bold">{p.name}</td>
                      <td className="py-3 px-3 text-slate-300">
                        {formatINR(p.allocated_amount || p.initial_cost)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={
                            isBestNpv
                              ? "px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                              : "text-slate-200"
                          }
                        >
                          {formatINR(p.npv)} {isBestNpv && "★"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={
                            isBestRoi
                              ? "px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                              : "text-slate-200"
                          }
                        >
                          {p.roi_percent.toFixed(1)}% {isBestRoi && "★"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={
                            isBestIrr
                              ? "px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                              : "text-slate-200"
                          }
                        >
                          {p.irr_percent !== null && p.irr_percent !== undefined
                            ? `${p.irr_percent.toFixed(1)}%`
                            : "N/A"}{" "}
                          {isBestIrr && "★"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={
                            isBestPayback
                              ? "px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                              : "text-slate-200"
                          }
                        >
                          {p.simple_payback_years !== null && p.simple_payback_years !== undefined
                            ? `${p.simple_payback_years.toFixed(2)}y`
                            : "N/A"}{" "}
                          {isBestPayback && "★"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {p.risk_category}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
