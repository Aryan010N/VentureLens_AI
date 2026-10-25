"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  Percent,
  Clock,
  Target,
  BarChart3,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  DollarSign,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { ProjectFinancials } from "@/lib/types";
import { formatINR, formatPct } from "@/lib/utils";

interface ProjectAnalysisCardsProps {
  projects: ProjectFinancials[];
}

export const ProjectAnalysisCards: React.FC<ProjectAnalysisCardsProps> = ({ projects }) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    projects.length > 0 ? projects[0].project_id : null
  );

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-400" />
            Financial Analysis & ML Valuations
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Textbook deterministic metrics combined with ML risk scoring and cash flow confidence multipliers.
          </p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-medium">
          {projects.length} Evaluated Initiatives
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {projects.map((p) => {
          const isExpanded = expandedId === p.project_id;
          const hasBreach = p.cash_flow_timeline.some((pt) => pt.breaches_reserve);

          // Prepare chart data combining timeline and scenarios
          const chartData = p.cash_flow_timeline
            .filter((pt) => pt.year > 0)
            .map((pt, idx) => ({
              year: `Year ${pt.year}`,
              Inflow: pt.inflow,
              Expected: p.scenarios.expected[idx] || pt.inflow,
              Optimistic: p.scenarios.optimistic[idx] || pt.inflow * 1.2,
              Pessimistic: p.scenarios.pessimistic[idx] || pt.inflow * 0.75,
            }));

          return (
            <div
              key={p.project_id}
              className={`glass-panel rounded-2xl border transition-all duration-200 overflow-hidden ${
                isExpanded ? "border-teal-500/40 shadow-teal-glow" : "border-slate-800 hover:border-slate-700"
              }`}
            >
              {/* Card Header */}
              <div
                onClick={() => toggleExpand(p.project_id)}
                className="p-6 cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 select-none hover:bg-slate-900/30 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-lg font-bold text-white">{p.name}</h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {p.industry_category}
                    </span>

                    {/* ML Risk Badge */}
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                        p.risk_score < 0.35
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : p.risk_score < 0.65
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      ML Risk Score: {(p.risk_score * 100).toFixed(0)}% ({p.risk_category})
                    </span>

                    {/* ML Confidence Multiplier */}
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      Realization: {(p.confidence_multiplier * 100).toFixed(1)}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Upfront Capital: <span className="text-slate-200 font-semibold">{formatINR(p.initial_cost)}</span> | Duration:{" "}
                    <span className="text-slate-200 font-semibold">{p.duration_years} Years</span>
                  </p>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                      Net Present Value
                    </span>
                    <span
                      className={`text-lg font-extrabold ${
                        p.npv >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatINR(p.npv)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                      Internal Rate (IRR)
                    </span>
                    <span className="text-lg font-extrabold text-teal-300">
                      {p.irr !== null ? formatPct(p.irr) : "N/A"}
                    </span>
                  </div>

                  <div className="p-1 rounded-lg bg-slate-800 text-slate-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Expanded Details Body */}
              {isExpanded && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-800/80 space-y-6 animate-in fade-in duration-200">
                  {/* Financial KPI Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        NPV
                      </span>
                      <p className={`text-base font-bold ${p.npv >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {formatINR(p.npv)}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-teal-400" />
                        Project IRR
                      </span>
                      <p className="text-base font-bold text-teal-300">
                        {p.irr !== null ? formatPct(p.irr) : "N/A"}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        Payback Period
                      </span>
                      <p className="text-base font-bold text-white">
                        {p.payback_period !== null ? `${p.payback_period.toFixed(2)} Yrs` : "Exceeds Lifespan"}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        Discounted Payback
                      </span>
                      <p className="text-base font-bold text-white">
                        {p.discounted_payback_period !== null
                          ? `${p.discounted_payback_period.toFixed(2)} Yrs`
                          : "Exceeds Lifespan"}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-amber-400" />
                        Profitability Index
                      </span>
                      <p className="text-base font-bold text-amber-300">
                        {p.profitability_index.toFixed(2)}x
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-violet-400" />
                        Break-Even Units
                      </span>
                      <p className="text-base font-bold text-white">
                        {p.break_even_units !== null ? `${p.break_even_units.toLocaleString()} Units` : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Cash Flow Forecast & Scenario Chart */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-teal-400" />
                        Cash-Flow Scenarios: Base, Expected (ML-Weighted), Optimistic (+20%), Pessimistic (-25%)
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        Deterministic assumptions based on historical volatility
                      </span>
                    </div>

                    <div className="h-64 w-full bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="year" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                          <YAxis
                            stroke="#64748b"
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              borderColor: "#14b8a6",
                              borderRadius: "0.75rem",
                              fontSize: "12px",
                            }}
                            formatter={(val: any) => [formatINR(Number(val)), ""]}
                          />
                          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                          <Bar dataKey="Optimistic" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Inflow" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Expected" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Pessimistic" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Sourcing & Liquidity Health */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Funding Analysis */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
                      <h5 className="font-bold text-white flex items-center justify-between">
                        <span>Capital Sourcing & Borrowing Analysis</span>
                        {p.funding_analysis.fully_funded ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Fully Funded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" /> Capital Deficit
                          </span>
                        )}
                      </h5>
                      <div className="grid grid-cols-2 gap-2 text-slate-400 pt-1">
                        <div>
                          Internal Equity:{" "}
                          <span className="font-semibold text-slate-200">
                            {formatINR(p.funding_analysis.internal_equity_allocated)}
                          </span>
                        </div>
                        <div>
                          Loan Facility Required:{" "}
                          <span className="font-semibold text-slate-200">
                            {formatINR(p.funding_analysis.loan_required)}
                          </span>
                        </div>
                        <div>
                          Annual Interest Expense:{" "}
                          <span className="font-semibold text-amber-400">
                            {formatINR(p.funding_analysis.annual_interest_expense)}
                          </span>
                        </div>
                        <div>
                          Borrowing Ratio:{" "}
                          <span className="font-semibold text-slate-200">
                            {p.funding_analysis.borrowing_ratio_pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Liquidity Reserve Status */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
                      <h5 className="font-bold text-white flex items-center justify-between">
                        <span>Liquidity Reserve Compliance</span>
                        {hasBreach ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" /> Reserve Breached
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Safe Cushion
                          </span>
                        )}
                      </h5>
                      <p className="text-slate-400 leading-relaxed">
                        {hasBreach
                          ? "This project's initial outlay or timing temporarily dips the company running cash balance below the required minimum reserve floor."
                          : "Project cash flow timeline operates safely within the company's designated minimum cash reserve cushion throughout its lifespan."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
