"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate, type Variants } from "framer-motion";
import {
  Send,
  Gem,
  Bitcoin,
  Coins,
  LineChart,
  ShieldCheck,
  Activity,
  ArrowRight,
  Sparkles,
  Users,
  Gift,
  IndianRupee,
} from "lucide-react";
import { getToken } from "@/lib/plan-token";
import { useRouter } from "next/navigation";


const TOTAL_SPOTS = 200;
const SPOTS_CLAIMED = 162; // update manually or wire to real data
const MEMBER_COUNT = 12400;

const FEATURES = [
  { icon: Send, title: "Telegram Access", desc: "Straight into the free group" },
  { icon: IndianRupee, title: "Indian Market", desc: "Built for Indian market" },
  { icon: Gem, title: "Gold Ideas", desc: "XAU/USD levels, daily" },
  { icon: Bitcoin, title: "BTC Ideas", desc: "Bitcoin structure & zones" },
  { icon: Coins, title: "Forex Ideas", desc: "Major pairs, called early" },
  { icon: LineChart, title: "Market Analysis", desc: "Context behind the moves" },
  { icon: ShieldCheck, title: "Risk Reminders", desc: "Stay disciplined" },
  { icon: Activity, title: "Indicator Updates", desc: "Core signals, kept current" },
];

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
};

function CountUp({ to, className }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.3,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to]);

  return <span ref={ref} className={className}>{display.toLocaleString()}</span>;
}

export default function FreePlanBanner() {
  const router = useRouter();

  function goToCheckout() {
    const tok = getToken("FREE");
    router.push(`/checkout?plan=${tok}`);
  }

  return (
    <div className="relative rounded-[1.75rem] sm:mx-12 mx-0 bg-gradient-to-r from-sky-500/40 via-cyan-400/15 to-sky-600/40 p-px dark:from-sky-400/40 dark:via-cyan-400/10 dark:to-sky-500/40">
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={containerVariants}
        className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-white dark:border-white/5 dark:bg-zinc-950"
      >
        {/* dot-grid texture, centered this time */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.25] [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)] [background-image:radial-gradient(circle,theme(colors.sky.500)_1px,transparent_1px)] [background-size:22px_22px]" />

        {/* ambient glow, symmetric top glow instead of side blobs */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[36rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-sky-500/20 blur-[110px] dark:bg-sky-400/20" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-cyan-400/15 blur-[90px] dark:bg-cyan-400/10" />

        {/* ============= HERO BAND (centered) ============= */}
        <div className="relative flex flex-col items-center gap-6 px-6 pb-10 pt-10 text-center sm:px-10 sm:pt-14">
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 rounded-full border border-sky-600/20 bg-sky-600/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-600 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-400"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-sky-600 opacity-75 dark:bg-sky-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-600 dark:bg-sky-400" />
            </span>
            First {TOTAL_SPOTS} Users Only
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="max-w-2xl text-4xl font-black leading-[0.95] tracking-tighter text-slate-900 sm:text-5xl dark:text-white"
          >
            Get Free <span className="bg-gradient-to-r from-sky-600 to-cyan-400 bg-clip-text text-transparent dark:from-sky-400 dark:to-cyan-300">
              Indicators
            </span>.{" "} <br />
            <span className="bg-gradient-to-r from-sky-600 to-cyan-400 bg-clip-text text-transparent dark:from-sky-400 dark:to-cyan-300">
              Start
            </span>
            {" "} in seconds.
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400"
          >
            Get a real feel for how we trade — live setup ideas across Gold,
            BTC & Forex, dropped straight into Telegram.
          </motion.p>

          {/* Launch offer banner (scaled down) */}
          {/* <motion.div
            variants={itemVariants}
            className="flex max-w-md items-center gap-2.5 rounded-full border border-amber-500/30 bg-amber-500/[0.06] px-4 py-2 dark:border-amber-400/20 dark:bg-amber-400/[0.08]"
          >
            <Gift className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              <span className="font-bold text-amber-700 dark:text-amber-400">
                Launch Offer (Jul 20–30):
              </span>{" "}
              upgrade later and get VIP Indicators free for 2 weeks
            </span>
          </motion.div> */}

          {/* price + CTA, inline row instead of stacked column */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center gap-4 pt-2 sm:flex-row sm:gap-6"
          >
            <div className="flex items-end gap-1.5">
              <span className="text-5xl font-black tracking-tighter text-sky-600 sm:text-6xl dark:text-sky-400">
                $0
              </span>
              <span className="pb-1.5 text-base font-medium text-slate-500 dark:text-slate-400">
                /forever
              </span>
            </div>

            <div className="hidden h-10 w-px bg-slate-200 dark:bg-white/10 sm:block" />

            <motion.button
              onClick={goToCheckout}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-7 py-3.5 font-semibold text-white shadow-lg shadow-sky-500/25 transition-shadow hover:shadow-sky-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative flex items-center gap-2">
                <Send className="h-4 w-4" />
                Get Indicators
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </motion.button>
          </motion.div>

          <motion.span variants={itemVariants} className="text-xs text-slate-400 dark:text-slate-500">
            No card required · No spam · Leave anytime
          </motion.span>
        </div>

        {/* divider */}
        <div className="relative mx-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10 sm:mx-10" />

        {/* ============= FEATURE CARD GRID ============= */}
        <motion.div
          variants={containerVariants}
          className="relative grid grid-cols-2 gap-3 p-6 sm:grid-cols-3 sm:gap-4 sm:p-10 lg:grid-cols-4"
        >
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover={{ y: -3 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="flex flex-col items-start gap-2.5 rounded-2xl border border-slate-200/70 p-4 dark:border-white/5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sky-600 dark:text-sky-400">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {feature.title}
                  </span>
                  <span className="text-xs leading-snug text-slate-500 dark:text-slate-400">
                    {feature.desc}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {/* filler card completing the grid rhythm, doubles as a soft upsell nudge */}
          {/* <motion.div
            variants={cardVariants}
            className="flex flex-col items-start justify-between gap-2.5 rounded-2xl border border-sky-600/20 bg-sky-600/[0.05] p-4 dark:border-sky-400/20 dark:bg-sky-400/[0.06]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600/15 text-sky-600 dark:bg-sky-400/15 dark:text-sky-400">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Want more?
              </span>
              <span className="text-xs leading-snug text-slate-500 dark:text-slate-400">
                Full signals & courses below
              </span>
            </div>
          </motion.div> */}
        </motion.div>

        {/* ============= FOOTER STRIP: scarcity + social proof ============= */}
        <motion.div
          variants={itemVariants}
          className="relative flex flex-col gap-5 border-t border-slate-200/70 bg-sky-600/[0.03] px-6 py-5 dark:border-white/5 dark:bg-sky-400/[0.04] sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-10"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black leading-none text-slate-900 dark:text-white">
                <CountUp to={MEMBER_COUNT} />+
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                traders already in
              </span>
            </div>
          </div>



          <motion.button
            onClick={goToCheckout}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-sky-600/20 bg-white px-4 py-2 text-xs font-bold text-sky-600 shadow-sm transition-colors hover:bg-sky-600/5 dark:border-sky-400/20 dark:bg-transparent dark:text-sky-400 dark:hover:bg-sky-400/5"
          >
            <Send className="h-3.5 w-3.5" />
            Join Now
          </motion.button>
        </motion.div>
      </motion.section>
    </div>
  );
}