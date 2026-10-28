"use client";

import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  History,
  FileCheck2,
  User,
  LogOut,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { UserProfile } from "@/lib/types";

interface NavbarProps {
  activeTab: "planner" | "history" | "account";
  setActiveTab: (tab: "planner" | "history" | "account") => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  backendHealthy: boolean | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onOpenAuth,
  onLogout,
  backendHealthy,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-teal-700 flex items-center justify-center text-white shadow-md">
              <TrendingUp className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight">
                  VentureLens <span className="text-teal-600">AI</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                  Smart Allocation
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Simple Multi-Project Capital Budgeting
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab("planner")}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "planner"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Planner</span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </button>

            <Link
              href="/testing"
              className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <span className="hidden md:inline">Tests & Proofs</span>
              <span className="md:hidden">Tests</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                5/5
              </span>
            </Link>

            <button
              onClick={() => setActiveTab("account")}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "account"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Account</span>
            </button>
          </nav>

          {/* Right Status & Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Backend Status Dot */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 border border-slate-200 text-slate-700">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealthy === true
                    ? "bg-emerald-500 animate-pulse"
                    : backendHealthy === false
                    ? "bg-rose-500"
                    : "bg-amber-400"
                }`}
              />
              <span>
                {backendHealthy === true
                  ? "Render Live"
                  : backendHealthy === false
                  ? "Backend Connecting"
                  : "Checking"}
              </span>
            </div>

            {/* Auth Action */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
