"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import type { CandleData } from "./types";
import type { PineVisualEvent } from "@/lib/pineJsLightweightAdapter";

type Handle = { id: string; kind: "line" | "box" | "label"; args: unknown[]; text?: string; textColor?: string; stack?: number };
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
      handles.set(id, { id, kind: event.call.split(".")[0] as Handle["kind"], args: [...args] });
    } else if (event.call.endsWith(".delete")) {
      handles.delete(id);
    } else if (event.call === "line.set_xy1" || event.call === "line.set_xy2") {
      const handle = handles.get(id); if (handle) { const offset = event.call.endsWith("xy1") ? 0 : 2; handle.args[offset] = args[1]; handle.args[offset + 1] = args[2]; }
    } else if (event.call === "line.set_color") { const handle = handles.get(id); if (handle) handle.args[6] = args[1]; }
    else if (event.call === "box.set_left" || event.call === "box.set_right" || event.call === "box.set_top" || event.call === "box.set_bottom") {
      const handle = handles.get(id); const index = event.call.endsWith("left") ? 0 : event.call.endsWith("top") ? 1 : event.call.endsWith("right") ? 2 : 3; if (handle) handle.args[index] = args[1];
    } else if (event.call === "box.set_bgcolor") { const handle = handles.get(id); if (handle) handle.args[9] = args[1]; }
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
    else if (event.call === "label.set_text") { const handle = handles.get(id); if (handle) handle.args[2] = args[1]; }
    else if (event.call === "table.new") tables.set(id, { id, position: String(args[0] || "middle_right"), columns: Math.max(1, number(args[1]) || 1), rows: Math.max(1, number(args[2]) || 1), cells: new Map() });
    else if (event.call === "table.cell") {
      // The transpiler preserves the Pine signature here: table_id, column,
      // row, text, width, height, text_color, …, bgcolor. The table id is
      // already represented by pineHandleId, so it must not be mistaken for
      // the column number.
      const table = tables.get(id);
      if (table) {
        // The standalone and factory paths differ: one includes table_id as
        // args[0], the other has already associated it with pineHandleId.
        const offset = typeof args[0] === "number" ? 0 : 1;
        const textColor = args[offset + 5];
        const background = args[offset + 9];
        table.cells.set(`${args[offset]}:${args[offset + 1]}`, {
          text: formatDisplayText(args[offset + 2]),
          textColor: typeof textColor === "string" ? textColor : undefined,
          bgcolor: typeof background === "string" ? background : undefined,
        });
      }
    }
  }
  // Pine code can create a drawing on every historical bar. A trading chart
  // remains useful only when its overlay is bounded, so keep the newest active
  // objects of each type. This is also a safety guard for third-party scripts.
  const active = [...handles.values()];
  const boxes = active.filter((handle) => handle.kind === "box").slice(-8);
  const lines = active.filter((handle) => handle.kind === "line").slice(-24);
  // A candle gets one final signal label. Scripts can report several pattern
  // checks on a single bar, but separate markers there are unreadable.
  const uniqueLabels = new Map<string, Handle>();
  active.filter((handle) => handle.kind === "label").forEach((handle) => {
    uniqueLabels.set(String(handle.args[0]), handle);
  });
  const labels = [...uniqueLabels.values()].sort((a, b) => number(a.args[0]) - number(b.args[0])).slice(-30);
  let previousBar = Number.NaN;
  let stack = 0;
  labels.forEach((label) => {
    const bar = number(label.args[0]);
    stack = Number.isFinite(previousBar) && bar - previousBar <= 3 ? stack + 1 : 0;
    label.stack = stack;
    previousBar = bar;
  });
  return { handles: [...boxes, ...lines, ...labels], tables: [...tables.values()].filter((table) => table.cells.size > 0).slice(-1) };
}

interface Props {
  events: PineVisualEvent[];
  candles: CandleData[];
  chartRef: React.RefObject<IChartApi | null>;
  candleSeriesRef: React.RefObject<ISeriesApi<any> | null>;
}

function tableMinimumSize(table: Table): TableMinimum {
  const columnWidths = Array.from({ length: table.columns }, (_, column) => {
    const longest = Math.max(...Array.from({ length: table.rows }, (_, row) => table.cells.get(`${column}:${row}`)?.text?.length || 0), 3);
    // This is intentionally slightly generous: it is a hard no-clipping
    // minimum, not merely a visual preference.
    return Math.max(86, Math.min(320, longest * 7.5 + 32));
  });
  return { width: columnWidths.reduce((sum, value) => sum + value, 0), height: Math.max(62, 16 + table.rows * 23), columns: columnWidths };
}

function PineTableCard({ table }: { table: Table }) {
  const min = useMemo(() => tableMinimumSize(table), [table]);
  const storageKey = `smartflow:pinetable:${table.id}`;
  const cardRef = useRef<HTMLDivElement>(null);
  const hasSavedLayoutRef = useRef(false);
  const hasPlacedInitialLayoutRef = useRef(false);
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

  const clampToChart = (candidate: TableLayout) => {
    const parent = cardRef.current?.parentElement?.getBoundingClientRect();
    if (!parent) return candidate;
    return {
      ...candidate,
      x: Math.max(0, Math.min(candidate.x, Math.max(0, parent.width - candidate.width))),
      y: Math.max(0, Math.min(candidate.y, Math.max(0, parent.height - candidate.height))),
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
    try { window.localStorage.setItem(storageKey, JSON.stringify(layout)); } catch { /* Storage is optional. */ }
  }, [layout, storageKey]);

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

  const fontSize = Math.max(9, Math.min(14, 10 * Math.min(layout.width / min.width, layout.height / min.height)));
  return <div
    ref={cardRef}
    className="absolute z-[7] select-none rounded border border-cyan-400/50 bg-[#070a10]/95 shadow-xl"
    style={{ left: layout.x, top: layout.y, width: layout.width, minWidth: min.width, minHeight: min.height }}
    onPointerMove={move}
    onPointerUp={() => { dragRef.current = null; }}
    onPointerCancel={() => { dragRef.current = null; }}
  >
    <div className="flex h-4 cursor-move items-center justify-center border-b border-cyan-400/30 text-[8px] tracking-[0.2em] text-cyan-300/70" onPointerDown={(event) => begin(event, "move")}>DRAG</div>
    <div style={{ display: "grid", minHeight: layout.height - 16, gridTemplateColumns: min.columns.map((column) => `minmax(${column}px, 1fr)`).join(" "), gridAutoRows: "minmax(23px, 1fr)", fontSize }}>
      {Array.from({ length: table.columns * table.rows }, (_, index) => {
        const cell = table.cells.get(`${index % table.columns}:${Math.floor(index / table.columns)}`);
        return <div key={index} className="min-w-0 border border-slate-700/50 px-2 py-1 whitespace-nowrap" style={{ color: cell?.textColor || "#d1d4dc", background: cell?.bgcolor, lineHeight: 1.25 }}>{cell?.text || ""}</div>;
      })}
    </div>
    <div aria-label="Resize dashboard" title="Drag to resize" className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize border-l border-t border-cyan-400/60 bg-cyan-400/20" onPointerDown={(event) => begin(event, "resize")} />
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
  const x = (value: unknown) => {
    const raw = number(value);
    const time = raw >= 0 && raw < candles.length ? candles[Math.trunc(raw)]?.time : raw;
    return Number(time) ? chart.timeScale().timeToCoordinate(time as Time) : null;
  };
  const y = (value: unknown) => series.priceToCoordinate(number(value));

  return (
    <>
      <svg ref={svgRef} aria-hidden="true" className="absolute inset-0 z-[6] h-full w-full pointer-events-none overflow-visible" viewBox={`0 0 ${width || 1} ${height || 1}`} preserveAspectRatio="none" data-revision={revision}>
        {drawings.handles.map((drawing) => {
          if (drawing.kind === "line") {
            const [x1v, y1v, x2v, y2v, , extend, color, style, lineWidth] = drawing.args;
            const x1 = x(x1v), y1 = y(y1v), rawX2 = x(x2v), y2 = y(y2v);
            if (x1 === null || y1 === null || y2 === null) return null;
            const x2 = extend === "right" || extend === "both" ? width : rawX2;
            if (x2 === null) return null;
            return <line key={drawing.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={typeof color === "string" ? color : "#38bdf8"} strokeWidth={number(lineWidth) || 1} strokeDasharray={style === "dashed" ? "7 5" : style === "dotted" ? "2 4" : undefined} />;
          }
          if (drawing.kind === "box") {
            const [left, top, right, bottom, borderColor, borderWidth, , extend, , background] = drawing.args;
            const rawX1 = x(left), rawX2 = x(right), y1 = y(top), y2 = y(bottom);
            const x1 = extend === "both" ? 0 : rawX1;
            const x2 = extend === "right" || extend === "both" ? width : rawX2;
            if (x1 === null || x2 === null || y1 === null || y2 === null) return null;
            const textX = width - 8;
            const textY = Math.min(y1, y2) + 11;
            return <g key={drawing.id}><rect x={Math.min(x1, x2)} y={Math.min(y1, y2)} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)} fill={typeof background === "string" ? background : "rgba(56,189,248,.12)"} stroke={typeof borderColor === "string" ? borderColor : "#38bdf8"} strokeWidth={number(borderWidth) || 1} />{drawing.text ? <text x={textX} y={textY} textAnchor="end" fontSize="10" fontWeight="700" fill={drawing.textColor || (typeof borderColor === "string" ? borderColor : "#38bdf8")}>{drawing.text}</text> : null}</g>;
          }
          if (drawing.kind === "label") {
            const [xv, yv, text, , , color, style, textColor] = drawing.args;
            const px = x(xv), py = y(yv);
            if (px === null || py === null) return null;
            const above = String(style).includes("down");
            const stackOffset = (drawing.stack || 0) * 19 * (above ? -1 : 1);
            const labelText = formatDisplayText(text);
            const labelWidth = Math.max(60, Math.min(220, labelText.length * 6.4 + 18));
            return <g key={drawing.id} transform={`translate(${px},${py + (above ? -10 : 10) + stackOffset})`}><rect x={-labelWidth / 2} y={above ? "-18" : "2"} width={labelWidth} height="16" rx="3" fill={typeof color === "string" ? color : "#089981"} /><text textAnchor="middle" y={above ? "-6" : "14"} fontSize="10" fontWeight="700" fill="#f8fafc">{labelText}</text></g>;
          }
          return null;
        })}
      </svg>
      {drawings.tables.map((table) => <PineTableCard key={table.id} table={table} />)}
    </>
  );
}
