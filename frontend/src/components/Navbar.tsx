"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  PieChart,
  UserPlus,
} from "lucide-react";
import { UserProfile } from "@/lib/types";

interface NavbarProps {
  user?: UserProfile | null;
  onLogout?: () => void;
  backendHealthy?: boolean | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  user: propUser,
  onLogout: propLogout,
  backendHealthy: propHealthy,
}) => {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = React.useState<UserProfile | null>(propUser || null);
  const [backendHealthy, setBackendHealthy] = React.useState<boolean | null>(
    propHealthy !== undefined ? propHealthy : null
  );

  React.useEffect(() => {
    if (propUser !== undefined) {
      setUser(propUser);
    } else if (typeof window !== "undefined") {
      const saved = localStorage.getItem("venturelens_user");
      if (saved) {
        try {
          setUser(JSON.parse(saved));
        } catch (e) {}
      }
    }
  }, [propUser]);

  React.useEffect(() => {
    if (propHealthy === undefined) {
      import("@/lib/api").then(({ fetchHealth }) => {
        fetchHealth()
          .then(() => setBackendHealthy(true))
          .catch(() => setBackendHealthy(false));
      });
    }
  }, [propHealthy]);

  const handleLogout = () => {
    if (propLogout) {
      propLogout();
    } else {
      localStorage.removeItem("venturelens_user");
      setUser(null);
      router.push("/login");
    }
  };

  const navLinks = [
    { href: "/dashboard", label: "Planner", icon: TrendingUp },
    { href: "/results", label: "Results", icon: PieChart },
    { href: "/history", label: "History", icon: History },
    { href: "/testing", label: "Tests & Proofs", icon: FileCheck2, badge: "5/5" },
    { href: "/account", label: "Account", icon: User },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-teal-700 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
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
          </Link>

          {/* Navigation Tabs - Dedicated Next.js Multi-Page Routing */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href === "/dashboard" && pathname === "/");

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className={link.label === "Tests & Proofs" ? "hidden md:inline" : ""}>
                    {link.label}
                  </span>
                  {link.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
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
                <Link
                  href="/account"
                  className="hidden sm:flex flex-col text-right hover:opacity-80 transition-opacity"
                >
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    {user.email}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Log In</span>
                </Link>
                <Link
                  href="/signup"
                  className="hidden sm:flex px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
