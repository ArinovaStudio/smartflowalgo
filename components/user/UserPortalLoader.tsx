"use client";

import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface UserPortalLoaderProps {
  statusMessage?: string;
  subMessage?: string;
}

export default function UserPortalLoader({
  statusMessage = "Preparing Your Workspace",
  subMessage = "Syncing your trading account and indicators...",
}: UserPortalLoaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-white dark:bg-[#050811] text-slate-900 dark:text-white select-none transition-colors duration-300">
      {/* ── AMBIENT GLOW ACCENT ── */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[450px] h-[450px] rounded-full bg-sky-500/10 dark:bg-sky-500/15 blur-[100px] animate-pulse" />
        <div className="w-[250px] h-[250px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/10 blur-[80px]" />
      </div>

      {/* ── CARD CONTAINER ── */}
      <div className="relative z-10 flex flex-col items-center px-6 py-8 max-w-sm w-full mx-auto text-center">
        {/* ── SLEEK ORBITAL LOADER ── */}
        <div className="relative flex items-center justify-center w-24 h-24 mb-6">
          {/* Subtle Outer Track */}
          <div className="absolute inset-0 rounded-full border border-slate-200 dark:border-slate-800" />

          {/* Smooth Rotating Gradient Arc */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-sky-400 dark:border-t-sky-400 dark:border-r-indigo-500 animate-spin [animation-duration:1.6s]" />

          {/* Inner Accent Ring */}
          <div className="absolute inset-2.5 rounded-full border border-slate-100 dark:border-slate-800/80" />

          {/* Central Monogram Badge */}
          <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-sky-500/30 shadow-lg shadow-sky-500/5 dark:shadow-[0_0_20px_rgba(14,165,233,0.25)] backdrop-blur-md">
            <span className="font-black text-sm tracking-tight bg-gradient-to-r from-sky-500 to-indigo-500 dark:from-sky-300 dark:to-indigo-400 bg-clip-text text-transparent">
              SF
            </span>

            {/* Glowing Corner Live Ping */}
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
            </span>
          </div>
        </div>

        {/* ── PLATFORM BRAND & TITLE ── */}
        <div className="space-y-1.5 mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-[10px] font-bold tracking-wider uppercase mb-0.5">
            <Sparkles className="h-2.5 w-2.5" />
            <span>SmartFlowAlgo</span>
          </div>

          <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
            {statusMessage}
          </h2>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {subMessage}
          </p>
        </div>

        {/* ── SMOOTH ELEGANT FLOW PROGRESS BAR ── */}
        <div className="w-52 h-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden relative mb-5">
          <div className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 dark:from-sky-400 dark:to-indigo-400 animate-[pulse_1.5s_ease-in-out_infinite]" />
          <div className="absolute inset-y-0 w-full bg-gradient-to-r from-transparent via-sky-400/30 dark:via-sky-300/40 to-transparent animate-[shimmer_1.8s_infinite]" />
        </div>

        {/* ── FOOTER SECURE BADGE ── */}
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          Secure Trading Environment
        </span>
      </div>
    </div>
  );
}
