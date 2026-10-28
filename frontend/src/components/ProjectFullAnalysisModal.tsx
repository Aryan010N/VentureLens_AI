"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  TrendingUp,
  CheckCircle2,
  Tag,
  Shield,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  DollarSign,
  Percent,
  Clock,
  Coins,
  FileText,
  AlertCircle,
  HelpCircle,
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
  ReferenceDot,
} from "recharts";
import { AllocationItem } from "@/lib/types";
import { formatINR } from "@/lib/utils";

interface ProjectFullAnalysisModalProps {
  project: AllocationItem | null;
  onClose: () => void;
  discountRate: number;
}

export const ProjectFullAnalysisModal: React.FC<ProjectFullAnalysisModalProps> = ({
  project,
  onClose,
  discountRate,
}) => {
  const [showFormulas, setShowFormulas] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  if (!project) return null;

  const hurdlePct = (
    discountRate <= 1.0 ? discountRate * 100 : discountRate
  ).toFixed(1);

  // Prepare zero-crossing chart data
  const chartData = useMemo(() => {
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

  // Payback point for ReferenceDot
  const paybackPoint = chartData.find((d) => d.isPaybackPoint);

  // 10 Capital Budgeting Metric Cards
  const metricCards = [
    {
      id: "total_benefits",
      title: "1. Total Benefits",
      value: formatINR(project.total_benefits),
      formula: "Total Benefits = Σ (Annual Cash Inflows)",
      example: `Sum of expected gross cash inflows = ${formatINR(project.total_benefits)}`,
      meaning: "Total undiscounted cash inflows generated over the project lifespan.",
      badge: "Inflows",
      color: "text-slate-900",
    },
    {
      id: "net_benefit",
      title: "2. Net Benefit",
      value: formatINR(project.net_benefit),
      formula: "Net Benefit = Total Benefits − Total Investment",
      example: `${formatINR(project.total_benefits)} − ${formatINR(project.total_investment)} = ${formatINR(project.net_benefit)}`,
      meaning: "Total economic profit after recovering the initial investment and contingency.",
      badge: project.net_benefit >= 0 ? "+ Profit" : "- Loss",
      color: project.net_benefit >= 0 ? "text-emerald-700" : "text-rose-700",
    },
    {
      id: "npv",
      title: "3. Net Present Value (NPV)",
      value: formatINR(project.npv),
      formula: "NPV = −I₀ + Σ [CFₜ / (1+r)ᵗ]",
      example: `Discounted at ${hurdlePct}% hurdle rate: ${formatINR(project.npv)}`,
      meaning: "Net economic value added in today's money (>0 creates wealth).",
      badge: project.npv > 0 ? "Accept (>0)" : "Reject (≤0)",
      color: project.npv > 0 ? "text-emerald-700" : "text-rose-700",
    },
    {
      id: "bcr",
      title: "4. Benefit-Cost Ratio (BCR)",
      value: project.bcr !== null && project.bcr !== undefined ? project.bcr.toFixed(3) : "N/A",
      formula: "BCR = Present Value of Benefits / Total Investment",
      example: `${formatINR(project.pv_of_benefits)} / ${formatINR(project.total_investment)} = ${project.bcr?.toFixed(3)}`,
      meaning: "Discounted value created per ₹1 of capital invested (>1.0 indicates viable capital efficiency).",
      badge: project.bcr > 1.0 ? "> 1.0 Viable" : "≤ 1.0",
      color: project.bcr > 1.0 ? "text-teal-700" : "text-amber-700",
    },
    {
      id: "roi",
      title: "5. Return on Investment (ROI)",
      value: `${project.roi_percent?.toFixed(1)}%`,
      formula: "ROI (%) = [(Total Benefits − Total Investment) / Total Investment] × 100",
      example: `[(${formatINR(project.total_benefits)} − ${formatINR(project.total_investment)}) / ${formatINR(project.total_investment)}] × 100 = ${project.roi_percent?.toFixed(1)}%`,
      meaning: "Cumulative percentage return generated on invested funds.",
      badge: "ROI",
      color: project.roi_percent >= 0 ? "text-teal-700" : "text-rose-700",
    },
    {
      id: "annual_roi",
      title: "6. Average Annual ROI",
      value: `${project.annual_avg_return_percent?.toFixed(1)}%`,
      formula: "Average Annual ROI = Total ROI (%) / Project Lifespan",
      example: `${project.roi_percent?.toFixed(1)}% / ${project.lifespan || 5} yrs = ${project.annual_avg_return_percent?.toFixed(1)}% per yr`,
      meaning: "Annualized simple accounting return across the planning horizon.",
      badge: "Per Year",
      color: "text-slate-800",
    },
    {
      id: "irr",
      title: "7. Internal Rate of Return (IRR)",
      value: project.irr_percent !== null && project.irr_percent !== undefined ? `${project.irr_percent.toFixed(1)}%` : "N/A",
      formula: "IRR = discount rate where NPV(r) = 0",
      example: `IRR = ${project.irr_percent?.toFixed(1)}% vs Hurdle Rate = ${hurdlePct}%`,
      meaning: `Breakeven return rate. ${project.irr_percent && project.irr_percent > parseFloat(hurdlePct) ? "Exceeds hurdle rate, adding shareholder value." : "Below hurdle rate."}`,
      badge: project.irr_percent && project.irr_percent > parseFloat(hurdlePct) ? "Beats Hurdle" : "Below Hurdle",
      color: project.irr_percent && project.irr_percent > parseFloat(hurdlePct) ? "text-emerald-700" : "text-amber-700",
    },
    {
      id: "simple_payback",
      title: "8. Simple Payback Period",
      value: project.simple_payback_years !== null && project.simple_payback_years !== undefined ? `${project.simple_payback_years.toFixed(2)} yrs` : "Never recovered",
      formula: "Payback = (T−1) + (Unrecovered Inflow / CF_T)",
      example: project.worked_calculations?.payback || `Recovers investment in ${project.simple_payback_years?.toFixed(2)} years`,
      meaning: "Time required for undiscounted cash inflows to fully recover initial outlay.",
      badge: "Linear Interpolation",
      color: project.simple_payback_years ? "text-teal-700" : "text-rose-700",
    },
    {
      id: "discounted_payback",
      title: "9. Discounted Payback Period",
      value: project.discounted_payback_years !== null && project.discounted_payback_years !== undefined ? `${project.discounted_payback_years.toFixed(2)} yrs` : "Never recovered",
      formula: "Same interpolation applied on discounted inflows PV(CF_t)",
      example: `Recovers capital taking time value of money into account: ${project.discounted_payback_years?.toFixed(2)} yrs`,
      meaning: "Capital recovery period taking the time value of money into account.",
      badge: "Discounted",
      color: project.discounted_payback_years ? "text-teal-700" : "text-amber-700",
    },
    {
      id: "break_even_year",
      title: "10. Break-Even Year",
      value: project.break_even_year ? `Year ${project.break_even_year}` : "Beyond Horizon",
      formula: "First Year where Cumulative Cash Flow ≥ 0",
      example: `Enters positive cumulative territory in Year ${project.break_even_year}`,
      meaning: "Earliest operating year where project recovers its total investment.",
      badge: "Break-even",
      color: project.break_even_year ? "text-emerald-700" : "text-slate-600",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {project.name}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ACCEPTED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Full Financial Analysis, Capital Budgeting Metrics & Cash Flow Schedules
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-6 space-y-8 overflow-y-auto flex-1">
          {/* A. Project Overview Card */}
          <section className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Tag className="w-4 h-4 text-teal-600" />
              A. Project Overview & Capital Outlays
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Industry Sector</span>
                <span className="font-bold text-slate-900 text-sm">{project.industry_category}</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Risk Profile</span>
                <span className="font-bold text-slate-900 text-sm">
                  {project.risk_category} (Score: {(project.risk_score * 100).toFixed(0)}%)
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Initial Cost</span>
                <span className="font-bold text-slate-900 text-sm">{formatINR(project.initial_cost)}</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Allocated Budget</span>
                <span className="font-black text-teal-800 text-sm">
                  {formatINR(project.allocated_amount || project.initial_cost)}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Total Investment</span>
                <span className="font-black text-slate-900 text-sm">
                  {formatINR(project.total_investment)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              <span><strong>Lifespan:</strong> {project.lifespan || 5} Years</span>
              <span>•</span>
              <span><strong>Contingency Reserve:</strong> {project.contingency_pct || 0}% ({formatINR(project.contingency_amount || 0)})</span>
              <span>•</span>
              <span><strong>Budget Share:</strong> {project.share_of_budget_percent?.toFixed(1)}%</span>
            </div>
          </section>

          {/* B. Capital Budgeting and Return Metrics (10 separate cards) */}
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Coins className="w-4 h-4 text-teal-600" />
              B. Capital Budgeting & Return Metrics (10 Core Dimensions)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {metricCards.map((m) => (
                <div
                  key={m.id}
                  className="card-clean rounded-xl p-3.5 flex flex-col justify-between hover:border-teal-400 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-700">{m.title}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {m.badge}
                      </span>
                    </div>
                    <span className={`text-lg font-black ${m.color} block my-1`}>
                      {m.value}
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono leading-tight">
                      {m.formula}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 mt-2">
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {m.meaning}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* C. Cash Flow Chart */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                C. Cumulative Cash Flow & Payback Point (Zero-Crossing)
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                Baseline crossing = Capital Recovery Point
              </span>
            </div>

            <div className="card-clean rounded-2xl p-4 bg-slate-50/50">
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 15, right: 25, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="name"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748B"
                      fontSize={11}
                      tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatINR(Number(val)), "Cash Flow"]}
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        color: "#F8FAFC",
                        fontSize: "12px",
                      }}
                    />
                    {/* Zero baseline */}
                    <ReferenceLine
                      y={0}
                      stroke="#0F172A"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{
                        value: "Break-Even Baseline (₹0)",
                        position: "insideBottomRight",
                        fill: "#475569",
                        fontSize: 10,
                      }}
                    />
                    {/* Payback point marked where line crosses zero */}
                    {paybackPoint && (
                      <ReferenceDot
                        x={paybackPoint.name}
                        y={0}
                        r={7}
                        fill="#0D9488"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        label={{
                          value: `Payback (${project.simple_payback_years?.toFixed(2)}y)`,
                          position: "top",
                          fill: "#0D9488",
                          fontSize: 11,
                          fontWeight: "bold",
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="cumulative_cash"
                      name="Cumulative Cash Flow"
                      stroke="#0D9488"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#0D9488" }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="discounted_cumulative"
                      name="Discounted Cumulative"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={{ r: 3, fill: "#3B82F6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-teal-600" />
                  <span className="font-semibold text-slate-700">Cumulative Cash Flow (Undiscounted)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="font-semibold text-slate-700">Discounted Cumulative (Present Value)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 border-t-2 border-dashed border-slate-900" />
                  <span className="font-semibold text-slate-700">Zero Baseline (₹0 Recovery)</span>
                </div>
              </div>
            </div>
          </section>

          {/* D. Year-by-Year Cash Flow Table */}
          <section className="space-y-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              D. Year-by-Year Cash Flow & Present Value Schedule
            </h4>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Year</th>
                    <th className="py-2.5 px-4">Annual Cash Flow</th>
                    <th className="py-2.5 px-4">Discount Factor (DF)</th>
                    <th className="py-2.5 px-4">Present Value (PV)</th>
                    <th className="py-2.5 px-4">Cumulative Cash Flow</th>
                    <th className="py-2.5 px-4">Discounted Cumulative</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-mono">
                  {(project.year_by_year_table || []).map((row) => (
                    <tr
                      key={row.year}
                      className={`hover:bg-slate-50 transition-colors ${
                        row.year === 0 ? "bg-slate-50/60 font-semibold" : ""
                      }`}
                    >
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-900">
                        {row.year === 0 ? "Year 0 (Outlay)" : `Year ${row.year}`}
                      </td>
                      <td
                        className={`py-2.5 px-4 ${
                          row.inflow < 0 ? "text-rose-700 font-bold" : "text-slate-800"
                        }`}
                      >
                        {formatINR(row.inflow)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {row.discount_factor?.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-4 text-teal-800 font-bold">
                        {row.present_value !== 0 ? formatINR(row.present_value) : "—"}
                      </td>
                      <td
                        className={`py-2.5 px-4 font-bold ${
                          row.cumulative_cash_flow >= 0
                            ? "text-emerald-700"
                            : "text-rose-600"
                        }`}
                      >
                        {formatINR(row.cumulative_cash_flow)}
                      </td>
                      <td
                        className={`py-2.5 px-4 font-bold ${
                          row.discounted_cumulative_cash_flow >= 0
                            ? "text-emerald-700"
                            : "text-rose-600"
                        }`}
                      >
                        {formatINR(row.discounted_cumulative_cash_flow)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* E. Financial Interpretation and Recommendation */}
          <section className="card-clean rounded-2xl p-5 bg-teal-50/40 border border-teal-200 space-y-2">
            <h4 className="text-sm font-bold text-teal-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              E. Financial Interpretation & Executive Recommendation
            </h4>
            <p className="text-xs sm:text-sm text-teal-900 font-medium leading-relaxed">
              {project.interpretation ||
                `This project requires an initial investment of ${formatINR(
                  project.initial_cost
                )} and is allocated ${formatINR(
                  project.allocated_amount || project.initial_cost
                )} from available funds. It delivers an estimated NPV of ${formatINR(
                  project.npv
                )} with an IRR of ${
                  project.irr_percent ? `${project.irr_percent.toFixed(1)}%` : "N/A"
                } against a ${hurdlePct}% hurdle rate, fully recovering capital in ${
                  project.simple_payback_years
                    ? `${project.simple_payback_years.toFixed(2)} years`
                    : "an extended period"
                }. It strongly adds value to the corporate portfolio.`}
            </p>
            <p className="text-[11px] text-slate-500 pt-2 border-t border-teal-200/50">
              * Note: Forecasts are calculated based on multi-period inputs, textbook discounting formulas, and historical venture data models. Forecasted returns do not constitute financial guarantees.
            </p>
          </section>

          {/* F. Show Calculation Formulas (Collapsible) */}
          <section className="card-clean rounded-2xl overflow-hidden border border-slate-200">
            <button
              type="button"
              onClick={() => setShowFormulas(!showFormulas)}
              className="w-full p-4 text-left flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  Show Calculation Formulas & Step-by-Step Worked Substitutions
                </span>
              </div>
              {showFormulas ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showFormulas && (
              <div className="p-5 space-y-4 bg-white text-xs text-slate-700 divide-y divide-slate-100">
                <div className="pt-2">
                  <h5 className="font-bold text-slate-900 mb-1">
                    Payback Period Substitution:
                  </h5>
                  <p className="font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-teal-800">
                    {project.worked_calculations?.payback ||
                      `Payback = (T−1) + (Unrecovered Outlay / CF_T) = ${project.simple_payback_years?.toFixed(2)} years`}
                  </p>
                </div>

                <div className="pt-3">
                  <h5 className="font-bold text-slate-900 mb-1">
                    Net Present Value (NPV) Substitution:
                  </h5>
                  <p className="font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-teal-800">
                    {project.worked_calculations?.npv ||
                      `NPV = PV of Inflows (${formatINR(project.pv_of_benefits)}) − Total Investment (${formatINR(project.total_investment)}) = ${formatINR(project.npv)}`}
                  </p>
                </div>

                <div className="pt-3">
                  <h5 className="font-bold text-slate-900 mb-1">
                    Benefit-Cost Ratio (BCR) Substitution:
                  </h5>
                  <p className="font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-teal-800">
                    {project.worked_calculations?.bcr ||
                      `BCR = ${formatINR(project.pv_of_benefits)} / ${formatINR(project.total_investment)} = ${project.bcr?.toFixed(3)}`}
                  </p>
                </div>

                <div className="pt-3">
                  <h5 className="font-bold text-slate-900 mb-1">
                    Return on Investment (ROI %) Substitution:
                  </h5>
                  <p className="font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-teal-800">
                    {project.worked_calculations?.roi ||
                      `ROI % = (Net Benefit / Total Investment) × 100 = (${formatINR(project.net_benefit)} / ${formatINR(project.total_investment)}) × 100 = ${project.roi_percent?.toFixed(1)}%`}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Certified by VentureLens Deterministic Finance Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
