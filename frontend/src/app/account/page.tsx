"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { AccountSection } from "@/components/AccountSection";
import { AIModelCard } from "@/components/AIModelCard";
import { UserProfile, CompanyData } from "@/lib/types";
import { fetchCompany } from "@/lib/api";

const DEFAULT_COMPANY_ID = "venture_company_01";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyData>({
    company_id: DEFAULT_COMPANY_ID,
    total_investment_budget: 2000000,
    min_cash_reserve: 200000,
    loan_facility: 500000,
    discount_rate: 0.12,
    planning_period_years: 5,
    max_acceptable_risk: "Medium",
    contingency_pct: 0,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("venturelens_user");
      if (!saved) {
        // Enforce Authentication Guard: redirect logged-out users to login
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
        fetchCompany(compId)
          .then((c) => {
            if (c) setCompany(c);
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      } catch (e) {
        localStorage.removeItem("venturelens_user");
        router.push("/login");
      }
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("venturelens_user");
    localStorage.removeItem("venturelens_latest_result");
    setUser(null);
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <AccountSection
          user={user}
          company={company}
          onLogout={handleLogout}
          onOpenAuth={() => router.push("/login")}
        />

        {/* Machine Learning Model and Dataset Transparency */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-slate-900">
            Trained Machine Learning Models & Real Kaggle Dataset
          </h3>
          <AIModelCard />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 mt-16 py-8 text-center text-xs text-slate-500">
        VentureLens AI — Investor Profile & Governance Configuration
      </footer>
    </div>
  );
}
