"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
} from "lightweight-charts";
import type { CandleData, SymbolInfo, TickState } from "./types";

const SYMBOLS_ENDPOINT = "http://127.0.0.1:8000/api/symbols";
const RECONNECT_DELAY_MS = 2500;

/**
 * Generates (and memoizes) a unique id for this chart instance, used by the
 * bridge server to route snapshots/updates to the correct client when
 * multiple charts are subscribed simultaneously.
 */
export function useClientId(): string {
  return useMemo(() => {
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
      return "chart_" + window.crypto.randomUUID();
    }
    return "chart_" + Math.random().toString(36).substring(2, 11);
  }, []);
}

/** Fetches the initial symbol list once via REST, as a fallback/primer before the WS connects. */
export function useInitialSymbols(setSymbol: React.Dispatch<React.SetStateAction<string>>) {
  const [symbolsList, setSymbolsList] = useState<SymbolInfo[]>([]);
  const [restError, setRestError] = useState<string | null>(null);

  useEffect(() => {
    fetch(SYMBOLS_ENDPOINT)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setSymbolsList(json.data);
          setSymbol((prev) => {
            if (prev && json.data.some((s: SymbolInfo) => s.symbol === prev)) return prev;
            if (json.data.some((s: SymbolInfo) => s.symbol === "EURUSD")) return "EURUSD";
            return json.data[0].symbol;
          });
          setRestError(null);
        }
      })
      .catch(() => {
        /* Non-fatal: the WebSocket connection may still succeed and supply symbols. */
      });
  }, [setSymbol]);

  return { symbolsList, setSymbolsList, restError };
}

interface UseLightweightChartArgs {
  isDark: boolean;
  /** MT5's authoritative number of decimal places for the selected symbol. */
  pricePrecision?: number;
}

/**
 * Owns the lightweight-charts instance lifecycle: creation, theming,
 * resize-observing, and crosshair-driven OHLC hover state. Recreates the
 * chart whenever the theme flips (colors can't be swapped on the fly for
 * every option, so a clean recreate keeps things simple and correct).
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
      // Lightweight Charts defaults to two decimal places. That makes FX
      // quotes such as 1.34778 appear as 1.35 on the right price scale.
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

  // Symbols can arrive after the chart itself (the MT5 symbols list is sent
  // over WebSocket). Update only the formatter; do not recreate or refit the
  // chart, because that would interrupt a user's current view.
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
 * Owns the WebSocket connection to the MT5 bridge: connecting, subscribing,
 * parsing incoming snapshot/update/status messages, and auto-reconnecting
 * with backoff on close/error. Also mirrors incoming candles into the
 * lightweight-charts series directly for minimal-latency updates.
 */
export function useMarketSocket({
  clientId,
  symbol,
  timeframe,
  candleSeriesRef,
  chartRef,
  hasFittedInitialSnapshot,
  setSymbolsList,
  setSymbol,
}: UseMarketSocketArgs) {
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>("Connecting to MT5 Python Bridge...");
  const [brokerInfo, setBrokerInfo] = useState<Record<string, unknown>>({});
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [snapshotSubscription, setSnapshotSubscription] = useState<{ symbol: string; timeframe: string } | null>(null);
  const [currentTick, setCurrentTick] = useState<TickState>({
    price: 0,
    time: Math.floor(Date.now() / 1000),
    change: 0,
    changePercent: 0,
  });

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;

    // Each symbol/timeframe has its own socket subscription. Remove all old
    // candle state before opening it so overlays can never be paired with a
    // stale or empty previous chart.
    setCandles([]);
    setSnapshotSubscription(null);
    hasFittedInitialSnapshot.current = false;
    candleSeriesRef.current?.setData([]);

    const applySnapshot = (msg: any) => {
      if (msg.client_id && msg.client_id !== clientId) return;
      // A prior subscription can finish after the user selects a new pair.
      // Never let its candles become the data source for the active chart.
      if (msg.symbol !== symbol || msg.timeframe !== timeframe) return;

      setCandles(msg.data);
      setSnapshotSubscription({ symbol, timeframe });
      setWsError(null);

      if (candleSeriesRef.current && msg.data.length > 0) {
        const formatted: CandlestickData<Time>[] = msg.data.map((c: CandleData) => ({
          time: c.time as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        candleSeriesRef.current.setData(formatted);

        if (!hasFittedInitialSnapshot.current) {
          chartRef.current?.timeScale().fitContent();
          hasFittedInitialSnapshot.current = true;
        }
      }

      if (msg.data.length > 0) {
        const last = msg.data[msg.data.length - 1];
        const first = msg.data[0];
        const change = last.close - first.open;
        const changePercent = first.open > 0 ? (change / first.open) * 100 : 0;
        setCurrentTick({ price: last.close, time: last.time, change, changePercent });
      }
    };

    const applyCandleUpdate = (msg: any) => {
      if (msg.symbol !== symbol || msg.timeframe !== timeframe) return;

      const updated: CandleData = msg.candle;

      if (candleSeriesRef.current) {
        candleSeriesRef.current.update({
          time: updated.time as Time,
          open: updated.open,
          high: updated.high,
          low: updated.low,
          close: updated.close,
        });
      }

      setCandles((prev) => {
        if (prev.length === 0) return [updated];
        const last = prev[prev.length - 1];
        if (last.time === updated.time) {
          const next = [...prev];
          next[next.length - 1] = updated;
          return next;
        }
        if (updated.time > last.time) {
          // Keep the same history depth as the server snapshot. Pine pivots,
          // ATR and request.security all depend on bars before the viewport.
          return [...prev.slice(-9999), updated];
        }
        return prev;
      });

      if (msg.tick) {
        setCurrentTick((prev) => ({
          price: msg.tick.price || updated.close,
          time: msg.tick.time || updated.time,
          change: updated.close - (prev.price || updated.close),
          changePercent: prev.price > 0 ? ((updated.close - prev.price) / prev.price) * 100 : 0,
        }));
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (isDisposed) return;
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "broker_status":
            setBrokerInfo(msg.broker || {});
            setWsError(msg.connected ? null : msg.error || "Awaiting connection to MT5 RPC bridge...");
            break;

          case "symbols_list":
            if (Array.isArray(msg.data) && msg.data.length > 0) {
              setSymbolsList(msg.data);
              setSymbol((prev) => {
                if (prev && msg.data.some((s: SymbolInfo) => s.symbol === prev)) return prev;
                if (msg.data.some((s: SymbolInfo) => s.symbol === "EURUSD")) return "EURUSD";
                return msg.data[0]?.symbol || "";
              });
              setWsError(null);
            }
            break;

          case "snapshot":
            if (Array.isArray(msg.data)) applySnapshot(msg);
            break;

          case "candle_update":
            if (msg.candle) applyCandleUpdate(msg);
            break;

          default:
            break;
        }
      } catch (e) {
        console.error("WS Parse error:", e);
      }
    };

    const connect = () => {
      if (isDisposed) return;

      let wsUrl = "";
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${protocol}//${window.location.hostname}/ws`;

        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isDisposed) return;
          setWsConnected(true);
          setWsError(null);
          ws?.send(JSON.stringify({ type: "get_symbols", client_id: clientId }));
          if (symbol) {
            ws?.send(JSON.stringify({ type: "subscribe", client_id: clientId, symbol, timeframe }));
          }
        };

        ws.onmessage = handleMessage;

        ws.onerror = (error) => {
          // console.error("WebSocket error:", error);
          setWsConnected(false);
          setWsError(`Cannot connect to WebSocket at ${wsUrl}`);
        };

        ws.onclose = (event) => {
          console.warn("WebSocket closed:", event.code, event.reason);
          setWsConnected(false);
          if (!isDisposed) reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        };
      } catch (error) {
        console.error("WebSocket connection error:", error);
        setWsConnected(false);
        setWsError(`Cannot connect to WebSocket at ${wsUrl}`);
        if (!isDisposed) reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, symbol, timeframe]);

  return { wsConnected, wsError, brokerInfo, candles, currentTick, snapshotSubscription };
}
