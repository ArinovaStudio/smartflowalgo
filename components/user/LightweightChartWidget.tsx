"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import SymbolSelectModal from "./SymbolSelectModal";
import { BUILTIN_SCRIPTS } from "./constants";
import { DrawingLayer } from "./DrawingLayer";
import { ToolRail, ToolFlyout } from "./ToolRail";
import { SymbolAndTimeframeBar, OhlcStrip } from "./ChartToolbar";
import { SelectionActionBar } from "./SelectionActionBar";
import { useInitialSymbols, useLightweightChart } from "./useMarketData";
import { useIndicatorPlots } from "./useIndicatorPlots";
import { useDrawingTools } from "./useDrawingTools";
import type { CandleData, LightweightChartWidgetProps, SymbolInfo, TickState } from "./types";
import { PineTS } from "pinets";

function mapToTimeframe(tf: string): string {
  const clean = tf.toUpperCase().replace(/\s+/g, "");
  const map: Record<string, string> = {
    "1M": "M1",
    "M1": "M1",
    "2M": "M2",
    "M2": "M2",
    "3M": "M3",
    "M3": "M3",
    "4M": "M4",
    "M4": "M4",
    "5M": "M5",
    "M5": "M5",
    "6M": "M6",
    "M6": "M6",
    "10M": "M10",
    "M10": "M10",
    "12M": "M12",
    "M12": "M12",
    "15M": "M15",
    "M15": "M15",
    "20M": "M20",
    "M20": "M20",
    "30M": "M30",
    "M30": "M30",
    "1H": "H1",
    "H1": "H1",
    "2H": "H2",
    "H2": "H2",
    "3H": "H3",
    "H3": "H3",
    "4H": "H4",
    "H4": "H4",
    "6H": "H6",
    "H6": "H6",
    "8H": "H8",
    "H8": "H8",
    "12H": "H12",
    "H12": "H12",
    "1D": "D1",
    "D1": "D1",
    "1W": "W1",
    "W1": "W1",
    "1MN": "MN1",
    "MN1": "MN1",
  };
  return map[clean] || "M1";
}

function timeframeToSeconds(timeframe: string): number {
  const tf = (timeframe || "M1").toUpperCase().trim();
  if (tf === "MN1" || tf === "1MN") return 30 * 24 * 60 * 60;
  if (tf === "W1" || tf === "1W") return 7 * 24 * 60 * 60;
  if (tf === "D1" || tf === "1D") return 24 * 60 * 60;

  if (tf.startsWith("M")) {
    const mins = parseInt(tf.slice(1), 10);
    return (!isNaN(mins) && mins > 0 ? mins : 1) * 60;
  }
  if (tf.endsWith("M")) {
    const mins = parseInt(tf.slice(0, -1), 10);
    return (!isNaN(mins) && mins > 0 ? mins : 1) * 60;
  }

  if (tf.startsWith("H")) {
    const hours = parseInt(tf.slice(1), 10);
    return (!isNaN(hours) && hours > 0 ? hours : 1) * 3600;
  }
  if (tf.endsWith("H")) {
    const hours = parseInt(tf.slice(0, -1), 10);
    return (!isNaN(hours) && hours > 0 ? hours : 1) * 3600;
  }

  return 60;
}

// export function TradingChart() {
//   const symbol = "XAUUSD";
//   const timeframe: Timeframe = "M1";

//   useEffect(() => {
//     const apiKey = process.env.NEXT_PUBLIC_MT5_API_KEY;

//     if (!apiKey) {
//       console.error("MT5 API key is missing");
//       return;
//     }

//     const stream = new LiveCandleStream({
//       apiKey,
//       symbol,
//       timeframe,

//       // If your frontend connects directly to the bridge:
//       url: "ws://127.0.0.1:8001",

//       callbacks: {
//         onOpen: () => {
//           console.log("[MT5] Candle stream connected");
//         },

//         onCandle: (candle: Candle) => {
//           console.log("[MT5] Live candle:", candle);
//         },

//         onComplete: (candle: Candle) => {
//           console.log("[MT5] Completed candle:", candle);
//         },

//         onError: (error) => {
//           console.error("[MT5] Stream error:", error);
//         },

//         onClose: () => {
//           console.log("[MT5] Candle stream closed");
//         },
//       },
//     });

//     stream.connect();

//     return () => {
//       console.log("[MT5] Cleaning up candle stream");
//       stream.close();
//     };
//   }, [symbol, timeframe]);

//   return <div>Trading Chart</div>;
// }

/** Re-exported for convenience so consumers can `import type { DrawingItem } from ".../LightweightChartWidget"`. */
export type { DrawingItem, IndicatorMeta } from "./types";

export default function LightweightChartWidget({
  initialSymbol = "",
  initialTimeframe = "1m",
  theme: themeProp,
  activeIndicators = [],
}: LightweightChartWidgetProps) {
  // ── SSR-safe portal mount flag ────────────────────────────────────────────
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // ── Theme (prop override, else follows the `dark` class on <html>) ───────
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">(() => {
    if (themeProp) return themeProp;
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "dark";
  });

  useEffect(() => {
    if (themeProp) setCurrentTheme(themeProp);
  }, [themeProp]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const syncTheme = () => setCurrentTheme("light");
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // useEffect(() => {
  //   const fetchCandles = async () => {
  //     try {
  //       const res = await fetch("/api/candle", {
  //         method: "GET",
  //         cache: "no-store",
  //       });

  //       if (!res.ok) {
  //         throw new Error(`HTTP ${res.status}`);
  //       }

  //       const data = await res.json();

  //       console.log("MT5 CANDLES:", data);
  //     } catch (error) {
  //       console.error("Failed to fetch candles:", error);
  //     }
  //   };

  //   fetchCandles();
  // }, []);

  const isDark = currentTheme === "dark";

  // ── Symbol / timeframe selection ─────────────────────────────────────────
  const [symbol, setSymbol] = useState(initialSymbol || "");
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [symbolModalOpen, setSymbolModalOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState("");

  const { symbolsList, setSymbolsList } = useInitialSymbols(setSymbol);
  const activeSymbolInfo: SymbolInfo = useMemo(() => {
    if (!symbol) return { symbol: "", name: "Awaiting broker stream...", category: "Forex", digits: 5 };
    return symbolsList.find((s) => s.symbol === symbol) || { symbol, name: symbol, category: "Forex", digits: 5 };
  }, [symbol, symbolsList]);

  // ── Chart instance ───────────────────────────────────────────────────────
  const { containerRef, chartRef, candleSeriesRef, hasFittedInitialSnapshot, hoveredCandle } = useLightweightChart({
    isDark,
    pricePrecision: activeSymbolInfo.digits,
  });

  useEffect(() => {
    const precision = activeSymbolInfo.digits ?? 2;
    candleSeriesRef.current?.applyOptions({
      upColor: "#089981",
      downColor: "#f23645",
      borderVisible: true,
      borderUpColor: "#089981",
      borderDownColor: "#f23645",
      wickUpColor: "#089981",
      wickDownColor: "#f23645",
      priceFormat: {
        type: "price",
        precision: precision,
        minMove: 1 / Math.pow(10, precision),
      },
    });

    chartRef.current?.applyOptions({
      timeScale: {
        barSpacing: 10,
        minBarSpacing: 3,
        rightOffset: 12,
        // This is the KEY fix: auto-scroll to new bars so there's no gap
        // when switching timeframes from 5m → 1m
        shiftVisibleRangeOnNewBar: true,
      },
    });
  }, [candleSeriesRef, chartRef, isDark, activeSymbolInfo.digits]);

  // ── MT5 Live Candle Stream (/api/mt5/live) ────────────────────────────────
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [snapshotSubscription, setSnapshotSubscription] = useState<{ symbol: string; timeframe: string } | null>(null);
  const [currentTick, setCurrentTick] = useState<TickState>({
    price: 0,
    time: Math.floor(Date.now() / 1000),
    change: 0,
    changePercent: 0,
  });

  useEffect(() => {
    if (!symbol) return;

    let cancelled = false;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    const abortController = new AbortController();

    const tf = mapToTimeframe(timeframe);
    setWsConnected(false);
    setWsError(null);
    setCandles([]);
    setSnapshotSubscription(null);
    hasFittedInitialSnapshot.current = false;
    candleSeriesRef.current?.setData([]);
    // Scroll to real-time and reset visible range immediately on switch so
    // there is no stale visible range left from the previous timeframe.
    // This prevents the gap that appears between historical candles (far left)
    // and the first live candle (far right) after switching e.g. 5m → 1m.
    chartRef.current?.timeScale().scrollToRealTime();

    // Connect to live stream endpoint /api/mt5/live
    async function connectStream() {
      try {
        console.log(`[MT5 LIVE] Connecting ${symbol} ${tf}...`);

        const response = await fetch("/api/mt5/live", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symbol,
            timeframe: tf,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new Error("Streaming response body is missing");
        }

        console.log(`[MT5 LIVE] Connected ${symbol} ${tf}`);
        if (!cancelled) {
          setWsConnected(true);
          setWsError(null);
          setSnapshotSubscription({ symbol, timeframe });
        }

        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) {
            console.log(`[MT5 LIVE] Stream finished ${symbol} ${tf}`);
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const messages = buffer.split("\n\n");
          buffer = messages.pop() || "";

          for (const message of messages) {
            if (!message.startsWith("data:")) continue;
            const json = message.replace(/^data:\s*/, "").trim();
            if (!json) continue;

            try {
              const candle = JSON.parse(json);
              const open = Number(candle.open);
              const high = Number(candle.high);
              const low = Number(candle.low);
              const close = Number(candle.close);

              if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || open <= 0) {
                continue;
              }

              const tfSecs = timeframeToSeconds(tf);
              const rawTime =
                typeof candle.time === "number" && !isNaN(candle.time) && candle.time > 0
                  ? candle.time
                  : Math.floor(Date.now() / 1000);

              const candleTime = Math.floor(rawTime / tfSecs) * tfSecs;

              const candleBar = {
                time: candleTime as any,
                open,
                high,
                low,
                close,
              };

              // Update lightweight chart series (red / green candlestick in place)
              candleSeriesRef.current?.update(candleBar);

              // Update candle state list
              setCandles((prev) => {
                const item: CandleData = {
                  time: candleTime,
                  open,
                  high,
                  low,
                  close,
                  volume: Number(candle.volume ?? 0),
                };
                if (prev.length === 0) return [item];
                const last = prev[prev.length - 1];
                if (last.time === candleTime) {
                  const next = [...prev];
                  next[next.length - 1] = item;
                  return next;
                }
                if (candleTime > last.time) {
                  return [...prev.slice(-999), item];
                }
                return prev;
              });

              // Update currentTick readout in OHLC strip
              setCurrentTick((prev) => ({
                price: close,
                time: candleTime,
                change: prev.price > 0 ? close - prev.price : 0,
                changePercent: prev.price > 0 ? ((close - prev.price) / prev.price) * 100 : 0,
              }));

              if (!hasFittedInitialSnapshot.current) {
                chartRef.current?.timeScale().fitContent();
                // Scroll to the live candle so no gap appears on timeframe switch
                chartRef.current?.timeScale().scrollToRealTime();
                hasFittedInitialSnapshot.current = true;
              }
            } catch (err) {
              console.error("[MT5 LIVE] Failed to parse candle message:", json, err);
            }
          }
        }
      } catch (err: any) {
        if (!cancelled && err.name !== "AbortError") {
          console.error(`[MT5 LIVE] ${symbol} ${tf} connection error:`, err);
          setWsConnected(false);
          setWsError(err.message || "Failed to connect to live stream");
        }
      }
    }

    connectStream();

    return () => {
      cancelled = true;
      abortController.abort();
      if (reader) {
        reader.cancel().catch(() => { });
        reader = null;
      }
      setWsConnected(false);
    };
  }, [symbol, timeframe, candleSeriesRef, chartRef, hasFittedInitialSnapshot]);

//   useEffect(() => {
//     if (!candles.length) {
//       console.log("[PineTS] No candles available yet");
//       return;
//     }

//     let cancelled = false;

//     async function runPineTS() {
//       try {
//         console.log("========================================");
//         console.log("[PineTS] Running with candles");
//         console.log("[PineTS] Candle count:", candles.length);
//         console.log("[PineTS] Last candle:", candles[candles.length - 1]);

//         // Convert your CandleData format
//         // into the OHLCV format PineTS expects.
//         const pineCandles = candles.map((candle) => ({
//           open: Number(candle.open),
//           high: Number(candle.high),
//           low: Number(candle.low),
//           close: Number(candle.close),
//           volume: Number(candle.volume ?? 0),

//           // Your Lightweight Chart candle time is seconds.
//           // PineTS custom data expects milliseconds.
//           openTime: Number(candle.time) * 1000,
//         }));

//         console.log("[PineTS] Data sent to PineTS:");
//         console.log(pineCandles);

//         // Create PineTS using YOUR MT5 candle data.
//         const pineTS = new PineTS(pineCandles);

//         // Dummy Pine Script.
//         const pineScript = `
// //@version=6
// // ==============================================================================
// //
// //   T R A D I N G   W I T H   S I D H A N T
// //   PDH/PDL Break & Retest  ·  Backtest Strategy
// //   v2.1
// //
// // ------------------------------------------------------------------------------
// //  Mirrors the live alert indicator's rules:
// //   1. Previous day's HIGH (PDH) and LOW (PDL) from the daily chart.
// //   2. MAJOR GAP DAYS ARE INELIGIBLE (default 0.5% open vs previous close).
// //   3. 15-min close beyond PDH/PDL arms the bias, only in the first 2.5 hours
// //      of the session (0915-1145 IST).
// //   4. Price must LEAVE the broken line, come back, and TOUCH it.
// //   5. Trigger: a) a DIRECTIONAL PIN BAR (green hammer for longs, red shooter
// //      for shorts) with a clean no-consolidation approach, or b) a PROPER
// //      ENGULFING (swallows the previous candle wicks-and-all, closes beyond
// //      its extreme).
// //   6. Entry = signal-candle close. SL just beyond the signal candle.
// //   7. T1 = 2R partial (SL to breakeven), T2 = 3R. Forced flat at session end.
// //   8. Max TWO trades a day; DEACTIVATES for the day after two full stop
// //      losses (a breakeven stop after T1 does not count, nor does EOD flat).
// //
// //  RUN ON THE 5-MINUTE CHART. The 15-min confirmation is read internally.
// // ==============================================================================

// strategy("Trading With Sidhant: PDH/PDL Break & Retest [BT]", "TWS PDH/PDL BT", overlay = true,
//      initial_capital            = 100000,
//      default_qty_type           = strategy.fixed,
//      default_qty_value          = 1,
//      pyramiding                 = 0,
//      calc_on_every_tick         = false,
//      process_orders_on_close    = true,
//      commission_type            = strategy.commission.percent,
//      commission_value           = 0.03,
//      slippage                   = 1)

// // ----------------------------------------------------------- brand palette ---
// TWS_BASE     = #0B0B0C
// TWS_SURFACE  = #2A2A2E
// TWS_OFFWHITE = #FAFAFA
// TWS_GREEN    = #00E676
// TWS_GREY     = #6B6B6E
// TWS_RED      = #FF5252

// // ------------------------------------------------------------------ inputs ---
// gS = "1 | Day eligibility & session"
// entryWindow = input.session("0915-1145", "Entry window (first 2.5h)", group = gS)
// useWindow   = input.bool(true,           "Restrict entries to window", group = gS)
// flatEOD     = input.bool(true,           "Force flat at session end",  group = gS)
// flatWindow  = input.session("1515-1530", "Flatten window",             group = gS)
// sessTz      = input.string("",           "Session timezone (blank = exchange)", group = gS,
//      tooltip = "Leave blank for NSE/BSE. For a 24/7 crypto chart set e.g. Asia/Kolkata or UTC and adjust both windows.")
// useGapFilter= input.bool(true,           "Stand down on major gap days", group = gS,
//      tooltip = "On a big gap the PDH/PDL break happens at the open by gravity, not by momentum, so the setup logic does not apply. The whole day is skipped.")
// maxGapPct   = input.float(0.5, "Major gap threshold (% vs prev close)", step = 0.05, minval = 0.05, group = gS,
//      tooltip = "Open-vs-previous-close distance, in percent, beyond which the day is ineligible. Applies to gap ups and gap downs equally.")

// gC = "2 | Breakout confirmation"
// confTF      = input.timeframe("15",      "Confirmation timeframe", group = gC)

// gT = "3 | Retest touch"
// touchMode   = input.string("Wick or body", "Level must be touched by",
//      options = ["Wick or body", "Body only"], group = gT,
//      tooltip = "Wick or body: the level sits anywhere inside the candle's high-low range. Body only: the level must sit inside the open-close body.")
// tolTicks    = input.int(0, "Touch allowance (ticks)", minval = 0, maxval = 100, group = gT,
//      tooltip = "0 = a genuine touch is required, per the rule. Raise it only to accept near-misses that stop a tick or two short of the level.")

// gE = "4 | Entry patterns"
// useHammer   = input.bool(true, "Allow pin bar / hammer",   group = gE)
// useEngulf   = input.bool(true, "Allow engulfing candle",   group = gE)
// maxTrades   = input.int(2,     "Max trades per day", minval = 1, maxval = 2, group = gE,
//      tooltip = "Hard cap. After the second fill the strategy stands down until the next day.")
// minBarATR   = input.float(0.60, "Min signal candle range (x ATR)", step = 0.1, minval = 0.0, group = gE,
//      tooltip = "Applies to pin bars AND engulfings. Filters out tiny noise candles that have the right shape but carry no conviction.")

// gP = "5 | Pin bar quality"
// wickMult    = input.float(2.0,  "Rejection wick >= N x body",             step = 0.1,  minval = 1.0, maxval = 10.0, group = gP)
// minWickPct  = input.float(0.60, "Rejection wick >= share of full range",  step = 0.05, minval = 0.3, maxval = 0.9, group = gP,
//      tooltip = "The rejection wick must dominate the candle, not just the body. 0.60 = the wick alone is at least 60% of the whole high-low range.")
// maxOppPct   = input.float(0.20, "Opposite wick <= share of range",        step = 0.05, minval = 0.0, maxval = 0.5, group = gP,
//      tooltip = "A true pin bar has almost no wick on the far side. Rejects two-sided indecision candles.")
// closePosMin = input.float(0.60, "Close within the extreme N of range",    step = 0.05, minval = 0.5, maxval = 1.0, group = gP,
//      tooltip = "For a hammer the close must sit in the top part of the candle; for a shooter, the bottom. 0.60 = close inside the far 40% of the range.")

// gN = "6 | Pin bar: no-consolidation filter"
// pinLookback = input.int(4,     "Approach lookback (bars before the pin)", minval = 2, maxval = 50, group = gN)
// fNoTouch    = input.bool(true, "Line untouched during approach",          group = gN,
//      tooltip = "Rejects a pin bar if price had already tagged the level on the return leg, i.e. it stalled there first.")
// fDirection  = input.bool(true, "Approach must move toward the level",     group = gN)
// fEfficiency = input.bool(true, "Approach must be impulsive (one shot)",   group = gN,
//      tooltip = "Efficiency ratio = net displacement / total distance travelled. A straight leg scores near 1.0; a sideways grind scores near 0.")
// minEff      = input.float(0.55,"Min efficiency ratio", minval = 0.05, maxval = 1.0, step = 0.05, group = gN)
// fNoSqueeze  = input.bool(true, "Reject compressed approach (range vs ATR)", group = gN)
// minRangeATR = input.float(1.2, "Min approach range (x ATR)", minval = 0.1, maxval = 10.0, step = 0.1, group = gN)
// atrLen      = input.int(14,    "ATR length", minval = 1, maxval = 200, group = gN)

// gG = "7 | Engulfing quality"
// engulfMult  = input.float(1.25, "Body >= N x engulfed body",              step = 0.05, minval = 1.0, group = gG,
//      tooltip = "The engulfing body must be decisively bigger than the candle it swallows, not a photo-finish.")
// minPrevBody = input.float(0.30, "Engulfed candle body >= share of range", step = 0.05, minval = 0.0, maxval = 0.8, group = gG,
//      tooltip = "Engulfing a doji means nothing. The engulfed candle must be a real directional candle in its own right.")
// minBodyPct  = input.float(0.50, "Engulfing body >= share of own range",   step = 0.05, minval = 0.0, maxval = 0.9, group = gG,
//      tooltip = "The engulfing candle must close with conviction: at least this share of its own range is body, not wick.")
// engulfBeyond= input.bool(true,  "Close must clear the engulfed extreme",  group = gG,
//      tooltip = "Bull engulfing must CLOSE above the engulfed candle's high (and bear below its low), not just cover its body.")
// strictEngulf= input.bool(true,  "Must swallow wicks too (full engulf)",   group = gG,
//      tooltip = "A proper engulfing covers the previous candle entirely, high to low, not just the body.")

// gR = "8 | Risk & targets"
// rr1         = input.float(2.0, "Partial target (R)",   step = 0.1, minval = 0.1, maxval = 20.0, group = gR)
// rr2         = input.float(3.0, "Final target (R)",     step = 0.1, minval = 0.1, maxval = 20.0, group = gR)
// partialPct  = input.int(50,    "Partial size (%)",     minval = 0, maxval = 99, group = gR,
//      tooltip = "Share of the position booked at the partial target. 0 disables the partial, and with it the breakeven move.")
// beAfterT1   = input.bool(true, "Trail SL to breakeven after partial",      group = gR)
// slBufTicks  = input.int(2,     "SL buffer (ticks)",    minval = 0, maxval = 100, group = gR)
// maxSLStops  = input.int(2,     "Deactivate after N stop losses", minval = 1, maxval = 2, group = gR,
//      tooltip = "Once this many trades stop out at a full loss, no further entries fire until the next day. Breakeven stops after the partial and EOD flattens do not count.")

// gV = "9 | Visuals"
// showLevels  = input.bool(true, "Plot PDH / PDL",              group = gV)
// showZone    = input.bool(true, "Shade retest touch zone",     group = gV)
// showGapBg   = input.bool(true, "Tint skipped gap days",       group = gV)
// showBrand   = input.bool(true, "Show TWS watermark",          group = gV)

// // ---------------------------------- previous day's high, low and close -------
// [pdh, pdl, pdc] = request.security(syminfo.tickerid, "D", [high[1], low[1], close[1]],
//      lookahead = barmerge.lookahead_on)

// // ------------------------------------------------------------ sanity gates ---
// if barstate.isfirst
//     if timeframe.in_seconds(timeframe.period) > timeframe.in_seconds(confTF) or timeframe.in_seconds(confTF) % timeframe.in_seconds(timeframe.period) != 0
//         runtime.error("Chart timeframe must evenly divide the confirmation timeframe. Use a 5 minute chart with the default 15 minute confirmation.")
//     if rr2 <= rr1
//         runtime.error("Final target (R) must be larger than the partial target (R).")

// // --------------------------------------------------------- session windows ---
// tzUse     = sessTz == "" ? syminfo.timezone : sessTz
// inWindow  = not useWindow or not na(time(timeframe.period, entryWindow, tzUse))
// inFlatWin = not na(time(timeframe.period, flatWindow, tzUse))
// eodExit   = flatEOD and (inFlatWin or (timeframe.isintraday and session.islastbar))

// // ------------------------------------------------------------------ state ---
// var int   bias        = 0
// var int   tradesToday = 0
// var int   slToday     = 0
// var bool  gapDay      = false
// var float gapPct      = 0.0
// var bool  leftLevel   = false
// var float entryPx     = na
// var float stopPx      = na
// var float tgt1        = na
// var float tgt2        = na
// var bool  partialDone = false
// var float initQty     = na

// newDay = timeframe.change("D")
// if newDay
//     bias        := 0
//     tradesToday := 0
//     slToday     := 0
//     leftLevel   := false
//     // ---- gap eligibility, decided once at the day's open and locked in ----
//     gapPct      := not na(pdc) and pdc > 0 ? math.abs(open - pdc) / pdc * 100 : 0.0
//     gapDay      := useGapFilter and gapPct >= maxGapPct

// // The two ways a day dies early: it opened on a major gap, or it already
// // burned through the allowed stop losses.
// dayEligible = not gapDay and slToday < maxSLStops

// // ------------------------------------------ step 2: 15-min break of PDH/PDL ---
// confClosed = timeframe.change(confTF) and not newDay
// htfClose   = close[1]

// brokeUp   = confClosed and not na(pdh) and htfClose > pdh
// brokeDown = confClosed and not na(pdl) and htfClose < pdl

// if bias == 0 and inWindow and inWindow[1] and dayEligible
//     if brokeUp
//         bias := 1
//         alert("PDH broken. 15m closed above " + str.tostring(pdh, format.mintick) + ". Watch for the retest.", alert.freq_once_per_bar_close)
//     else if brokeDown
//         bias := -1
//         alert("PDL broken. 15m closed below " + str.tostring(pdl, format.mintick) + ". Watch for the retest.", alert.freq_once_per_bar_close)

// // A confirmation close back through the level VOIDS the break. The setup may
// // re-arm later in the window; maxTrades still caps the day.
// if confClosed and bias == 1 and not na(pdh) and htfClose < pdh
//     bias      := 0
//     leftLevel := false
// if confClosed and bias == -1 and not na(pdl) and htfClose > pdl
//     bias      := 0
//     leftLevel := false

// // ------------------------------------------- step 4: TOUCH of the line -------
// level    = bias == 1 ? pdh : bias == -1 ? pdl : na
// tol      = syminfo.mintick * tolTicks
// zoneLive = not na(level)

// // A retest needs a RETURN: price must fully leave the level zone after the
// // break before any entry is allowed.
// if zoneLive and ((bias == 1 and low > level + tol) or (bias == -1 and high < level - tol))
//     leftLevel := true

// bodyTop = math.max(open, close)
// bodyBot = math.min(open, close)

// rangeTouch = zoneLive and low     <= level + tol and high    >= level - tol
// bodyTouch  = zoneLive and bodyBot <= level + tol and bodyTop >= level - tol
// touch      = touchMode == "Body only" ? bodyTouch : rangeTouch

// rangeTouchP = zoneLive and low[1]     <= level + tol and high[1]    >= level - tol
// bodyTouchP  = zoneLive and bodyBot[1] <= level + tol and bodyTop[1] >= level - tol
// touchPrv    = touchMode == "Body only" ? bodyTouchP : rangeTouchP

// // ------------------------- step 5a: NO-CONSOLIDATION filter (pin bars only) ---
// // Shifted by [1] so the window covers the bars BEFORE the pin bar. Tags count
// // only on the return leg (leftLevel), so the breakout leg cannot pollute it.
// atrVal = ta.atr(atrLen)

// apprTag    = leftLevel and rangeTouch ? 1.0 : 0.0
// noPriorTag = not fNoTouch or nz(math.sum(apprTag, pinLookback)[1]) < 0.5

// netChg  = nz(ta.change(close, pinLookback)[1])

// pathLen = nz(math.sum(math.abs(ta.change(close)), pinLookback)[1])
// effRatio= pathLen > 0 ? math.abs(netChg) / pathLen : 0.0
// impulsive = not fEfficiency or effRatio >= minEff

// appHigh   = ta.highest(high, pinLookback)[1]
// appLow    = ta.lowest(low,  pinLookback)[1]
// appRange  = nz(appHigh - appLow)
// notCoiled = not fNoSqueeze or (atrVal > 0 and appRange >= minRangeATR * atrVal)

// fallingIn = not fDirection or netChg < 0
// risingIn  = not fDirection or netChg > 0

// cleanApproachLong  = noPriorTag and impulsive and notCoiled and fallingIn
// cleanApproachShort = noPriorTag and impulsive and notCoiled and risingIn

// // ------------------------------------------------- step 5b: candle shapes ---
// // PIN BAR, strict and DIRECTIONAL: only a GREEN hammer counts for a long and
// // only a RED shooter for a short. The rejection wick must dominate the body
// // AND the whole range, the far wick must be near-absent, the close must sit
// // in the extreme of the range, and the candle must be a real move vs ATR.
// bodySz  = math.abs(close - open)
// bodyRef = math.max(bodySz, syminfo.mintick)
// upWick  = high - bodyTop
// dnWick  = bodyBot - low
// rng     = high - low

// bigEnough   = rng > 0 and rng >= minBarATR * nz(atrVal)
// closeTopPct = rng > 0 ? (close - low)  / rng : 0.0
// closeBotPct = rng > 0 ? (high - close) / rng : 0.0

// hammer  = bigEnough and close > open and
//      dnWick >= wickMult * bodyRef and dnWick >= minWickPct * rng and
//      upWick <= maxOppPct * rng and closeTopPct >= closePosMin

// shooter = bigEnough and close < open and
//      upWick >= wickMult * bodyRef and upWick >= minWickPct * rng and
//      dnWick <= maxOppPct * rng and closeBotPct >= closePosMin

// // ENGULFING, proper: the engulfed candle must be a real directional candle
// // (not a doji), the engulfing body must be decisively bigger and mostly body,
// // it must swallow the previous candle wicks-and-all, CLOSE beyond its extreme,
// // and be a real move vs ATR: a full takeout, not a technicality.
// prevBody   = math.abs(close[1] - open[1])
// prevRng    = math.max(high[1] - low[1], syminfo.mintick)
// prevRealBar= prevBody >= minPrevBody * prevRng
// decisive   = rng > 0 and bodySz >= minBodyPct * rng
// biggerBody = bodySz >= engulfMult * math.max(prevBody, syminfo.mintick)
// wicksOk    = not strictEngulf or (high >= high[1] and low <= low[1])

// bullEngulf = bigEnough and (close > open) and (close[1] < open[1]) and prevRealBar and decisive and biggerBody and
//      wicksOk and (close >= open[1]) and (open <= close[1]) and (not engulfBeyond or close > high[1])
// bearEngulf = bigEnough and (close < open) and (close[1] > open[1]) and prevRealBar and decisive and biggerBody and
//      wicksOk and (close <= open[1]) and (open >= close[1]) and (not engulfBeyond or close < low[1])

// // ------------------------------------------------------------ entry signals ---
// canTrade = barstate.isconfirmed and inWindow and dayEligible and strategy.position_size == 0 and tradesToday < maxTrades and leftLevel

// longHammer  = useHammer and hammer     and touch and cleanApproachLong
// longEngulf  = useEngulf and bullEngulf and (touch or touchPrv)
// shortPin    = useHammer and shooter    and touch and cleanApproachShort
// shortEngulf = useEngulf and bearEngulf and (touch or touchPrv)

// longSig  = canTrade and bias ==  1 and (longHammer or longEngulf)
// shortSig = canTrade and bias == -1 and (shortPin   or shortEngulf)

// buf = syminfo.mintick * slBufTicks

// // --------------------------------------------------------------- orders -----
// // Brackets are placed WITH the entry so the stop and targets are live from the
// // moment the entry fills, not one bar later.
// if longSig
//     entryPx     := close
//     stopPx      := math.round_to_mintick((longHammer ? low : math.min(low, low[1])) - buf)
//     float r      = entryPx - stopPx
//     tgt1        := math.round_to_mintick(entryPx + rr1 * r)
//     tgt2        := math.round_to_mintick(entryPx + rr2 * r)
//     partialDone := false
//     initQty     := na
//     strategy.entry("L", strategy.long, comment = longHammer ? "Hammer" : "Engulf")
//     if partialPct > 0
//         strategy.exit("L-T1", from_entry = "L", qty_percent = partialPct, limit = tgt1, stop = stopPx)
//     strategy.exit("L-T2", from_entry = "L", qty_percent = 100, limit = tgt2, stop = stopPx)

// if shortSig
//     entryPx     := close
//     stopPx      := math.round_to_mintick((shortPin ? high : math.max(high, high[1])) + buf)
//     float r      = stopPx - entryPx
//     tgt1        := math.round_to_mintick(entryPx - rr1 * r)
//     tgt2        := math.round_to_mintick(entryPx - rr2 * r)
//     partialDone := false
//     initQty     := na
//     strategy.entry("S", strategy.short, comment = shortPin ? "PinBar" : "Engulf")
//     if partialPct > 0
//         strategy.exit("S-T1", from_entry = "S", qty_percent = partialPct, limit = tgt1, stop = stopPx)
//     strategy.exit("S-T2", from_entry = "S", qty_percent = 100, limit = tgt2, stop = stopPx)

// // -------------------------------------------------- fill-derived tracking ---
// // tradesToday counts FILLS, not signals, so an unfilled order cannot burn the
// // day's allowance. partialDone flips only when the position size actually
// // shrinks, i.e. the T1 order really filled.
// if strategy.position_size != 0 and nz(strategy.position_size[1]) == 0
//     tradesToday += 1

// if strategy.position_size != 0 and na(initQty)
//     initQty := math.abs(strategy.position_size)
// if not na(initQty) and strategy.position_size != 0 and math.abs(strategy.position_size) < initQty
//     partialDone := true

// // ------------------------------------------------ stop-loss day counter -----
// // A stop loss = a trade that went flat at a loss WITHOUT ever paying the
// // partial. A breakeven stop after T1 is not a loss and does not count; the
// // EOD flatten never counts; and a flat detected on the first bar of a new
// // day belongs to yesterday, not to the fresh counter.
// justFlat = strategy.position_size == 0 and nz(strategy.position_size[1]) != 0
// if justFlat and not partialDone and not eodExit and not newDay and strategy.closedtrades > 0
//     if strategy.closedtrades.profit(strategy.closedtrades - 1) < 0
//         slToday += 1
// if justFlat
//     initQty := na

// // ------------------------------------------------ breakeven after partial ---
// if beAfterT1 and partialDone and strategy.position_size != 0
//     stopPx := math.round_to_mintick(entryPx)

// // ---------------------------------------------------- exit maintenance ------
// // Re-issues update the working orders with the (possibly trailed) stop. The
// // T1 leg is only maintained while the partial has NOT yet filled; without that
// // gate a fresh T1 limit would be created after the fill, already inside the
// // market, and it would flush the 3R runner at 2R.
// if strategy.position_size > 0
//     if partialPct > 0 and not partialDone
//         strategy.exit("L-T1", from_entry = "L", qty_percent = partialPct, limit = tgt1, stop = stopPx)
//     strategy.exit("L-T2", from_entry = "L", qty_percent = 100, limit = tgt2, stop = stopPx)

// if strategy.position_size < 0
//     if partialPct > 0 and not partialDone
//         strategy.exit("S-T1", from_entry = "S", qty_percent = partialPct, limit = tgt1, stop = stopPx)
//     strategy.exit("S-T2", from_entry = "S", qty_percent = 100, limit = tgt2, stop = stopPx)

// // --------------------------------------------------------------- EOD flat ---
// // Membership of the flatten window in the resolved timezone, with a
// // last-bar-of-session backstop for feeds whose bars never open inside it.
// if eodExit and strategy.position_size != 0
//     strategy.close_all("EOD flat")

// // ----------------------------------------------------------------- visuals ---
// plot(showLevels ? pdh : na, "PDH", color.new(TWS_RED,  0), 1, plot.style_linebr)
// plot(showLevels ? pdl : na, "PDL", color.new(TWS_GREEN, 0), 1, plot.style_linebr)

// zTop = showZone and not na(level) ? level + tol : na
// zBot = showZone and not na(level) ? level - tol : na
// pT = plot(zTop, "Zone top", color.new(TWS_GREY, 100), 1, plot.style_linebr)
// pB = plot(zBot, "Zone bot", color.new(TWS_GREY, 100), 1, plot.style_linebr)
// fill(pT, pB, color.new(bias == 1 ? TWS_GREEN : bias == -1 ? TWS_RED : TWS_GREY, 88), "Retest zone")

// bgcolor(showGapBg and gapDay ? color.new(TWS_GREY, 85) : na, title = "Gap day (stand down)")

// plotshape(bias ==  1 and nz(bias[1]) != 1,  "Break up (armed)",   shape.triangleup,   location.belowbar, TWS_GREEN, size = size.tiny)
// plotshape(bias == -1 and nz(bias[1]) != -1, "Break down (armed)", shape.triangledown, location.abovebar, TWS_RED,  size = size.tiny)
// plotshape(longSig,  "Long entry",  shape.labelup,   location.belowbar, TWS_GREEN, text = "BUY",  textcolor = TWS_BASE, size = size.small)
// plotshape(shortSig, "Short entry", shape.labeldown, location.abovebar, TWS_RED,  text = "SELL", textcolor = TWS_BASE, size = size.small)

// showMgmt = strategy.position_size != 0 or longSig or shortSig
// plot(showMgmt ? stopPx : na, "SL", color.new(TWS_RED,  20), 1, plot.style_linebr)
// plot(showMgmt ? tgt1   : na, "T1", color.new(TWS_GREEN, 55), 1, plot.style_linebr)
// plot(showMgmt ? tgt2   : na, "T2", color.new(TWS_GREEN, 20), 1, plot.style_linebr)

// plot(gapPct, "Gap %", display = display.data_window)

// // ---------------------------------------------------------------- watermark ---
// var table brandMark = table.new(position.bottom_right, 1, 1)
// if showBrand and barstate.islast
//     table.cell(brandMark, 0, 0, "TRADING WITH SIDHANT",
//          text_color = color.new(TWS_GREEN, 10), bgcolor = color.new(TWS_BASE, 30), text_size = size.small)

// // ------------------------------------------------------------------ alerts ---
// if longSig
//     alert("LONG " + syminfo.ticker + " @ " + str.tostring(entryPx, format.mintick) +
//           " | SL " + str.tostring(stopPx, format.mintick) +
//           " | T1 " + str.tostring(tgt1, format.mintick) +
//           " | T2 " + str.tostring(tgt2, format.mintick), alert.freq_once_per_bar_close)
// if shortSig
//     alert("SHORT " + syminfo.ticker + " @ " + str.tostring(entryPx, format.mintick) +
//           " | SL " + str.tostring(stopPx, format.mintick) +
//           " | T1 " + str.tostring(tgt1, format.mintick) +
//           " | T2 " + str.tostring(tgt2, format.mintick), alert.freq_once_per_bar_close)

// `;

//         // Execute Pine Script against your MT5 candles.
//         const result = await pineTS.run(pineScript);

//         // if (cancelled) return;

//         console.log("[PineTS] FULL RESULT:");
//         console.log(result);

//         // console.log("[PineTS] PLOTS:");
//         // console.log(result.plots);

//         // console.log("[PineTS] SMA 10:");
//         // console.log(result.plots?.["SMA 10"]);

//         // console.log("[PineTS] SMA 10 DATA:");
//         // console.log(result.plots?.["SMA 10"]?.data);

//         // // Last calculated SMA value
//         // const smaData = result.plots?.["SMA 10"]?.data;

//         // if (smaData?.length) {
//         //   console.log("[PineTS] LAST SMA VALUE:");
//         //   console.log(smaData[smaData.length - 1]);
//         // }

//         console.log("========================================");
//       } catch (error) {
//         console.error("[PineTS] Error:", error);
//       }
//     }

//     runPineTS();

//     return () => {
//       cancelled = true;
//     };
//   }, [candles]);

  // ── Indicators (built-in + externally supplied + sandbox) ────────────────
  const [activeBuiltins] = useState<string[]>([]);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxCode, setSandboxCode] = useState(BUILTIN_SCRIPTS.supertrend);

  const { visualEvents, indicatorStatus } = useIndicatorPlots({
    candles,
    symbol,
    timeframe,
    marketDataReady: snapshotSubscription?.symbol === symbol && snapshotSubscription.timeframe === timeframe,
    activeBuiltins,
    activeIndicators,
    sandboxOpen,
    sandboxCode,
    chartRef,
    candleSeriesRef,
  });

  // ── Symbol modal open/close handlers (used by drawing-tools keyboard shortcuts too) ──
  const handleCloseSymbolModal = useCallback(() => {
    setSymbolModalOpen(false);
    setSymbolSearch("");
  }, []);

  const handleOpenSymbolSearch = useCallback((initialChar: string) => {
    setSymbolSearch(initialChar);
    setSymbolModalOpen(true);
  }, []);

  const handleSelectSymbolFromModal = useCallback((sName: string) => {
    setSymbol(sName);
    setSymbolModalOpen(false);
    setSymbolSearch("");
    hasFittedInitialSnapshot.current = false;
  }, [hasFittedInitialSnapshot]);

  const handleSelectTimeframe = useCallback((tfVal: string) => {
    setTimeframe(tfVal);
    hasFittedInitialSnapshot.current = false;
  }, [hasFittedInitialSnapshot]);

  // ── Drawing tools (creation, selection, editing, shortcuts) ──────────────
  const drawingTools = useDrawingTools({
    onOpenSymbolSearch: handleOpenSymbolSearch,
    onCloseSymbolModal: handleCloseSymbolModal,
    isSymbolModalOpen: symbolModalOpen,
  });

  // ── Category flyout (which drawing-tool submenu is open, and where) ─────
  const [activeCategoryFlyout, setActiveCategoryFlyout] = useState<string | null>(null);
  const [flyoutTop, setFlyoutTop] = useState(8);
  const flyoutPanelRef = useRef<HTMLDivElement | null>(null);
  const flyoutSidebarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeCategoryFlyout) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const sidebar = flyoutSidebarRef.current;
      const panel = flyoutPanelRef.current;
      if (sidebar && !sidebar.contains(e.target as Node) && panel && !panel.contains(e.target as Node)) {
        setActiveCategoryFlyout(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [activeCategoryFlyout]);

  // Close the flyout automatically whenever Escape resets the active tool via the drawing-tools hook.
  useEffect(() => {
    if (drawingTools.activeTool === "cursor") setActiveCategoryFlyout(null);
  }, [drawingTools.activeTool]);

  return (
    <div
      className="flex flex-col h-full w-full rounded-2xl border border-slate-200 dark:border-[#2a2e39] bg-white dark:bg-[#131722] text-slate-900 dark:text-[#d1d4dc] shadow-2xl relative transition-colors overflow-hidden min-h-0"
      style={{ isolation: "isolate" }}
    >
      <SymbolAndTimeframeBar
        symbol={symbol}
        timeframe={timeframe}
        activeSymbolInfo={activeSymbolInfo}
        wsConnected={wsConnected}
        wsError={wsError}
        onOpenSymbolModal={() => {
          setSymbolModalOpen(true);
          setSymbolSearch("");
        }}
        onSelectTimeframe={handleSelectTimeframe}
      />

      <OhlcStrip symbol={symbol} activeSymbolInfo={activeSymbolInfo} hoveredCandle={hoveredCandle} currentTick={currentTick} />

      <div className="relative flex-1 w-full h-full min-h-0 flex flex-row overflow-hidden">
        <ToolRail
          activeTool={drawingTools.activeTool}
          categoryLastTool={drawingTools.categoryLastTool}
          favorites={drawingTools.favorites}
          stayInDrawMode={drawingTools.stayInDrawMode}
          showDrawings={drawingTools.showDrawings}
          hasSelection={!!drawingTools.selectedDrawingId}
          hasAnyDrawings={drawingTools.drawings.length > 0}
          sidebarRef={flyoutSidebarRef}
          onSelectTool={(toolId) => drawingTools.setActiveTool(toolId)}
          onOpenFlyout={(categoryId, top) => {
            setFlyoutTop(top);
            setActiveCategoryFlyout((prev) => (prev === categoryId ? null : categoryId));
          }}
          onToggleStayInDrawMode={() => drawingTools.setStayInDrawMode((v) => !v)}
          onToggleShowDrawings={() => drawingTools.setShowDrawings((v) => !v)}
          onDeleteSelected={drawingTools.deleteSelected}
          onClearAll={drawingTools.clearAllDrawings}
        />

        {activeCategoryFlyout && (
          <ToolFlyout
            categoryId={activeCategoryFlyout}
            activeTool={drawingTools.activeTool}
            favorites={drawingTools.favorites}
            top={flyoutTop}
            panelRef={flyoutPanelRef}
            onSelectTool={(categoryId, toolId) => {
              drawingTools.selectToolFromFlyout(categoryId, toolId);
              setActiveCategoryFlyout(null);
            }}
            onToggleFavorite={drawingTools.toggleFavorite}
          />
        )}

        <div className="relative flex-1 h-full min-h-0 overflow-hidden bg-white dark:bg-[#131722]">
          <div className="absolute inset-0" ref={containerRef} />

          <div className="absolute bottom-8 left-4 z-[5] pointer-events-none select-none flex items-center gap-2 opacity-50 hover:opacity-80 transition-opacity">
            <img src="/logo.jpg" alt="SmartFlowAlgo" className="h-5 w-auto rounded object-contain" />
            <span className="text-[11px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">SmartFlowAlgo</span>
          </div>

          {/* Indicator Execution Status Toast */}
          <AnimatePresence>
            {indicatorStatus.status !== "idle" && (
              <motion.div
                key="indicator-status-toast"
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none flex items-center gap-2.5 px-4 py-2 rounded-full shadow-2xl backdrop-blur-md border text-xs font-semibold"
                style={{
                  backgroundColor:
                    indicatorStatus.status === "loading"
                      ? "rgba(15, 23, 42, 0.9)"
                      : indicatorStatus.status === "success"
                        ? "rgba(6, 78, 59, 0.92)"
                        : "rgba(127, 29, 29, 0.92)",
                  borderColor:
                    indicatorStatus.status === "loading"
                      ? "rgba(59, 130, 246, 0.5)"
                      : indicatorStatus.status === "success"
                        ? "rgba(34, 197, 94, 0.5)"
                        : "rgba(239, 68, 68, 0.5)",
                  color: "#ffffff",
                }}
              >
                {indicatorStatus.status === "loading" && (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400 shrink-0" />
                    <span>
                      Loading script: <span className="font-bold text-sky-200">{indicatorStatus.name}</span>...
                    </span>
                  </>
                )}
                {indicatorStatus.status === "success" && (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      Loaded script: <span className="font-bold text-emerald-200">{indicatorStatus.name}</span>
                    </span>
                  </>
                )}
                {indicatorStatus.status === "error" && (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>
                      Failed to load <span className="font-bold text-rose-200">{indicatorStatus.name}</span>
                      {indicatorStatus.message && (
                        <span className="opacity-80 text-[11px] ml-1">({indicatorStatus.message.slice(0, 60)})</span>
                      )}
                    </span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {drawingTools.showDrawings && (
            <DrawingLayer
              drawings={drawingTools.drawings}
              currentDrawing={drawingTools.currentDrawing}
              activeTool={drawingTools.activeTool}
              selectedDrawingId={drawingTools.selectedDrawingId}
              isDark={isDark}
              svgRef={drawingTools.svgRef}
              onMouseDown={drawingTools.handleSvgMouseDown}
              onMouseMove={drawingTools.handleSvgMouseMove}
              onMouseUp={drawingTools.handleSvgMouseUp}
              onEraseDrawing={drawingTools.eraseDrawing}
              onSelectDrawing={(id) => drawingTools.setSelectedDrawingId(id)}
            />
          )}

          {drawingTools.selectedDrawing && (
            <SelectionActionBar
              drawing={drawingTools.selectedDrawing}
              colorPickerOpen={drawingTools.colorPickerOpen}
              onToggleColorPicker={() => drawingTools.setColorPickerOpen((v) => !v)}
              onPickColor={drawingTools.updateSelectedColor}
              onEditLabel={drawingTools.editSelectedLabel}
              onDelete={drawingTools.deleteSelected}
              onDeselect={() => drawingTools.setSelectedDrawingId(null)}
            />
          )}
        </div>
      </div>

      <SymbolSelectModal
        isOpen={symbolModalOpen}
        onClose={handleCloseSymbolModal}
        onSelect={handleSelectSymbolFromModal}
        symbolsList={symbolsList}
        currentSymbol={symbol}
        initialSearch={symbolSearch}
      />
    </div>
  );
}
