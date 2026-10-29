"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { BudgetSection } from "@/components/BudgetSection";
import {
  saveCompany,
  fetchCompany,
  saveProject,
  clearAllProjects,
} from "@/lib/api";
import { CompanyData, UserProfile } from "@/lib/types";
import { Wallet, Layers, PieChart, Sparkles, ArrowRight } from "lucide-react";

const DEFAULT_COMPANY_ID = "venture_company_01";

export default function BudgetPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState<CompanyData>({
    company_id: "",
    total_investment_budget: 2000000,
    min_cash_reserve: 200000,
    loan_facility: 0,
    discount_rate: 0.12,
    planning_period_years: 5,
    max_acceptable_risk: "Medium",
    contingency_pct: 0,
  });

  const loadCompanyData = useCallback(async (compId: string) => {
    if (!compId) return;
    setIsLoading(true);
    try {
      const comp = await fetchCompany(compId).catch(() => null);
      if (comp) {
        setCompany(comp);
      } else {
        setCompany((prev) => ({ ...prev, company_id: compId }));
      }
    } catch (err) {
      console.warn("Error loading company budget:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("venturelens_user");
      if (!saved) {
        router.push("/login");
        return;
      }
      try {
        const u = JSON.parse(saved);
        if (!u || !u.user_id) {
          localStorage.removeItem("venturelens_user");
          router.push("/login");
          return;
        }
        setUser(u);
        const compId = u.company_id || DEFAULT_COMPANY_ID;
        setCompany((prev) => ({ ...prev, company_id: compId }));
        loadCompanyData(compId);
      } catch (e) {
        localStorage.removeItem("venturelens_user");
        router.push("/login");
      }
    }
  }, [router, loadCompanyData]);

  const handleSaveCompany = async (updated: Partial<CompanyData>) => {
    const compId = user?.company_id || company.company_id;
    try {
      const saved = await saveCompany({
        ...company,
        ...updated,
        company_id: compId,
      });
      setCompany(saved);
    } catch (err) {
      console.error("Save company error:", err);
    }
  };

  const handleLoadSpecDemo = async () => {
    const compId = user?.company_id || company.company_id;
    const specCompany: Partial<CompanyData> = {
      company_id: compId,
      total_investment_budget: 2000000,
      min_cash_reserve: 200000,
      discount_rate: 0.12,
      planning_period_years: 5,
      max_acceptable_risk: "Medium",
      loan_facility: 500000,
      contingency_pct: 0,
    };
    await saveCompany(specCompany);
    setCompany((prev) => ({ ...prev, ...specCompany }));
  };

  const handleLogout = () => {
    localStorage.removeItem("venturelens_user");
    localStorage.removeItem("venturelens_latest_result");
    setUser(null);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Step-by-Step Workflow Breadcrumb */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1.5 shadow-sm">
              <Wallet className="w-3.5 h-3.5 text-teal-600" />
              <span>Step 1: Budget & Constraints (Part A)</span>
            </span>
            <span>→</span>
            <Link
              href="/projects"
              className="px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Step 2: Candidate Projects (Part B)</span>
            </Link>
            <span>→</span>
            <Link
              href="/results"
              className="px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <PieChart className="w-3.5 h-3.5 text-slate-400" />
              <span>Step 3: Results</span>
            </Link>
          </div>

          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-teal-700 transition-all shadow-sm"
          >
            <span>Continue to Projects (Part B)</span>
            <ArrowRight className="w-3.5 h-3.5 text-teal-300" />
          </Link>
        </div>

        {/* Section A Component */}
        <BudgetSection
          company={company}
          setCompany={setCompany}
          onSaveCompany={handleSaveCompany}
          onLoadSpecDemo={handleLoadSpecDemo}
          onProceedToProjects={() => router.push("/projects")}
          showProceedButton={true}
        />
      </main>

      <footer className="bg-white border-t border-slate-200 mt-16 py-8 text-center text-xs text-slate-500">
        VentureLens AI — Multi-Project Capital Allocation · Part A: Investment Budget
      </footer>
    </div>
  );
}

