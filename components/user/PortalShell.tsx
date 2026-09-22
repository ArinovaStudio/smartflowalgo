"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
    LayoutDashboard, LineChart, Sparkles, LogOut, Sun, Moon, Menu, X,
    ChevronLeft, ChevronRight, User,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePortal } from "./PortalContext";

export default function PortalShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const {
        user, indicators, loading, error,
        theme, toggleTheme,
        sidebarCollapsed, setSidebarCollapsed,
        mobileMenuOpen, setMobileMenuOpen,
        selectedIndicatorIds, appliedToast,
    } = usePortal();

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                <div className="flex flex-col items-center gap-6">
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

                    <div className="relative h-14 w-14 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-[3px] border-slate-200 dark:border-slate-800" />
                        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-sky-500 animate-spin" />
                        <div className="h-7 w-7 rounded-full bg-sky-500/10 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                        </div>
                    </div>

                    <div className="text-center space-y-1.5">
                        <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                            Preparing Your Workspace
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Syncing your trading account and indicators...
                        </p>
                    </div>

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

    if (error || !user) {
        return <div>{error}</div>;
    }

    if (error || !user) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-rose-500 text-sm">
                {error || "Failed to load user data"}
            </div>
        );
    }

    const isPaid = user.planType === "PAID";
    const activeIndicatorsList = indicators.filter((ind) => selectedIndicatorIds.includes(ind.id));

    const navItems = [
        { href: "/user", label: "Dashboard", icon: LayoutDashboard },
        { href: "/user/chart", label: "Live Terminal", icon: LineChart },
        { href: "/user/profile", label: "My Profile", icon: User },
    ];

    const pageTitle =
        pathname === "/user/chart" ? "SmartFlow Live Terminal" :
            pathname === "/user/profile" ? "User Profile & Account" :
                "Trader Dashboard";

    return (
        <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex overflow-hidden">
            <AnimatePresence>
                {appliedToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="fixed top-14 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold shadow-2xl"
                    >
                        <Sparkles className="h-4 w-4" /><span>{appliedToast}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <aside className={`h-full shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 transition-all duration-300 z-40 ${sidebarCollapsed ? "w-14" : "w-52"} ${mobileMenuOpen ? "fixed inset-y-0 left-0 z-50 w-52 translate-x-0 shadow-2xl flex" : "hidden md:flex"}`}>
                <div className="flex h-12 items-center justify-between px-3 border-b border-slate-200 dark:border-slate-800/80">
                    {!sidebarCollapsed ? (
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center font-black text-sm">SF</div>
                            <div>
                                <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">SmartFlowAlgo</span>
                                <p className="text-[10px] text-slate-400 font-semibold leading-none">Trading Platform</p>
                            </div>
                        </div>
                    ) : (
                        <div className="mx-auto h-8 w-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center font-black text-sm">SF</div>
                    )}
                    <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                    <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-3 border-b border-slate-200 dark:border-slate-800/60">
                    <Link
                        href="/user/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 hover:border-sky-500/50 dark:hover:border-sky-500/50 transition-all ${sidebarCollapsed ? "justify-center" : ""} ${pathname === "/user/profile" ? "ring-2 ring-sky-500/40" : ""}`}
                    >
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md">
                            {(user.name || user.email || "T").charAt(0).toUpperCase()}
                        </div>
                        {!sidebarCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name || "Member Trader"}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`h-1.5 w-1.5 rounded-full ${isPaid ? "bg-emerald-400" : "bg-amber-400"}`} />
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase truncate">{user.plan?.name || user.planType || "Free"}</span>
                                </div>
                            </div>
                        )}
                    </Link>
                </div>

                <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
                    {navItems.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href;
                        return (
                            <Link
                                key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${active ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"} ${sidebarCollapsed ? "justify-center px-2" : ""}`}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                {!sidebarCollapsed && <span>{label}</span>}
                            </Link>
                        );
                    })}

                    {!sidebarCollapsed && activeIndicatorsList.length > 0 && (
                        <div className="pt-4 px-1 space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Indicator</p>
                            <div className="space-y-1">
                                {activeIndicatorsList.map((ind) => (
                                    <div key={ind.id} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-sky-500 flex items-center gap-1.5 truncate">
                                        <Sparkles className="h-3 w-3 shrink-0" /><span className="truncate">{ind.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </nav>

                <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                    <button onClick={toggleTheme} className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}>
                        {theme === "dark" ? (<><Sun className="h-4 w-4 text-amber-400" />{!sidebarCollapsed && <span>Light Mode</span>}</>) : (<><Moon className="h-4 w-4 text-indigo-500" />{!sidebarCollapsed && <span>Dark Mode</span>}</>)}
                    </button>
                    <button onClick={() => signOut({ callbackUrl: "/login" })} className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}>
                        <LogOut className="h-4 w-4" />{!sidebarCollapsed && <span>Sign Out</span>}
                    </button>
                </div>
            </aside>

            {mobileMenuOpen && <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-30 bg-black/60 md:hidden backdrop-blur-xs" />}

            <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
                <header className="h-12 flex items-center justify-between px-3 sm:px-4 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md shrink-0 z-30">
                    <div className="flex items-center gap-2.5">
                        <button type="button" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors" title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
                            {sidebarCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
                        </button>
                        <button type="button" onClick={() => setMobileMenuOpen(true)} className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900">
                            <Menu size={18} />
                        </button>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{pageTitle}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {pathname !== "/user/chart" && (
                            <Link href="/user/chart" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all">
                                <LineChart className="h-3.5 w-3.5" /><span>Live Chart</span>
                            </Link>
                        )}
                        {pathname !== "/user" && (
                            <Link href="/user" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-semibold transition-all">
                                <LayoutDashboard className="h-3.5 w-3.5" /><span>Dashboard</span>
                            </Link>
                        )}
                        {pathname !== "/user/profile" && (
                            <Link href="/user/profile" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-semibold transition-all">
                                <User className="h-3.5 w-3.5" /><span className="hidden sm:inline">Profile</span>
                            </Link>
                        )}
                    </div>
                </header>

                <main className={`flex-1 min-h-0 ${pathname === "/user/chart" ? "p-1 sm:p-1.5 overflow-hidden flex flex-col" : "p-4 sm:p-6 overflow-y-auto"}`}>
                    {children}
                </main>
            </div>
        </div>
    );
}