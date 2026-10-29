"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  PieChart,
  RefreshCw,
  Sparkles,
  Layers,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { ProjectFullAnalysisModal } from "@/components/ProjectFullAnalysisModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { fetchRunHistory, fetchCompany } from "@/lib/api";
import { OptimizationResult, AllocationItem, UserProfile } from "@/lib/types";

const DEFAULT_COMPANY_ID = "venture_company_01";

export default function ResultsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [discountRate, setDiscountRate] = useState<number>(0.12);
  const [selectedProject, setSelectedProject] = useState<AllocationItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("venturelens_user");
      if (!userStr) {
        router.push("/login");
        return;
      }
      let compId = DEFAULT_COMPANY_ID;
      try {
        const u = JSON.parse(userStr);
        if (!u || !u.user_id) {
          localStorage.removeItem("venturelens_user");
          router.push("/login");
          return;
        }
        setUser(u);
        if (u.company_id) compId = u.company_id;
      } catch (e) {
        localStorage.removeItem("venturelens_user");
        router.push("/login");
        return;
      }

      // 1. Try reading latest result from localStorage
      const saved = localStorage.getItem("venturelens_latest_result");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setResult(parsed);
          if (parsed.constraints_summary?.discount_rate) {
            setDiscountRate(parsed.constraints_summary.discount_rate);
          }
          setLoading(false);
          return;
        } catch (e) {}
      }

      // 2. Fallback: fetch latest run from Firestore
      fetchCompany(compId)
        .then((c) => {
          if (c?.discount_rate) setDiscountRate(c.discount_rate);
        })
        .catch(() => {});

      fetchRunHistory(compId)
        .then((runs) => {
          if (runs && runs.length > 0) {
            setResult(runs[0]);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("venturelens_user");
    localStorage.removeItem("venturelens_latest_result");
    setUser(null);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-teal-600" />
              <span>Back to Planner</span>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <PieChart className="w-6 h-6 text-teal-600" />
                Optimization Allocation Results
              </h1>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            Adjust Budget / Projects
          </Link>
        </div>

        {loading ? (
          <div className="card-clean rounded-2xl p-12 text-center text-slate-500 space-y-3">
            <div className="w-8 h-8 border-3 border-slate-300 border-t-teal-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold">Loading optimization results...</p>
          </div>
        ) : result ? (
          <ErrorBoundary fallbackTitle="Error displaying Results Dashboard">
            <ResultsDashboard
              result={result}
              onOpenFullAnalysis={(proj) => setSelectedProject(proj)}
              discountRate={discountRate}
            />
          </ErrorBoundary>
        ) : (
          <div className="card-clean rounded-2xl p-12 text-center text-slate-500 space-y-4">
            <PieChart className="w-10 h-10 text-slate-400 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-800">No Optimization Results Found</p>
              <p className="text-xs text-slate-500 mt-1">
                Enter your investment budget and project proposals in the Smart Planner, then click Analyze.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-md"
            >
              <span>Go to Smart Planner</span>
            </Link>
          </div>
        )}
      </main>

      {/* Full Analysis Modal wrapped in ErrorBoundary */}
      <ErrorBoundary
        fallbackTitle="Unable to display Full Project Analysis"
        onReset={() => setSelectedProject(null)}
      >
        <ProjectFullAnalysisModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          discountRate={discountRate}
        />
      </ErrorBoundary>

      <footer className="bg-white border-t border-slate-200 mt-16 py-8 text-center text-xs text-slate-500">
        VentureLens AI — PuLP Mathematical Knapsack Optimization & Deterministic Capital Allocation
      </footer>
    </div>
  );
}

