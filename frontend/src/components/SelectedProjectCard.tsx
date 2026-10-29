"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Shield,
  Tag,
  TrendingUp,
  Clock,
  Coins,
  Percent,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { AllocationItem } from "@/lib/types";
import { formatINR } from "@/lib/utils";

interface SelectedProjectCardProps {
  project: AllocationItem;
  discountRate: number;
}

export const SelectedProjectCard: React.FC<SelectedProjectCardProps> = ({
  project,
  discountRate,
}) => {
  const [showCalculations, setShowCalculations] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Prepare chart data with exact zero-crossing payback point
  const chartData = React.useMemo(() => {
    if (!project.year_by_year_table || project.year_by_year_table.length === 0) {
      return [];
    }

    const data: Array<{
      name: string;
      yearNum: number;
      cumulative_cash: number;
      discounted_cumulative: number;
      isPaybackPoint?: boolean;
    }> = [];

    const pb = project.simple_payback_years;
    let insertedPb = false;

    project.year_by_year_table.forEach((pt) => {
      // Check if we should insert the interpolated payback point before this year
      if (
        !insertedPb &&
        pb !== null &&
        pb !== undefined &&
        pb > 0 &&
        pt.year > Math.floor(pb)
      ) {
        data.push({
          name: `Payback (${pb.toFixed(2)}y)`,
          yearNum: pb,
          cumulative_cash: 0,
          discounted_cumulative: 0,
          isPaybackPoint: true,
        });
        insertedPb = true;
      }

      data.push({
        name: pt.year === 0 ? "Year 0" : `Yr ${pt.year}`,
        yearNum: pt.year,
        cumulative_cash: pt.cumulative_cash_flow,
        discounted_cumulative: pt.discounted_cumulative_cash_flow,
      });
    });

    return data;
  }, [project.year_by_year_table, project.simple_payback_years]);

  // Hurdle display rate
  const hurdlePct = (discountRate <= 1.0 ? discountRate * 100 : discountRate).toFixed(1);

  // 10 Metric Tiles definitions
  const metricTiles = [
    {
      id: "total_benefits",
      title: "Total Benefits",
      value: formatINR(project.total_benefits),
      formula: "Σ (Inflows)",
      meaning: "Total gross cash inflows generated over the project lifespan.",
      badge: "Inflows",
      color: "text-slate-100",
    },
    {
      id: "net_benefit",
      title: "Net Benefit",
      value: formatINR(project.net_benefit),
      formula: "Benefits − Total Investment",
      meaning: "Net economic profit created after recouping total capital outlay.",
      badge: project.net_benefit >= 0 ? "+ Profit" : "- Loss",
      color: project.net_benefit >= 0 ? "text-emerald-400" : "text-rose-400",
    },
    {
      id: "npv",
      title: "Net Present Value (NPV)",
      value: formatINR(project.npv),
      formula: "PV Benefits − Total Investment",
      meaning: "Present economic value added discounted at cost of capital (>0 accept).",
      badge: project.npv > 0 ? "Accept (>0)" : "Reject (≤0)",
      color: project.npv > 0 ? "text-emerald-300" : "text-rose-400",
    },
    {
      id: "bcr",
      title: "BCR (Profitability Index)",
      value: project.bcr !== null && project.bcr !== undefined ? project.bcr.toFixed(3) : "N/A",
      formula: "PV Benefits / Total Investment",
      meaning: "Value created per ₹1 of capital invested (>1.0 indicates viable return).",
      badge: project.bcr > 1.0 ? "> 1.0 Viable" : "≤ 1.0 Unviable",
      color: project.bcr > 1.0 ? "text-teal-300" : "text-amber-400",
    },
    {
      id: "roi",
      title: "Return on Investment (ROI)",
      value: `${project.roi_percent.toFixed(1)}%`,
      formula: "(Net Benefit / Total Inv) × 100",
      meaning: "Cumulative percentage return generated on invested funds.",
      badge: "ROI",
      color: project.roi_percent >= 0 ? "text-teal-300" : "text-rose-400",
    },
    {
      id: "annual_return",
      title: "Avg Annual Return",
      value: `${project.annual_avg_return_percent.toFixed(1)}%`,
      formula: "ROI % / Lifespan",
      meaning: "Annualized simple accounting rate of return across the horizon.",
      badge: "Per Year",
      color: "text-slate-200",
    },
    {
      id: "irr",
      title: "IRR % (vs Hurdle)",
      value:
        project.irr_percent !== null && project.irr_percent !== undefined
          ? `${project.irr_percent.toFixed(1)}%`
          : "N/A",
      formula: "NPV(r) = 0 solver",
      meaning: `Breakeven internal rate of return compared against ${hurdlePct}% hurdle rate.`,
      badge:
        project.irr_percent && project.irr_percent > parseFloat(hurdlePct)
          ? `Beats ${hurdlePct}%`
          : `Below ${hurdlePct}%`,
      color:
        project.irr_percent && project.irr_percent > parseFloat(hurdlePct)
          ? "text-emerald-400"
          : "text-amber-400",
    },
    {
      id: "simple_payback",
      title: "Simple Payback Period",
      value:
        project.simple_payback_years !== null && project.simple_payback_years !== undefined
          ? `${project.simple_payback_years.toFixed(2)} yrs`
          : "Never recovered",
      formula: "Year + (Unrecovered / Inflow)",
      meaning: "Time required for cumulative cash inflows to fully recover initial outlay.",
      badge: "Linear Interpolation",
      color: project.simple_payback_years ? "text-teal-300" : "text-rose-400",
    },
    {
      id: "discounted_payback",
      title: "Discounted Payback",
      value:
        project.discounted_payback_years !== null && project.discounted_payback_years !== undefined
          ? `${project.discounted_payback_years.toFixed(2)} yrs`
          : "Never recovered",
      formula: "Cumulative PV Inflow = Inv",
      meaning: "Time required to recover initial investment taking time value of money into account.",
      badge: "Discounted",
      color: project.discounted_payback_years ? "text-teal-200" : "text-amber-400",
    },
    {
      id: "break_even_year",
      title: "Break-Even Year",
      value:
        project.break_even_year !== null && project.break_even_year !== undefined
          ? `Year ${project.break_even_year}`
          : "Beyond Horizon",
      formula: "First Year Cum CF ≥ 0",
      meaning: "Earliest operating year where project enters positive cumulative territory.",
      badge: "Break-even",
      color: project.break_even_year ? "text-emerald-400" : "text-slate-400",
    },
  ];

  return (
    <article className="glass-panel rounded-2xl border border-teal-500/30 overflow-hidden shadow-2xl bg-gradient-to-b from-slate-900/90 to-[#0B1220]/95 print:bg-white print:text-black print:border-slate-300 print:shadow-none break-inside-avoid transition-all hover:border-teal-400/50">
      {/* 1. Header: Project Name & ACCEPT Badge */}
      <div className="p-6 border-b border-teal-500/20 bg-slate-950/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-black text-white print:text-black tracking-tight">
                {project.name}
              </h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ACCEPT
              </span>
            </div>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-1 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-teal-400" />
              <span>Industry: {project.industry_category}</span>
              <span>•</span>
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Risk: {project.risk_category} (Score: {(project.risk_score * 100).toFixed(0)}%)</span>
            </p>
          </div>
        </div>

        {/* Action / Print Tag */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-teal-300/80 bg-teal-950/40 px-3 py-1.5 rounded-xl border border-teal-800/40 print:border-slate-400 print:text-black">
            Approved Candidate
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 2. Allocation Row: Allocated Amount (₹), % of total budget, Contingency reserve, Total Investment */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 p-4 rounded-xl border border-teal-500/20 text-xs">
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[11px] block font-semibold">
              Allocated Amount
            </span>
            <span className="text-lg sm:text-xl font-black text-teal-300 print:text-black">
              {formatINR(project.allocated_amount || project.initial_cost)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[11px] block font-semibold">
              % of Total Budget
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-400 print:text-black">
              {project.share_of_budget_percent.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[11px] block font-semibold">
              Contingency Reserve ({project.contingency_pct}%)
            </span>
            <span className="text-lg sm:text-xl font-black text-amber-400 print:text-black">
              {formatINR(project.contingency_amount)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[11px] block font-semibold">
              Total Investment
            </span>
            <span className="text-lg sm:text-xl font-black text-white print:text-black">
              {formatINR(project.total_investment)}
            </span>
          </div>
        </div>

        {/* 3. Metrics Grid (10 Tiles) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-white print:text-black uppercase tracking-wider flex items-center gap-2">
              <Coins className="w-4 h-4 text-teal-400" />
              Capital Budgeting & Return Metrics
            </h4>
            <span className="text-[11px] text-slate-400">Hover tile (i) for financial interpretation</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {metricTiles.map((tile) => (
              <div
                key={tile.id}
                className="relative p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-teal-500/40 transition-all flex flex-col justify-between group print:border-slate-300 print:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="text-[11px] font-semibold text-slate-400 leading-tight">
                    {tile.title}
                  </span>
                  <div className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => setActiveTooltip(tile.id)}
                      onMouseLeave={() => setActiveTooltip(null)}
                      onClick={() => setActiveTooltip(activeTooltip === tile.id ? null : tile.id)}
                      className="text-slate-500 hover:text-teal-400 transition-colors"
                      aria-label={tile.meaning}
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                    {activeTooltip === tile.id && (
                      <div className="absolute right-0 bottom-full mb-2 z-30 w-52 p-2.5 rounded-xl bg-slate-900 border border-teal-500/50 text-[11px] text-slate-200 shadow-xl leading-snug">
                        <p className="font-bold text-teal-300 mb-1">{tile.title}</p>
                        <p>{tile.meaning}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`text-base sm:text-lg font-black tracking-tight ${tile.color} print:text-black my-1`}>
                  {tile.value}
                </div>

                <div className="pt-1.5 border-t border-slate-900 print:border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="font-mono text-[9.5px] truncate max-w-[110px]" title={tile.formula}>
                    {tile.formula}
                  </span>
                  <span className="text-teal-400/80 font-medium">{tile.badge}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Chart & Year-by-Year Table Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Cumulative Cash Flow Line Chart (7 cols) */}
          <div className="lg:col-span-7 rounded-xl p-4 bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-bold text-white print:text-black flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                Cumulative Cash Flow & Payback Cross Point
              </h5>
              {project.simple_payback_years && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold">
                  Zero crossed at {project.simple_payback_years.toFixed(2)} yrs
                </span>
              )}
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 15, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#14b8a6",
                      borderRadius: "0.75rem",
                      fontSize: "11px",
                    }}
                    formatter={(val: any) => [formatINR(Number(val)), "Cumulative Cash"]}
                  />
                  {/* Zero reference line where cumulative cash turns positive */}
                  <ReferenceLine y={0} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Break-Even (₹0)", fill: "#f59e0b", fontSize: 10, position: "top" }} />
                  {/* Payback point dot rendered via Line dot */}
                  <Line
                    type="monotone"
                    dataKey="cumulative_cash"
                    name="Cumulative Cash"
                    stroke="#14b8a6"
                    strokeWidth={2.5}
                    dot={(props: any) => {
                      const { cx, cy, payload, index } = props;
                      if (!cx || !cy || isNaN(cx) || isNaN(cy)) return <g key={`spc-empty-${index}`} />;
                      if (payload?.isPaybackPoint) {
                        return (
                          <g key={`spc-payback-${cx}-${cy}`}>
                            <circle cx={cx} cy={cy} r={6} fill="#14b8a6" stroke="#ffffff" strokeWidth={2} />
                            <text
                              x={cx}
                              y={cy - 10}
                              textAnchor="middle"
                              fill="#14b8a6"
                              fontSize={10}
                              fontWeight="bold"
                            >
                              Payback ({project.simple_payback_years?.toFixed(2)}y)
                            </text>
                          </g>
                        );
                      }
                      return <circle key={`spc-dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill="#14b8a6" />;
                    }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="discounted_cumulative"
                    name="Discounted Cumulative"
                    stroke="#60a5fa"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 mt-2">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-teal-400 inline-block" /> Undiscounted Cumulative
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-400 inline-block border-dashed" /> Discounted ({hurdlePct}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Zero Baseline
              </span>
            </div>
          </div>

          {/* Year-by-Year Table (5 cols) */}
          <div className="lg:col-span-5 rounded-xl p-3 bg-slate-950/60 border border-slate-800 flex flex-col justify-between overflow-x-auto">
            <h5 className="text-xs font-bold text-white print:text-black mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              Year-by-Year Cash Flows & Present Value
            </h5>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="py-1.5 px-2">Year</th>
                    <th className="py-1.5 px-2">Inflow</th>
                    <th className="py-1.5 px-2">DF</th>
                    <th className="py-1.5 px-2">PV</th>
                    <th className="py-1.5 px-2">Cum CF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-[11px]">
                  {project.year_by_year_table.map((row) => (
                    <tr
                      key={row.year}
                      className={row.cumulative_cash_flow >= 0 ? "bg-emerald-500/5" : ""}
                    >
                      <td className="py-1.5 px-2 font-bold text-slate-300">
                        {row.year === 0 ? "Yr 0" : `Yr ${row.year}`}
                      </td>
                      <td className="py-1.5 px-2 text-slate-200">
                        {row.year === 0 ? "−" : formatINR(row.inflow)}
                      </td>
                      <td className="py-1.5 px-2 font-mono text-slate-400 text-[10px]">
                        {row.discount_factor.toFixed(3)}
                      </td>
                      <td className="py-1.5 px-2 text-slate-200">
                        {row.year === 0 ? "−" : formatINR(row.present_value)}
                      </td>
                      <td
                        className={`py-1.5 px-2 font-semibold ${
                          row.cumulative_cash_flow >= 0 ? "text-emerald-400" : "text-slate-400"
                        }`}
                      >
                        {formatINR(row.cumulative_cash_flow)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 5. Interpretation Sentence & Risk Assessment */}
        <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider block">
              Financial Interpretation & Recommendation
            </span>
            <p className="text-sm font-medium text-slate-200 print:text-black leading-relaxed">
              {project.interpretation}
            </p>
          </div>
        </div>

        {/* 6. Collapsible "Show calculation" section with worked substitutions */}
        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40">
          <button
            type="button"
            onClick={() => setShowCalculations(!showCalculations)}
            className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-teal-400" />
              {showCalculations ? "Hide Detailed Calculations & Worked Substitutions" : "Show Calculation Formulas & Step-by-Step Worked Substitutions"}
            </span>
            {showCalculations ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showCalculations && (
            <div className="p-4 border-t border-slate-800 space-y-3 text-xs text-slate-300 font-mono bg-slate-950/80">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-teal-400 font-bold block mb-1">
                  1. Payback Period Worked Substitution:
                </span>
                <p className="text-slate-200">
                  {project.worked_calculations?.payback || "Payback calculation substitution available."}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-teal-400 font-bold block mb-1">
                  2. Net Present Value (NPV) Worked Substitution:
                </span>
                <p className="text-slate-200">
                  {project.worked_calculations?.npv || "NPV formula substitution."}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-teal-400 font-bold block mb-1">
                  3. Benefit-Cost Ratio (BCR) Substitution:
                </span>
                <p className="text-slate-200">
                  {project.worked_calculations?.bcr || "BCR formula substitution."}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-teal-400 font-bold block mb-1">
                  4. Return on Investment (ROI) Substitution:
                </span>
                <p className="text-slate-200">
                  {project.worked_calculations?.roi || "ROI formula substitution."}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-teal-400 font-bold block mb-1">
                  5. Capital Contingency Reserve Substitution:
                </span>
                <p className="text-slate-200">
                  {project.worked_calculations?.contingency || "Contingency substitution."}
                </p>
              </div>

              {/* Rules Evaluation List */}
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-teal-400 font-bold block mb-1">
                  6. Investment Decision Rules Passed:
                </span>
                <ul className="space-y-1">
                  {project.rules.map((rule, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-[11px]">
                      <span className={rule.passed ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                        {rule.passed ? "✔ PASS" : "✖ FAIL"}
                      </span>
                      <span>
                        <strong className="text-white">{rule.rule}:</strong> {rule.actual} (Threshold: {rule.threshold})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

