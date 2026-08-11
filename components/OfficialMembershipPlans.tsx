"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Globe,
  TrendingUp,
  Flame,
  Bot,
  Gift,
  Clock,
  MessageSquare,
  Users,
  Radio,
  Map,
  Activity,
  Layers,
  Magnet,
  ArrowRight,
  Send,
  Star,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/plan-token";

// Data types
export type IndicatorBillingCycle = "monthly" | "quarterly" | "yearly";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function OfficialMembershipPlans() {
  const router = useRouter();
  const [indicatorCycle, setIndicatorCycle] = useState<IndicatorBillingCycle>("monthly");

  const indicatorPricing = {
    monthly: { price: 3499, label: "Month", period: "monthly" as const, periodText: "billed monthly", discount: null },
    quarterly: { price: 9000, label: "3 Months", period: "monthly" as const, periodText: "billed every 3 months", discount: "Save ₹1,497" },
    yearly: { price: 29499, label: "Year", period: "yearly" as const, periodText: "billed annually", discount: "Save ₹12,489 🔥" },
  };

  const handleCheckout = (price: number, cycle: "monthly" | "yearly", name?: string) => {
    const token = getToken("PAID", price, cycle, name);
    router.push(`/checkout?plan=${token}`);
  };

  const handleFreeCheckout = () => {
    const token = getToken("FREE");
    router.push(`/checkout?plan=${token}`);
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Dynamic Background Glows */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 dark:bg-blue-500/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 right-10 w-[400px] h-[400px] bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-[120px]" />
      </div>

      {/* ==================== ⏳ URGENCY BANNER ==================== */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 p-px shadow-lg"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-slate-900/90 dark:bg-zinc-950/95 px-6 py-4 backdrop-blur-md border border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/20">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">Limited Time Access</span>
              </div>
              <h4 className="text-sm font-bold text-white sm:text-base">
                ⏳ FREE INDICATOR ACCESS ENDS — <span className="text-amber-400 font-extrabold underline decoration-amber-500">14 AUGUST</span>
              </h4>
            </div>
          </div>
          <a
            href="#vip-plans"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:from-amber-400 hover:to-rose-400 transition-all transform hover:scale-[1.02]"
          >
            Claim Access Before Cutoff
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </motion.div>

      {/* ==================== HERO ANNOUNCEMENT ==================== */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="text-center space-y-4 max-w-3xl mx-auto"
      >
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 backdrop-blur-sm"
        >
          <Sparkles className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          <span>🚀 SFA OFFICIAL MEMBERSHIP PLANS</span>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white"
        >
          Our New Membership Plans <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-300 dark:to-amber-400">
            Are Officially Here!
          </span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium"
        >
          Dear SFA Family ❤️ Unlock institutional-grade indicators, scanners, Gold research setups, and algorithmic automation designed for ultimate precision.
        </motion.p>
      </motion.div>

      {/* ==================== CORE PAID MEMBERSHIP CARDS ==================== */}
      <div id="vip-plans" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch pt-4">
        
        {/* ==================== PLAN 1: INDICATOR + SCANNER VIP ==================== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-8 shadow-xl backdrop-blur-xl hover:border-blue-500/50 transition-all duration-300 group"
        >
          {/* Subtle Top Accent */}
          <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-t-full" />

          <div>
            {/* Header / Title */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    INDICATOR + SCANNER VIP
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Complete algorithmic indicators & market scanners for daily consistency.
                </p>
              </div>
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-extrabold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Core VIP
              </span>
            </div>

            {/* Pricing Selector Tabs */}
            <div className="mt-6 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-1">
              {(["monthly", "quarterly", "yearly"] as IndicatorBillingCycle[]).map((cycle) => {
                const item = indicatorPricing[cycle];
                const active = indicatorCycle === cycle;
                return (
                  <button
                    key={cycle}
                    onClick={() => setIndicatorCycle(cycle)}
                    className={`relative py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      active
                        ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-md"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.discount && (
                      <span className={`text-[9px] font-black leading-none ${active ? "text-blue-600 dark:text-amber-300" : "text-emerald-500"}`}>
                        {item.discount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Display Active Pricing */}
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                ₹{indicatorPricing[indicatorCycle].price.toLocaleString("en-IN")}
              </span>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                / {indicatorPricing[indicatorCycle].periodText}
              </span>
            </div>

            {/* Feature List */}
            <div className="mt-8 space-y-3.5 border-t border-slate-100 dark:border-slate-800/80 pt-6">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                What&apos;s Included:
              </span>
              
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span>4 Private SFA Indicators</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <Radio className="h-5 w-5 text-blue-500 shrink-0" />
                  <span>SFA Premium Scanner</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <span className="text-base shrink-0">🇮🇳</span>
                  <span>Indian Market Included</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <Sparkles className="h-5 w-5 text-indigo-500 shrink-0" />
                  <span>VIP Telegram Channel Access</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <Users className="h-5 w-5 text-cyan-500 shrink-0" />
                  <span>1-to-1 Member Plan Discussion</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <Activity className="h-5 w-5 text-amber-500 shrink-0" />
                  <span>Copy Trading Access</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <MessageSquare className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span>24/7 Support</span>
                </li>
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => handleCheckout(indicatorPricing[indicatorCycle].price, indicatorPricing[indicatorCycle].period, "INDICATOR + SCANNER VIP")}
              className="w-full py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer transform active:scale-[0.99]"
            >
              <span>Get Indicator + Scanner VIP</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* ==================== PLAN 2: SFA GOLD RESEARCH ==================== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative flex flex-col justify-between rounded-3xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/5 via-slate-900/90 to-slate-950 p-8 shadow-2xl backdrop-blur-xl hover:border-amber-400 transition-all duration-300 group"
        >
          {/* Gold VIP Highlight Badge */}
          <div className="absolute -top-4 right-8 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
            <Flame className="h-4 w-4 fill-slate-950" />
            <span>👑 Gold VIP Research</span>
          </div>

          <div>
            {/* Header / Title */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👑</span>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    SFA GOLD RESEARCH
                  </h3>
                </div>
                <p className="text-xs text-amber-200/80 font-medium mt-1">
                  24/7 Precision Gold signals, zone maps, strike levels & website access.
                </p>
              </div>
            </div>

            {/* Price display */}
            <div className="mt-8 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 tracking-tight">
                ₹6,000
              </span>
              <span className="text-sm font-semibold text-amber-200/70">
                / Month
              </span>
            </div>

            {/* Feature List */}
            <div className="mt-8 space-y-3.5 border-t border-amber-500/20 pt-6">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Exclusive Features:
              </span>
              
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-semibold text-white">
                  <Globe className="h-5 w-5 text-amber-400 shrink-0" />
                  <span>Private Website Access</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-white">
                  <span className="text-base shrink-0">🟡</span>
                  <span>24/7 Gold Research & Setups</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-white">
                  <Map className="h-5 w-5 text-amber-400 shrink-0" />
                  <span>Full Zone Map</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-white">
                  <Zap className="h-5 w-5 text-yellow-400 shrink-0" />
                  <span>Strike Signals</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-white">
                  <TrendingUp className="h-5 w-5 text-amber-400 shrink-0" />
                  <span>Swing Signals</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-white">
                  <Clock className="h-5 w-5 text-amber-400 shrink-0" />
                  <span>Multi-Timeframe Signals</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-white">
                  <Magnet className="h-5 w-5 text-amber-400 shrink-0" />
                  <span>Magnet Zones</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-white">
                  <Sparkles className="h-5 w-5 text-amber-400 shrink-0" />
                  <span>VIP Telegram Channel Access</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-white">
                  <Users className="h-5 w-5 text-amber-400 shrink-0" />
                  <span>1-to-1 Member Plan Discussion</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-white">
                  <Activity className="h-5 w-5 text-amber-400 shrink-0" />
                  <span>Copy Trading Access</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-white">
                  <MessageSquare className="h-5 w-5 text-amber-400 shrink-0" />
                  <span>24/7 Support</span>
                </li>
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 pt-6 border-t border-amber-500/20">
            <button
              onClick={() => handleCheckout(6000, "monthly", "SFA GOLD RESEARCH")}
              className="w-full py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-xl shadow-amber-500/20 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer transform active:scale-[0.99]"
            >
              <span>Get SFA Gold Research</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* ==================== SPECIAL INCLUDED / LAUNCH BONUSES ==================== */}
      <div className="pt-6 space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Exclusive Ecosystem Offers
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Special Launch Perks & Automated Trading
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 3: $20 -> $10,000 Challenge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative flex flex-col justify-between rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 p-6 sm:p-8 backdrop-blur-xl"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-400">
                  <Gift className="h-3.5 w-3.5" />
                  <span>🎁 FREE FOR ALL ACTIVE SFA MEMBERS DURING LAUNCH</span>
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-black text-white flex items-center gap-2">
                <span>🚀 $20 → $10,000 CHALLENGE</span>
              </h3>

              <p className="mt-2 text-sm text-slate-300 leading-relaxed font-medium">
                Step-by-step compounding framework, risk management protocols, and high-probability setups engineered to scale a mini account.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>From next month → Separate Paid Plan</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Included with any active membership
              </span>
              <a
                href="#vip-plans"
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Join Plan to Unlock
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </motion.div>

          {/* Card 4: SFA EA - FREE */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="relative flex flex-col justify-between rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/60 via-slate-900 to-slate-950 p-6 sm:p-8 backdrop-blur-xl"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-black text-cyan-400">
                  <Bot className="h-3.5 w-3.5" />
                  <span>PARTNER BROKER SPECIAL</span>
                </span>
                <span className="text-lg font-black text-emerald-400">FREE</span>
              </div>

              <h3 className="mt-4 text-2xl font-black text-white flex items-center gap-2">
                <span>🤖 SFA EA (Expert Advisor)</span>
              </h3>

              <p className="mt-3 text-sm text-slate-300 leading-relaxed font-medium">
                Available to eligible members who open an account with our approved Partner Broker using the official SFA referral link/code.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Zero upfront cost with partner link
              </span>
              <button
                onClick={handleFreeCheckout}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 px-4 py-2 text-xs font-bold text-cyan-300 border border-cyan-500/40 transition-colors cursor-pointer"
              >
                <span>Claim Free EA Access</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>

        </div>
      </div>

      {/* ==================== GLOBAL PAID INCLUSIONS STRIP ==================== */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="rounded-3xl border border-blue-500/20 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-blue-900/40 p-6 sm:p-8 backdrop-blur-xl shadow-xl text-center space-y-6"
      >
        <div className="flex items-center justify-center gap-2 text-rose-500">
          <span className="text-lg">❤️</span>
          <h3 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">
            ALL PAID SFA PLANS INCLUDE
          </h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-2">
          <div className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
            <span className="text-2xl">💎</span>
            <span className="text-xs sm:text-sm font-bold text-white">VIP Channel Access</span>
          </div>

          <div className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
            <span className="text-2xl">👤</span>
            <span className="text-xs sm:text-sm font-bold text-white">1-to-1 Member Plan Discussion</span>
          </div>

          <div className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
            <span className="text-2xl">🔄</span>
            <span className="text-xs sm:text-sm font-bold text-white">Copy Trading Access</span>
          </div>

          <div className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
            <span className="text-2xl">💬</span>
            <span className="text-xs sm:text-sm font-bold text-white">24/7 Support</span>
          </div>
        </div>
      </motion.div>

      {/* ==================== FOOTER SIGN-OFF ==================== */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center py-6 border-t border-slate-200 dark:border-slate-800 space-y-2"
      >
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          ❤️ Thank you for your incredible support. The next chapter of SFA starts now. 🚀
        </p>
        <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          SMARTFLOWALGO — SFA
        </span>
      </motion.div>
    </div>
  );
}
