"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { MT5_ALIAS_PREFIXES, Mt5VelaProvider } from "./Mt5VelaProvider";
import { toVelaTimeframe } from "./Mt5timeframes";
import type { LightweightChartWidgetProps } from "./types";

export type { DrawingItem, IndicatorMeta } from "./types";

type IndicatorState = {
  status: "idle" | "loading" | "success" | "error";
  name: string;
  message?: string;
};

type ActiveIndicator = { key: string; name: string; source: string };

/** How many bars the chart loads. Scripts that look back over days (e.g. backtests) are limited by this. */
const CHART_BARS = 1500;

function pineSource(entry: any): string {
  const sourceKeys = ["script", "pineSource", "pineScript", "pine", "source", "code", "content"];
  const read = (value: any) => {
    if (!value || typeof value !== "object") return "";
    for (const key of sourceKeys) {
      if (typeof value[key] === "string" && value[key].trim()) return value[key].trim();
    }
    return "";
  };
  if (typeof entry === "string") return entry.trim();
  const versions = Array.isArray(entry?.versions)
    ? [...entry.versions].sort((a: any, b: any) => new Date(b?.createdAt ?? 0).getTime() - new Date(a?.createdAt ?? 0).getTime())
    : [];
  return read(entry) || read(entry?.latestVersion) || read(entry?.activeVersion) || read(versions[0]);
}

function resolveIndicator(entry: any): ActiveIndicator | null {
  const source = pineSource(entry);
  if (!source) return null;
  const declaredTitle = /(?:indicator|strategy)\s*\(\s*(?:title\s*=\s*)?["']([^"']+)/i.exec(source)?.[1];
  const name = entry?.name || entry?.title || declaredTitle || "Pine Script";
  const key = String(entry?.id ?? entry?.key ?? name);
  return { key, name, source };
}

function velaSymbol(symbol: string): string {
  const plain = String(symbol || "EURUSD").replace(/^[A-Za-z0-9_]+:/, "");
  return `mt5:${plain}`;
}

function removeHandle(handle: any) {
  try { (handle?.remove ?? handle?.dispose)?.call(handle); } catch { /* already removed */ }
}

export default function LightweightChartWidget({
  initialSymbol = "EURUSD",
  initialTimeframe = "1m",
  theme: themeProp = "light",
  activeIndicators = [],
}: LightweightChartWidgetProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<any>(null);
  const providerRef = useRef<Mt5VelaProvider | null>(null);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [indicatorState, setIndicatorState] = useState<IndicatorState>({ status: "idle", name: "" });

  const indicatorHandlesRef = useRef(new Map<string, { source: string; handle: any }>());
  /** key -> source currently being executed (prevents duplicate runs while one is in flight) */
  const pendingRef = useRef(new Map<string, string>());
  /** The indicators wanted by the latest render; async results are checked against this. */
  const wantedRef = useRef(new Map<string, ActiveIndicator>());
  const aliveRef = useRef(false);

  const symbolRef = useRef(initialSymbol);
  const timeframeRef = useRef(initialTimeframe);
  const themeRef = useRef(themeProp);
  symbolRef.current = initialSymbol;
  timeframeRef.current = initialTimeframe;
  themeRef.current = themeProp;

  // A stable string, so a parent that rebuilds the array every render does not re-run every script.
  const indicatorSignature = useMemo(
    () =>
      JSON.stringify(
        (activeIndicators as any[]).map((entry) => {
          const resolved = resolveIndicator(entry);
          return resolved ? [resolved.key, resolved.name, resolved.source] : [String(entry?.name ?? entry?.id ?? "?"), null];
        }),
      ),
    [activeIndicators],
  );

  useEffect(() => {
    if (!hostRef.current) return;
    let cancelled = false;
    aliveRef.current = true;
    const offEvents: Array<() => void> = [];

    const boot = async () => {
      try {
        const [{ VelaWorkspace }, { PineEngine }] = await Promise.all([
          import("@luxalgo/vela/workspace"),
          import("@luxalgo/vela-pinets"),
        ]);
        if (cancelled || !hostRef.current) return;

        const provider = new Mt5VelaProvider({
          onError: (message) => {
            if (!cancelled) setIndicatorState({ status: "error", name: "MT5 data", message });
          },
        });
        providerRef.current = provider;

        // "mt5" is the real provider. The aliases let scripts use TradingView-style symbols
        // such as TVC:DXY or OANDA:XAUUSD: they all resolve to the same MT5 data.
        const providers: Record<string, () => unknown> = { mt5: () => provider };
        for (const name of MT5_ALIAS_PREFIXES) providers[name] = () => provider.alias(name);

        const workspace = new VelaWorkspace(hostRef.current, {
          layout: false,
          symbol: velaSymbol(symbolRef.current),
          timeframe: toVelaTimeframe(timeframeRef.current),
          bars: CHART_BARS,
          live: true,
          theme: themeRef.current,
          upColor: "#089981",
          downColor: "#f23645",
          currentPriceLine: true,
          defaultLanguage: "pine",
          providers,
          engines: { pine: () => new PineEngine() },
          drawings: { toolbar: true },
          volume: true,
          topbar: { left: ["symbol", "timeframes", "style", "undo-redo"] },
          autofocus: false,
          persist: false,
        } as any);
        workspaceRef.current = workspace;
        await workspace.chart.ready();
        if (cancelled) return;

        offEvents.push(workspace.chart.on("indicator:error", ({ error }: { error: Error }) => {
          setIndicatorState((current) => ({
            status: "error",
            name: current.name || "Indicator",
            message: error?.message || "Pine execution failed",
          }));
        }));
        setBootError(null);
        setReady(true);
      } catch (error: any) {
        console.error("[Vela] chart failed to start:", error);
        if (!cancelled) setBootError(error?.message || "Failed to start the Vela chart");
      }
    };

    void boot();
    return () => {
      cancelled = true;
      aliveRef.current = false;
      offEvents.forEach((off) => { try { off(); } catch { /* workspace already destroyed */ } });
      for (const { handle } of indicatorHandlesRef.current.values()) removeHandle(handle);
      indicatorHandlesRef.current.clear();
      pendingRef.current.clear();
      try { workspaceRef.current?.destroy?.(); } catch { /* noop */ }
      providerRef.current?.dispose();
      workspaceRef.current = null;
      providerRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const chart = workspaceRef.current?.chart;
    if (!ready || !chart) return;
    chart.setTheme(themeProp);
  }, [themeProp, ready]);

  useEffect(() => {
    const chart = workspaceRef.current?.chart;
    if (!ready || !chart) return;
    const nextSymbol = velaSymbol(initialSymbol);
    const nextTimeframe = toVelaTimeframe(initialTimeframe);
    const market = chart.market ?? {};
    const sameSymbol = String(market.symbol ?? "").toLowerCase() === nextSymbol.toLowerCase();
    const sameTimeframe = String(market.timeframe ?? "") === nextTimeframe;
    if (sameSymbol && sameTimeframe) return;
    void chart.setMarket({
      ...(sameSymbol ? {} : { symbol: nextSymbol }),
      ...(sameTimeframe ? {} : { timeframe: nextTimeframe }),
    }).catch((error: unknown) => console.error("[Vela] market switch failed:", error));
  }, [initialSymbol, initialTimeframe, ready]);

  useEffect(() => {
    const chart = workspaceRef.current?.chart;
    if (!ready || !chart) return;

    const wanted = new Map<string, ActiveIndicator>();
    let missingSource: string | null = null;
    for (const entry of activeIndicators as any[]) {
      const resolved = resolveIndicator(entry);
      if (resolved) wanted.set(resolved.key, resolved);
      else if (entry) missingSource = entry.name || "Indicator";
    }
    wantedRef.current = wanted;
    if (missingSource) {
      setIndicatorState({ status: "error", name: missingSource, message: "Pine source is missing from the selected version" });
    }

    // Remove indicators that were switched off or whose source changed.
    for (const [key, current] of Array.from(indicatorHandlesRef.current)) {
      const next = wanted.get(key);
      if (!next || next.source !== current.source) {
        removeHandle(current.handle);
        indicatorHandlesRef.current.delete(key);
      }
    }

    if (!wanted.size && !indicatorHandlesRef.current.size) {
      if (!missingSource) setIndicatorState({ status: "idle", name: "" });
      return;
    }

    for (const indicator of wanted.values()) {
      if (indicatorHandlesRef.current.has(indicator.key)) continue;
      if (pendingRef.current.get(indicator.key) === indicator.source) continue; // already running
      pendingRef.current.set(indicator.key, indicator.source);
      setIndicatorState({ status: "loading", name: indicator.name });

      const id = `dropdown-${indicator.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
      const settle = () => {
        if (pendingRef.current.get(indicator.key) === indicator.source) pendingRef.current.delete(indicator.key);
      };
      const stillWanted = () => wantedRef.current.get(indicator.key)?.source === indicator.source;

      void chart.runIndicator(indicator.source, { id, title: indicator.name }).then((result: any) => {
        settle();
        const handle = result?.handle;
        if (!result?.ok || !handle) {
          if (aliveRef.current && stillWanted()) {
            setIndicatorState({ status: "error", name: indicator.name, message: result?.error?.message || "Pine script could not be executed" });
          }
          return;
        }
        // The user may have toggled it off, or the widget unmounted, while it was running.
        if (!aliveRef.current || !stillWanted() || indicatorHandlesRef.current.has(indicator.key)) {
          removeHandle(handle);
          return;
        }
        indicatorHandlesRef.current.set(indicator.key, { source: indicator.source, handle });
        setIndicatorState({ status: "success", name: indicator.name });
      }).catch((error: any) => {
        settle();
        if (aliveRef.current && stillWanted()) {
          setIndicatorState({ status: "error", name: indicator.name, message: error?.message || "Pine script could not be executed" });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicatorSignature, ready]);

  useEffect(() => {
    if (indicatorState.status !== "success" && indicatorState.status !== "error") return;
    const timer = setTimeout(() => setIndicatorState((state) => state === indicatorState ? { status: "idle", name: "" } : state), 5_000);
    return () => clearTimeout(timer);
  }, [indicatorState]);

  const toastColors = indicatorState.status === "success"
    ? { bg: "rgba(6, 78, 59, 0.92)", border: "rgba(34, 197, 94, 0.5)" }
    : indicatorState.status === "error"
      ? { bg: "rgba(127, 29, 29, 0.92)", border: "rgba(239, 68, 68, 0.5)" }
      : { bg: "rgba(15, 23, 42, 0.92)", border: "rgba(59, 130, 246, 0.5)" };

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden rounded-2xl bg-white text-slate-900 dark:bg-[#131722] dark:text-[#d1d4dc]">
      <div ref={hostRef} className="absolute inset-0" />

      {bootError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-6 text-center text-sm text-rose-300">
          Vela chart failed to start: {bootError}
        </div>
      )}

      {indicatorState.status !== "idle" && (
        <div
          role="status"
          className="absolute left-1/2 top-16 z-50 flex max-w-[min(90%,640px)] -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-md"
          style={{ backgroundColor: toastColors.bg, borderColor: toastColors.border }}
        >
          {indicatorState.status === "loading" && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-sky-300" />}
          {indicatorState.status === "success" && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-300" />}
          {indicatorState.status === "error" && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-300" />}
          <span className="truncate">
            {indicatorState.status === "loading" ? `Loading ${indicatorState.name}…` :
              indicatorState.status === "success" ? `Loaded ${indicatorState.name}` :
                `Failed to load ${indicatorState.name}${indicatorState.message ? `: ${indicatorState.message}` : ""}`}
          </span>
        </div>
      )}
    </div>
  );
}