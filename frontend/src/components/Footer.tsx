"use client";

import React from "react";
import { Github, ExternalLink, GraduationCap, Database } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-teal-500/10 bg-slate-950/80 py-8 px-4 sm:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <span className="font-semibold text-slate-200">VentureLens AI</span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="flex items-center gap-1.5 text-teal-400">
            <GraduationCap className="w-4 h-4" />
            FFM CIE-2 Academic Project
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            Firebase Firestore Database
          </span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://www.kaggle.com/datasets/manishkc06/startup-success-prediction"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:text-teal-400 transition-colors"
          >
            Kaggle Dataset
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://github.com/Aryan010N/VentureLens_AI"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:text-teal-400 transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            GitHub Repository
          </a>
        </div>
      </div>
    </footer>
  );
};
