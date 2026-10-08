"use client";

import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import type { CandleData, IndicatorMeta } from "./types";

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
  const [indicatorStatus, setIndicatorStatus] = useState<IndicatorStatus>({ status: "idle" });
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());

  useEffect(() => {
    // Clean up any remaining indicator series
    if (chartRef.current && indicatorSeriesRef.current.size > 0) {
      indicatorSeriesRef.current.forEach((series) => {
        try {
          chartRef.current?.removeSeries(series);
        } catch {
          // Series might already be detached
        }
      });
      indicatorSeriesRef.current.clear();
    }

    // Check if an indicator is selected
    const selectedIndicator = activeIndicators[0];
    if (selectedIndicator) {
      setIndicatorStatus({
        status: "error",
        name: selectedIndicator.name,
        message: "Selected indicator logic is not available",
      });
    } else if (activeBuiltins.length > 0) {
      setIndicatorStatus({
        status: "error",
        name: activeBuiltins[0],
        message: "Selected indicator logic is not available",
      });
    } else if (sandboxOpen && sandboxCode) {
      setIndicatorStatus({
        status: "error",
        name: "Sandbox Indicator",
        message: "Selected indicator logic is not available",
      });
    } else {
      setIndicatorStatus({ status: "idle" });
    }
  }, [activeIndicators, activeBuiltins, sandboxOpen, sandboxCode, chartRef]);

  return { visualEvents: [] as any[], indicatorStatus };
}
