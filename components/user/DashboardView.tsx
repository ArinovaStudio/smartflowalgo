"use client";

import { Sparkles, Check, Play, LineChart } from "lucide-react";
import { usePortal } from "./PortalContext";

export default function DashboardView() {
    const { user, indicators, selectedIndicatorIds, toggleIndicatorSelection, handleApplyAndLaunch } = usePortal();
    if (!user) return null;

    const isPaid = user.planType === "PAID";
    const daysLeft = user.renualDate
        ? Math.max(0, Math.ceil((new Date(user.renualDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-bold uppercase tracking-wider">Active Member</span>
                            {user.plan && <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold">{user.plan.name}</span>}
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Welcome, {user.name || "Trader"}</h2>
                        <p className="mt-1 text-sm text-slate-300 max-w-xl">Select your unlocked indicators below to launch them directly into the full TradingView charting platform.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5 min-w-[130px]">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">TradingView ID</p>
                            <p className="text-sm font-bold text-white mt-0.5">{user.tradingViewId || "Linked"}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5 min-w-[130px]">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Plan Status</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`h-2 w-2 rounded-full ${isPaid ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                                <span className={`text-sm font-bold ${isPaid ? "text-emerald-400" : "text-amber-400"}`}>{user.planType || "APPLIED"}</span>
                            </div>
                        </div>
                        {user.renualDate && (
                            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5 min-w-[130px]">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Renewal Due</p>
                                <p className="text-sm font-bold text-white mt-0.5">{daysLeft !== null ? `${daysLeft} days left` : "Active"}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-sky-500" /><span>My Unlocked Indicators ({indicators.length})</span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Proprietary indicators granted with your subscription. Choose one indicator to load into the live terminal.</p>
                    </div>
                </div>

                {indicators.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {indicators.map((ind) => {
                            const isSelected = selectedIndicatorIds.includes(ind.id);
                            return (
                                <div key={ind.id} className={`rounded-2xl border transition-all p-5 flex flex-col justify-between ${isSelected ? "border-sky-500 dark:border-sky-500 bg-sky-500/5 dark:bg-sky-500/10 shadow-lg shadow-sky-500/10" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-sky-500/40"}`}>
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`p-2.5 rounded-xl border ${isSelected ? "bg-sky-500 text-white border-sky-400" : "bg-sky-500/10 text-sky-500 border-sky-500/20"}`}>
                                                    <LineChart className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{ind.name}</h4>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">Version: <span className="font-mono font-semibold text-sky-500">{ind.currentVersion || "v1.0.0"}</span></p>
                                                </div>
                                            </div>
                                            {isSelected ? (
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold uppercase">Loaded</span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-semibold">Ready</span>
                                            )}
                                        </div>
                                        {ind.description && <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{ind.description}</p>}
                                        {(ind.market || ind.timeframe) && (
                                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                                {ind.market && <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{ind.market}</span>}
                                                {ind.timeframe && <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{ind.timeframe}</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                                        <button type="button" onClick={() => toggleIndicatorSelection(ind.id, ind.name)} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${isSelected ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"}`}>
                                            <Check className={`h-3.5 w-3.5 ${isSelected ? "opacity-100" : "opacity-30"}`} /><span>{isSelected ? "Active" : "Select"}</span>
                                        </button>
                                        <button type="button" onClick={() => handleApplyAndLaunch(ind)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all">
                                            <Play className="h-3.5 w-3.5" /><span>Launch Chart</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
                        <div className="h-12 w-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto"><Sparkles className="h-6 w-6" /></div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">No Indicators Unlocked Yet</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                            {isPaid ? "Your subscription plan is being provisioned. Please check back shortly or reach out to support." : "Your access request is currently in review. Once approved, your indicators will appear here ready to launch in the chart."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}