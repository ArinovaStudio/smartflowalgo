"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Shield,
  UserCog,
  LineChart,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";

const NAV_ITEMS = [
  { label: "Checkout Leads", href: "/admin", icon: Users },
  // { label: "User Management", href: "/admin/users", icon: UserCog },
  { label: "Indicator Repository", href: "/admin/indicators", icon: LineChart },
  { label: "Promoters", href: "/admin/promoters", icon: Megaphone },
  { label: "Plans & Subscriptions", href: "/admin/plans", icon: CreditCard },
];

const SIDEBAR_KEY = "admin-sidebar-collapsed";

export default function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  // Restore collapsed state + theme from localStorage
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved === "true") setCollapsed(true);

    const savedTheme = (localStorage.getItem("theme") as "light" | "dark") || "dark";
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  function applyTheme(t: "light" | "dark") {
    if (typeof window === "undefined") return;
    document.documentElement.classList.toggle("dark", t === "dark");
  }

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  }, [theme]);

  const userInitial = (session?.user?.name || session?.user?.email || "A")
    .charAt(0)
    .toUpperCase();

  return (
    <>
      {/* ═══════════════════════════════════════════
          TOP ADMIN NAVBAR
      ═══════════════════════════════════════════ */}
      <header
        className="fixed top-0 right-0 z-40 h-14 flex items-center gap-3 px-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md transition-all duration-300"
        style={{ left: collapsed ? "4rem" : "16rem" }}
      >
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Page label */}
        <div className="hidden md:flex items-center gap-2">
          <Shield className="h-4 w-4 text-sky-500 dark:text-sky-400" />
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Admin Panel
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* ── Theme toggle ── */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle theme"
        >
          {mounted ? (
            theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            )
          ) : (
            <Sun className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          )}
        </button>

        <div className="h-5 w-px bg-slate-800" />

        {/* ── User info ── */}
        <div className="flex items-center gap-2.5">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || "Admin"}
              className="w-7 h-7 rounded-full border border-sky-500/40 object-cover shrink-0"
            />
          ) : (
            <div className="w-7 h-7 shrink-0 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 text-xs font-bold">
              {userInitial}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-slate-900 dark:text-white leading-none max-w-[130px] truncate">
              {session?.user?.name || "Admin"}
            </p>
            <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium mt-0.5 leading-none">
              Administrator
            </p>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-800" />

        {/* ── Logout ── */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 border border-red-500/25 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all uppercase tracking-wider"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </header>

      {/* ═══════════════════════════════════════════
          MOBILE OVERLAY
      ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-50 bg-black/60 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          COLLAPSIBLE SIDEBAR
      ═══════════════════════════════════════════ */}
      <aside
        className={`
          fixed left-0 top-0 z-50 h-screen flex flex-col
          bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-16" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Sidebar header row */}
        <div
          className={`flex h-14 items-center border-b border-slate-200 dark:border-slate-800 px-3 shrink-0 ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 border border-sky-500/20">
                <LayoutDashboard className="h-3.5 w-3.5 text-sky-400" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
                SmartFlowAlgo
              </span>
            </div>
          )}

          {collapsed && (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 border border-sky-500/20">
              <LayoutDashboard className="h-3.5 w-3.5 text-sky-400" />
            </div>
          )}

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden md:flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          {/* Mobile close */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 px-2 py-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 rounded-lg px-2.5 py-2.5
                  text-sm font-medium transition-all border
                  ${collapsed ? "justify-center" : ""}
                  ${
                    isActive
                      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white border-transparent"
                  }
                `}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer — user card */}
        <div className="border-t border-slate-200 dark:border-slate-800 shrink-0">
          {collapsed ? (
            <div className="flex justify-center py-3.5">
              <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 text-xs font-bold">
                {userInitial}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-4 py-3.5">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "Admin"}
                  className="w-8 h-8 rounded-full border border-sky-500/40 object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 shrink-0 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 text-xs font-bold">
                  {userInitial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {session?.user?.name || "Admin"}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  {session?.user?.email}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}