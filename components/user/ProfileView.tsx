"use client";

import { useState } from "react";
import Link from "next/link";
import {
    User, Mail, Calendar, Copy, CheckCircle2, LineChart, CreditCard,
    ShieldCheck, Sparkles, Play, LayoutDashboard, Check,
} from "lucide-react";
import { usePortal } from "./PortalContext";

export default function ProfileView() {
    const { user, indicators, handleApplyAndLaunch } = usePortal();
    const [copiedField, setCopiedField] = useState<string | null>(null);
    if (!user) return null;

    const isPaid = user.planType === "PAID";
    const daysLeft = user.renualDate
        ? Math.max(0, Math.ceil((new Date(user.renualDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;

    const handleCopy = (text: string, fieldName: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 px-4 md:px-8">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            {user.image ? (
                                <img src={user.image} alt={user.name || "User"} className="w-20 h-20 rounded-2xl border-2 border-sky-400 object-cover shadow-lg" />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                                    {(user.name || user.email || "U").charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white stroke-[3]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h2 className="text-xl sm:text-2xl font-black tracking-tight">{user.name || "Member Trader"}</h2>
                                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-bold uppercase tracking-wider">{user.userType || "CLIENT"}</span>
                                {user.plan && <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase">{user.plan.name}</span>}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-sky-400" /><span>{user.email}</span></p>
                            {user.createdAt && (
                                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Member since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric", day: "numeric" })}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/user/chart" className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-lg shadow-sky-500/25 transition-all flex items-center gap-2">
                            <LineChart className="w-4 h-4" /><span>Live Terminal</span>
                        </Link>
                        <Link href="/user" className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-white text-xs font-bold transition-all flex items-center gap-2">
                            <LayoutDashboard className="w-4 h-4" /><span>Dashboard</span>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm pb-3 border-b border-slate-100 dark:border-slate-800/80">
                        <User className="w-4 h-4 text-sky-500" /><span>Personal Details</span>
                    </div>
                    <div className="space-y-3.5 text-xs">
                        <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span><p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{user.name || "Not provided"}</p></div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                            <div className="flex items-center justify-between mt-0.5">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate mr-2">{user.email}</span>
                                <button type="button" onClick={() => handleCopy(user.email, "email")} className="text-slate-400 hover:text-sky-500 transition-colors p-1" title="Copy Email">
                                    {copiedField === "email" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                        <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone / Mobile</span><p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{user.mobile || "Not registered"}</p></div>
                        <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trading Experience</span><p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{user.experience || "Intermediate / Systematic Trader"}</p></div>
                        <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Primary Market Focus</span><p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{user.interest || "Gold (XAUUSD), Forex & Crypto"}</p></div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm pb-3 border-b border-slate-100 dark:border-slate-800/80">
                        <LineChart className="w-4 h-4 text-emerald-500" /><span>Trading & Brokerage</span>
                    </div>
                    <div className="space-y-3.5 text-xs">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TradingView Username</span>
                            <div className="flex items-center justify-between mt-0.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
                                <span className="font-mono font-bold text-sky-600 dark:text-sky-400 truncate mr-2">{user.tradingViewId || "Pending link"}</span>
                                {user.tradingViewId && (
                                    <button type="button" onClick={() => handleCopy(user.tradingViewId!, "tv")} className="text-slate-400 hover:text-sky-500 p-0.5" title="Copy TradingView ID">
                                        {copiedField === "tv" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Broker Integration</span><p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{user.broker || "MetaTrader 5 (MT5 Broker Feed)"}</p></div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Terminal Live Status</span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">WebSocket MT5 Active</span>
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account ID</span>
                            <div className="flex items-center justify-between mt-0.5">
                                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate mr-2">{user.id}</span>
                                <button type="button" onClick={() => handleCopy(user.id, "uid")} className="text-slate-400 hover:text-sky-500 transition-colors p-1" title="Copy User ID">
                                    {copiedField === "uid" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm pb-3 border-b border-slate-100 dark:border-slate-800/80">
                        <CreditCard className="w-4 h-4 text-purple-500" /><span>Membership Details</span>
                    </div>
                    <div className="space-y-3.5 text-xs">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Membership Plan</span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="font-extrabold text-slate-900 dark:text-white text-sm">{user.plan?.name || "Free Access / Direct Grant"}</span>
                                {user.plan?.badge && <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-500 text-[10px] font-bold uppercase">{user.plan.badge}</span>}
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Access Status</span>
                            <div className="mt-1">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${isPaid ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"}`}>
                                    <ShieldCheck className="w-3.5 h-3.5" /><span>{user.planType || "APPLIED"}</span>
                                </span>
                            </div>
                        </div>
                        <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Activated Date</span><p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{user.planDate ? new Date(user.planDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Immediate Registration"}</p></div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Next Renewal / Expiry</span>
                            <div className="flex items-center justify-between mt-0.5">
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{user.renualDate ? new Date(user.renualDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Lifetime / Continuous"}</p>
                                {daysLeft !== null && <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-500 font-extrabold text-[10px]">{daysLeft} Days Left</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
                        <Sparkles className="w-4 h-4 text-sky-500" /><span>My Algorithm Access ({indicators.length})</span>
                    </div>
                    <Link href="/user/chart" className="text-xs font-bold text-sky-500 hover:text-sky-400 transition-colors">Launch in Chart &rarr;</Link>
                </div>
                {indicators.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                        {indicators.map((ind) => (
                            <div key={ind.id} className="w-full sm:w-[calc(50%-0.375rem)] lg:w-[280px] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 flex flex-col justify-between space-y-3">
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">{ind.name}</span>
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 font-bold shrink-0">{ind.currentVersion || "v1.0"}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{ind.description || "Systematic institutional trend and market-flow indicator."}</p>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
                                    <span className="text-[10px] font-semibold text-slate-400">{ind.distributionType || "TradingView & MT5"}</span>
                                    <button type="button" onClick={() => handleApplyAndLaunch(ind)} className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline">
                                        <Play className="w-3 h-3 fill-current" /><span>Open in Chart</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="w-full sm:w-[calc(50%-0.375rem)] lg:w-[280px] p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-950/20 flex flex-col items-center justify-center text-center space-y-2">
                            <Sparkles className="w-4 h-4 text-slate-400" />
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Explore more algorithms to add to your account</p>
                            <Link href="/user" className="text-[11px] font-bold text-sky-500 hover:underline">Browse Indicators &rarr;</Link>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center text-xs text-slate-400">No custom indicators currently assigned to this account.</div>
                )}
            </div>
        </div>
    );
}