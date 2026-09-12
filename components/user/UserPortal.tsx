"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  LineChart,
  Sparkles,
  CreditCard,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Plus,
  Check,
  Play,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Calendar,
  Copy,
  CheckCircle2,
  Shield,
  ExternalLink,
  Award,
  Clock,
} from "lucide-react";
import { signOut } from "next-auth/react";
import TradingViewWidget from "./TradingViewWidget";

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
    script?: string | null;
    releaseNotes: string | null;
    releasedAt: string | null;
  } | null;
  accessSource?: string;
  expiresAt?: string | null;
}

interface UserPortalProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    tradingViewId: string | null;
    broker?: string | null;
    mobile?: string | null;
    userType?: string | null;
    image?: string | null;
    experience?: string | null;
    interest?: string | null;
    createdAt?: string | null;
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

export default function UserPortal({ user, indicators }: UserPortalProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "chart" | "profile">("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Selected multiple indicators for chart
  const [selectedIndicatorIds, setSelectedIndicatorIds] = useState<string[]>([]);
  const [appliedToast, setAppliedToast] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || (document.documentElement.classList.contains("dark") ? "dark" : "dark");
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    window.location.reload();
  };

  const isPaid = user.planType === "PAID";
  const daysLeft = user.renualDate
    ? Math.max(
      0,
      Math.ceil((new Date(user.renualDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    )
    : null;

  // Toggle single indicator in multi-selection
  const toggleIndicatorSelection = (id: string, name?: string) => {
    setSelectedIndicatorIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      if (!exists && name) {
        setAppliedToast(`Added "${name}" to Live Chart!`);
        setTimeout(() => setAppliedToast(null), 2500);
      }
      return next;
    });
  };

  // Add & Launch directly from dashboard card
  const handleApplyAndLaunch = (ind: UserIndicator) => {
    setSelectedIndicatorIds((prev) => {
      if (!prev.includes(ind.id)) {
        return [...prev, ind.id];
      }
      return prev;
    });
    setAppliedToast(`Loaded "${ind.name}" on Live Chart!`);
    setTimeout(() => setAppliedToast(null), 2500);
    setActiveTab("chart");
  };

  const activeIndicatorsList = indicators.filter((ind) =>
    selectedIndicatorIds.includes(ind.id)
  );

  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex overflow-hidden">
      {/* ── Toast Notification ── */}
      <AnimatePresence>
        {appliedToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-14 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold shadow-2xl"
          >
            <Sparkles className="h-4 w-4" />
            <span>{appliedToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          COMPACT & COLLAPSIBLE SIDEBAR NAVIGATION (NO OVERLAP)
      ═══════════════════════════════════════════ */}
      <aside
        className={`h-full shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 transition-all duration-300 z-40 ${sidebarCollapsed ? "w-14" : "w-52"
          } ${mobileMenuOpen ? "fixed inset-y-0 left-0 z-50 w-52 translate-x-0 shadow-2xl flex" : "hidden md:flex"}`}
      >
        {/* Sidebar Header */}
        <div className="flex h-12 items-center justify-between px-3 border-b border-slate-200 dark:border-slate-800/80">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center font-black text-sm">
                SF
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
                  SmartFlowAlgo
                </span>
                <p className="text-[10px] text-slate-400 font-semibold leading-none">
                  Trading Platform
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto h-8 w-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center font-black text-sm">
              SF
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Card (Clickable to view Profile) */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800/60">
          <div
            onClick={() => {
              setActiveTab("profile");
              setMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 hover:border-sky-500/50 dark:hover:border-sky-500/50 cursor-pointer transition-all ${sidebarCollapsed ? "justify-center" : ""
              } ${activeTab === "profile" ? "ring-2 ring-sky-500/40" : ""}`}
            title="View User Profile"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md">
              {(user.name || user.email || "T").charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user.name || "Member Trader"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isPaid ? "bg-emerald-400" : "bg-amber-400"
                      }`}
                  />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase truncate">
                    {user.plan?.name || user.planType || "Free"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => {
              setActiveTab("dashboard");
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "dashboard"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
              } ${sidebarCollapsed ? "justify-center px-2" : ""}`}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>

          <button
            onClick={() => {
              setActiveTab("chart");
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "chart"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
              } ${sidebarCollapsed ? "justify-center px-2" : ""}`}
          >
            <LineChart className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && (
              <div className="flex-1 flex items-center justify-between">
                <span>Live Terminal</span>
                {/* <span className="px-1.5 py-0.2 rounded-md bg-emerald-400/20 text-emerald-300 text-[9px] font-extrabold uppercase">
                  MT5 Live
                </span> */}
              </div>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("profile");
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "profile"
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
              } ${sidebarCollapsed ? "justify-center px-2" : ""}`}
          >
            <User className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>My Profile</span>}
          </button>

          {/* Quick Active Indicators Tag */}
          {!sidebarCollapsed && activeIndicatorsList.length > 0 && (
            <div className="pt-4 px-1 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Indicators ({activeIndicatorsList.length})
                </p>
              </div>
              <div className="space-y-1">
                {activeIndicatorsList.map((ind) => (
                  <div
                    key={ind.id}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-sky-500 flex items-center gap-1.5 truncate"
                  >
                    <Sparkles className="h-3 w-3 shrink-0" />
                    <span className="truncate">{ind.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors ${sidebarCollapsed ? "justify-center" : ""
              }`}
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" />
                {!sidebarCollapsed && <span>Light Mode</span>}
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-indigo-500" />
                {!sidebarCollapsed && <span>Dark Mode</span>}
              </>
            )}
          </button>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors ${sidebarCollapsed ? "justify-center" : ""
              }`}
          >
            <LogOut className="h-4 w-4" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 md:hidden backdrop-blur-xs"
        />
      )}

      {/* ═══════════════════════════════════════════
          MAIN CONTENT AREA (NO OVERLAP, FULL VIEWPORT)
      ═══════════════════════════════════════════ */}
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-12 flex items-center justify-between px-3 sm:px-4 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md shrink-0 z-30">
          <div className="flex items-center gap-2.5">
            {/* Sidebar Collapse Toggle (Makes Chart View Bigger!) */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {activeTab === "dashboard"
                  ? "Trader Dashboard"
                  : activeTab === "chart"
                    ? "SmartFlow Live Terminal"
                    : "User Profile & Account"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab !== "chart" && (
              <button
                type="button"
                onClick={() => setActiveTab("chart")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
              >
                <LineChart className="h-3.5 w-3.5" />
                <span>Live Chart</span>
              </button>
            )}
            {activeTab !== "dashboard" && (
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-semibold transition-all cursor-pointer"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </button>
            )}
            {activeTab !== "profile" && (
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-semibold transition-all cursor-pointer"
              >
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Profile</span>
              </button>
            )}
          </div>
        </header>

        {/* ── Main Tab Views ── */}
        <main className={`flex-1 min-h-0 ${activeTab === "chart" ? "p-1 sm:p-1.5 overflow-hidden flex flex-col" : "p-4 sm:p-6 overflow-y-auto"}`}>
          {/* ========================================================
              TAB 1: TRADER DASHBOARD VIEW
          ======================================================== */}
          {activeTab === "dashboard" && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Hero Banner */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-bold uppercase tracking-wider">
                        Active Member
                      </span>
                      {user.plan && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                          {user.plan.name}
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                      Welcome, {user.name || "Trader"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-300 max-w-xl">
                      Select your unlocked indicators below to launch them directly into the full TradingView charting platform.
                    </p>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5 min-w-[130px]">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        TradingView ID
                      </p>
                      <p className="text-sm font-bold text-white mt-0.5">
                        {user.tradingViewId || "Linked"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5 min-w-[130px]">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Plan Status
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`h-2 w-2 rounded-full ${isPaid ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                            }`}
                        />
                        <span
                          className={`text-sm font-bold ${isPaid ? "text-emerald-400" : "text-amber-400"
                            }`}
                        >
                          {user.planType || "APPLIED"}
                        </span>
                      </div>
                    </div>

                    {user.renualDate && (
                      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5 min-w-[130px]">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
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

              {/* ── My Unlocked Indicators Grid ── */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-sky-500" />
                      <span>My Unlocked Indicators ({indicators.length})</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Proprietary indicators granted with your subscription. Click &quot;Add & Launch Chart&quot; to load them into the TradingView terminal.
                    </p>
                  </div>
                </div>

                {indicators.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {indicators.map((ind) => {
                      const isSelected = selectedIndicatorIds.includes(ind.id);

                      return (
                        <div
                          key={ind.id}
                          className={`rounded-2xl border transition-all p-5 flex flex-col justify-between ${isSelected
                              ? "border-sky-500 dark:border-sky-500 bg-sky-500/5 dark:bg-sky-500/10 shadow-lg shadow-sky-500/10"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-sky-500/40"
                            }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`p-2.5 rounded-xl border ${isSelected
                                      ? "bg-sky-500 text-white border-sky-400"
                                      : "bg-sky-500/10 text-sky-500 border-sky-500/20"
                                    }`}
                                >
                                  <LineChart className="h-5 w-5" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                    {ind.name}
                                  </h4>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    Version:{" "}
                                    <span className="font-mono font-semibold text-sky-500">
                                      {ind.currentVersion || "v1.0.0"}
                                    </span>
                                  </p>
                                </div>
                              </div>

                              {isSelected ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold uppercase">
                                  Loaded
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-semibold">
                                  Ready
                                </span>
                              )}
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

                          {/* Action Buttons */}
                          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleIndicatorSelection(ind.id, ind.name)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${isSelected
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                                  : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                                }`}
                            >
                              <Check className={`h-3.5 w-3.5 ${isSelected ? "opacity-100" : "opacity-30"}`} />
                              <span>{isSelected ? "Selected" : "Select"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleApplyAndLaunch(ind)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
                            >
                              <Play className="h-3.5 w-3.5" />
                              <span>Launch Chart</span>
                            </button>
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
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      No Indicators Unlocked Yet
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      {isPaid
                        ? "Your subscription plan is being provisioned. Please check back shortly or reach out to support."
                        : "Your access request is currently in review. Once approved, your indicators will appear here ready to launch in the chart."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: PURE FULL-FLEDGED TRADINGVIEW CHART PLATFORM
          ======================================================== */}
          {activeTab === "chart" && (
            <div className="flex flex-col h-full w-full min-h-0 space-y-1.5 overflow-hidden">
              {/* ── Top Indicator Selection Bar (Multiple Indicators Toggle) ── */}
              {indicators.length > 0 && (
                <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-sm shrink-0">
                  <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-none">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                      <span>Custom Indicators:</span>
                    </span>

                    {/* Indicator Multi-Select Toggle Badges */}
                    {indicators.map((ind) => {
                      const isSelected = selectedIndicatorIds.includes(ind.id);
                      return (
                        <button
                          key={ind.id}
                          type="button"
                          onClick={() => toggleIndicatorSelection(ind.id, ind.name)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${isSelected
                              ? "bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/30"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                        >
                          <div
                            className={`h-3 w-3 rounded flex items-center justify-center border ${isSelected
                                ? "bg-white text-sky-500 border-white"
                                : "border-slate-400 dark:border-slate-500"
                              }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </div>
                          <span>{ind.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold text-emerald-400">
                      {selectedIndicatorIds.length} Active on Chart
                    </span>
                  </div>
                </div>
              )}

              {/* ── Pure TradingView Advanced Chart Widget ── */}
              <div className="flex-1 w-full h-full min-h-0 overflow-hidden">
                <TradingViewWidget
                  symbol="XAUUSD"
                  interval="1m"
                  theme={theme}
                  activeIndicators={activeIndicatorsList}
                />
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 3: COMPREHENSIVE USER PROFILE SECTION
          ======================================================== */}
          {activeTab === "profile" && (
            <div className="max-w-[1600px] mx-auto space-y-6 pb-12 px-4 md:px-8">
              {/* Profile Header Banner */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name || "User"}
                          className="w-20 h-20 rounded-2xl border-2 border-sky-400 object-cover shadow-lg"
                        />
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
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                          {user.name || "Member Trader"}
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-bold uppercase tracking-wider">
                          {user.userType || "CLIENT"}
                        </span>
                        {user.plan && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase">
                            {user.plan.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-sky-400" />
                        <span>{user.email}</span>
                      </p>
                      {user.createdAt && (
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>Member since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric", day: "numeric" })}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab("chart")}
                      className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-lg shadow-sky-500/25 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <LineChart className="w-4 h-4" />
                      <span>Live Terminal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("dashboard")}
                      className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Dashboard</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* 1. Personal & Contact Information */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm pb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <User className="w-4 h-4 text-sky-500" />
                    <span>Personal Details</span>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Full Name
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {user.name || "Not provided"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Email Address
                      </span>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate mr-2">
                          {user.email}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(user.email, "email")}
                          className="text-slate-400 hover:text-sky-500 transition-colors p-1 cursor-pointer"
                          title="Copy Email"
                        >
                          {copiedField === "email" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Phone / Mobile
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {user.mobile || "Not registered"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Trading Experience
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {user.experience || "Intermediate / Systematic Trader"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Primary Market Focus
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {user.interest || "Gold (XAUUSD), Forex & Crypto"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Trading Accounts & Broker Integration */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm pb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <LineChart className="w-4 h-4 text-emerald-500" />
                    <span>Trading & Brokerage</span>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        TradingView Username
                      </span>
                      <div className="flex items-center justify-between mt-0.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400 truncate mr-2">
                          {user.tradingViewId || "Pending link"}
                        </span>
                        {user.tradingViewId && (
                          <button
                            type="button"
                            onClick={() => handleCopy(user.tradingViewId!, "tv")}
                            className="text-slate-400 hover:text-sky-500 p-0.5 cursor-pointer"
                            title="Copy TradingView ID"
                          >
                            {copiedField === "tv" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Broker Integration
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {user.broker || "MetaTrader 5 (MT5 Broker Feed)"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Terminal Live Status
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          WebSocket MT5 Active
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Account ID
                      </span>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate mr-2">
                          {user.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(user.id, "uid")}
                          className="text-slate-400 hover:text-sky-500 transition-colors p-1 cursor-pointer"
                          title="Copy User ID"
                        >
                          {copiedField === "uid" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Subscription & Membership Plan */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm pb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <CreditCard className="w-4 h-4 text-purple-500" />
                    <span>Membership Details</span>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Membership Plan
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {user.plan?.name || "Free Access / Direct Grant"}
                        </span>
                        {user.plan?.badge && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-500 text-[10px] font-bold uppercase">
                            {user.plan.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Account Access Status
                      </span>
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${isPaid
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{user.planType || "APPLIED"}</span>
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Activated Date
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {user.planDate
                          ? new Date(user.planDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "Immediate Registration"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Next Renewal / Expiry
                      </span>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {user.renualDate
                            ? new Date(user.renualDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "Lifetime / Continuous"}
                        </p>
                        {daysLeft !== null && (
                          <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-500 font-extrabold text-[10px]">
                            {daysLeft} Days Left
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Assigned Indicators & Algorithms */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
                    <Sparkles className="w-4 h-4 text-sky-500" />
                    <span>My Algorithm Access ({indicators.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("chart")}
                    className="text-xs font-bold text-sky-500 hover:text-sky-400 transition-colors cursor-pointer"
                  >
                    Launch in Chart &rarr;
                  </button>
                </div>

                {indicators.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {indicators.map((ind) => (
                      <div
                        key={ind.id}
                        className="w-full sm:w-[calc(50%-0.375rem)] lg:w-[280px] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {ind.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 font-bold shrink-0">
                              {ind.currentVersion || "v1.0"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {ind.description || "Systematic institutional trend and market-flow indicator."}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
                          <span className="text-[10px] font-semibold text-slate-400">
                            {ind.distributionType || "TradingView & MT5"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleApplyAndLaunch(ind)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Open in Chart</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Filler CTA so the row doesn't stretch into empty space on desktop */}
                    <div className="w-full sm:w-[calc(50%-0.375rem)] lg:w-[280px] p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-950/20 flex flex-col items-center justify-center text-center space-y-2">
                      <Sparkles className="w-4 h-4 text-slate-400" />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Explore more algorithms to add to your account
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("dashboard")}
                        className="text-[11px] font-bold text-sky-500 hover:underline cursor-pointer"
                      >
                        Browse Indicators &rarr;
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No custom indicators currently assigned to this account.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
