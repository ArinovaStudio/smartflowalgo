"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import type { CandleData } from "./types";
import type { PineVisualEvent } from "@/lib/pineJsLightweightAdapter";
import { ChevronDown, Minus } from "lucide-react";

type Handle = { id: string; kind: "line" | "box" | "label" | "shape"; args: unknown[]; text?: string; textColor?: string; stack?: number; barIndexOffset?: number };
type TableCell = { text?: string; textColor?: string; bgcolor?: string };
type Table = { id: string; position?: string; columns: number; rows: number; cells: Map<string, TableCell> };
type TableLayout = { x: number; y: number; width: number; height: number };
type TableMinimum = { width: number; height: number; columns: number[] };

// Pine assigns handle IDs independently for box, line, label, and table.
// A box #1 and a label #1 are different objects; include the namespace so a
// label update/delete cannot overwrite a zone box with the same numeric id.
function key(event: PineVisualEvent) {
  const namespace = event.call.split(".")[0] || "drawing";
  return `${event.indicatorId || "script"}:${namespace}:${event.pineHandleId || "new"}`;
}
function number(value: unknown) { const result = Number(value); return Number.isFinite(result) ? result : Number.NaN; }

// Dashboard text is supplied by arbitrary third-party Pine scripts. Keep the
// requested compact presentation without changing the underlying calculation.
function formatDisplayText(value: unknown) {
  return String(value ?? "").replace(/-?\d+\.\d+/g, (token) => {
    const parsed = Number(token);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : token;
  });
}

export function reduceEvents(events: PineVisualEvent[]) {
  const handles = new Map<string, Handle>();
  const tables = new Map<string, Table>();
  for (const event of events) {
    const id = key(event);
    const args = event.args;
    if (event.call === "line.new" || event.call === "box.new" || event.call === "label.new") {
      // ── CRITICAL FIX: copy barIndexOffset from the event into the Handle so
      // the SVG renderer can map replay bar_index → full-history candle index. ──
      handles.set(id, {
        id,
        kind: event.call.split(".")[0] as Handle["kind"],
        args: [...args],
        barIndexOffset: event.barIndexOffset,   // was missing → bOff was always 0
      });
    } else if (event.call.endsWith(".delete")) {
      handles.delete(id);
    } else if (event.call === "line.set_xy1" || event.call === "line.set_xy2") {
      const handle = handles.get(id); if (handle) { const offset = event.call.endsWith("xy1") ? 0 : 2; handle.args[offset] = args[1]; handle.args[offset + 1] = args[2]; }
    } else if (event.call === "line.set_color") { const handle = handles.get(id); if (handle) handle.args[6] = args[1]; }
    else if (event.call === "box.set_left" || event.call === "box.set_right" || event.call === "box.set_top" || event.call === "box.set_bottom") {
      const handle = handles.get(id); const index = event.call.endsWith("left") ? 0 : event.call.endsWith("top") ? 1 : event.call.endsWith("right") ? 2 : 3; if (handle) handle.args[index] = args[1];
    } else if (event.call === "box.set_bgcolor") { const handle = handles.get(id); if (handle) handle.args[8] = args[1]; }
    else if (event.call === "box.set_extend") { const handle = handles.get(id); if (handle) handle.args[7] = args[1]; }
    else if (event.call === "box.set_border_color") { const handle = handles.get(id); if (handle) handle.args[4] = args[1]; }
    else if (event.call === "box.set_border_width") { const handle = handles.get(id); if (handle) handle.args[5] = args[1]; }
    else if (event.call === "box.set_text_color") {
      const handle = handles.get(id);
      if (handle) {
        const value = String(args[1] ?? "");
        if (value.startsWith("__PINE_BOX_TEXT__")) handle.text = value.slice("__PINE_BOX_TEXT__".length);
        else handle.textColor = value;
      }
    }
    else if (event.call === "label.set_xy") { const handle = handles.get(id); if (handle) { handle.args[0] = args[1]; handle.args[1] = args[2]; } }
    else if (event.call === "label.set_x")  { const handle = handles.get(id); if (handle) handle.args[0] = args[1]; }
    else if (event.call === "label.set_y")  { const handle = handles.get(id); if (handle) handle.args[1] = args[1]; }
    else if (event.call === "label.set_text")  { const handle = handles.get(id); if (handle) handle.args[2] = args[1]; }
    else if (event.call === "label.set_color") { const handle = handles.get(id); if (handle) handle.args[5] = args[1]; }
    else if (event.call === "label.set_style") { const handle = handles.get(id); if (handle) handle.args[6] = args[1]; }
    else if (event.call === "label.set_textcolor") { const handle = handles.get(id); if (handle) handle.args[7] = args[1]; }
    else if (event.call === "label.set_size")  { /* size hint — no visible change needed */ }
    // Individual line coordinate setters
    else if (event.call === "line.set_x1")  { const handle = handles.get(id); if (handle) handle.args[0] = args[1]; }
    else if (event.call === "line.set_y1")  { const handle = handles.get(id); if (handle) handle.args[1] = args[1]; }
    else if (event.call === "line.set_x2")  { const handle = handles.get(id); if (handle) handle.args[2] = args[1]; }
    else if (event.call === "line.set_y2")  { const handle = handles.get(id); if (handle) handle.args[3] = args[1]; }
    else if (event.call === "line.set_extend")     { const handle = handles.get(id); if (handle) handle.args[5] = args[1]; }
    else if (event.call === "line.set_width")      { const handle = handles.get(id); if (handle) handle.args[8] = args[1]; }
    else if (event.call === "line.set_style")      { const handle = handles.get(id); if (handle) handle.args[7] = args[1]; }
    else if (event.call === "table.new") {
      const cols = Math.max(1, number(args[1]) || 1);
      const rows = Math.max(1, number(args[2]) || 1);
      const existing = tables.get(id);
      if (existing) {
        existing.position = String(args[0] || existing.position || "middle_right");
        existing.columns = Math.max(existing.columns, cols);
        existing.rows = Math.max(existing.rows, rows);
      } else {
        tables.set(id, {
          id,
          position: String(args[0] || "middle_right"),
          columns: cols,
          rows,
          cells: new Map(),
        });
      }
    }
    else if (event.call === "table.cell") {
      let table = tables.get(id);
      if (!table) {
        table = { id, position: "middle_right", columns: 1, rows: 1, cells: new Map() };
        tables.set(id, table);
      }
      const offset = typeof args[0] === "number" || typeof args[0] === "object" ? 1 : 0;
      const tooltip = typeof args[offset + 10] === "string" ? (args[offset + 10] as string) : "";
      if (tooltip.startsWith("__PINE_TABLE_POS__")) {
        const rawPos = tooltip.slice("__PINE_TABLE_POS__".length).trim();
        const cleanPos = rawPos.replace(/^position\./, "").toLowerCase();
        if (cleanPos) table.position = cleanPos;
        continue;
      }
      if (tooltip.startsWith("__PINE_TABLE_IGNORE__")) {
        continue;
      }
      const col = number(args[offset]);
      const row = number(args[offset + 1]);
      if (Number.isFinite(col) && Number.isFinite(row)) {
        table.columns = Math.max(table.columns, col + 1);
        table.rows = Math.max(table.rows, row + 1);
        const cellKey = `${col}:${row}`;
        const prev = table.cells.get(cellKey) || {};
        const rawText = args[offset + 2];
        const textColor = args[offset + 5];
        const background = args[offset + 9];
        table.cells.set(cellKey, {
          text: rawText !== null && rawText !== undefined ? formatDisplayText(rawText) : prev.text,
          textColor: typeof textColor === "string" ? textColor : prev.textColor,
          bgcolor: typeof background === "string" ? background : prev.bgcolor,
        });
      }
    }
    else if (event.call === "table.set_cell_text" || event.call === "table.set_cell_value") {
      let table = tables.get(id);
      if (!table) {
        table = { id, position: "middle_right", columns: 1, rows: 1, cells: new Map() };
        tables.set(id, table);
      }
      const offset = typeof args[0] === "number" || typeof args[0] === "object" ? 1 : 0;
      const col = number(args[offset]);
      const row = number(args[offset + 1]);
      if (Number.isFinite(col) && Number.isFinite(row)) {
        table.columns = Math.max(table.columns, col + 1);
        table.rows = Math.max(table.rows, row + 1);
        const cellKey = `${col}:${row}`;
        const prev = table.cells.get(cellKey) || {};
        table.cells.set(cellKey, {
          ...prev,
          text: formatDisplayText(args[offset + 2]),
        });
      }
    }
    else if (event.call === "table.set_cell_bgcolor") {
      let table = tables.get(id);
      if (!table) {
        table = { id, position: "middle_right", columns: 1, rows: 1, cells: new Map() };
        tables.set(id, table);
      }
      const offset = typeof args[0] === "number" || typeof args[0] === "object" ? 1 : 0;
      const col = number(args[offset]);
      const row = number(args[offset + 1]);
      if (Number.isFinite(col) && Number.isFinite(row)) {
        table.columns = Math.max(table.columns, col + 1);
        table.rows = Math.max(table.rows, row + 1);
        const cellKey = `${col}:${row}`;
        const prev = table.cells.get(cellKey) || {};
        if (typeof args[offset + 2] === "string") {
          table.cells.set(cellKey, { ...prev, bgcolor: args[offset + 2] as string });
        }
      }
    }
    else if (event.call === "table.set_cell_text_color") {
      let table = tables.get(id);
      if (!table) {
        table = { id, position: "middle_right", columns: 1, rows: 1, cells: new Map() };
        tables.set(id, table);
      }
      const offset = typeof args[0] === "number" || typeof args[0] === "object" ? 1 : 0;
      const col = number(args[offset]);
      const row = number(args[offset + 1]);
      if (Number.isFinite(col) && Number.isFinite(row)) {
        table.columns = Math.max(table.columns, col + 1);
        table.rows = Math.max(table.rows, row + 1);
        const cellKey = `${col}:${row}`;
        const prev = table.cells.get(cellKey) || {};
        if (typeof args[offset + 2] === "string") {
          table.cells.set(cellKey, { ...prev, textColor: args[offset + 2] as string });
        }
      }
    }
    else if (
      event.call === "plotshape" ||
      event.call === "plotchar" ||
      event.call === "plotarrow"
    ) {
      // args: [value, title, style, location, color, size, offset, text, textcolor, ...]
      // barIndex is the candle bar index within the replay slice; barIndexOffset
      // is attached by the adapter to address the full candle array.
      const style  = String(event.args[2] ?? "");
      const location = String(event.args[3] ?? "");
      const color  = typeof event.args[4] === "string" ? event.args[4] : undefined;
      const text   = String(event.args[7] ?? event.args[1] ?? "");
      handles.set(id, {
        id,
        kind: "shape",
        // args[0] = barIndex (in replay slice), args[1] = style enum, args[2] = location enum
        args: [event.barIndex, style, location, color, text],
        barIndexOffset: event.barIndexOffset ?? 0,
      });
    }
  }
  // Pine code can create a drawing on every historical bar. Keep all active
  // objects up to a generous cap so valid zones and signals remain visible.
  // The previous hard limits (.slice(-8), .slice(-24), .slice(-30)) were too
  // aggressive and discarded valid on-screen drawings.
  const MAX_BOXES  = 200;
  const MAX_LINES  = 500;
  const MAX_LABELS = 500;
  const MAX_SHAPES = 1000;
  const active = [...handles.values()];
  const boxes  = active.filter((h) => h.kind === "box").slice(-MAX_BOXES);
  const lines  = active.filter((h) => h.kind === "line").slice(-MAX_LINES);
  const shapes = active.filter((h) => h.kind === "shape").slice(-MAX_SHAPES);
  // Keep all active labels (e.g. WHALE SELL, SELL ENTRY, WAIT ZONE) and stack if at same bar
  const labels = active
    .filter((h) => h.kind === "label")
    .sort((a, b) => number(a.args[0]) - number(b.args[0]))
    .slice(-MAX_LABELS);

  let previousBar = Number.NaN;
  let stack = 0;
  labels.forEach((label) => {
    const bar = number(label.args[0]);
    stack = Number.isFinite(previousBar) && bar - previousBar <= 3 ? stack + 1 : 0;
    label.stack = stack;
    previousBar = bar;
  });
  return { handles: [...boxes, ...lines, ...labels, ...shapes], tables: [...tables.values()].filter((table) => table.cells.size > 0).slice(-2) };
}

interface Props {
  events: PineVisualEvent[];
  candles: CandleData[];
  chartRef: React.RefObject<IChartApi | null>;
  candleSeriesRef: React.RefObject<ISeriesApi<any> | null>;
}

function tableMinimumSize(table: Table): TableMinimum {
  let maxCol = 0;
  let maxRow = 0;
  for (const cellKey of table.cells.keys()) {
    const [c, r] = cellKey.split(":").map(Number);
    if (Number.isFinite(c) && c > maxCol) maxCol = c;
    if (Number.isFinite(r) && r > maxRow) maxRow = r;
  }
  const cols = Math.max(1, Math.min(table.columns, maxCol + 1));
  const rows = Math.max(1, Math.min(table.rows, maxRow + 1));

  const columnWidths = Array.from({ length: cols }, (_, column) => {
    let longest = 3;
    for (let row = 0; row < rows; row++) {
      const len = table.cells.get(`${column}:${row}`)?.text?.length || 0;
      if (len > longest) longest = len;
    }
    return Math.max(54, Math.min(220, longest * 7 + 18));
  });

  const rawWidth = columnWidths.reduce((sum, value) => sum + value, 0);
  const width = Math.max(120, Math.min(480, rawWidth));
  const height = Math.max(48, Math.min(500, 20 + rows * 24));
  return { width, height, columns: columnWidths };
}

function PineTableCard({ table }: { table: Table }) {
  const min = useMemo(() => tableMinimumSize(table), [table]);
  const storageKey = `smartflow:pinetable:${table.id}`;
  const cardRef = useRef<HTMLDivElement>(null);
  const hasSavedLayoutRef = useRef(false);
  const hasPlacedInitialLayoutRef = useRef(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null") as (Partial<TableLayout> & { isMinimized?: boolean }) | null;
      return Boolean(saved?.isMinimized);
    } catch {
      return false;
    }
  });
  const [layout, setLayout] = useState<TableLayout>(() => {
    if (typeof window === "undefined") return { x: 12, y: 12, width: min.width, height: min.height };
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null") as Partial<TableLayout> | null;
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) && Number.isFinite(saved.width) && Number.isFinite(saved.height)) {
        hasSavedLayoutRef.current = true;
        return { x: saved.x!, y: saved.y!, width: Math.max(min.width, saved.width!), height: Math.max(min.height, saved.height!) };
      }
    } catch { /* A bad saved preference must not block the chart. */ }
    return { x: 12, y: 12, width: min.width, height: min.height };
  });
  const dragRef = useRef<{ mode: "move" | "resize"; x: number; y: number; layout: TableLayout } | null>(null);

  const clampToChart = (candidate: TableLayout, currentHeight?: number) => {
    const parent = cardRef.current?.parentElement?.getBoundingClientRect();
    if (!parent || parent.width === 0 || parent.height === 0) return candidate;
    const effectiveHeight = currentHeight ?? (isMinimized ? 18 : candidate.height);
    const clampedWidth = Math.min(candidate.width, Math.max(80, parent.width - 24));
    const clampedHeight = Math.min(effectiveHeight, Math.max(40, parent.height - 24));
    return {
      width: clampedWidth,
      height: isMinimized ? candidate.height : clampedHeight,
      x: Math.max(12, Math.min(candidate.x, Math.max(12, parent.width - clampedWidth - 12))),
      y: Math.max(12, Math.min(candidate.y, Math.max(12, parent.height - clampedHeight - 12))),
    };
  };

  useEffect(() => setLayout((current) => {
    const normalized = { ...current, width: Math.max(min.width, current.width), height: Math.max(min.height, current.height) };
    const parent = cardRef.current?.parentElement?.getBoundingClientRect();
    if (!parent || hasPlacedInitialLayoutRef.current || hasSavedLayoutRef.current) return clampToChart(normalized);

    // Pine's table position is relative to the chart pane, never the browser
    // window. This keeps right/bottom cards completely visible beside the
    // price scale and above the time scale on the first render.
    const position = String(table.position || "middle_right").replace("position.", "");
    hasPlacedInitialLayoutRef.current = true;
    return clampToChart({
      ...normalized,
      x: position.includes("left") ? 12 : Math.max(12, parent.width - normalized.width - 12),
      y: position.includes("top") ? 12 : position.includes("bottom") ? Math.max(12, parent.height - normalized.height - 12) : Math.max(12, (parent.height - normalized.height) / 2),
    });
  }), [min.height, min.width, table.position]);

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify({ ...layout, isMinimized })); } catch { /* Storage is optional. */ }
  }, [layout, isMinimized, storageKey]);

  const toggleMinimize = () => {
    setIsMinimized((prev) => {
      const next = !prev;
      if (!next) {
        setLayout((current) => clampToChart(current, current.height));
      }
      return next;
    });
  };

  const begin = (event: React.PointerEvent<HTMLDivElement>, mode: "move" | "resize") => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { mode, x: event.clientX, y: event.clientY, layout };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (drag.mode === "move") {
      setLayout(clampToChart({ ...drag.layout, x: drag.layout.x + dx, y: drag.layout.y + dy }));
    } else {
      const parent = cardRef.current?.parentElement?.getBoundingClientRect();
      const maximumWidth = parent ? Math.max(min.width, parent.width - drag.layout.x) : Number.POSITIVE_INFINITY;
      const maximumHeight = parent ? Math.max(min.height, parent.height - drag.layout.y) : Number.POSITIVE_INFINITY;
      setLayout({ ...drag.layout, width: Math.min(maximumWidth, Math.max(min.width, drag.layout.width + dx)), height: Math.min(maximumHeight, Math.max(min.height, drag.layout.height + dy)) });
    }
  };

  const cardTitle = useMemo(() => {
    const c0 = table.cells.get("0:0")?.text?.trim();
    const c1 = table.cells.get("1:0")?.text?.trim();
    if (c0 && c1) return `${c0} • ${c1}`;
    if (c0) return c0;
    return "DASHBOARD";
  }, [table]);

  const fontSize = Math.max(9, Math.min(13, 10 * Math.min(layout.width / min.width, layout.height / min.height)));
  return <div
    ref={cardRef}
    className="absolute z-30 select-none rounded-lg border border-cyan-400/50 bg-[#070a10]/95 shadow-2xl overflow-hidden pointer-events-auto backdrop-blur-sm"
    style={{ left: layout.x, top: layout.y, width: layout.width, minWidth: isMinimized ? undefined : min.width, minHeight: isMinimized ? undefined : min.height }}
    onPointerMove={move}
    onPointerUp={() => { dragRef.current = null; }}
    onPointerCancel={() => { dragRef.current = null; }}
  >
    <div
      className={`flex h-4 cursor-move items-center justify-between px-1 text-[8px] tracking-[0.2em] text-cyan-300/70 ${isMinimized ? "" : "border-b border-cyan-400/30"}`}
      onPointerDown={(event) => begin(event, "move")}
      onDoubleClick={(event) => {
        event.stopPropagation();
        toggleMinimize();
      }}
      title={isMinimized ? "Drag to move • Double-click to expand" : "Drag to move • Double-click to minimize"}
    >
      {isMinimized ? (
        <span className="truncate max-w-[140px] text-[8px] font-bold tracking-normal text-cyan-200 pl-0.5">
          {cardTitle}
        </span>
      ) : (
        <div className="w-3.5" />
      )}
      <span className={isMinimized ? "text-[7px] opacity-60" : ""}>DRAG</span>
      <button
        type="button"
        aria-label={isMinimized ? "Expand dashboard" : "Minimize dashboard"}
        title={isMinimized ? "Expand (or double-click header)" : "Minimize (or double-click header)"}
        className="flex h-3.5 w-3.5 items-center justify-center rounded text-cyan-300/70 hover:bg-cyan-400/20 hover:text-cyan-100 transition-colors"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          toggleMinimize();
        }}
      >
        {isMinimized ? <ChevronDown className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
      </button>
    </div>
    {!isMinimized && (
      <>
        <div
          style={{
            display: "grid",
            minHeight: Math.max(30, layout.height - 18),
            gridTemplateColumns: min.columns.map((column) => `minmax(${column}px, 1fr)`).join(" "),
            gridAutoRows: "minmax(22px, 1fr)",
            fontSize,
          }}
        >
          {Array.from({ length: table.rows }, (_, r) =>
            Array.from({ length: table.columns }, (_, c) => {
              const cell = table.cells.get(`${c}:${r}`);
              return (
                <div
                  key={`${c}:${r}`}
                  className="min-w-0 border border-slate-700/50 px-2 py-0.5 flex items-center whitespace-nowrap overflow-hidden text-ellipsis"
                  style={{
                    color: cell?.textColor || "#d1d4dc",
                    backgroundColor: cell?.bgcolor || "transparent",
                    lineHeight: 1.25,
                  }}
                  title={cell?.text || ""}
                >
                  {cell?.text || ""}
                </div>
              );
            })
          )}
        </div>
        <div aria-label="Resize dashboard" title="Drag to resize" className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize border-l border-t border-cyan-400/60 bg-cyan-400/20" onPointerDown={(event) => begin(event, "resize")} />
      </>
    )}
  </div>;
}

/** Renders Pine's stateful drawing events above the Lightweight Charts canvas. */
export function PineVisualLayer({ events, candles, chartRef, candleSeriesRef }: Props) {
  const [revision, setRevision] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const drawings = useMemo(() => reduceEvents(events), [events]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const refresh = () => {
      const parent = svgRef.current?.parentElement;
      if (parent) {
        const bounds = parent.getBoundingClientRect();
        setViewport({ width: Math.round(bounds.width), height: Math.round(bounds.height) });
      }
      setRevision((value) => value + 1);
    };
    refresh();
    chart.timeScale().subscribeVisibleLogicalRangeChange(refresh);
    window.addEventListener("resize", refresh);
    const observer = new ResizeObserver(refresh);
    if (svgRef.current?.parentElement) observer.observe(svgRef.current.parentElement);
    return () => { observer.disconnect(); chart.timeScale().unsubscribeVisibleLogicalRangeChange(refresh); window.removeEventListener("resize", refresh); };
  }, [chartRef, events]);

  const chart = chartRef.current;
  const series = candleSeriesRef.current;
  if (!chart || !series) return null;
  const { width, height } = viewport;

  /**
   * Convert a Pine x-coordinate to a Lightweight Charts pixel coordinate.
   *
   * Pine x-values can be one of three things:
   *  1. A bar_index within the replay slice  (small integer, 0–2000)
   *  2. A Unix epoch in milliseconds         (> 1e12)
   *  3. A Unix epoch in seconds              (everything else ≥ 946684800)
   *
   * @param value       The raw x value from the Pine event.
   * @param barOffset   barIndexOffset from the adapter (0 when candles < maxBars).
   */
  const x = (value: unknown, barOffset = 0) => {
    const raw = number(value);
    if (!Number.isFinite(raw)) return null;

    // ── Branch 1: bar_index within the replay slice ──────────────────────
    // Values this small cannot be epoch-seconds (would be year 1970).
    if (raw >= -50_000 && raw < 100_000) {
      const globalIdx = Math.trunc(raw) + barOffset;
      const candle = candles[globalIdx] ?? candles[Math.trunc(raw)];
      if (candle) {
        return chart.timeScale().timeToCoordinate(candle.time as Time);
      }
      if (candles.length >= 2 && globalIdx >= candles.length) {
        const cLast = chart.timeScale().timeToCoordinate(candles[candles.length - 1].time as Time);
        const cPrev = chart.timeScale().timeToCoordinate(candles[candles.length - 2].time as Time);
        if (cLast !== null && cPrev !== null) {
          const spacing = Math.max(1, cLast - cPrev);
          return cLast + (globalIdx - (candles.length - 1)) * spacing;
        }
      }
      if (candles.length >= 2 && globalIdx < 0) {
        const c0 = chart.timeScale().timeToCoordinate(candles[0].time as Time);
        const c1 = chart.timeScale().timeToCoordinate(candles[1].time as Time);
        if (c0 !== null && c1 !== null) {
          const spacing = Math.max(1, c1 - c0);
          return c0 + globalIdx * spacing;
        }
      }
      return null;
    }


    // ── Branch 2/3: timestamp (ms or s) ──────────────────────────────────
    // Pine's `time` built-in is milliseconds; Lightweight Charts uses seconds.
    const ts = raw > 1e12 ? Math.round(raw / 1000) : Math.round(raw);
    const coord = chart.timeScale().timeToCoordinate(ts as Time);
    if (coord !== null) return coord;

    // Fuzzy snap: find the nearest candle by timestamp distance.
    if (candles.length === 0) return null;
    let best = candles[0];
    let bestDist = Math.abs(best.time - ts);
    for (let i = 1; i < candles.length; i++) {
      const dist = Math.abs(candles[i].time - ts);
      if (dist < bestDist) { best = candles[i]; bestDist = dist; }
      if (dist > bestDist) break; // candles are sorted ascending; stop early
    }
    return chart.timeScale().timeToCoordinate(best.time as Time);
  };

  const y = (value: unknown) => series.priceToCoordinate(number(value));

  return (
    <>
      <svg ref={svgRef} aria-hidden="true" className="absolute inset-0 z-[6] h-full w-full pointer-events-none overflow-visible" viewBox={`0 0 ${width || 1} ${height || 1}`} preserveAspectRatio="none" data-revision={revision}>
        {drawings.handles.map((drawing) => {
          const bOff = drawing.barIndexOffset ?? 0;

          if (drawing.kind === "line") {
            const [x1v, y1v, x2v, y2v, , extend, color, style, lineWidth] = drawing.args;
            const x1 = x(x1v, bOff), y1 = y(y1v), rawX2 = x(x2v, bOff), y2 = y(y2v);
            if (x1 === null || y1 === null || y2 === null) return null;
            const x2 = extend === "right" || extend === "both" ? width : rawX2;
            if (x2 === null) return null;
            return <line key={drawing.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={typeof color === "string" ? color : "#38bdf8"} strokeWidth={number(lineWidth) || 1} strokeDasharray={style === "dashed" ? "7 5" : style === "dotted" ? "2 4" : undefined} />;
          }
          if (drawing.kind === "box") {
            const [left, top, right, bottom, borderColor, borderWidth, , extend, background, textArg, , textColorArg] = drawing.args;
            const rawX1 = x(left, bOff), rawX2 = x(right, bOff), y1 = y(top), y2 = y(bottom);
            if (y1 === null || y2 === null) return null;

            const isExtendRight = extend === "right" || extend === "both" || String(extend).includes("right");
            const isExtendLeft  = extend === "left"  || extend === "both" || String(extend).includes("left");

            const x1 = isExtendLeft ? 0 : (rawX1 !== null ? rawX1 : 0);
            const x2 = isExtendRight ? width : (rawX2 !== null ? rawX2 : (rawX1 !== null ? rawX1 + 100 : width));

            const minX = Math.min(x1, x2);
            const maxX = Math.max(x1, x2);
            const minY = Math.min(y1, y2);
            const maxY = Math.max(y1, y2);
            const boxW = Math.max(1, maxX - minX);
            const boxH = Math.max(1, maxY - minY);

            const boxText = drawing.text || (typeof textArg === "string" ? textArg : undefined);
            const boxTextColor = drawing.textColor || (typeof textColorArg === "string" ? textColorArg : undefined) || (typeof borderColor === "string" ? borderColor : "#38bdf8");

            const textX = Math.max(10, minX + 12);
            const textY = minY + 14;

            return (
              <g key={drawing.id}>
                <rect
                  x={minX}
                  y={minY}
                  width={boxW}
                  height={boxH}
                  fill={typeof background === "string" ? background : "rgba(56,189,248,.12)"}
                  stroke={typeof borderColor === "string" ? borderColor : "#38bdf8"}
                  strokeWidth={number(borderWidth) || 1}
                />
                {boxText ? (
                  <text
                    x={textX}
                    y={textY}
                    fontSize="10"
                    fontWeight="700"
                    fill={boxTextColor}
                  >
                    {boxText}
                  </text>
                ) : null}
              </g>
            );
          }
          if (drawing.kind === "label") {
            // args from label.new: [x, y, text, ?, ?, color, style, textcolor, size]
            const [xv, yv, rawText, , , color, style, textColor] = drawing.args;
            const px = x(xv, bOff), py = y(yv);
            if (px === null || py === null) return null;
            // Pine label.style_label_down = label ABOVE bar pointing DOWN (SELL arrow)
            // Pine label.style_label_up   = label BELOW bar pointing UP   (BUY  arrow)
            const styleStr = String(style ?? "");
            const isAboveBar = styleStr.includes("down") || styleStr.includes("label_down");
            const stackOffset = (drawing.stack || 0) * 19 * (isAboveBar ? -1 : 1);
            const labelText = formatDisplayText(rawText);
            const labelWidth = Math.max(60, Math.min(220, labelText.length * 6.4 + 18));
            const bgColor = typeof color === "string" && color ? color : (isAboveBar ? "#f23645" : "#089981");
            const fgColor = typeof textColor === "string" && textColor ? textColor : "#ffffff";
            return <g key={drawing.id} transform={`translate(${px},${py + (isAboveBar ? -12 : 12) + stackOffset})`}>
              <rect x={-labelWidth / 2} y={isAboveBar ? "-18" : "2"} width={labelWidth} height="16" rx="3" fill={bgColor} />
              <text textAnchor="middle" y={isAboveBar ? "-6" : "14"} fontSize="10" fontWeight="700" fill={fgColor}>{labelText}</text>
            </g>;
          }
          if (drawing.kind === "shape") {
            // args: [barIndex, styleEnum, locationEnum, color, text]
            const [barIdxRaw, styleEnum, locationEnum, shapeColor, shapeText] = drawing.args;
            const px = x(barIdxRaw, bOff);
            if (px === null) return null;

            // Determine if this signal is above or below the candle.
            const loc = String(locationEnum ?? "");
            const above = loc.includes("abovebar") || loc.includes("top");
            const below = loc.includes("belowbar") || loc.includes("bottom") || (!above);

            // Map Pine style strings to arrow glyphs.
            const style = String(styleEnum ?? "");
            const isUp = style.includes("up") || style.includes("triangleup") || style.includes("arrowup") || style.includes("circle");
            const glyph = isUp ? "▲" : "▼";
            const pillColor = typeof shapeColor === "string" && shapeColor
              ? shapeColor
              : isUp ? "#089981" : "#f23645";
            const labelRaw = String(shapeText ?? (isUp ? "BUY" : "SELL"));
            const label = labelRaw || (isUp ? "BUY" : "SELL");
            const pillW = Math.max(36, Math.min(120, label.length * 6.4 + 20));

            // y-position: use the actual candle high/low at this bar so the
            // signal sits on the candle (like TradingView) rather than at a
            // fixed screen fraction. Fall back to height-fraction only when
            // the candle is unavailable (e.g. bar off the loaded range).
            const globalBarIdx = Math.trunc(number(barIdxRaw)) + bOff;
            const shapeCandle = candles[globalBarIdx];
            let pyEstimate: number;
            if (shapeCandle) {
              const priceHint = above ? shapeCandle.high : shapeCandle.low;
              const coord = series.priceToCoordinate(priceHint);
              pyEstimate = coord !== null ? coord : (below && !above ? height * 0.75 : height * 0.25);
            } else {
              pyEstimate = below && !above ? height * 0.75 : height * 0.25;
            }

            const ty = above || !below ? pyEstimate - 20 : pyEstimate + 4;

            return (
              <g key={drawing.id} transform={`translate(${px},${ty})`}>
                <polygon
                  points={isUp ? "0,-8 5,0 -5,0" : "0,8 5,0 -5,0"}
                  fill={pillColor}
                  opacity="0.9"
                />
                <rect x={-pillW / 2} y={isUp ? "-22" : "8"} width={pillW} height="14" rx="3" fill={pillColor} opacity="0.9" />
                <text textAnchor="middle" y={isUp ? "-12" : "18"} fontSize="9" fontWeight="700" fill="#ffffff">{`${glyph} ${label}`}</text>
              </g>
            );
          }
          return null;
        })}
      </svg>
      {drawings.tables.map((table) => <PineTableCard key={table.id} table={table} />)}
    </>
  );
}
