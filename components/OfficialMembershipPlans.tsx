"use client";

import { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  Globe,
  TrendingUp,
  Bot,
  Gift,
  Clock,
  MessageSquare,
  Users,
  Radio,
  Map,
  Activity,
  Magnet,
  ArrowRight,
  AlertTriangle,
  IndianRupee,
  Gem,
  Crown,
  UserCheck,
  Repeat,
  Headset,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/plan-token";

export type IndicatorBillingCycle = "monthly" | "quarterly" | "yearly";

export interface DynamicPlan {
  id: string;
  name: string;
  subtitle?: string | null;
  badge?: string | null;
  isHighlight: boolean;
  hasCycles: boolean;
  price?: number | null;
  billingPeriod?: string | null;
  monthlyPrice?: number | null;
  quarterlyPrice?: number | null;
  quarterlyDiscount?: string | null;
  yearlyPrice?: number | null;
  yearlyDiscount?: string | null;
  features: string[];
  buttonText?: string | null;
  order: number;
  isActive: boolean;
}

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
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function OfficialMembershipPlans() {
  const router = useRouter();
  const [plans, setPlans] = useState<DynamicPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycleState, setCycleState] = useState<Record<string, IndicatorBillingCycle>>({});

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch("/api/plans");
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setPlans(json.data);
        }
      } catch (e) {
        console.error("Failed to load dynamic plans:", e);
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);

  const handleCheckout = (
    price: number,
    cycle: "monthly" | "yearly",
    name?: string
  ) => {
    const token = getToken("PAID", price, cycle, name);
    router.push(`/checkout?plan=${token}`);
  };

  const handleFreeCheckout = () => {
    const token = getToken("FREE");
    router.push(`/checkout?plan=${token}`);
  };

  function getFeatureIcon(text: string) {
    const lower = text.toLowerCase();
    if (lower.includes("website") || lower.includes("access")) return Globe;
    if (lower.includes("gold") || lower.includes("gem")) return Gem;
    if (lower.includes("map") || lower.includes("zone")) return Map;
    if (lower.includes("swing") || lower.includes("signal")) return TrendingUp;
    if (lower.includes("magnet")) return Magnet;
    if (lower.includes("telegram") || lower.includes("vip")) return Sparkles;
    if (lower.includes("discussion") || lower.includes("member")) return Users;
    if (lower.includes("scanner")) return Radio;
    if (lower.includes("indian") || lower.includes("rupee") || lower.includes("market")) return IndianRupee;
    if (lower.includes("support")) return MessageSquare;
    if (lower.includes("copy") || lower.includes("trading")) return Activity;
    return CheckCircle2;
  }

  // Add this helper above the component (or inside, before the return)
function getAdaptiveGridClass(count: number): string {
  switch (count) {
    case 0:
      return "grid-cols-1";
    case 1:
      // Full screen width, single centered card
      return "grid-cols-1 max-w-2xl mx-auto";
    case 2:
      // Half / half
      return "grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto";
    case 3:
      // Third / third / third
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    case 4:
      // 2x2 — wraps to a new line after 2
      return "grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto";
    default:
      // 5+ falls back to a clean 3-col wrap
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  }
}

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-sky-500/10 dark:bg-sky-400/10 rounded-full blur-[140px]" />
      </div>

      {/* ==================== URGENCY BANNER ==================== */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        // className="relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-zinc-950 p-px shadow-sm border border-slate-200/80 dark:border-white/10"
      >
        {/* <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-white/95 dark:bg-zinc-950/95 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  Limited Offer
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">
                Free Indicator Access Ends — <span className="text-sky-600 dark:text-cyan-400 font-extrabold">August 14</span>
              </h4>
            </div>
          </div>
          <a
            href="#vip-plans"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 dark:bg-sky-500 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-sky-500 dark:hover:bg-sky-400 transition-all transform hover:scale-[1.02]"
          >
            Claim Access Before Cutoff
            <ArrowRight className="h-4 w-4" />
          </a>
        </div> */}
      </motion.div>

      {/* ==================== HERO HEADER ==================== */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="text-center space-y-4 max-w-3xl mx-auto"
      >
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 backdrop-blur-sm"
        >
          <Sparkles className="h-4 w-4 text-sky-500 dark:text-sky-400" />
          <span>OFFICIAL MEMBERSHIP PLANS</span>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white"
        >
          Institutional Trading Plans <br className="hidden sm:inline" />
          <span className="text-sky-600 dark:text-sky-400">
            Built For Precision
          </span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed"
        >
          Unlock proprietary indicators, real-time market scanners, institutional Gold research, and algorithmic automation engineered for professional traders.
        </motion.p>
      </motion.div>

      {/* Loading Spinner */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      )}

      {/* ==================== PRICING CARDS DYNAMIC GRID ==================== */}
      {!loading && (
        <div id="vip-plans"  className={`grid gap-6 lg:gap-8 items-stretch pt-4 ${getAdaptiveGridClass(plans.length)}`}>
          {plans.map((plan, index) => {
            const currentCycle = cycleState[plan.id] || "monthly";

            let displayPrice = plan.price || 0;
            let displayPeriod = plan.billingPeriod || "month";

            if (plan.hasCycles) {
              if (currentCycle === "monthly") {
                displayPrice = plan.monthlyPrice || 3499;
                displayPeriod = "billed monthly";
              } else if (currentCycle === "quarterly") {
                displayPrice = plan.quarterlyPrice || 9000;
                displayPeriod = "billed every 3 months";
              } else if (currentCycle === "yearly") {
                displayPrice = plan.yearlyPrice || 29499;
                displayPeriod = "billed annually";
              }
            }

            return (
              <motion.div
                key={plan.id || index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className={`relative flex flex-col justify-between rounded-3xl p-7 sm:p-8 shadow-xl backdrop-blur-xl transition-all duration-300 group ${
                  plan.isHighlight
                    ? "border-3 border-sky-500/60 dark:border-sky-400/30 bg-white dark:bg-zinc-950/80"
                    : "border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-950/80 hover:border-sky-500/40"
                }`}
              >
                {/* Highlight Badge */}
                {plan.isHighlight && (
                  <div className="absolute -top-3.5 right-6 bg-sky-600 dark:bg-sky-500 text-white font-extrabold text-[11px] uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5 text-white" />
                    <span>{plan.badge || "Highlighted VIP"}</span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                          {plan.isHighlight ? <Crown className="h-4.5 w-4.5" /> : plan.hasCycles ? <Activity className="h-4.5 w-4.5" /> : <Zap className="h-4.5 w-4.5" />}
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          {plan.name}
                        </h3>
                      </div>
                      {plan.subtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {plan.subtitle}
                        </p>
                      )}
                    </div>

                    {!plan.isHighlight && plan.badge && (
                      <span className="rounded-full bg-slate-100 dark:bg-zinc-900 px-3 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 shrink-0">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  {/* Multi-Cycle Selector Tabs (if hasCycles = true) */}
                  {plan.hasCycles && (
                    <div className="p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 grid grid-cols-3 gap-1">
                      {[
                        { key: "monthly" as const, label: "Month", discount: null },
                        { key: "quarterly" as const, label: "3 Months", discount: plan.quarterlyDiscount },
                        { key: "yearly" as const, label: "Year", discount: plan.yearlyDiscount },
                      ].map((cycle) => {
                        const active = currentCycle === cycle.key;
                        return (
                          <button
                            key={cycle.key}
                            onClick={() => setCycleState((prev) => ({ ...prev, [plan.id]: cycle.key }))}
                            className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                              active
                                ? "bg-white dark:bg-sky-500 text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            <span>{cycle.label}</span>
                            {cycle.discount && (
                              <span className={`text-[8px] font-extrabold leading-none ${active ? "text-sky-600 dark:text-sky-100" : "text-cyan-600 dark:text-cyan-400"}`}>
                                {cycle.discount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-baseline gap-2 pt-2">
                    <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                      ₹{displayPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      / {displayPeriod}
                    </span>
                  </div>

                  {/* Feature List */}
                  <div className="space-y-3 border-t border-slate-100 dark:border-white/10 pt-6">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      What&apos;s Included:
                    </span>
                    
                    <ul className="space-y-3">
                      {plan.features.map((feat, fIdx) => {
                        const IconComponent = getFeatureIcon(feat);
                        return (
                          <li key={fIdx} className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                            <IconComponent className="h-4.5 w-4.5 text-sky-500 dark:text-sky-400 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-8 border-t border-slate-100 dark:border-white/10 mt-8">
                  <button
                    onClick={() =>
                      handleCheckout(
                        displayPrice,
                        currentCycle === "yearly" ? "yearly" : "monthly",
                        plan.name
                      )
                    }
                    className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                      plan.isHighlight
                        ? "bg-sky-600 hover:bg-sky-500 dark:bg-sky-500 dark:hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20"
                        : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 shadow-md"
                    }`}
                  >
                    <span>{plan.buttonText || `Get ${plan.name}`}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ==================== SPECIAL INCLUDED / LAUNCH PERKS ==================== */}
      <div className="pt-8 space-y-6">
        {/* <div className="text-center space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Ecosystem Offers
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Special Launch Perks & Automated Trading
          </h2>
        </div> */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card A: $20 -> $10,000 Challenge */}
          {/* <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative flex flex-col justify-between rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-950/80 p-7 sm:p-8 backdrop-blur-xl shadow-lg"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 px-3 py-1 text-xs font-bold text-sky-600 dark:text-sky-400">
                  <Gift className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
                  <span>Free For Active SFA Members During Launch</span>
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>$20 → $10,000 Challenge</span>
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Step-by-step compounding framework, risk management protocols, and high-probability setups engineered to scale a mini account.
              </p>

              <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-3 py-1.5 rounded-xl border border-sky-500/20">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-sky-500 dark:text-sky-400" />
                <span>Separate paid plan starting next month</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Included with active membership
              </span>
              <a
                href="#vip-plans"
                className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-cyan-500 transition-colors"
              >
                Join Plan to Unlock
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </motion.div> */}

          {/* Card B: SFA EA */}
          {/* <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="relative flex flex-col justify-between rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-950/80 p-7 sm:p-8 backdrop-blur-xl shadow-lg"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 px-3 py-1 text-xs font-bold text-sky-600 dark:text-sky-400">
                  <Bot className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
                  <span>Partner Broker Special</span>
                </span>
                <span className="text-base font-extrabold text-sky-600 dark:text-cyan-400">FREE</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>SFA EA (Expert Advisor)</span>
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Automated trading software available to eligible members who open an account with our approved Partner Broker using the official referral link.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Zero upfront cost with partner link
              </span>
              <button
                onClick={handleFreeCheckout}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 px-4 py-2 text-xs font-bold text-sky-600 dark:text-sky-300 border border-sky-500/20 transition-colors cursor-pointer"
              >
                <span>Claim Free EA Access</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div> */}

        </div>
      </div>

      {/* ==================== GLOBAL PAID INCLUSIONS STRIP ==================== */}
      {/* <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="rounded-3xl border border-slate-200/80 dark:border-sky-500/20 bg-slate-50/80 dark:bg-zinc-950/90 p-6 sm:p-8 backdrop-blur-xl shadow-xl text-center space-y-6"
      >
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-base sm:text-lg font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
            All Paid SFA Plans Include
          </h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-2">
          <div className="flex flex-col items-center p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/10 shadow-sm hover:border-sky-500/40 transition-all space-y-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400">
              <Crown className="h-5 w-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">VIP Channel Access</span>
          </div>

          <div className="flex flex-col items-center p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/10 shadow-sm hover:border-sky-500/40 transition-all space-y-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">1-to-1 Member Discussion</span>
          </div>

          <div className="flex flex-col items-center p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/10 shadow-sm hover:border-sky-500/40 transition-all space-y-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400">
              <Repeat className="h-5 w-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Copy Trading Access</span>
          </div>

          <div className="flex flex-col items-center p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/10 shadow-sm hover:border-sky-500/40 transition-all space-y-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400">
              <Headset className="h-5 w-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">24/7 Priority Support</span>
          </div>
        </div>
      </motion.div> */}

      {/* ==================== FOOTER SIGN-OFF ==================== */}
      {/* <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center py-6 border-t border-slate-200/80 dark:border-white/10 space-y-1.5"
      >
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Thank you for being part of SmartFlowAlgo. The next chapter of institutional trading starts now.
        </p>
        <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          SMARTFLOWALGO — SFA
        </span>
      </motion.div> */}
    </div>
  );
}
