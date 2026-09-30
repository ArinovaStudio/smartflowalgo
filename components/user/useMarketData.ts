"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
  IChartApi,
  ISeriesApi,
  Time,
} from "lightweight-charts";
import type { CandleData, SymbolInfo, TickState } from "./types";
import { LiveCandleStream, type Candle, type Timeframe } from "./liveCandleStream";

const DEFAULT_SYMBOLS: SymbolInfo[] = [
  { symbol: "EURUSD", name: "Euro / US Dollar", category: "Forex", digits: 5 },
  { symbol: "GBPUSD", name: "British Pound / US Dollar", category: "Forex", digits: 5 },
  { symbol: "USDJPY", name: "US Dollar / Japanese Yen", category: "Forex", digits: 3 },
  { symbol: "AUDUSD", name: "Australian Dollar / US Dollar", category: "Forex", digits: 5 },
  { symbol: "USDCAD", name: "US Dollar / Canadian Dollar", category: "Forex", digits: 5 },
  { symbol: "USDCHF", name: "US Dollar / Swiss Franc", category: "Forex", digits: 5 },
  { symbol: "NZDUSD", name: "New Zealand Dollar / US Dollar", category: "Forex", digits: 5 },
  { symbol: "XAUUSD", name: "Gold / US Dollar", category: "Metals", digits: 2 },
  { symbol: "BTCUSD", name: "Bitcoin / US Dollar", category: "Crypto", digits: 2 },
  { symbol: "ETHUSD", name: "Ethereum / US Dollar", category: "Crypto", digits: 2 },
];

function mapToTimeframe(tf: string): Timeframe {
  const clean = tf.toUpperCase().replace(/\s+/g, "");
  const map: Record<string, Timeframe> = {
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

/**
 * Generates (and memoizes) a unique id for this chart instance.
 */
export function useClientId(): string {
  return useMemo(() => {
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
      return "chart_" + window.crypto.randomUUID();
    }
    return "chart_" + Math.random().toString(36).substring(2, 11);
  }, []);
}

/** Provides default symbol list for the symbol selector modal. */
export function useInitialSymbols(setSymbol: React.Dispatch<React.SetStateAction<string>>) {
  const [symbolsList, setSymbolsList] = useState<SymbolInfo[]>(DEFAULT_SYMBOLS);
  const [restError] = useState<string | null>(null);

  useEffect(() => {
    setSymbol((prev) => {
      if (prev && DEFAULT_SYMBOLS.some((s) => s.symbol === prev)) return prev;
      return "EURUSD";
    });
  }, [setSymbol]);

  return { symbolsList, setSymbolsList, restError };
}

interface UseLightweightChartArgs {
  isDark: boolean;
  pricePrecision?: number;
}

/**
 * Owns the lightweight-charts instance lifecycle: creation, theming,
 * resize-observing, and crosshair-driven OHLC hover state.
 */
export function useLightweightChart({ isDark, pricePrecision = 5 }: UseLightweightChartArgs) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const hasFittedInitialSnapshot = useRef(false);
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = containerRef.current;
    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? "#131722" : "#ffffff" },
        textColor: isDark ? "#d1d4dc" : "#131722",
        fontSize: 11,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: isDark ? "rgba(42, 46, 57, 0.4)" : "rgba(226, 232, 240, 0.8)" },
        horzLines: { color: isDark ? "rgba(42, 46, 57, 0.4)" : "rgba(226, 232, 240, 0.8)" },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: "#2962FF", width: 1, style: 3, labelBackgroundColor: "#2962FF" },
        horzLine: { color: "#2962FF", width: 1, style: 3, labelBackgroundColor: "#2962FF" },
      },
      timeScale: {
        borderColor: isDark ? "#2a2e39" : "#e0e3eb",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 15,
        shiftVisibleRangeOnNewBar: false,
        fixLeftEdge: false,
        fixRightEdge: false,
        minBarSpacing: 0.5,
      },
      rightPriceScale: { borderColor: isDark ? "#2a2e39" : "#e0e3eb", scaleMargins: { top: 0.1, bottom: 0.1 } },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const precision = Math.max(0, Math.min(10, Math.floor(pricePrecision)));
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#089981",
      downColor: "#f23645",
      borderVisible: false,
      wickUpColor: "#089981",
      wickDownColor: "#f23645",
      priceFormat: { type: "price", precision, minMove: 10 ** -precision },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    chart.subscribeCrosshairMove((param) => {
      const data = param.time ? (param.seriesData.get(candleSeries) as any) : null;
      if (data) {
        setHoveredCandle({
          time: typeof param.time === "number" ? param.time : Math.floor(Date.now() / 1000),
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: 0,
        });
      } else {
        setHoveredCandle(null);
      }
    });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && chartRef.current) {
          chartRef.current.applyOptions({ width, height });
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [isDark]);

  useEffect(() => {
    const precision = Math.max(0, Math.min(10, Math.floor(pricePrecision)));
    candleSeriesRef.current?.applyOptions({
      priceFormat: { type: "price", precision, minMove: 10 ** -precision },
    });
  }, [pricePrecision]);

  return { containerRef, chartRef, candleSeriesRef, hasFittedInitialSnapshot, hoveredCandle };
}

interface UseMarketSocketArgs {
  clientId: string;
  symbol: string;
  timeframe: string;
  candleSeriesRef: React.RefObject<ISeriesApi<any> | null>;
  chartRef: React.RefObject<IChartApi | null>;
  hasFittedInitialSnapshot: React.MutableRefObject<boolean>;
  setSymbolsList: React.Dispatch<React.SetStateAction<SymbolInfo[]>>;
  setSymbol: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * Connects to live candle stream using LiveCandleStream and updates
 * the lightweight-charts series with live candles.
 */
export function useMarketSocket({
  symbol,
  timeframe,
  candleSeriesRef,
  chartRef,
  hasFittedInitialSnapshot,
}: UseMarketSocketArgs) {
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [brokerInfo] = useState<Record<string, unknown>>({});
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

    setCandles([]);
    setSnapshotSubscription(null);
    hasFittedInitialSnapshot.current = false;
    candleSeriesRef.current?.setData([]);

    const tf = mapToTimeframe(timeframe);
    const apiKey =
      (typeof process !== "undefined" &&
        (process.env.NEXT_PUBLIC_MT5_API_KEY || process.env.MT5_API_KEY)) ||
      "demo_key";
    const wsUrl =
      (typeof process !== "undefined" &&
        (process.env.NEXT_PUBLIC_MT5_WS_URL || process.env.MT5_WS_URL)) ||
      (typeof window !== "undefined"
        ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:8001`
        : "ws://localhost:8001");

    const stream = new LiveCandleStream({
      apiKey,
      symbol,
      timeframe: tf,
      url: wsUrl,
      callbacks: {
        onOpen() {
          console.log(`[LiveCandleStream] Connected: ${symbol} ${tf}`);
          setWsConnected(true);
          setWsError(null);
          setSnapshotSubscription({ symbol, timeframe });
        },
        onCandle(candle: Candle) {
          candleSeriesRef.current?.update({
            time: candle.time as Time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          });

          setCandles((prev) => {
            if (prev.length === 0) return [candle];
            const last = prev[prev.length - 1];
            if (last.time === candle.time) {
              const next = [...prev];
              next[next.length - 1] = candle;
              return next;
            }
            if (candle.time > last.time) {
              return [...prev.slice(-9999), candle];
            }
            return prev;
          });

          if (!hasFittedInitialSnapshot.current) {
            chartRef.current?.timeScale().fitContent();
            hasFittedInitialSnapshot.current = true;
          }

          setCurrentTick((prev) => ({
            price: candle.close,
            time: candle.time,
            change: prev.price > 0 ? candle.close - prev.price : 0,
            changePercent: prev.price > 0 ? ((candle.close - prev.price) / prev.price) * 100 : 0,
          }));
        },
        onComplete(candle: Candle) {
          candleSeriesRef.current?.update({
            time: candle.time as Time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          });
        },
        onError(error: Error) {
          console.error("[LiveCandleStream] Error:", error);
          setWsConnected(false);
          setWsError(error.message || "Live candle stream error");
        },
        onClose() {
          console.log("[LiveCandleStream] Closed");
          setWsConnected(false);
        },
      },
    });

    stream.connect();

    return () => {
      stream.close();
      setWsConnected(false);
    };
  }, [symbol, timeframe, candleSeriesRef, chartRef, hasFittedInitialSnapshot]);

  return { wsConnected, wsError, brokerInfo, candles, currentTick, snapshotSubscription };
}
