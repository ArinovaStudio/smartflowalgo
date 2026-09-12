"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileCode,
  LineChart,
  Copy,
  Check,
  Download,
  Eye,
  CreditCard,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Clock,
  User,
  X,
  Zap,
  HelpCircle,
} from "lucide-react";

export interface UserIndicator {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  symbol: string | null;
  market: string | null;
  timeframe: string | null;
  currentVersion: string | null;
  distributionType: string | null;
  tradingViewId: string | null;
  tradingViewUrl: string | null;
  publisher: string | null;
  latestVersion?: {
    id: string;
    version: string;
    script: string | null;
    releaseNotes: string | null;
    releasedAt: string | null;
  } | null;
  accessSource?: string;
  expiresAt?: string | null;
}

interface UserDashboardViewProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    tradingViewId: string | null;
    broker?: string | null;
    mobile?: string | null;
    planType: string | null;
    planDate?: string | null;
    renualDate?: string | null;
    plan?: {
      id: string;
      name: string;
      badge: string | null;
      price?: number | null;
    } | null;
  };
  indicators: UserIndicator[];
}

export default function UserDashboardView({ user, indicators }: UserDashboardViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewingScript, setViewingScript] = useState<UserIndicator | null>(null);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  };

  const handleDownloadCode = (name: string, version: string, code: string) => {
    if (!code) return;
    const element = document.createElement("a");
    const file = new Blob([code], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    element.download = `${sanitizedName}_${version || "v1"}.pine`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const isPaid = user.planType === "PAID";
  const daysLeft = user.renualDate
    ? Math.max(
        0,
        Math.ceil((new Date(user.renualDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── Top Hero Banner ── */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-bold uppercase tracking-wider">
                Member Portal
              </span>
              {user.plan && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  {user.plan.name}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome back, {user.name || "Trader"}
            </h1>
            <p className="mt-1 text-sm text-slate-300 max-w-xl">
              Access your proprietary algorithmic indicators, view source codes, and monitor your subscription status.
            </p>
          </div>

          {/* Account Meta Badges */}
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5 min-w-[140px]">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                TradingView ID
              </p>
              <p className="text-sm font-bold text-white mt-0.5">
                {user.tradingViewId || "Not Linked"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5 min-w-[140px]">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Plan Status
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isPaid ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
                />
                <span
                  className={`text-sm font-bold ${
                    isPaid ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {user.planType || "APPLIED"}
                </span>
              </div>
            </div>

            {user.renualDate && (
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5 min-w-[140px]">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Renewal Due
                </p>
                <p className="text-sm font-bold text-white mt-0.5">
                  {daysLeft !== null ? `${daysLeft} days left` : "Active"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── My Unlocked Indicators & Pine Scripts ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-sky-500" />
              <span>My Unlocked Indicators ({indicators.length})</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Indicators and automated signal systems included with your active subscription plan.
            </p>
          </div>
        </div>

        {indicators.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {indicators.map((ind) => {
              const scriptCode = ind.latestVersion?.script;
              const isDirectScript = ind.distributionType === "DIRECT_SCRIPT" || !!scriptCode;

              return (
                <div
                  key={ind.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 shadow-sm hover:shadow-md hover:border-sky-500/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
                          {isDirectScript ? (
                            <FileCode className="h-5 w-5" />
                          ) : (
                            <LineChart className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            {ind.name}
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {isDirectScript ? "Pine Script Code" : "TradingView Invite"} •{" "}
                            <span className="font-mono font-semibold">
                              {ind.currentVersion || "v1.0.0"}
                            </span>
                          </p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold uppercase tracking-wider">
                        Active
                      </span>
                    </div>

                    {ind.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {ind.description}
                      </p>
                    )}

                    {(ind.market || ind.timeframe) && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        {ind.market && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {ind.market}
                          </span>
                        )}
                        {ind.timeframe && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {ind.timeframe}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                    {isDirectScript && scriptCode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCopy(scriptCode, ind.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                        >
                          {copiedId === ind.id ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy Pine Code</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewingScript(ind)}
                          title="View Code"
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-sky-500/40 hover:text-sky-500 transition-colors cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* <button
                          type="button"
                          onClick={() =>
                            handleDownloadCode(
                              ind.name,
                              ind.currentVersion || "v1.0.0",
                              scriptCode
                            )
                          }
                          title="Download .pine File"
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-sky-500/40 hover:text-sky-500 transition-colors cursor-pointer"
                        >
                          <Download className="h-4 w-4" />
                        </button> */}
                      </>
                    ) : ind.tradingViewUrl ? (
                      <a
                        href={ind.tradingViewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-sm transition-all"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open on TradingView</span>
                      </a>
                    ) : (
                      <div className="w-full text-center py-1 text-xs text-slate-400 italic">
                        Access granted to TradingView ID: {user.tradingViewId || "Your Account"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No Indicators Unlocked Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {isPaid
                ? "Your subscription plan is being provisioned with proprietary indicators. Please check back shortly or contact our support team."
                : "Your account is currently in review. Once approved and confirmed, your unlocked indicators and Pine script codes will appear right here."}
            </p>
          </div>
        )}
      </div>

      {/* ── Quick Setup Guide ── */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-sky-500" />
          <span>How to Add Pine Script Indicators to TradingView</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1.5">
            <span className="font-bold text-sky-500 text-sm">Step 1</span>
            <p className="font-semibold text-slate-900 dark:text-white">Copy Indicator Code</p>
            <p>Click &quot;Copy Pine Code&quot; on your desired indicator above to copy the Pine Script to your clipboard.</p>
          </div>

          <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1.5">
            <span className="font-bold text-sky-500 text-sm">Step 2</span>
            <p className="font-semibold text-slate-900 dark:text-white">Open TradingView Pine Editor</p>
            <p>Open TradingView chart, click on the &quot;Pine Editor&quot; tab at the bottom, and paste the code.</p>
          </div>

          <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1.5">
            <span className="font-bold text-sky-500 text-sm">Step 3</span>
            <p className="font-semibold text-slate-900 dark:text-white">Add to Chart</p>
            <p>Click &quot;Save&quot; and then &quot;Add to chart&quot;. Your indicators and signals will render instantly on your chart.</p>
          </div>
        </div>
      </div>

      {/* ==================== VIEW FULL CODE MODAL ==================== */}
      <AnimatePresence>
        {viewingScript && viewingScript.latestVersion?.script && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setViewingScript(null)}
          >
            <motion.div
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {viewingScript.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Version: {viewingScript.currentVersion || "v1.0.0"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(viewingScript.latestVersion!.script!, "modal")
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    {copiedId === "modal" ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingScript(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto rounded-xl bg-slate-900 p-4 border border-slate-800">
                <pre className="font-mono text-xs text-sky-300 whitespace-pre leading-relaxed">
                  {viewingScript.latestVersion.script}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
