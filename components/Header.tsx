"use client";

import React, { useState, useRef, useEffect } from "react";
import { Menu, X, Send, LogIn, ChevronRight, Sparkles, LogOut, User, ChevronDown, Shield, LineChart } from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { useRouter, usePathname } from "next/navigation";
import { getToken } from "@/lib/plan-token";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

const navItems = [
  { label: "Home", page: "/" },
  { label: "Plans", page: "plans" },
  { label: "About", page: "about" },
  { label: "Contact", page: "contact" },
];

type theme = "light" | "dark";
export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState(navItems[0].page);
  const router = useRouter();
  const pathname = usePathname();
  const [theme, setTheme] = useState<theme>("dark");
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 200);
  };

  const userRole = (session?.user as any)?.userType || (session?.user as any)?.role;
  const isAdmin = userRole === "ADMIN";
  const portalPath = isAdmin ? "/admin" : "/user";
  const portalLabel = isAdmin ? "Admin Dashboard" : "Trading Portal";

  // Hide the public navbar entirely inside the admin panel or user terminal
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/user")) return null;

  const onThemeChange = () => {
    let newTheme: theme = "dark";

    if (theme === "dark") {
      newTheme = "light";
    }
    if (theme === "light") {
      newTheme = "dark";
    }

    setTheme(newTheme);
  };

  const handleNavClick = (page: string) => {
    router.push(page);
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  function goToCheckout() {
    const tok = getToken("FREE");
    router.push(`/checkout?plan=${tok}`);
  }

  return (
    <>
      {/* <div className="bg-gradient-to-r from-indigo-700 via-blue-600 to-indigo-800 text-white py-2 text-center text-xs font-semibold px-4 flex items-center justify-center gap-2 select-none">
        <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse shrink-0" />
        <span>
          LAUNCH BONUS: Free Premium Telegram Community access for the first 200
          members! Only a few seats remaining.
        </span>
        <button
          onClick={goToCheckout}
          className="underline font-bold hover:text-yellow-100 transition-colors shrink-0"
        >
          Claim Now &rarr;
        </button>
      </div> */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#050B1D] backdrop-blur-md transition-colors">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo */}
          <button
            onClick={() => handleNavClick("/")}
            className="focus:outline-none transition-transform hover:scale-[1.01] active:scale-95 cursor-pointer text-left"
            id="hdr-logo-btn"
          >
            <Logo className="h-20 mb-4 w-auto" />
          </button>

          {/* Desktop Navigation */}
          <nav
            className="hidden xl:flex items-center space-x-1"
            id="desktop-nav"
          >
            {navItems.map((item) => (
              <button
                key={item.page}
                id={`nav-link-${item.page}`}
                onClick={() => handleNavClick(item.page)}
                className={`px-3 py-2 text-xs font-bold rounded-md uppercase tracking-wider transition-all cursor-pointer ${
                  activePage === item.page
                    ? "text-blue-600 dark:text-emerald-400 bg-blue-50/50 dark:bg-emerald-500/10 border border-transparent dark:border-emerald-500/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/60"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Action Controls */}
          <div
            className="hidden xl:flex items-center space-x-3"
            id="hdr-actions"
          >
            {/* Theme Toggle */}
            <ThemeToggle onThemeChange={onThemeChange} />

            {/* Instagram Link */}
            <a
              href="https://www.instagram.com/smartflowalgo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center group gap-1.5 px-3 py-2 text-sm font-semibold uppercase rounded-lg border border-pink-500 hover:text-white hover:bg-pink-500 text-pink-400 transition-all shrink-0 cursor-pointer tracking-tight"
              id="hdr-join-tg-btn"
            >
              <div className="w-5 h-5 text-pink-500 group-hover:text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 256 256"
                >
                  <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160ZM176,24H80A56.06,56.06,0,0,0,24,80v96a56.06,56.06,0,0,0,56,56h96a56.06,56.06,0,0,0,56-56V80A56.06,56.06,0,0,0,176,24Zm40,152a40,40,0,0,1-40,40H80a40,40,0,0,1-40-40V80A40,40,0,0,1,80,40h96a40,40,0,0,1,40,40ZM192,76a12,12,0,1,1-12-12A12,12,0,0,1,192,76Z"></path>
                </svg>
              </div>
              Follow
            </a>

            {/* Auth buttons or User Dropdown */}
            {session ? (
              <div
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer text-slate-800 dark:text-slate-200"
                >
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-700 object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                      {(session.user?.name || session.user?.email || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col items-start leading-none text-left">
                    <span className="text-xs font-bold max-w-[110px] truncate">
                      {session.user?.name || session.user?.email?.split("@")[0]}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                      {isAdmin ? "Admin" : "Trader"}
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    {/* User Info Header */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/50 mb-2">
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                        {session.user?.name || "Member Trader"}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {session.user?.email}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                            isAdmin
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {isAdmin ? "Administrator" : "Standard Trader"}
                        </span>
                      </div>
                    </div>

                    {/* Role-based portal navigation */}
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        router.push(portalPath);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-sky-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                          {isAdmin ? (
                            <Shield className="h-4 w-4" />
                          ) : (
                            <LineChart className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold">{portalLabel}</p>
                          <p className="text-[10px] font-normal text-slate-400">
                            {isAdmin ? "Manage system & indicators" : "Access live terminal"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                    {/* Logout Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        signOut({ callbackUrl: "/login" });
                      }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavClick("login")}
                  className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer uppercase tracking-wider"
                >
                  Login
                </button>
                <button
                  onClick={() => handleNavClick("register")}
                  className="flex items-center gap-1 px-4 py-2.5 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 dark:from-emerald-500 dark:to-teal-500 dark:hover:from-emerald-600 dark:hover:to-teal-600 text-white shadow-sm hover:shadow-md transition-all shrink-0 cursor-pointer uppercase tracking-wider"
                  id="hdr-get-started-btn"
                >
                  Get Started
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile controls (Menu Toggle, Theme Toggle) */}
          <div className="flex xl:hidden items-center space-x-2">
            <ThemeToggle onThemeChange={onThemeChange} />

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
              aria-label="Toggle mobile menu"
              id="mobile-menu-toggle"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div
            className="xl:hidden bg-white dark:bg-[#050B1D] border-t border-slate-200 dark:border-slate-800 py-4 px-4 space-y-3"
            id="mobile-drawer"
          >
            <div className="flex items-center justify-between gap-2 px-2 py-1 bg-blue-500/10 dark:bg-emerald-500/10 rounded-lg border border-blue-500/20 dark:border-emerald-500/20 text-blue-600 dark:text-emerald-400">
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3 animate-pulse" />
                First 200 members get Free access
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {navItems.map((item) => (
                <button
                  key={item.page}
                  id={`m-nav-link-${item.page}`}
                  onClick={() => handleNavClick(item.page)}
                  className={`px-3 py-2.5 text-xs text-left font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                    activePage === item.page
                      ? "text-blue-600 dark:text-emerald-400 bg-blue-50/50 dark:bg-emerald-500/10 border border-transparent dark:border-emerald-500/20"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 flex flex-col">
              {session ? (
                <div className="space-y-2 px-1">
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {(session.user?.name || session.user?.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {session.user?.name || session.user?.email}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {session.user?.email}
                      </p>
                    </div>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                      {isAdmin ? "Admin" : "Trader"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      router.push(portalPath);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {isAdmin ? <Shield className="h-4 w-4" /> : <LineChart className="h-4 w-4" />}
                      <span>{portalLabel}</span>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-2">
                  <button
                    onClick={() => handleNavClick("login")}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer uppercase tracking-wider"
                    id="m-hdr-login-btn"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </button>

                  <button
                    onClick={() => handleNavClick("register")}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer uppercase tracking-wider"
                    id="m-hdr-get-started-btn"
                  >
                    Get Started
                  </button>
                </div>
              )}

              <button
                onClick={goToCheckout}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-blue-600 dark:bg-emerald-600 text-white text-xs font-bold shadow-sm uppercase tracking-wider"
                id="m-hdr-join-tg-btn"
              >
                <Send className="h-4 w-4" />
                Join Free Telegram
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

