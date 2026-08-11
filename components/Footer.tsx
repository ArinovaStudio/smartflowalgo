"use client";

import React from "react";
import Logo from "./Logo";
import { Send, Mail, Phone, Calendar, ShieldAlert, Instagram } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { getToken } from "@/lib/plan-token";
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const router = useRouter();
  const pathname = usePathname();

  // Hide footer inside admin panel
  if (pathname?.startsWith("/admin")) return null;

  function goToCheckout() {
    const tok = getToken("FREE")
    router.push(`/checkout?plan=${tok}`)
  }


  return (
    <footer className="bg-slate-50 dark:bg-black border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
      {/* Top Main Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
        {/* Brand Column */}
        <div className="space-y-4">
          <button
            onClick={() => router.push("home")}
            className="focus:outline-none text-left cursor-pointer hover:opacity-90 transition-opacity"
            id="ftr-logo-btn"
          >
            <Logo className="h-9 w-auto" />
          </button>

          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            SMARTFLOWALGO by Smartflow Trading helps learners follow Gold, BTC,
            and Forex market analysis, educational signal breakdowns,
            indicators, risk management, and simulated strategy practice.
          </p>

          <div className="flex flex-col space-y-2 pt-2 text-xs">
            <button
              onClick={goToCheckout}
              className="flex items-center gap-2 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              <Send className="h-4 w-4 text-blue-500" />
              <span>Telegram</span>
            </button>

            <Link
              href="https://www.instagram.com/smartflowalgo"
              target="_blank"
              className="flex items-center gap-2 hover:text-blue-500 transition-colors"
            >
              <Instagram className="h-4 w-4 text-pink-400" />
              <span>Smartflowalgo</span>
            </Link>

            <a
              href="mailto:support@smartflowalgo.com"
              className="flex items-center gap-2 hover:text-blue-500 transition-colors"
            >
              <Mail className="h-4 w-4 text-slate-400" />
              <span>support@smartflowalgo.com</span>
            </a>
          </div>
        </div>

        {/* Navigation Column 1 */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Trading Tools
          </h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <button
                onClick={() => router.push("indicators")}
                className="hover:text-blue-500 transition-colors cursor-pointer"
                id="ftr-link-indicators"
              >
                Educational Indicators
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push("plans")}
                className="hover:text-blue-500 transition-colors cursor-pointer"
                id="ftr-link-plans"
              >
                Subscription Plans
              </button>
            </li>
          </ul>
        </div>

        {/* Navigation Column 2 */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Education & Support
          </h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <button
                onClick={() => router.push("about")}
                className="hover:text-blue-500 transition-colors cursor-pointer"
                id="ftr-link-about"
              >
                About Smartflow Trading
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push("contact")}
                className="hover:text-blue-500 transition-colors cursor-pointer"
                id="ftr-link-contact"
              >
                Contact Support Desk
              </button>
            </li>
          </ul>
        </div>

        {/* Hours Column */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Business Info
          </h4>
          <ul className="space-y-2.5 text-xs">
            <li className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Mon - Fri, 10:00 - 18:00</span>
            </li>
            <li className="pt-2">
              <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                Launch Phase Active
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Compliance Disclaimer Area */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-black/40 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong>IMPORTANT COMPLIANCE NOTICE & RISK WARNING:</strong>{" "}
              SMARTFLOWALGO provides educational market analysis, signal ideas,
              indicators, and simulated trading tools. We do not provide
              financial advice, broker execution, portfolio management, or
              guaranteed trading outcomes. Trading Gold, cryptocurrency, Forex,
              CFDs, and other leveraged financial instruments involves
              substantial risk of capital loss and may not be suitable for all
              investors. Before trading with real capital, you should thoroughly
              educate yourself, test strategies in risk-free environments, and
              understand the statistical probability distribution of losses.
              Never invest money you cannot afford to lose. All simulator runs
              operate purely on synthetic, demo data or user-uploaded historical
              text records with zero real-world clearing, and do not reflect
              real market conditions or live transaction fees.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Copy Link Section */}
      <div className="border-t border-slate-200 dark:border-slate-800 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div>
            &copy; {currentYear} SMARTFLOWALGO by Smartflow Trading. All rights
            reserved.
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <button
              onClick={() => router.push("privacy")}
              className="hover:text-blue-500 transition-colors cursor-pointer"
              id="ftr-legal-privacy"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => router.push("terms")}
              className="hover:text-blue-500 transition-colors cursor-pointer"
              id="ftr-legal-terms"
            >
              Terms & Conditions
            </button>
            <button
              onClick={() => router.push("disclaimer")}
              className="hover:text-blue-500 transition-colors cursor-pointer"
              id="ftr-legal-disclaimer"
            >
              Risk Disclaimer Statement
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
