"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { MT5_ALIAS_PREFIXES, Mt5VelaProvider } from "./Mt5VelaProvider";
import { toVelaTimeframe } from "./mt5Timeframes";
import type { LightweightChartWidgetProps } from "./types";
import { registerRendererDefaults } from "@luxalgo/vela/plugin";

export type { DrawingItem, IndicatorMeta } from "./types";

type IndicatorState = {
  status: "idle" | "loading" | "success" | "error";
  name: string;
  message?: string;
};

type ActiveIndicator = { key: string; name: string; source: string };
type PineTableEntry = { ownerId: string; table: any };

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

function opaqueColor(color: string | undefined, fallback: string): string {
  if (!color || color.trim().toLowerCase() === "transparent") return fallback;
  const rgba = /^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*[\d.]+\s*\)$/i.exec(color);
  if (rgba) return `rgb(${rgba[1]}, ${rgba[2]}, ${rgba[3]})`;
  const hex = /^#([\da-f]{8})$/i.exec(color);
  if (hex) return `#${hex[1].slice(0, 6)}`;
  const shortHex = /^#([\da-f]{4})$/i.exec(color);
  if (shortHex) return `#${shortHex[1].slice(0, 3)}`;
  return color;
}

function rgbOf(color: string): [number, number, number] | null {
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(color.trim());
  if (hex) {
    const value = hex[1].length === 3 ? hex[1].split("").map((digit) => digit + digit).join("") : hex[1];
    return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16)) as [number, number, number];
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(color);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const named: Record<string, [number, number, number]> = {
    black: [0, 0, 0], white: [255, 255, 255], yellow: [255, 255, 0],
    red: [255, 0, 0], green: [0, 128, 0], blue: [0, 0, 255],
  };
  return named[color.trim().toLowerCase()] ?? null;
}

function luminance([r, g, b]: [number, number, number]): number {
  const linear = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function readableTextColor(textColor: string | undefined, backgroundColor: string, fallback: string): string {
  const foreground = textColor ?? fallback;
  const foregroundRgb = rgbOf(foreground);
  const backgroundRgb = rgbOf(backgroundColor);
  if (!foregroundRgb || !backgroundRgb) return foreground;
  const fgLuminance = luminance(foregroundRgb);
  const bgLuminance = luminance(backgroundRgb);
  const contrast = (Math.max(fgLuminance, bgLuminance) + 0.05) / (Math.min(fgLuminance, bgLuminance) + 0.05);
  if (contrast >= 4.5) return foreground;
  const blackContrast = (bgLuminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (bgLuminance + 0.05);
  return blackContrast >= whiteContrast ? "#000000" : "#ffffff";
}

function createPineEngineWithFrontTables(
  PineEngine: new () => any,
  onTables: (ownerId: string, tables: any[]) => void,
): any {
  const engine = new PineEngine();
  return {
    language: engine.language,
    capabilities: engine.capabilities,
    prepare: (source: string, instanceId: string) => engine.prepare(source, instanceId),
    execute: (request: any, handlers: any) => engine.execute(request, {
      ...handlers,
      onModel: (model: any) => {
        const tables = model.tables?.map((table: any) => ({
          ...table,
          overlay: true,
          bgColor: opaqueColor(table.bgColor, "#07111a"),
          cells: table.cells?.map((row: any[]) => row.map((cell: any) => cell == null ? null : ({
            ...cell,
            bgColor: opaqueColor(cell.bgColor, opaqueColor(table.bgColor, "#07111a")),
          }))),
        }));
        onTables(model.id, tables ?? []);
        handlers.onModel({ ...model, tables: [] });
      },
    }),
  };
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
  const [pineTables, setPineTables] = useState<PineTableEntry[]>([]);
  const [tablePositions, setTablePositions] = useState<Record<string, { left: number; top: number }>>({});
  const [tableSizes, setTableSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [minimizedTables, setMinimizedTables] = useState<Record<string, boolean>>({});

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
    let unregisterChartClock: (() => void) | null = null;

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
        const clockHost = globalThis as typeof globalThis & { __velaChartNow?: () => number };
        const chartNow = () => provider.chartNow();
        clockHost.__velaChartNow = chartNow;
        unregisterChartClock = () => {
          if (clockHost.__velaChartNow === chartNow) delete clockHost.__velaChartNow;
        };

        // "mt5" is the real provider. The aliases let scripts use TradingView-style symbols
        // such as TVC:DXY or OANDA:XAUUSD: they all resolve to the same MT5 data.
        const providers: Record<string, () => unknown> = { mt5: () => provider };
        for (const name of MT5_ALIAS_PREFIXES) providers[name] = () => provider.alias(name);

        const unregisterAttribution = registerRendererDefaults({
          attribution: '<img src="/logo-removebg.png" alt="Your brand" style="height:28px;width:auto" />',
        });

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
          engines: { pine: () => createPineEngineWithFrontTables(PineEngine, (ownerId, tables) => {
            setPineTables((current) => [
              ...current.filter((entry) => entry.ownerId !== ownerId),
              ...tables.map((table) => ({ ownerId, table })),
            ]);
          }) },
          drawings: { toolbar: true },
          volume: false,
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
      unregisterChartClock?.();
      offEvents.forEach((off) => { try { off(); } catch { /* workspace already destroyed */ } });
      for (const { handle } of indicatorHandlesRef.current.values()) removeHandle(handle);
      indicatorHandlesRef.current.clear();
      pendingRef.current.clear();
      setPineTables([]);
      setTablePositions({});
      setTableSizes({});
      setMinimizedTables({});
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
    const activeOwnerIds = new Set(Array.from(wanted.keys()).map((key) => `dropdown-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`));
    setPineTables((current) => current.filter(({ ownerId }) => activeOwnerIds.has(ownerId)));
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

      <div className="pointer-events-none absolute inset-0 z-[35] overflow-hidden">
        {pineTables.map(({ table }) => {
          const minimized = !!minimizedTables[table.id];
          const position = tablePositions[table.id];
          const size = tableSizes[table.id];
          const defaultBg = opaqueColor(table.bgColor, "#07111a");
          const anchorStyle: React.CSSProperties = position
            ? { left: position.left, top: position.top }
            : {
                left: table.position?.includes("left") ? 12 : table.position?.includes("right") ? undefined : "50%",
                right: table.position?.includes("right") ? 12 : undefined,
                top: table.position?.startsWith("top") ? 54 : table.position?.startsWith("middle") ? "50%" : undefined,
                bottom: table.position?.startsWith("bottom") ? 40 : undefined,
                transform: table.position?.startsWith("middle")
                  ? table.position?.includes("center") ? "translate(-50%, -50%)" : "translateY(-50%)"
                  : table.position?.includes("center") ? "translateX(-50%)" : undefined,
              };
          const defaultWidth = Math.max(200, Math.min(560, (table.columns ?? 3) * 108));
          const defaultHeight = Math.max(72, Math.min(440, (table.rows ?? 3) * 24 + 24));
          const merges: any[] = table.merges ?? [];

          return (
            <div
              key={table.id}
              className={`pointer-events-auto absolute max-w-[90%] max-h-[85%] rounded-sm shadow-xl ${minimized ? "min-w-[150px] overflow-hidden" : "min-w-[180px] min-h-[80px] resize overflow-auto"}`}
              style={{
                ...anchorStyle,
                width: minimized ? 180 : size?.width ?? defaultWidth,
                height: minimized ? 26 : size?.height ?? defaultHeight,
                minWidth: minimized ? 150 : Math.max(180, Math.min(420, (table.columns ?? 2) * 68)),
                minHeight: minimized ? 26 : Math.max(80, Math.min(360, 26 + (table.rows ?? 3) * 17)),
                backgroundColor: defaultBg,
                border: `${Math.max(1, table.frameWidth ?? 0)}px solid ${table.frameColor ?? table.borderColor ?? "#64748b"}`,
              }}
              onPointerUp={(event) => {
                if (minimized) return;
                const rect = event.currentTarget.getBoundingClientRect();
                setTableSizes((current) => ({ ...current, [table.id]: { width: rect.width, height: rect.height } }));
              }}
            >
              <div
                className="sticky top-0 z-10 flex h-6 cursor-move items-center justify-between bg-black/45 px-1.5 text-[10px] font-semibold text-white"
                title="Drag to move table"
                onPointerDown={(event) => {
                  event.preventDefault();
                  const container = hostRef.current;
                  const panel = event.currentTarget.parentElement;
                  if (!container || !panel) return;
                  const bounds = container.getBoundingClientRect();
                  const rect = panel.getBoundingClientRect();
                  const startX = event.clientX;
                  const startY = event.clientY;
                  const originX = rect.left - bounds.left;
                  const originY = rect.top - bounds.top;
                  const move = (moveEvent: PointerEvent) => setTablePositions((current) => ({
                    ...current,
                    [table.id]: {
                      left: Math.max(0, Math.min(bounds.width - rect.width, originX + moveEvent.clientX - startX)),
                      top: Math.max(0, Math.min(bounds.height - rect.height, originY + moveEvent.clientY - startY)),
                    },
                  }));
                  const stop = () => {
                    window.removeEventListener("pointermove", move);
                    window.removeEventListener("pointerup", stop);
                  };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", stop, { once: true });
                }}
              >
                <span className="truncate">Pine table</span>
                <button
                  type="button"
                  title={minimized ? "Restore table" : "Minimize table"}
                  aria-label={minimized ? "Restore table" : "Minimize table"}
                  className="ml-2 flex h-4 w-5 shrink-0 items-center justify-center rounded hover:bg-white/20"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => setMinimizedTables((current) => ({ ...current, [table.id]: !current[table.id] }))}
                >{minimized ? "□" : "−"}</button>
              </div>

              {!minimized && (
                <table className="w-max min-w-full table-auto border-collapse text-[11px] leading-tight">
                  <tbody>
                    {(table.cells ?? []).map((row: any[], rowIndex: number) => (
                      <tr key={rowIndex}>
                        {row.map((cell: any, colIndex: number) => {
                          const merge = merges.find((item) => item.startRow === rowIndex && item.startCol === colIndex);
                          const covered = merges.some((item) => rowIndex >= item.startRow && rowIndex <= item.endRow && colIndex >= item.startCol && colIndex <= item.endCol && (rowIndex !== item.startRow || colIndex !== item.startCol));
                          if (covered) return null;
                          return (
                            <td
                              key={colIndex}
                              colSpan={merge ? merge.endCol - merge.startCol + 1 : undefined}
                              rowSpan={merge ? merge.endRow - merge.startRow + 1 : undefined}
                              title={cell?.tooltip}
                              className="border px-1 py-0.5"
                              style={{
                                color: readableTextColor(cell?.textColor, opaqueColor(cell?.bgColor, defaultBg), "#e2e8f0"),
                                backgroundColor: opaqueColor(cell?.bgColor, defaultBg),
                                borderColor: table.borderColor ?? "rgba(148,163,184,.45)",
                                fontSize: typeof cell?.textSize === "number" ? cell.textSize : undefined,
                                fontWeight: cell?.bold ? 700 : 400,
                                fontStyle: cell?.italic ? "italic" : "normal",
                                textAlign: cell?.hAlign ?? "center",
                                verticalAlign: cell?.vAlign ?? "middle",
                                width: cell?.width ? `${cell.width}%` : undefined,
                                whiteSpace: "pre-wrap",
                                overflowWrap: "anywhere",
                              }}
                            >{cell?.text ?? ""}</td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

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
