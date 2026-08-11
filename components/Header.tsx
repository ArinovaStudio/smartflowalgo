"use client";

import React, { useState } from "react";
import { Menu, X, Send, LogIn, ChevronRight, Sparkles, LogOut, User } from "lucide-react";
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

  // Hide the public navbar entirely inside the admin panel
  if (pathname?.startsWith("/admin")) return null;

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
      <div className="bg-gradient-to-r from-indigo-700 via-blue-600 to-indigo-800 text-white py-2 text-center text-xs font-semibold px-4 flex items-center justify-center gap-2 select-none">
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
      </div>
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

            {/* Auth buttons or Profile */}
            {session ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                  <span className="max-w-[100px] truncate">
                    {session.user?.name || session.user?.email}
                  </span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer uppercase tracking-wider"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
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
                <div className="flex items-center justify-between px-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {session.user?.name || session.user?.email}
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-red-500/30 text-red-500 uppercase tracking-wider"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
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

