"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Shield,
  Percent,
  Calendar,
  Sparkles,
  ArrowRight,
  Info,
  HelpCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { CompanyData } from "@/lib/types";
import { formatINR } from "@/lib/utils";

interface BudgetSectionProps {
  company: CompanyData;
  setCompany: (c: CompanyData) => void;
  onSaveCompany: (c: Partial<CompanyData>) => Promise<void>;
  onLoadSpecDemo?: () => Promise<void>;
  onProceedToProjects?: () => void;
  showProceedButton?: boolean;
}

export const BudgetSection: React.FC<BudgetSectionProps> = ({
  company,
  setCompany,
  onSaveCompany,
  onLoadSpecDemo,
  onProceedToProjects,
  showProceedButton = true,
}) => {
  const [showHurdleHelp, setShowHurdleHelp] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const totalBudget = Number(company.total_investment_budget) || 0;
  const minReserve = Number(company.min_cash_reserve) || 0;
  const availableForInvestment = Math.max(0, totalBudget - minReserve);

  const handleBudgetChange = (field: keyof CompanyData, value: any) => {
    const updated = { ...company, [field]: value };
    setCompany(updated);
    onSaveCompany({ [field]: value })
      .then(() => {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      })
      .catch((err) =>
        console.warn("Could not auto-save company parameter:", err)
      );
  };

  return (
    <div className="space-y-6">
      {/* SECTION A: Enter Your Budget */}
      <section className="card-clean rounded-2xl p-6 bg-white space-y-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shadow-sm">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                A. Investment Budget & Corporate Constraints
              </h2>
              <p className="text-xs text-slate-500">
                Define your capital ceiling, liquidity reserve, and cost of capital.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
            {onLoadSpecDemo && (
              <button
                type="button"
                onClick={onLoadSpecDemo}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 hover:border-teal-300 transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Load Spec Example (₹20L)</span>
              </button>
            )}
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Budget */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Total Budget (₹)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                value={company.total_investment_budget > 0 ? company.total_investment_budget : ""}
                onChange={(e) =>
                  handleBudgetChange(
                    "total_investment_budget",
                    parseFloat(e.target.value) || 0
                  )
                }
                placeholder="e.g. 2000000"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-900 bg-white transition-all shadow-sm placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>
            <span className="text-[11px] text-teal-700 font-semibold mt-1 block">
              {company.total_investment_budget > 0 ? formatINR(company.total_investment_budget) : "Enter investment capital"}
            </span>
          </div>

          {/* Min Cash Reserve */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Minimum Reserve (₹)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={company.min_cash_reserve > 0 ? company.min_cash_reserve : ""}
              onChange={(e) =>
                handleBudgetChange(
                  "min_cash_reserve",
                  parseFloat(e.target.value) || 0
                )
              }
              placeholder="e.g. 200000 (optional)"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-900 bg-white transition-all shadow-sm placeholder:text-slate-400 placeholder:font-normal"
            />
            <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
              {company.min_cash_reserve > 0 ? `${formatINR(company.min_cash_reserve)} (Protected)` : "Optional liquidity buffer"}
            </span>
          </div>

          {/* Discount Rate / Hurdle Rate with Explanation */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Cost of Capital (Hurdle %)
              </label>
              <button
                type="button"
                onClick={() => setShowHurdleHelp(!showHurdleHelp)}
                className="text-slate-400 hover:text-teal-700 transition-colors"
                title="What is Hurdle Rate?"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              type="number"
              min="0.1"
              max="100"
              step="any"
              value={
                company.discount_rate <= 1.0
                  ? Number((company.discount_rate * 100).toFixed(2))
                  : company.discount_rate
              }
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                handleBudgetChange(
                  "discount_rate",
                  isNaN(val) ? 0.12 : val / 100.0
                );
              }}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-900 bg-white transition-all shadow-sm"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Discount rate (default 12.0%)
            </span>
          </div>

          {/* Planning Horizon */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Planning Horizon (Years)
            </label>
            <input
              type="number"
              min="1"
              max="25"
              step="1"
              value={company.planning_period_years || 5}
              onChange={(e) =>
                handleBudgetChange(
                  "planning_period_years",
                  Math.max(1, parseInt(e.target.value) || 5)
                )
              }
              placeholder="e.g. 5"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-900 bg-white transition-all shadow-sm"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Evaluation lifespan: {company.planning_period_years || 5} years
            </span>
          </div>

          {/* Risk Ceiling */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Max Portfolio Risk
            </label>
            <select
              value={company.max_acceptable_risk || "Medium"}
              onChange={(e) =>
                handleBudgetChange(
                  "max_acceptable_risk",
                  e.target.value as "Low" | "Medium" | "High"
                )
              }
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-900 bg-white transition-all shadow-sm"
            >
              <option value="Low">Low Risk Only</option>
              <option value="Medium">Medium Risk (Balanced)</option>
              <option value="High">High Risk (Growth)</option>
            </select>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Portfolio risk ceiling
            </span>
          </div>
        </div>

        {/* Hurdle Rate / WACC Educational Accordion */}
        {showHurdleHelp && (
          <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-950 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-teal-900">
                <Info className="w-4 h-4 text-teal-600" />
                What is the Cost of Capital / Hurdle Rate (WACC)?
              </span>
              <button
                type="button"
                onClick={() => setShowHurdleHelp(false)}
                className="text-teal-700 hover:text-teal-900 text-[11px] font-bold"
              >
                Dismiss
              </button>
            </div>
            <p className="leading-relaxed text-teal-900">
              The <strong>Hurdle Rate</strong> (also known as <strong>Cost of Capital</strong> or <strong>WACC</strong>) is the minimum annual rate of return that your business expects to earn on any capital allocation to justify the risk.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-white/80 p-2.5 rounded-lg border border-teal-200">
                <strong>1. Used for Net Present Value (NPV):</strong>
                <p className="text-slate-600 font-sans mt-0.5">
                  Future revenues are discounted into today&apos;s money using: PV = CF / (1 + r)^t.
                </p>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-teal-200">
                <strong>2. Decision Hurdle for IRR:</strong>
                <p className="text-slate-600 font-sans mt-0.5">
                  If an initiative&apos;s Internal Rate of Return (IRR) is lower than your hurdle rate, it destroys shareholder value.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sleek Live Capital Allocation Ribbon */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Total Capital:</span>
              <span className="font-extrabold text-slate-900 text-sm">
                {formatINR(totalBudget)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Protected Reserve:</span>
              <span className="font-bold text-amber-700 text-sm">
                {formatINR(minReserve)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs sm:text-sm">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Available for Investment: {formatINR(availableForInvestment)}</span>
          </div>
        </div>

        {/* Proceed Action Button */}
        {showProceedButton && (
          <div className="pt-2 flex justify-end">
            {onProceedToProjects ? (
              <button
                type="button"
                onClick={onProceedToProjects}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white hover:bg-teal-700 transition-all shadow-md hover:shadow-lg"
              >
                <span>Proceed to Add Projects (Part B)</span>
                <ArrowRight className="w-4 h-4 text-teal-300" />
              </button>
            ) : (
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white hover:bg-teal-700 transition-all shadow-md hover:shadow-lg"
              >
                <span>Proceed to Add Projects (Part B)</span>
                <ArrowRight className="w-4 h-4 text-teal-300" />
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
