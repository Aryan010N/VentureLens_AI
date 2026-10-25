"use client";

import React, { useState } from "react";
import { Building2, Save, CheckCircle2, AlertCircle, Percent, DollarSign, Calendar, Shield } from "lucide-react";
import { CompanyData } from "@/lib/types";

interface CompanySetupProps {
  company: CompanyData;
  onSaveCompany: (updated: Partial<CompanyData>) => Promise<void>;
  loading: boolean;
}

export const CompanySetup: React.FC<CompanySetupProps> = ({
  company,
  onSaveCompany,
  loading,
}) => {
  const [budget, setBudget] = useState<number>(company.total_investment_budget || 2000000);
  const [minReserve, setMinReserve] = useState<number>(company.min_cash_reserve || 200000);
  const [loanFacility, setLoanFacility] = useState<number>(company.loan_facility || 500000);
  const [discountRate, setDiscountRate] = useState<number>(company.discount_rate ? company.discount_rate * 100 : 12);
  const [planningYears, setPlanningYears] = useState<number>(company.planning_period_years || 5);
  const [riskTolerance, setRiskTolerance] = useState<"Low" | "Medium" | "High">(company.max_acceptable_risk || "Medium");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state if company prop changes (e.g. when demo template loaded)
  React.useEffect(() => {
    setBudget(company.total_investment_budget);
    setMinReserve(company.min_cash_reserve);
    setLoanFacility(company.loan_facility);
    setDiscountRate(company.discount_rate > 1 ? company.discount_rate : company.discount_rate * 100);
    setPlanningYears(company.planning_period_years);
    setRiskTolerance(company.max_acceptable_risk);
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSavedSuccess(false);

    if (budget <= 0) {
      setErrorMsg("Total investment budget must be greater than 0");
      return;
    }

    try {
      await onSaveCompany({
        company_id: company.company_id,
        total_investment_budget: budget,
        min_cash_reserve: minReserve,
        loan_facility: loanFacility,
        discount_rate: discountRate / 100,
        planning_period_years: planningYears,
        max_acceptable_risk: riskTolerance,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update company parameters");
    }
  };

  return (
    <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-teal-500/20 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Company Capital & Financial Constraints
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800">
                Firestore Sync
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Configure available capital pools, required liquidity reserves, cost of capital, and risk appetite.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            Saved to Firestore
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Total Budget */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-teal-400" />
              Total Investment Budget (₹)
            </label>
            <input
              type="number"
              min="10000"
              step="10000"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white font-medium text-sm transition-all"
              required
            />
            <p className="text-[11px] text-slate-500">
              Allocable capital: ₹{(budget / 100000).toFixed(2)} Lakh
            </p>
          </div>

          {/* Min Cash Reserve */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              Minimum Cash Reserve (₹)
            </label>
            <input
              type="number"
              min="0"
              step="10000"
              value={minReserve}
              onChange={(e) => setMinReserve(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white font-medium text-sm transition-all"
              required
            />
            <p className="text-[11px] text-slate-500">
              Liquidity floor: ₹{(minReserve / 100000).toFixed(2)} Lakh
            </p>
          </div>

          {/* Loan Facility */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-cyan-400" />
              Available Loan Facility (₹)
            </label>
            <input
              type="number"
              min="0"
              step="10000"
              value={loanFacility}
              onChange={(e) => setLoanFacility(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white font-medium text-sm transition-all"
              required
            />
            <p className="text-[11px] text-slate-500">
              Credit buffer: ₹{(loanFacility / 100000).toFixed(2)} Lakh
            </p>
          </div>

          {/* Discount Rate */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-amber-400" />
              Cost of Capital / Discount Rate (%)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              step="0.5"
              value={discountRate}
              onChange={(e) => setDiscountRate(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white font-medium text-sm transition-all"
              required
            />
            <p className="text-[11px] text-slate-500">
              Required annual hurdle rate (default 12%)
            </p>
          </div>

          {/* Planning Horizon */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-400" />
              Planning Horizon (Years)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={planningYears}
              onChange={(e) => setPlanningYears(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white font-medium text-sm transition-all"
              required
            />
            <p className="text-[11px] text-slate-500">
              Evaluation timeline (typically 5 years)
            </p>
          </div>

          {/* Max Risk Level */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-rose-400" />
              Max Acceptable Portfolio Risk
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["Low", "Medium", "High"] as const).map((tier) => (
                <button
                  type="button"
                  key={tier}
                  onClick={() => setRiskTolerance(tier)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    riskTolerance === tier
                      ? tier === "Low"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500"
                        : tier === "Medium"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500"
                        : "bg-rose-500/20 text-rose-300 border-rose-500"
                      : "bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              Risk ceiling applied by PuLP optimizer
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-teal-sm active:scale-95 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? "Saving to Firestore..." : "Save Financial Parameters"}
          </button>
        </div>
      </form>
    </section>
  );
};
