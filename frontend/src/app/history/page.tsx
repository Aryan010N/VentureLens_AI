"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { AnalysisHistorySection } from "@/components/AnalysisHistorySection";
import { fetchRunHistory } from "@/lib/api";
import { OptimizationResult } from "@/lib/types";

const DEFAULT_COMPANY_ID = "venture_company_01";

export default function HistoryPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<OptimizationResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    let compId = DEFAULT_COMPANY_ID;
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("venturelens_user");
      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          if (u.company_id) compId = u.company_id;
        } catch (e) {}
      }
    }

    try {
      const history = await fetchRunHistory(compId);
      setRuns(history);
    } catch (err) {
      console.warn("Failed to fetch runs history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSelectRun = (run: OptimizationResult) => {
    localStorage.setItem("venturelens_latest_result", JSON.stringify(run));
    router.push("/results");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="card-clean rounded-2xl p-12 text-center text-slate-500 space-y-3">
            <div className="w-8 h-8 border-3 border-slate-300 border-t-teal-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold">Loading past runs from Firestore...</p>
          </div>
        ) : (
          <AnalysisHistorySection
            runs={runs}
            onSelectRun={handleSelectRun}
            onRefresh={loadHistory}
          />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-16 py-8 text-center text-xs text-slate-500">
        VentureLens AI — Historical Capital Allocation Audit Trail
      </footer>
    </div>
  );
}
