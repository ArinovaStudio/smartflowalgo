"use client";

import { useEffect, useState } from "react";
import UserPortal from "@/components/user/UserPortal";
import DashboardView from "@/components/user/DashboardView";


export default function UserDashboardClient() {
  const [userData, setUserData] = useState<any>(null);
  const [indicators, setIndicators] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = async () => {
    try {
      const response = await fetch("/api/user/dashboard");

      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }

      const data = await response.json();

      setUserData(data.user);
      setIndicators(data.indicators ?? []);
    } catch (error) {
      console.error("Error fetching user:", error);
      setError("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    user();
  }, []);

if (loading) {
  return (
    <div className="h-screen w-screen flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <div className="flex flex-col items-center gap-6">

        {/* SmartFlowAlgo Branding */}
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center font-black text-lg">
            SF
          </div>

          <div>
            <h2 className="font-extrabold text-base tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              SmartFlowAlgo
            </h2>

            <p className="text-[10px] text-slate-400 font-semibold">
              Trading Platform
            </p>
          </div>
        </div>

        {/* Animated Loader */}
        <div className="relative h-14 w-14 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[3px] border-slate-200 dark:border-slate-800" />

          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-sky-500 animate-spin" />

          <div className="h-7 w-7 rounded-full bg-sky-500/10 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-1.5">
          <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
            Preparing Your Workspace
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Syncing your trading account and indicators...
          </p>
        </div>

        {/* Animated Progress Bar */}
        <div className="h-1 w-48 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 animate-[loading_1.5s_ease-in-out_infinite]" />
        </div>

        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Secure Trading Environment
        </span>
      </div>
    </div>
  );
}
  if (error) {
    return <div>{error}</div>;
  }

  return (
    <DashboardView />
  );
}