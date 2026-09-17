"use client";

import { useEffect, useRef, useState } from "react";
import { LineSeries, createSeriesMarkers, IChartApi, ISeriesApi, SeriesMarker, Time, LineData } from "lightweight-charts";
import { BUILTIN_SCRIPTS } from "./constants";
import type { CandleData, IndicatorMeta } from "./types";
import { runPineScriptOnCandles, type PineVisualEvent } from "@/lib/pineJsLightweightAdapter";

interface UseIndicatorPlotsArgs {
  candles: CandleData[];
  symbol: string;
  timeframe: string;
  marketDataReady: boolean;
  activeBuiltins: string[];
  activeIndicators: IndicatorMeta[];
  sandboxOpen: boolean;
  sandboxCode: string;
  chartRef: React.RefObject<IChartApi | null>;
  candleSeriesRef: React.RefObject<ISeriesApi<any> | null>;
}

export interface IndicatorStatus {
  status: "idle" | "loading" | "success" | "error";
  name?: string;
  message?: string;
}

/**
 * Re-runs every active Pine Script (built-in, user-toggled, and sandbox) each
 * time candles or the active script set changes, then reconciles the
 * resulting line series and buy/sell markers against the chart.
 */
export function useIndicatorPlots({
  candles,
  symbol,
  timeframe,
  marketDataReady,
  activeBuiltins,
  activeIndicators,
  sandboxOpen,
  sandboxCode,
  chartRef,
  candleSeriesRef,
}: UseIndicatorPlotsArgs) {
  // Replays are keyed to candle time (below), so same-bar tick updates do not
  // rerun Pine. Using the current array avoids a deferred old-symbol snapshot
  // being calculated after the user has selected a new pair.
  const deferredCandles = candles;
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const markersRef = useRef<any>(null);
  const lastReplayKeyRef = useRef<string | null>(null);
  const requestedReplayKeyRef = useRef<string | null>(null);
  const [visualEvents, setVisualEvents] = useState<PineVisualEvent[]>([]);
  const [indicatorStatus, setIndicatorStatus] = useState<IndicatorStatus>({ status: "idle" });
  const statusDismissTimerRef = useRef<number | null>(null);
  const latestCandle = deferredCandles[deferredCandles.length - 1];
  const scriptSignature = activeIndicators
    .map((indicator) => `${indicator.id}:${indicator.latestVersion?.version || ""}:${indicator.latestVersion?.script || ""}`)
    .join("\u0001");
  // Deliberately excludes the live candle's OHLC values. Pine replay is only
  // needed on an initial load, a completed/new candle, or source change.
  const replayKey = latestCandle
    ? `${symbol}\u0000${timeframe}\u0000${latestCandle.time}\u0000${deferredCandles.length}\u0000${activeBuiltins.join("\u0001")}\u0000${scriptSignature}\u0000${sandboxOpen ? sandboxCode : ""}`
    : "";

  useEffect(() => {
    if (!marketDataReady) {
      // Immediately remove the old pair's overlay while waiting for the new
      // subscription snapshot. This prevents a EURUSD zone appearing on GBPUSD.
      lastReplayKeyRef.current = null;
      requestedReplayKeyRef.current = null;
      indicatorSeriesRef.current.forEach((series) => series.setData([]));
      setVisualEvents([]);
      return;
    }
    if (!candleSeriesRef.current || deferredCandles.length === 0) return;
    requestedReplayKeyRef.current = replayKey;
    if (lastReplayKeyRef.current === replayKey) return;

    // A tick can update many times per second. Replaying a complete Pine
    // history for every one of those ticks starves the chart's pan/zoom work.
    // Coalesce bursts; the candle series itself continues updating instantly.
    const candleSeries = candleSeriesRef.current;
    const replayTimer = window.setTimeout(async () => {

    const scriptsToRun: Array<{ id: string; name: string; script: string }> = [];

    activeBuiltins.forEach((key) => {
      if (BUILTIN_SCRIPTS[key]) scriptsToRun.push({ id: key, name: key, script: BUILTIN_SCRIPTS[key] });
    });

    activeIndicators.forEach((ind) => {
      const scriptCode = ind.latestVersion?.script;
      if (scriptCode) scriptsToRun.push({ id: ind.id, name: ind.name, script: scriptCode });
    });

    if (sandboxOpen && sandboxCode) {
      scriptsToRun.push({ id: "sandbox", name: "Custom Sandbox Script", script: sandboxCode });
    }

    // Remove line series belonging to indicators that are no longer active.
    const currentIndicatorIds = new Set(scriptsToRun.map((s) => s.id));
    indicatorSeriesRef.current.forEach((series, key) => {
      const ownerId = key.split("_")[0];
      if (!currentIndicatorIds.has(ownerId) && chartRef.current) {
        try {
          chartRef.current.removeSeries(series);
        } catch {
          /* Series may already be detached; safe to ignore. */
        }
        indicatorSeriesRef.current.delete(key);
      }
    });

    const allMarkers: SeriesMarker<Time>[] = [];
    const nextVisualEvents: PineVisualEvent[] = [];
    const visibleLow = Math.min(...deferredCandles.map((candle) => candle.low));
    const visibleHigh = Math.max(...deferredCandles.map((candle) => candle.high));
    const visibleRange = Math.max(Number.EPSILON, visibleHigh - visibleLow);

    // Show loading toast for the first script in the queue.
    const firstScriptName = scriptsToRun[0]?.name || "Indicator";
    if (statusDismissTimerRef.current) window.clearTimeout(statusDismissTimerRef.current);
    setIndicatorStatus({ status: "loading", name: firstScriptName });

    let lastError: string | undefined;

    for (const item of scriptsToRun) {
      const output = await runPineScriptOnCandles(item.script, item.id, item.name, deferredCandles, symbol, timeframe);
      if (requestedReplayKeyRef.current !== replayKey) return;
      if (output.error) {
        lastError = output.error;
        console.warn(`Pine Script \"${item.name}\" was not rendered: ${output.error}`);
        setIndicatorStatus({ status: "error", name: item.name, message: output.error });
        statusDismissTimerRef.current = window.setTimeout(() => setIndicatorStatus({ status: "idle" }), 4000);
        continue;
      }

      output.plots.forEach((plot, plotIndex) => {
        const lineKey = `${item.id}_plot_${plotIndex}`;
        let plotLow = Number.NaN;
        let plotHigh = Number.NaN;
        let hasValues = false;

        if (plot.times && plot.values) {
          const len = plot.values.length;
          for (let i = 0; i < len; i++) {
            const val = plot.values[i];
            if (!Number.isNaN(val)) {
              if (!hasValues) {
                plotLow = val;
                plotHigh = val;
                hasValues = true;
              } else {
                if (val < plotLow) plotLow = val;
                if (val > plotHigh) plotHigh = val;
              }
            }
          }
        } else if (plot.data) {
          const values = plot.data.map((point) => point.value).filter(Number.isFinite);
          plotLow = values.length ? Math.min(...values) : Number.NaN;
          plotHigh = values.length ? Math.max(...values) : Number.NaN;
          hasValues = values.length > 0;
        }

        // Overlay indicators can also expose counters/booleans through plot().
        // Do not put those values on the candle's shared right scale: a 0/1
        // series beside FX or Gold prices makes the actual candles disappear.
        const isPriceLike = plot.overlay && hasValues
          && plotHigh >= visibleLow - visibleRange * 5
          && plotLow <= visibleHigh + visibleRange * 5;
        if (!isPriceLike) {
          const obsoleteSeries = indicatorSeriesRef.current.get(lineKey);
          if (obsoleteSeries) {
            try { chartRef.current?.removeSeries(obsoleteSeries); } catch { /* Safe detached-series cleanup. */ }
            indicatorSeriesRef.current.delete(lineKey);
          }
          return;
        }
        let lineSeries = indicatorSeriesRef.current.get(lineKey);

        if (!lineSeries && chartRef.current) {
          lineSeries = chartRef.current.addSeries(LineSeries, {
            color: plot.color || "#2962FF",
            lineWidth: Math.min(4, Math.max(1, plot.lineWidth || 2)) as 1 | 2 | 3 | 4,
            title: plot.title || item.name,
            priceScaleId: plot.overlay ? "right" : "",
          });
          indicatorSeriesRef.current.set(lineKey, lineSeries);
        }

        if (lineSeries) {
          if (plot.times && plot.values) {
            const len = plot.times.length;
            const lineData: LineData<Time>[] = [];
            for (let i = 0; i < len; i++) {
              const val = plot.values[i];
              if (!Number.isNaN(val)) {
                lineData.push({ time: plot.times[i] as Time, value: val });
              }
            }
            lineSeries.setData(lineData);
          } else if (plot.data) {
            const lineData: LineData<Time>[] = plot.data
              .filter((d) => !isNaN(d.value) && d.value !== null)
              .map((d) => ({ time: d.time as Time, value: d.value }));
            lineSeries.setData(lineData);
          }
        }
      });

      // A source edit can reduce `plot()` calls. Remove those orphaned chart
      // series immediately instead of displaying data from the old source.
      indicatorSeriesRef.current.forEach((series, key) => {
        const prefix = `${item.id}_plot_`;
        if (key.startsWith(prefix) && Number(key.slice(prefix.length)) >= output.plots.length) {
          try {
            chartRef.current?.removeSeries(series);
          } catch {
            /* Series may already be detached; safe to ignore. */
          }
          indicatorSeriesRef.current.delete(key);
        }
      });

      // The adapter already bounds this to the live final drawing state. Use a
      // loop rather than `push(...items)` so a third-party script can never
      // overflow the browser's function-argument limit.
      for (const event of output.visualEvents) {
        nextVisualEvents.push({ ...event, indicatorId: item.id });
      }
    }

    if (candleSeries) {
      try {
        if (markersRef.current && typeof markersRef.current.setMarkers === "function") {
          markersRef.current.setMarkers(allMarkers);
        } else {
          markersRef.current = createSeriesMarkers(candleSeries, allMarkers);
        }
      } catch {
        /* Marker plugin can throw if the series was just torn down; safe to ignore. */
      }
    }
    if (requestedReplayKeyRef.current === replayKey) {
      lastReplayKeyRef.current = replayKey;
      setVisualEvents(nextVisualEvents);
      // Show success toast only if no error was set by the final script.
      if (!lastError) {
        setIndicatorStatus({ status: "success", name: firstScriptName });
        statusDismissTimerRef.current = window.setTimeout(() => setIndicatorStatus({ status: "idle" }), 2500);
      }
    }
    }, 300);
    return () => window.clearTimeout(replayTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey, marketDataReady]);

  return { visualEvents, indicatorStatus };
}
