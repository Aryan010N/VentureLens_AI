"use client";

import React, { useState } from "react";
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
import { AllocationItem, YearByYearPoint } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface ProjectFullAnalysisModalProps {
  project: AllocationItem | null;
  onClose: () => void;
  discountRate?: number;
}

// Resilient number parsing helpers that never throw
function safeNum(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "number") return isNaN(val) ? fallback : val;
  const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(parsed) ? fallback : parsed;
}

function safeToFixed(val: any, decimals: number, fallback = "N/A"): string {
  if (val === null || val === undefined) return fallback;
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  if (isNaN(num)) return fallback;
  return num.toFixed(decimals);
}

export const ProjectFullAnalysisModal: React.FC<ProjectFullAnalysisModalProps> = ({
  project,
  onClose,
  discountRate = 0.12,
}) => {
  const [showFormulas, setShowFormulas] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!project) return null;

  const dRate = safeNum(discountRate, 0.12);
  const hurdlePct = (dRate <= 1.0 ? dRate * 100 : dRate).toFixed(1);
  const initialCost = safeNum(project.initial_cost, 0);
  const initialOutlay = safeNum(project.total_investment, initialCost);
  const lifespan = safeNum(project.lifespan, 5);

  // Synthesize or normalize year-by-year points (deterministic calculation without conditional hook)
  const displayTableRows: YearByYearPoint[] = (() => {
    let rows: YearByYearPoint[] = [];

    if (Array.isArray(project.year_by_year_table) && project.year_by_year_table.length > 0) {
      rows = [...project.year_by_year_table];
    } else {
      // Fallback synthesis from summary metrics if year_by_year_table was omitted
      const annualInflow = safeNum(project.total_benefits, 0) / (lifespan || 5);
      let cum = -initialOutlay;
      let cumDisc = -initialOutlay;

      rows.push({
        year: 0,
        inflow: -initialOutlay,
        discount_factor: 1.0,
        present_value: -initialOutlay,
        cumulative_cash_flow: -initialOutlay,
        discounted_cumulative_cash_flow: -initialOutlay,
      });

      for (let t = 1; t <= (lifespan || 5); t++) {
        const df = 1 / Math.pow(1 + (dRate <= 1.0 ? dRate : dRate / 100), t);
        const pv = annualInflow * df;
        cum += annualInflow;
        cumDisc += pv;
        rows.push({
          year: t,
          inflow: annualInflow,
          discount_factor: Number(df.toFixed(4)),
          present_value: Number(pv.toFixed(2)),
          cumulative_cash_flow: Number(cum.toFixed(2)),
          discounted_cumulative_cash_flow: Number(cumDisc.toFixed(2)),
        });
      }
    }

    // Ensure Year 0 is always present at index 0
    const hasYear0 = rows.some((r) => r.year === 0);
    if (!hasYear0) {
      const year0Row: YearByYearPoint = {
        year: 0,
        inflow: -initialOutlay,
        discount_factor: 1.0,
        present_value: -initialOutlay,
        cumulative_cash_flow: -initialOutlay,
        discounted_cumulative_cash_flow: -initialOutlay,
      };
      rows = [year0Row, ...rows];
    }

    return rows.sort((a, b) => a.year - b.year);
  })();

  // Numerical values for metrics cards
  const totalBenefits = safeNum(project.total_benefits, 0);
  const netBenefit = safeNum(project.net_benefit, totalBenefits - initialOutlay);
  const npv = safeNum(project.npv, 0);
  const bcr = project.bcr !== null && project.bcr !== undefined ? safeNum(project.bcr) : null;
  const roiPct = safeNum(project.roi_percent, 0);
  const annualRoi = safeNum(project.annual_avg_return_percent, roiPct / (lifespan || 1));
  const irrPct = project.irr_percent !== null && project.irr_percent !== undefined ? safeNum(project.irr_percent) : null;
  const pbYears = project.simple_payback_years !== null && project.simple_payback_years !== undefined ? safeNum(project.simple_payback_years) : null;
  const discPbYears = project.discounted_payback_years !== null && project.discounted_payback_years !== undefined ? safeNum(project.discounted_payback_years) : null;
  const breakEvenYr = project.break_even_year;

  // 10 Capital Budgeting Metric Cards
  const metricCards = [
    {
      id: "total_benefits",
      title: "1. Total Benefits",
      value: formatINR(totalBenefits),
      formula: "Total Benefits = Σ (Annual Cash Inflows)",
      example: `Sum of expected gross cash inflows = ${formatINR(totalBenefits)}`,
      meaning: "Total undiscounted cash inflows generated over the project lifespan.",
      badge: "Inflows",
      color: "text-slate-900",
    },
    {
      id: "net_benefit",
      title: "2. Net Benefit",
      value: formatINR(netBenefit),
      formula: "Net Benefit = Total Benefits − Total Investment",
      example: `${formatINR(totalBenefits)} − ${formatINR(initialOutlay)} = ${formatINR(netBenefit)}`,
      meaning: "Total economic profit after recovering the initial investment and contingency.",
      badge: netBenefit >= 0 ? "+ Profit" : "- Loss",
      color: netBenefit >= 0 ? "text-emerald-700" : "text-rose-700",
    },
    {
      id: "npv",
      title: "3. Net Present Value (NPV)",
      value: formatINR(npv),
      formula: "NPV = −I₀ + Σ [CFₜ / (1+r)ᵗ]",
      example: `Discounted at ${hurdlePct}% hurdle rate: ${formatINR(npv)}`,
      meaning: "Net economic value added in today's money (>0 creates wealth).",
      badge: npv > 0 ? "Accept (>0)" : "Reject (≤0)",
      color: npv > 0 ? "text-emerald-700" : "text-rose-700",
    },
    {
      id: "bcr",
      title: "4. Benefit-Cost Ratio (BCR)",
      value: bcr !== null ? bcr.toFixed(3) : "N/A",
      formula: "BCR = Present Value of Benefits / Total Investment",
      example: `${formatINR(safeNum(project.pv_of_benefits, 0))} / ${formatINR(initialOutlay)} = ${bcr !== null ? bcr.toFixed(3) : "N/A"}`,
      meaning: "Discounted value created per ₹1 of capital invested (>1.0 indicates viable capital efficiency).",
      badge: (bcr || 0) > 1.0 ? "> 1.0 Viable" : "≤ 1.0",
      color: (bcr || 0) > 1.0 ? "text-teal-700" : "text-amber-700",
    },
    {
      id: "roi",
      title: "5. Return on Investment (ROI)",
      value: `${roiPct.toFixed(1)}%`,
      formula: "ROI (%) = [(Total Benefits − Total Investment) / Total Investment] × 100",
      example: `[(${formatINR(totalBenefits)} − ${formatINR(initialOutlay)}) / ${formatINR(initialOutlay)}] × 100 = ${roiPct.toFixed(1)}%`,
      meaning: "Cumulative percentage return generated on invested funds.",
      badge: "ROI",
      color: roiPct >= 0 ? "text-teal-700" : "text-rose-700",
    },
    {
      id: "annual_roi",
      title: "6. Average Annual ROI",
      value: `${annualRoi.toFixed(1)}%`,
      formula: "Average Annual ROI = Total ROI (%) / Project Lifespan",
      example: `${roiPct.toFixed(1)}% / ${lifespan} yrs = ${annualRoi.toFixed(1)}% per yr`,
      meaning: "Annualized simple accounting return across the planning horizon.",
      badge: "Per Year",
      color: "text-slate-800",
    },
    {
      id: "irr",
      title: "7. Internal Rate of Return (IRR)",
      value: irrPct !== null ? `${irrPct.toFixed(1)}%` : "N/A",
      formula: "IRR = discount rate where NPV(r) = 0",
      example: `IRR = ${irrPct !== null ? `${irrPct.toFixed(1)}%` : "N/A"} vs Hurdle = ${hurdlePct}%`,
      meaning: `Breakeven return rate. ${irrPct !== null && irrPct > safeNum(hurdlePct) ? "Exceeds hurdle rate, adding shareholder value." : "Evaluated against cost of capital."}`,
      badge: irrPct !== null && irrPct > safeNum(hurdlePct) ? "Beats Hurdle" : "Evaluation",
      color: irrPct !== null && irrPct > safeNum(hurdlePct) ? "text-emerald-700" : "text-slate-700",
    },
    {
      id: "simple_payback",
      title: "8. Simple Payback Period",
      value: pbYears !== null ? `${pbYears.toFixed(2)} yrs` : "Never recovered",
      formula: "Payback = (T−1) + (Unrecovered Inflow / CF_T)",
      example: project.worked_calculations?.payback || (pbYears !== null ? `Recovers investment in ${pbYears.toFixed(2)} years` : "Cost exceeds inflows"),
      meaning: "Time required for undiscounted cash inflows to fully recover initial outlay.",
      badge: "Linear Interpolation",
      color: pbYears !== null ? "text-teal-700" : "text-rose-700",
    },
    {
      id: "discounted_payback",
      title: "9. Discounted Payback Period",
      value: discPbYears !== null ? `${discPbYears.toFixed(2)} yrs` : "Never recovered",
      formula: "Same interpolation applied on discounted inflows PV(CF_t)",
      example: discPbYears !== null ? `Recovers capital taking time value of money into account: ${discPbYears.toFixed(2)} yrs` : "Not recovered in horizon",
      meaning: "Capital recovery period taking the time value of money into account.",
      badge: "Discounted",
      color: discPbYears !== null ? "text-teal-700" : "text-amber-700",
    },
    {
      id: "break_even_year",
      title: "10. Break-Even Year",
      value: breakEvenYr ? `Year ${breakEvenYr}` : "Beyond Horizon",
      formula: "First Year where Cumulative Cash Flow ≥ 0",
      example: breakEvenYr ? `Enters positive cumulative territory in Year ${breakEvenYr}` : "Does not break even",
      meaning: "Earliest operating year where project recovers its total investment.",
      badge: "Break-even",
      color: breakEvenYr ? "text-emerald-700" : "text-slate-600",
    },
  ];

  // Pure SVG Line Chart Geometry (100% crash-proof, zero external charting dependencies)
  const chartWidth = 720;
  const chartHeight = 280;
  const padLeft = 85;
  const padRight = 45;
  const padTop = 35;
  const padBottom = 45;
  const plotWidth = chartWidth - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;

  const allVals = displayTableRows.flatMap((r) => [
    safeNum(r.cumulative_cash_flow),
    safeNum(r.discounted_cumulative_cash_flow),
  ]);
  const minCash = Math.min(-initialOutlay, ...allVals, 0);
  const maxCash = Math.max(0, ...allVals, initialOutlay * 0.5);
  const ySpan = maxCash - minCash || 1;

  const getYCoord = (v: number) => {
    const fraction = (v - minCash) / ySpan;
    return padTop + (1 - fraction) * plotHeight;
  };

  const getXCoord = (index: number) => {
    const step = displayTableRows.length > 1 ? plotWidth / (displayTableRows.length - 1) : plotWidth;
    return padLeft + index * step;
  };

  const yZero = getYCoord(0);

  // Paths
  const undiscountedPath = displayTableRows
    .map((r, i) => `${i === 0 ? "M" : "L"} ${getXCoord(i).toFixed(1)} ${getYCoord(safeNum(r.cumulative_cash_flow)).toFixed(1)}`)
    .join(" ");

  const discountedPath = displayTableRows
    .map((r, i) => `${i === 0 ? "M" : "L"} ${getXCoord(i).toFixed(1)} ${getYCoord(safeNum(r.discounted_cumulative_cash_flow)).toFixed(1)}`)
    .join(" ");

  // Payback geometric marker calculation
  let paybackMarker: { x: number; y: number } | null = null;
  if (pbYears !== null && pbYears >= 0 && displayTableRows.length > 1) {
    const maxYear = displayTableRows[displayTableRows.length - 1].year || 5;
    if (pbYears <= maxYear) {
      const step = plotWidth / (displayTableRows.length - 1);
      const xPb = padLeft + (pbYears / (maxYear || 1)) * plotWidth;
      paybackMarker = { x: xPb, y: yZero };
    }
  }

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
                  {project.name || "Candidate Initiative"}
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
            aria-label="Close Analysis"
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
                <span className="font-bold text-slate-900 text-sm">{project.industry_category || "General"}</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">AI Risk Assessment</span>
                <span className="font-bold text-slate-900 text-sm">
                  {project.risk_category || "Medium"}{" "}
                  <span className="text-xs text-slate-500 font-normal">
                    (Score: {safeToFixed(safeNum(project.risk_score, 0.5) * 100, 0)}%)
                  </span>
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Initial Cost</span>
                <span className="font-bold text-slate-900 text-sm">{formatINR(initialCost)}</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Allocated Budget</span>
                <span className="font-black text-teal-800 text-sm">
                  {formatINR(safeNum(project.allocated_amount, initialCost))}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Total Investment</span>
                <span className="font-black text-slate-900 text-sm">
                  {formatINR(initialOutlay)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              <span><strong>Lifespan:</strong> {lifespan} Years</span>
              <span>•</span>
              <span><strong>Contingency Reserve:</strong> {safeNum(project.contingency_pct, 0)}% ({formatINR(safeNum(project.contingency_amount, 0))})</span>
              <span>•</span>
              <span><strong>Budget Share:</strong> {safeToFixed(project.share_of_budget_percent, 1)}%</span>
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
                  className="card-clean rounded-xl p-3.5 flex flex-col justify-between hover:border-teal-400 transition-all bg-white"
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

          {/* C. Cash Flow Chart (Zero-Crossing Native SVG) */}
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

            <div className="card-clean rounded-2xl p-4 bg-slate-50/50 overflow-hidden">
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-auto max-h-[300px] select-none font-sans"
                >
                  {/* Background Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1.0].map((fraction, idx) => {
                    const yVal = minCash + fraction * ySpan;
                    const yPx = getYCoord(yVal);
                    return (
                      <g key={`grid-line-${idx}`}>
                        <line
                          x1={padLeft}
                          y1={yPx}
                          x2={padLeft + plotWidth}
                          y2={yPx}
                          stroke="#E2E8F0"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={padLeft - 10}
                          y={yPx + 3}
                          textAnchor="end"
                          fill="#64748B"
                          fontSize="10"
                          fontFamily="monospace"
                        >
                          {formatINR(yVal)}
                        </text>
                      </g>
                    );
                  })}

                  {/* ₹0 Break-Even Baseline */}
                  <line
                    x1={padLeft}
                    y1={yZero}
                    x2={padLeft + plotWidth}
                    y2={yZero}
                    stroke="#0F172A"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padLeft + plotWidth}
                    y={yZero - 6}
                    textAnchor="end"
                    fill="#334155"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    Break-Even Baseline (₹0)
                  </text>

                  {/* Discounted Cumulative Path (Blue dashed) */}
                  <path
                    d={discountedPath}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Undiscounted Cumulative Path (Teal solid) */}
                  <path
                    d={undiscountedPath}
                    fill="none"
                    stroke="#0D9488"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data Point Dots & Interactions */}
                  {displayTableRows.map((r, i) => {
                    const x = getXCoord(i);
                    const yUndisc = getYCoord(safeNum(r.cumulative_cash_flow));
                    const yDisc = getYCoord(safeNum(r.discounted_cumulative_cash_flow));
                    const isHovered = hoveredIndex === i;

                    return (
                      <g key={`point-${i}`} className="cursor-pointer" onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                        {/* Discounted Dot */}
                        <circle cx={x} cy={yDisc} r={isHovered ? 5 : 3.5} fill="#3B82F6" />

                        {/* Undiscounted Dot */}
                        <circle cx={x} cy={yUndisc} r={isHovered ? 7 : 5} fill="#0D9488" stroke="#FFFFFF" strokeWidth="2" />

                        {/* X-Axis Tick Label */}
                        <text
                          x={x}
                          y={chartHeight - 15}
                          textAnchor="middle"
                          fill={isHovered ? "#0D9488" : "#64748B"}
                          fontSize="11"
                          fontWeight={isHovered ? "bold" : "600"}
                        >
                          {r.year === 0 ? "Year 0" : `Yr ${r.year}`}
                        </text>

                        {/* Hover Value Tooltip */}
                        {isHovered && (
                          <g transform={`translate(${x}, ${Math.min(yUndisc, yDisc) - 35})`}>
                            <rect
                              x="-65"
                              y="-15"
                              width="130"
                              height="40"
                              rx="8"
                              fill="#0F172A"
                              filter="drop-shadow(0 4px 6px rgba(0,0,0,0.2))"
                            />
                            <text x="0" y="2" textAnchor="middle" fill="#5EEAD4" fontSize="10" fontWeight="bold">
                              Undisc: {formatINR(safeNum(r.cumulative_cash_flow))}
                            </text>
                            <text x="0" y="16" textAnchor="middle" fill="#93C5FD" fontSize="9">
                              Disc: {formatINR(safeNum(r.discounted_cumulative_cash_flow))}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* Geometrically Exact Payback Point Marker */}
                  {paybackMarker && (
                    <g>
                      <circle
                        cx={paybackMarker.x}
                        cy={paybackMarker.y}
                        r="12"
                        fill="#0D9488"
                        fillOpacity="0.25"
                      />
                      <circle
                        cx={paybackMarker.x}
                        cy={paybackMarker.y}
                        r="6.5"
                        fill="#0D9488"
                        stroke="#FFFFFF"
                        strokeWidth="2.5"
                      />
                      <g transform={`translate(${paybackMarker.x}, ${paybackMarker.y - 22})`}>
                        <rect
                          x="-50"
                          y="-14"
                          width="100"
                          height="20"
                          rx="6"
                          fill="#0D9488"
                          stroke="#FFFFFF"
                          strokeWidth="1.5"
                        />
                        <text
                          x="0"
                          y="0"
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          Payback: {safeToFixed(pbYears, 2)}y
                        </text>
                      </g>
                    </g>
                  )}
                </svg>
              </div>

              {/* Chart Legend */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-3 text-xs pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-teal-600" />
                  <span className="font-semibold text-slate-700">Cumulative Cash Flow (Undiscounted)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-1.5 border-t-2 border-dashed border-blue-500" />
                  <span className="font-semibold text-slate-700">Discounted Cumulative (Present Value)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 border-t-2 border-dashed border-slate-900" />
                  <span className="font-semibold text-slate-700">Zero Baseline (₹0 Recovery)</span>
                </div>
                {pbYears !== null && (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600 ring-2 ring-teal-200" />
                    <span className="font-semibold text-teal-800">Payback Point ({safeToFixed(pbYears, 2)} yrs)</span>
                  </div>
                )}
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
                  {displayTableRows.map((row) => (
                    <tr
                      key={row.year}
                      className={`hover:bg-slate-50 transition-colors ${
                        row.year === 0 ? "bg-slate-50/70 font-semibold" : ""
                      }`}
                    >
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-900">
                        {row.year === 0 ? "Year 0 (Outlay)" : `Year ${row.year}`}
                      </td>
                      <td
                        className={`py-2.5 px-4 ${
                          safeNum(row.inflow) < 0 ? "text-rose-700 font-bold" : "text-slate-800"
                        }`}
                      >
                        {formatINR(safeNum(row.inflow))}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {safeToFixed(row.discount_factor, 4, "1.0000")}
                      </td>
                      <td className="py-2.5 px-4 text-teal-800 font-bold">
                        {row.year === 0
                          ? formatINR(-initialOutlay)
                          : (safeNum(row.present_value) !== 0 ? formatINR(safeNum(row.present_value)) : "—")}
                      </td>
                      <td
                        className={`py-2.5 px-4 font-bold ${
                          safeNum(row.cumulative_cash_flow) >= 0
                            ? "text-emerald-700"
                            : "text-rose-600"
                        }`}
                      >
                        {formatINR(safeNum(row.cumulative_cash_flow))}
                      </td>
                      <td
                        className={`py-2.5 px-4 font-bold ${
                          safeNum(row.discounted_cumulative_cash_flow) >= 0
                            ? "text-emerald-700"
                            : "text-rose-600"
                        }`}
                      >
                        {formatINR(safeNum(row.discounted_cumulative_cash_flow))}
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
                  initialCost
                )} and is allocated ${formatINR(
                  safeNum(project.allocated_amount, initialCost)
                )} from available funds. It delivers an estimated NPV of ${formatINR(
                  npv
                )} with an IRR of ${
                  irrPct !== null ? `${irrPct.toFixed(1)}%` : "N/A"
                } against a ${hurdlePct}% hurdle rate, fully recovering capital in ${
                  pbYears !== null
                    ? `${pbYears.toFixed(2)} years`
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
                      `Payback = (T−1) + (Unrecovered Outlay / CF_T) = ${pbYears !== null ? `${pbYears.toFixed(2)} years` : "N/A"}`}
                  </p>
                </div>

                <div className="pt-3">
                  <h5 className="font-bold text-slate-900 mb-1">
                    Net Present Value (NPV) Substitution:
                  </h5>
                  <p className="font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-teal-800">
                    {project.worked_calculations?.npv ||
                      `NPV = PV of Inflows (${formatINR(safeNum(project.pv_of_benefits, 0))}) − Total Investment (${formatINR(initialOutlay)}) = ${formatINR(npv)}`}
                  </p>
                </div>

                <div className="pt-3">
                  <h5 className="font-bold text-slate-900 mb-1">
                    Benefit-Cost Ratio (BCR) Substitution:
                  </h5>
                  <p className="font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-teal-800">
                    {project.worked_calculations?.bcr ||
                      `BCR = ${formatINR(safeNum(project.pv_of_benefits, 0))} / ${formatINR(initialOutlay)} = ${bcr !== null ? bcr.toFixed(3) : "1.000"}`}
                  </p>
                </div>

                <div className="pt-3">
                  <h5 className="font-bold text-slate-900 mb-1">
                    Return on Investment (ROI %) Substitution:
                  </h5>
                  <p className="font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-teal-800">
                    {project.worked_calculations?.roi ||
                      `ROI % = (Net Benefit / Total Investment) × 100 = (${formatINR(netBenefit)} / ${formatINR(initialOutlay)}) × 100 = ${roiPct.toFixed(1)}%`}
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
