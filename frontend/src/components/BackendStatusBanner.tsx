"use client";

import React, { useState, useEffect } from "react";
import { Server, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, Settings } from "lucide-react";
import { getApiBaseUrl, setApiBaseUrl, fetchHealth } from "@/lib/api";

interface BackendStatusBannerProps {
  onBackendReconnected: () => void;
}

export const BackendStatusBanner: React.FC<BackendStatusBannerProps> = ({ onBackendReconnected }) => {
  const [apiUrl, setApiUrl] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [tempUrl, setTempUrl] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [serviceInfo, setServiceInfo] = useState<any>(null);

  const checkConnection = async () => {
    setChecking(true);
    try {
      const data = await fetchHealth();
      if (data && data.status === "healthy") {
        setIsConnected(true);
        setServiceInfo(data);
      } else {
        setIsConnected(false);
      }
    } catch {
      setIsConnected(false);
      setServiceInfo(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    const current = getApiBaseUrl();
    setApiUrl(current);
    setTempUrl(current);
    checkConnection();
  }, []);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tempUrl.trim().replace(/\/+$/, "");
    setApiBaseUrl(clean);
    setApiUrl(clean);
    setIsEditing(false);
    checkConnection().then(() => {
      onBackendReconnected();
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 pt-4">
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs transition-all ${
        isConnected === true
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          : isConnected === false
          ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
          : "bg-slate-900/60 border-slate-800 text-slate-400"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            isConnected === true ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
          }`}>
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-bold text-sm">
              <span>FastAPI Backend Engine:</span>
              {isConnected === true ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Real Python + PuLP + Firebase Firestore Active
                </span>
              ) : isConnected === false ? (
                <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" /> Backend Unreachable at {apiUrl}
                </span>
              ) : (
                <span className="text-slate-400 text-xs">Checking connection...</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live Target Endpoint: <code className="text-slate-200 font-mono">{apiUrl}</code>
              {serviceInfo?.database && ` | Database: ${serviceInfo.database}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {isEditing ? (
            <form onSubmit={handleSaveUrl} className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="https://your-backend.onrender.com"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-teal-400 w-full sm:w-72"
                required
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 transition-colors"
              >
                Connect
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-2 py-1.5 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => checkConnection()}
                disabled={checking}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700 hover:border-slate-600 text-slate-300 font-medium"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
                Test Ping
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 font-semibold"
              >
                <Settings className="w-3.5 h-3.5" />
                Change Backend URL
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
