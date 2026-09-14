"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import type { CandleData } from "./types";
import type { PineVisualEvent } from "@/lib/pineJsLightweightAdapter";

type Handle = { id: string; kind: "line" | "box" | "label"; args: unknown[]; text?: string; textColor?: string };
type TableCell = { text?: string; textColor?: string; bgcolor?: string };
type Table = { id: string; position?: string; columns: number; rows: number; cells: Map<string, TableCell> };

// Pine assigns handle IDs independently for box, line, label, and table.
// A box #1 and a label #1 are different objects; include the namespace so a
// label update/delete cannot overwrite a zone box with the same numeric id.
function key(event: PineVisualEvent) {
  const namespace = event.call.split(".")[0] || "drawing";
  return `${event.indicatorId || "script"}:${namespace}:${event.pineHandleId || "new"}`;
}
function number(value: unknown) { const result = Number(value); return Number.isFinite(result) ? result : Number.NaN; }

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
          text: String(args[offset + 2] ?? ""),
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
  const labels = active.filter((handle) => handle.kind === "label").slice(-30);
  return { handles: [...boxes, ...lines, ...labels], tables: [...tables.values()].filter((table) => table.cells.size > 0).slice(-1) };
}

interface Props {
  events: PineVisualEvent[];
  candles: CandleData[];
  chartRef: React.RefObject<IChartApi | null>;
  candleSeriesRef: React.RefObject<ISeriesApi<any> | null>;
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
            return <g key={drawing.id} transform={`translate(${px},${py + (above ? -10 : 10)})`}><rect x="-30" y={above ? "-18" : "2"} width="60" height="16" rx="3" fill={typeof color === "string" ? color : "#089981"} /><text textAnchor="middle" y={above ? "-6" : "14"} fontSize="10" fontWeight="700" fill={typeof textColor === "string" ? textColor : "#fff"}>{String(text || "")}</text></g>;
          }
          return null;
        })}
      </svg>
      {drawings.tables.map((table) => {
        const position = String(table.position || "middle_right").replace("position.", "");
        const location = position.includes("left") ? "left-3" : "right-3";
        const vertical = position.includes("top") ? "top-3" : position.includes("bottom") ? "bottom-3" : "top-1/2 -translate-y-1/2";
        return <div key={table.id} className={`absolute ${location} ${vertical} z-[7] overflow-hidden rounded border border-cyan-400/40 bg-[#070a10]/90 text-[10px] shadow-xl pointer-events-none`} style={{ display: "grid", gridTemplateColumns: `repeat(${table.columns}, auto)` }}>{Array.from({ length: table.columns * table.rows }, (_, index) => { const cell = table.cells.get(`${index % table.columns}:${Math.floor(index / table.columns)}`); return <div key={index} className="border border-slate-700/50 px-2 py-1 whitespace-nowrap" style={{ color: cell?.textColor || "#d1d4dc", background: cell?.bgcolor }}>{cell?.text || ""}</div>; })}</div>;
      })}
    </>
  );
}
