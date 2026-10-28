"use client";

import React from "react";
import {
  User,
  Building,
  Mail,
  Shield,
  Database,
  LogOut,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { UserProfile, CompanyData } from "@/lib/types";

interface AccountSectionProps {
  user: UserProfile | null;
  company: CompanyData;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export const AccountSection: React.FC<AccountSectionProps> = ({
  user,
  company,
  onLogout,
  onOpenAuth,
}) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <User className="w-6 h-6 text-teal-600" />
          Investor Account
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Manage your investment profile and corporate portfolio credentials.
        </p>
      </div>

      <div className="card-clean rounded-2xl p-6 sm:p-8 space-y-6">
        {user ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 to-teal-700 flex items-center justify-center text-white text-2xl font-black shadow-md">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{user.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {user.email}
                </p>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mt-2">
                  Active Financial Officer
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-100">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Company ID</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {company.company_id}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Database</span>
                <span className="font-bold text-teal-800 text-sm flex items-center gap-1.5 mt-0.5">
                  <Database className="w-3.5 h-3.5 text-teal-600" />
                  Firebase Firestore Cloud
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Ready to switch accounts?
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                You are currently browsing as a Guest
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Log in to link your portfolio configurations and optimization history to your account.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenAuth}
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-md"
            >
              Sign In / Register
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
