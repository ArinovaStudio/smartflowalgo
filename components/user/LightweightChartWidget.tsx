"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Mt5VelaProvider } from "./Mt5VelaProvider";
import type { LightweightChartWidgetProps } from "./types";

export type { DrawingItem, IndicatorMeta } from "./types";

type IndicatorState = {
  status: "idle" | "loading" | "success" | "error";
  name: string;
  message?: string;
};

type ActiveIndicator = { key: string; name: string; source: string };

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

/** Convert stored MT5/TV labels to Vela/Pine timeframe strings. */
function toVelaTimeframe(value: string): string {
  const tf = String(value || "1m").trim().replace(/\s+/g, "");
  const month = /^(\d+)M$/.exec(tf);
  if (month) {
    const amount = Number(month[1]) || 1;
    return amount === 1 ? "M" : `${amount}M`;
  }
  const mt5 = /^(MN|M|H|D|W)(\d+)$/i.exec(tf);
  if (mt5) {
    const amount = Number(mt5[2]) || 1;
    switch (mt5[1].toUpperCase()) {
      case "MN": return amount === 1 ? "M" : `${amount}M`;
      case "M": return String(amount);
      case "H": return String(amount * 60);
      case "D": return amount === 1 ? "D" : `${amount}D`;
      case "W": return amount === 1 ? "W" : `${amount}W`;
    }
  }
  const pine = /^(\d+)([mhdw])$/i.exec(tf);
  if (pine) {
    const amount = Number(pine[1]) || 1;
    switch (pine[2].toLowerCase()) {
      case "m": return String(amount);
      case "h": return String(amount * 60);
      case "d": return amount === 1 ? "D" : `${amount}D`;
      case "w": return amount === 1 ? "W" : `${amount}W`;
    }
  }
  if (/^\d+$/.test(tf)) return tf;
  if (/^(1?D|1?W|1?M)$/i.test(tf)) return tf.replace(/^1/, "").toUpperCase();
  if (/^\d+(D|W|M)$/i.test(tf)) return tf.toUpperCase();
  return "1";
}

function velaSymbol(symbol: string): string {
  const plain = String(symbol || "EURUSD").replace(/^mt5:/i, "");
  return `mt5:${plain}`;
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
  const symbolRef = useRef(initialSymbol);
  const timeframeRef = useRef(initialTimeframe);
  const themeRef = useRef(themeProp);
  symbolRef.current = initialSymbol;
  timeframeRef.current = initialTimeframe;
  themeRef.current = themeProp;

  useEffect(() => {
    if (!hostRef.current) return;
    let cancelled = false;
    const offEvents: Array<() => void> = [];

    const boot = async () => {
      try {
        const [{ VelaWorkspace }, { PineEngine }] = await Promise.all([
          import("@luxalgo/vela/workspace"),
          import("@luxalgo/vela-pinets"),
        ]);
        if (cancelled || !hostRef.current) return;

        const provider = new Mt5VelaProvider();
        providerRef.current = provider;
        const workspace = new VelaWorkspace(hostRef.current, {
          layout: false,
          symbol: velaSymbol(symbolRef.current),
          timeframe: toVelaTimeframe(timeframeRef.current),
          bars: 1500,
          live: true,
          theme: themeRef.current,
          upColor: "#089981",
          downColor: "#f23645",
          currentPriceLine: true,
          defaultLanguage: "pine",
          providers: { mt5: () => provider },
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
      offEvents.forEach((off) => { try { off(); } catch { /* workspace already destroyed */ } });
      for (const { handle } of indicatorHandlesRef.current.values()) {
        try { (handle?.remove ?? handle?.dispose)?.call(handle); } catch { /* chart already destroyed */ }
      }
      indicatorHandlesRef.current.clear();
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
    let cancelled = false;
    const wanted = new Map<string, ActiveIndicator>();
    for (const entry of activeIndicators as any[]) {
      const resolved = resolveIndicator(entry);
      if (resolved) wanted.set(resolved.key, resolved);
      else if (entry) {
        setIndicatorState({ status: "error", name: entry.name || "Indicator", message: "Pine source is missing from the selected version" });
      }
    }

    for (const [key, current] of Array.from(indicatorHandlesRef.current)) {
      const next = wanted.get(key);
      if (!next || next.source !== current.source) {
        try { (current.handle?.remove ?? current.handle?.dispose)?.call(current.handle); } catch { /* already removed */ }
        indicatorHandlesRef.current.delete(key);
      }
    }

    if (!wanted.size && !indicatorHandlesRef.current.size) {
      setIndicatorState({ status: "idle", name: "" });
      return () => { cancelled = true; };
    }

    for (const indicator of wanted.values()) {
      if (indicatorHandlesRef.current.has(indicator.key)) continue;
      setIndicatorState({ status: "loading", name: indicator.name });
      const id = `dropdown-${indicator.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
      void chart.runIndicator(indicator.source, { id, title: indicator.name }).then((result: any) => {
        if (!result?.ok || !result.handle) {
          if (cancelled) return;
          setIndicatorState({ status: "error", name: indicator.name, message: result?.error?.message || "Pine script could not be executed" });
          return;
        }
        const stillWanted = (activeIndicators as any[]).some((entry) => {
          const current = resolveIndicator(entry);
          return current?.key === indicator.key && current.source === indicator.source;
        });
        if (cancelled || !stillWanted || indicatorHandlesRef.current.has(indicator.key)) {
          try { (result.handle.remove ?? result.handle.dispose)?.call(result.handle); } catch { /* already removed */ }
          return;
        }
        indicatorHandlesRef.current.set(indicator.key, { source: indicator.source, handle: result.handle });
        setIndicatorState({ status: "success", name: indicator.name });
      }).catch((error: any) => {
        if (!cancelled) setIndicatorState({ status: "error", name: indicator.name, message: error?.message || "Pine script could not be executed" });
      });
    }

    return () => { cancelled = true; };
  }, [activeIndicators, ready]);

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
