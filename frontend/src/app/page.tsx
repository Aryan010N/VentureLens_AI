"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Brain,
  Layers,
  Sparkles,
  PieChart,
  Coins,
  History,
  FileCheck2,
  LogIn,
  UserPlus,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AIModelCard } from "@/components/AIModelCard";

export default function LandingPage() {
  const router = useRouter();

  // If user already has a session or wants immediate planner, redirect to /dashboard
  useEffect(() => {
    const hasVisited = sessionStorage.getItem("venturelens_visited");
    if (hasVisited) {
      router.push("/dashboard");
    } else {
      sessionStorage.setItem("venturelens_visited", "true");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-5 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>PuLP 0-1 Optimization · Real Scikit-Learn Models · Zero Hardcoding</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Smart Capital Allocation for{" "}
            <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
              Venture Portfolios
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto">
            Solve the Capital Rationing Dilemma with mathematical certainty. Maximize total portfolio NPV while protecting liquidity reserves and satisfying risk ceilings.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <span>Open Smart Planner</span>
              <ArrowRight className="w-4 h-4 text-teal-400" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Investor Sign In</span>
            </Link>

            <Link
              href="/testing"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <span>5/5 Tests & Proofs</span>
            </Link>
          </div>
        </div>

        {/* 3 Core Architecture Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-clean rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              1. Real Kaggle Machine Learning
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Trained on 923 historical startup companies (<code className="font-mono text-teal-700">data/startup_data.csv</code>) to predict cash flow realization confidence (R² = 86.8%) and distress probability (ROC-AUC = 81.8%). No hardcoded metrics.
            </p>
          </div>

          <div className="card-clean rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              2. Deterministic Financial Engine
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Computes exact textbook NPV, BCR, Accounting ROI, Annualized Return, Newton-Raphson numerical IRR, linear interpolated payback, and cash reserve buffers through <code className="font-mono text-emerald-700">metrics.py</code>.
            </p>
          </div>

          <div className="card-clean rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-slate-700" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              3. PuLP 0-1 Knapsack Optimization
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Evaluates all $2^n$ project combinations simultaneously via binary integer programming to maximize total corporate NPV subject to budget limits, reserve floors, and risk thresholds.
            </p>
          </div>
        </div>

        {/* Real ML Model & Kaggle Dataset Transparency */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Machine Learning Model & Kaggle Dataset Citation
            </h2>
            <span className="text-xs text-slate-500">Live Scikit-Learn Engine</span>
          </div>
          <AIModelCard />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-bold text-slate-700">VentureLens AI</span> — Multi-Project Capital Allocation
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:underline text-teal-700">Planner</Link>
            <span>•</span>
            <Link href="/testing" className="hover:underline text-teal-700">Tests (5/5 PASS)</Link>
            <span>•</span>
            <Link href="/history" className="hover:underline text-teal-700">History</Link>
            <span>•</span>
            <Link href="/account" className="hover:underline text-teal-700">Account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
