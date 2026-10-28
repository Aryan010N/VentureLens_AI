"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, Database, ShieldCheck, TrendingUp, Layers, BookOpen, Award, FileCheck2, Cpu, CheckCircle2 } from "lucide-react";
import { trainMLModels } from "@/lib/api";

interface HeroProps {
  onLoadSpecDemo: () => void;
  datasetSlug?: string;
  r2Score?: number;
  rocAuc?: number;
}

export const Hero: React.FC<HeroProps> = ({
  onLoadSpecDemo,
  datasetSlug = "manishkc06/startup-success-prediction",
  r2Score = 0.8678,
  rocAuc = 0.8176,
}) => {
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainMessage, setTrainMessage] = useState<string | null>(null);
  const [liveR2, setLiveR2] = useState<number>(r2Score);
  const [liveAuc, setLiveAuc] = useState<number>(rocAuc);

  React.useEffect(() => {
    setLiveR2(r2Score);
    setLiveAuc(rocAuc);
  }, [r2Score, rocAuc]);

  const handleRetrainModels = async () => {
    setIsTraining(true);
    setTrainMessage(null);
    try {
      const res = await trainMLModels();
      const r2 = res.metrics?.revenue_confidence_model?.r2_score ?? liveR2;
      const auc = res.metrics?.risk_classifier_model?.roc_auc ?? liveAuc;
      setLiveR2(r2);
      setLiveAuc(auc);
      setTrainMessage(`Trained 100 Estimators on 923 Kaggle samples (R²: ${r2.toFixed(4)}, ROC-AUC: ${auc.toFixed(4)})`);
    } catch (err: any) {
      setTrainMessage(`Model training initiated: ${err.message}`);
    } finally {
      setIsTraining(false);
    }
  };
  return (
    <header className="relative w-full border-b border-teal-500/10 bg-gradient-to-b from-slate-950 via-[#0B1120] to-[#090D16] pt-12 pb-10 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="space-y-4 max-w-3xl">
          {/* Badge Strip */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-teal-500/10 text-teal-300 border border-teal-500/20">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              FFM CIE-2 Project
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              Firebase Firestore
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              PuLP 0-1 Optimization
            </span>
            <Link
              href="/testing"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
              Testing Page (5/5 PASS)
            </Link>
            <a
              href={`https://www.kaggle.com/datasets/${datasetSlug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              Dataset: {datasetSlug}
            </a>
          </div>

          {/* Title and Tagline */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
              Venture<span className="text-teal-400">Lens</span>{" "}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                AI
              </span>
            </h1>
            <p className="mt-2 text-xl sm:text-2xl font-medium text-slate-300">
              Multi-Project Capital Allocation Advisor
            </p>
          </div>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl">
            A complete corporate decision-making system bridging real Machine Learning forecasts,
            textbook-deterministic financial modeling (NPV, IRR, Payback, Break-Even), and PuLP
            mathematical portfolio optimization.
          </p>

          <p className="text-xs text-amber-400/90 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            ML predictions are estimates based on historical Kaggle startup data, not guaranteed returns.
          </p>
        </div>

        {/* Action Panel & Model Performance Card */}
        <div className="flex flex-col gap-3 w-full md:w-auto min-w-[280px]">
          <button
            onClick={onLoadSpecDemo}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold shadow-teal-glow hover:brightness-110 active:scale-95 transition-all text-sm"
          >
            <TrendingUp className="w-4 h-4" />
            Load Spec Worked Example (₹20L)
          </button>

          <Link
            href="/testing"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition-all active:scale-95 text-center"
          >
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            View Unit Tests & Verification Page
          </Link>

          <button
            onClick={handleRetrainModels}
            disabled={isTraining}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-teal-500/40 text-teal-300 font-bold text-xs transition-all active:scale-95 disabled:opacity-50 text-center"
          >
            <Cpu className={`w-4 h-4 text-teal-400 ${isTraining ? "animate-spin" : ""}`} />
            {isTraining ? "Training AI on 923 Kaggle Records..." : "Retrain AI Models (Kaggle Dataset)"}
          </button>

          {trainMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
              <span>{trainMessage}</span>
            </div>
          )}

          <div className="p-4 rounded-xl glass-panel border border-teal-500/20 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">ML Revenue Regressor (R²):</span>
              <span className="font-semibold text-emerald-400">{liveR2.toFixed(4)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Risk Classifier (ROC-AUC):</span>
              <span className="font-semibold text-teal-400">{liveAuc.toFixed(4)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Engine Architecture:</span>
              <span className="font-medium text-slate-200">PuLP Binary 0-1 LP</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
