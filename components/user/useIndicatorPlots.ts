"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import { LineSeries, createSeriesMarkers, IChartApi, ISeriesApi, SeriesMarker, Time, LineData } from "lightweight-charts";
import { BUILTIN_SCRIPTS } from "./constants";
import type { CandleData, IndicatorMeta } from "./types";
import { runPineScriptOnCandles, type PineVisualEvent } from "@/lib/pineJsLightweightAdapter";

interface UseIndicatorPlotsArgs {
  candles: CandleData[];
  symbol: string;
  timeframe: string;
  activeBuiltins: string[];
  activeIndicators: IndicatorMeta[];
  sandboxOpen: boolean;
  sandboxCode: string;
  chartRef: React.RefObject<IChartApi | null>;
  candleSeriesRef: React.RefObject<ISeriesApi<any> | null>;
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
  activeBuiltins,
  activeIndicators,
  sandboxOpen,
  sandboxCode,
  chartRef,
  candleSeriesRef,
}: UseIndicatorPlotsArgs) {
  // Candle updates are high priority because they move the price chart. Let
  // React schedule the comparatively expensive script replay behind pan/zoom
  // and the latest price paint.
  const deferredCandles = useDeferredValue(candles);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const markersRef = useRef<any>(null);
  const [visualEvents, setVisualEvents] = useState<PineVisualEvent[]>([]);

  useEffect(() => {
    if (!candleSeriesRef.current || deferredCandles.length === 0) return;

    // A tick can update many times per second. Replaying a complete Pine
    // history for every one of those ticks starves the chart's pan/zoom work.
    // Coalesce bursts; the candle series itself continues updating instantly.
    const candleSeries = candleSeriesRef.current;
    const replayTimer = window.setTimeout(() => {

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

    scriptsToRun.forEach((item) => {
      const output = runPineScriptOnCandles(item.script, item.id, item.name, deferredCandles, symbol, timeframe);
      if (output.error) {
        console.warn(`Pine Script \"${item.name}\" was not rendered: ${output.error}`);
        return;
      }

      output.plots.forEach((plot, plotIndex) => {
        const lineKey = `${item.id}_plot_${plotIndex}`;
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
          const lineData: LineData<Time>[] = plot.data
            .filter((d) => !isNaN(d.value) && d.value !== null)
            .map((d) => ({ time: d.time as Time, value: d.value }));
          lineSeries.setData(lineData);
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

      nextVisualEvents.push(...output.visualEvents.map((event) => ({ ...event, indicatorId: item.id })));
    });

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
    setVisualEvents(nextVisualEvents);
    }, 250);
    return () => window.clearTimeout(replayTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredCandles, symbol, timeframe, activeBuiltins, activeIndicators, sandboxOpen, sandboxCode]);

  return { visualEvents };
}
