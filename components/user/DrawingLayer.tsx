"use client";

import React from "react";
import type { DrawingItem } from "./types";

interface RenderCtx {
  drawing: DrawingItem;
  isSelected: boolean;
  isDark: boolean;
  onClick: (e: React.MouseEvent) => void;
}

/** Standard Fibonacci retracement ratios, colors, and labels. */
const FIB_LEVELS = [
  { ratio: 0.0, color: "#787b86", label: "0.0%" },
  { ratio: 0.236, color: "#38bdf8", label: "23.6%" },
  { ratio: 0.382, color: "#ab47bc", label: "38.2%" },
  { ratio: 0.5, color: "#089981", label: "50.0% (EQ)" },
  { ratio: 0.618, color: "#ff9800", label: "61.8% (Golden)" },
  { ratio: 0.786, color: "#ec4899", label: "78.6%" },
  { ratio: 1.0, color: "#f23645", label: "100.0%" },
];

/** Premium / Discount (SMC) zone levels — reuses the fib renderer's layout. */
const PREMIUM_DISCOUNT_LEVELS = [
  { ratio: 0.0, color: "#f23645", label: "Premium (100%)" },
  { ratio: 0.5, color: "#ab47bc", label: "50% Equilibrium (EQ)" },
  { ratio: 1.0, color: "#089981", label: "Discount (0%)" },
];

const ICON_GLYPHS: Record<string, string> = {
  icon_star: "⭐",
  icon_target: "🎯",
  icon_shield: "🛡️",
  icon_check: "✅",
  icon_dollar: "💵",
  icon_flag: "🚩",
  icon_fire: "🔥",
  icon_zap: "⚡",
  icon_award: "🏆",
};

function renderFvg({ drawing: d, isSelected, onClick }: RenderCtx) {
  const x = Math.min(d.startX, d.endX);
  const y = Math.min(d.startY, d.endY);
  const w = Math.max(Math.abs(d.endX - d.startX), 80);
  const h = Math.max(Math.abs(d.endY - d.startY), 18);
  const isBull = d.type === "fvg_bull";
  const color = isBull ? "#089981" : "#f23645";

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={isBull ? "rgba(8, 153, 129, 0.2)" : "rgba(242, 54, 69, 0.2)"}
        stroke={color}
        strokeWidth={isSelected ? "2.5" : "1.5"}
        strokeDasharray={isSelected ? "4 2" : undefined}
      />
      <rect x={x + 4} y={y + 3} width={76} height={13} rx={2.5} fill={color} />
      <text x={x + 7} y={y + 12} fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
        {isBull ? "+FVG Demand" : "-FVG Supply"}
      </text>
      {isSelected && <circle cx={x + w} cy={y + h / 2} r="4" fill="#fff" stroke={color} strokeWidth="1.5" />}
    </g>
  );
}

function renderOrderBlock({ drawing: d, isSelected, onClick }: RenderCtx) {
  const x = Math.min(d.startX, d.endX);
  const y = Math.min(d.startY, d.endY);
  const w = Math.max(Math.abs(d.endX - d.startX), 90);
  const h = Math.max(Math.abs(d.endY - d.startY), 22);
  const isBull = d.type.includes("bull");
  const color = isBull ? "#089981" : d.type === "breaker_block" ? "#ab47bc" : "#f23645";
  const label = d.type === "breaker_block" ? "Breaker Block" : isBull ? "+OB Institutional" : "-OB Institutional";

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <rect x={x} y={y} width={w} height={h} fill={`${color}22`} stroke={color} strokeWidth={isSelected ? "2.5" : "1.5"} rx={3} />
      <rect x={x + 4} y={y + 3} width={88} height={14} rx={2.5} fill={color} />
      <text x={x + 7} y={y + 13} fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
        {label}
      </text>
    </g>
  );
}

function renderStructureBreak({ drawing: d, isSelected, onClick }: RenderCtx) {
  const strokeColor = d.color || "#2962FF";
  const midX = (d.startX + d.endX) / 2;

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <line
        x1={d.startX}
        y1={d.startY}
        x2={d.endX}
        y2={d.startY}
        stroke={strokeColor}
        strokeWidth={isSelected ? "3" : "2"}
        strokeDasharray="4 2"
      />
      <rect x={midX - 28} y={d.startY - 16} width="56" height="15" rx="3" fill={strokeColor} />
      <text x={midX} y={d.startY - 5} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
        {d.label || d.type.toUpperCase()}
      </text>
    </g>
  );
}

function renderTrendline({ drawing: d, isSelected, onClick }: RenderCtx) {
  const strokeColor = d.color || "#2962FF";
  const dx = d.endX - d.startX;
  const dy = d.endY - d.startY;
  const angle = (Math.atan2(dy, dx) * (180 / Math.PI)).toFixed(1);

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <line
        x1={d.startX}
        y1={d.startY}
        x2={d.endX}
        y2={d.endY}
        stroke={strokeColor}
        strokeWidth={isSelected ? "3.5" : "2"}
        strokeDasharray={isSelected ? "6 3" : undefined}
        strokeLinecap="round"
      />
      <circle cx={d.startX} cy={d.startY} r={isSelected ? 5 : 3.5} fill={strokeColor} stroke="#ffffff" strokeWidth="1.5" />
      <circle cx={d.endX} cy={d.endY} r={isSelected ? 5 : 3.5} fill={strokeColor} stroke="#ffffff" strokeWidth="1.5" />
      <text
        x={(d.startX + d.endX) / 2}
        y={(d.startY + d.endY) / 2 - 8}
        fill={strokeColor}
        fontSize="10"
        fontFamily="monospace"
        textAnchor="middle"
        className="font-bold"
      >
        {angle}° {d.type === "info_line" ? `(dx: ${Math.round(dx)})` : ""}
      </text>
    </g>
  );
}

function renderRayOrExtendedLine({ drawing: d, isSelected, onClick }: RenderCtx) {
  const strokeColor = d.color || "#2962FF";
  const dx = d.endX - d.startX;
  const dy = d.endY - d.startY;
  const len = Math.hypot(dx, dy) || 1;
  const extX = d.startX + (dx / len) * 4000;
  const extY = d.startY + (dy / len) * 4000;
  const backX = d.type === "extended_line" ? d.startX - (dx / len) * 4000 : d.startX;
  const backY = d.type === "extended_line" ? d.startY - (dy / len) * 4000 : d.startY;

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <line x1={backX} y1={backY} x2={extX} y2={extY} stroke={strokeColor} strokeWidth={isSelected ? "3" : "2"} strokeDasharray="6 3" />
      <circle cx={d.startX} cy={d.startY} r={isSelected ? 5 : 3.5} fill={strokeColor} stroke="#fff" />
      <circle cx={d.endX} cy={d.endY} r="3" fill={strokeColor} />
    </g>
  );
}

function renderHorizontalLine({ drawing: d, isSelected, onClick }: RenderCtx) {
  const strokeColor = d.color || "#2962FF";
  const xStart = d.type === "horizontal_ray" ? d.startX : 0;

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <line
        x1={xStart}
        y1={d.startY}
        x2={9999}
        y2={d.startY}
        stroke={strokeColor}
        strokeWidth={isSelected ? "3" : "2"}
        strokeDasharray={isSelected ? "8 4" : "4 4"}
      />
      <rect x={Math.max(xStart + 10, 10)} y={d.startY - 17} width="78" height="15" rx="3" fill={strokeColor} />
      <text x={Math.max(xStart + 14, 14)} y={d.startY - 6} fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
        {d.label || "KEY LEVEL"}
      </text>
      {isSelected && <circle cx={xStart + 10} cy={d.startY} r="5" fill="#fff" stroke={strokeColor} strokeWidth="2" />}
    </g>
  );
}

function renderVerticalLine({ drawing: d, isSelected, onClick }: RenderCtx) {
  const strokeColor = d.color || "#2962FF";

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <line x1={d.startX} y1={0} x2={d.startX} y2={9999} stroke={strokeColor} strokeWidth={isSelected ? "3" : "1.5"} strokeDasharray="4 4" />
      <rect x={d.startX - 22} y="10" width="44" height="15" rx="3" fill={strokeColor} />
      <text x={d.startX} y="21" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
        {d.label || "TIME"}
      </text>
    </g>
  );
}

function renderCrossLine({ drawing: d, isSelected, onClick }: RenderCtx) {
  const strokeColor = d.color || "#2962FF";

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <line x1={0} y1={d.startY} x2={9999} y2={d.startY} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1={d.startX} y1={0} x2={d.startX} y2={9999} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3 3" />
      <circle cx={d.startX} cy={d.startY} r={isSelected ? 6 : 4} fill={strokeColor} stroke="#fff" strokeWidth="2" />
    </g>
  );
}

function renderChannel({ drawing: d, isSelected, onClick }: RenderCtx) {
  const strokeColor = d.color || "#2962FF";
  const channelHeight = 45;

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <polygon
        points={`${d.startX},${d.startY} ${d.endX},${d.endY} ${d.endX},${d.endY + channelHeight} ${d.startX},${d.startY + channelHeight}`}
        fill={`${strokeColor}22`}
      />
      <line x1={d.startX} y1={d.startY} x2={d.endX} y2={d.endY} stroke={strokeColor} strokeWidth={isSelected ? "3" : "2"} />
      <line
        x1={d.startX}
        y1={d.startY + channelHeight}
        x2={d.endX}
        y2={d.endY + channelHeight}
        stroke={strokeColor}
        strokeWidth={isSelected ? "3" : "2"}
      />
      <line
        x1={d.startX}
        y1={d.startY + channelHeight / 2}
        x2={d.endX}
        y2={d.endY + channelHeight / 2}
        stroke={strokeColor}
        strokeWidth="1"
        strokeDasharray="4 4"
      />
    </g>
  );
}

function renderFibonacci({ drawing: d, isSelected, onClick }: RenderCtx) {
  const minY = Math.min(d.startY, d.endY);
  const maxY = Math.max(d.startY, d.endY);
  const diff = Math.max(maxY - minY, 30);
  const levels = d.type === "premium_discount" ? PREMIUM_DISCOUNT_LEVELS : FIB_LEVELS;

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      {levels.map((fib, idx) => {
        const y = minY + diff * fib.ratio;
        return (
          <g key={idx}>
            <line x1={0} y1={y} x2={9999} y2={y} stroke={fib.color} strokeWidth={isSelected ? "2" : "1.2"} strokeDasharray="3 3" />
            <rect x="60" y={y - 13} width="96" height="13" rx="2.5" fill={fib.color} fillOpacity="0.2" />
            <text x="64" y={y - 3} fill={fib.color} fontSize="9" fontWeight="bold" fontFamily="monospace">
              {fib.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function renderPitchfork({ drawing: d, onClick }: RenderCtx) {
  const strokeColor = d.color || "#2962FF";
  const midX = (d.startX + d.endX) / 2;
  const midY = (d.startY + d.endY) / 2;

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <line x1={d.startX} y1={d.startY} x2={midX + 250} y2={midY - 40} stroke={strokeColor} strokeWidth="2" />
      <line x1={d.startX} y1={d.startY - 30} x2={midX + 250} y2={midY - 70} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 2" />
      <line x1={d.startX} y1={d.startY + 30} x2={midX + 250} y2={midY - 10} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 2" />
      <text x={d.startX + 10} y={d.startY - 35} fill={strokeColor} fontSize="9" fontWeight="bold">
        Andrews Pitchfork
      </text>
    </g>
  );
}

function renderRectangle({ drawing: d, isSelected, onClick }: RenderCtx) {
  const strokeColor = d.color || "#2962FF";
  const x = Math.min(d.startX, d.endX);
  const y = Math.min(d.startY, d.endY);
  const w = Math.max(Math.abs(d.endX - d.startX), 30);
  const h = Math.max(Math.abs(d.endY - d.startY), 20);

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={`${strokeColor}18`}
        stroke={strokeColor}
        strokeWidth={isSelected ? "2.5" : "1.5"}
        strokeDasharray={isSelected ? "5 3" : undefined}
        rx="3"
      />
      <text x={x + 6} y={y + 13} fill={strokeColor} fontSize="9" fontWeight="bold" fontFamily="sans-serif">
        {d.label || (d.type === "rectangle" ? "Zone Block" : "Gann Box")}
      </text>
      {isSelected && <circle cx={x + w} cy={y + h} r="4" fill="#fff" stroke={strokeColor} strokeWidth="1.5" />}
    </g>
  );
}

function renderEllipse({ drawing: d, isSelected, onClick }: RenderCtx) {
  const strokeColor = d.color || "#2962FF";
  const cx = (d.startX + d.endX) / 2;
  const cy = (d.startY + d.endY) / 2;
  const rx = Math.max(Math.abs(d.endX - d.startX) / 2, 20);
  const ry = Math.max(Math.abs(d.endY - d.startY) / 2, 20);

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`${strokeColor}18`} stroke={strokeColor} strokeWidth={isSelected ? "2.5" : "1.5"} />
      {isSelected && <circle cx={cx + rx} cy={cy} r="4" fill="#fff" stroke={strokeColor} strokeWidth="1.5" />}
    </g>
  );
}

function renderTriangle({ drawing: d, isSelected, onClick }: RenderCtx) {
  const strokeColor = d.color || "#2962FF";
  const x1 = d.startX;
  const y1 = d.startY;
  const x2 = d.endX;
  const y2 = d.endY;
  const x3 = d.startX - (d.endX - d.startX);
  const y3 = d.endY;

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <polygon points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} fill={`${strokeColor}18`} stroke={strokeColor} strokeWidth={isSelected ? "2.5" : "1.5"} />
    </g>
  );
}

function renderFreehand({ drawing: d, isSelected, onClick }: RenderCtx) {
  if (!d.points || d.points.length === 0) return null;
  const strokeColor = d.color || "#2962FF";
  const pathData = d.points.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`, "");

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth={d.type === "highlighter" ? "12" : isSelected ? "3.5" : "2"}
        strokeOpacity={d.type === "highlighter" ? "0.35" : "1"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

function renderHeadAndShoulders({ drawing: d, onClick }: RenderCtx) {
  const strokeColor = d.color || "#2962FF";
  const w = Math.max(Math.abs(d.endX - d.startX), 140);
  const x0 = Math.min(d.startX, d.endX);
  const yBase = Math.max(d.startY, d.endY);
  const lsX = x0 + w * 0.2;
  const lsY = yBase - 40;
  const headX = x0 + w * 0.5;
  const headY = yBase - 80;
  const rsX = x0 + w * 0.8;
  const rsY = yBase - 40;

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <polyline
        points={`${x0},${yBase} ${lsX},${lsY} ${x0 + w * 0.35},${yBase} ${headX},${headY} ${x0 + w * 0.65},${yBase} ${rsX},${rsY} ${x0 + w},${yBase}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
      />
      <line x1={x0} y1={yBase} x2={x0 + w} y2={yBase} stroke={strokeColor} strokeWidth="2" strokeDasharray="4 2" />
      <text x={lsX} y={lsY - 8} fill={strokeColor} fontSize="9" fontWeight="bold" textAnchor="middle">LS</text>
      <text x={headX} y={headY - 8} fill={strokeColor} fontSize="9" fontWeight="bold" textAnchor="middle">HEAD</text>
      <text x={rsX} y={rsY - 8} fill={strokeColor} fontSize="9" fontWeight="bold" textAnchor="middle">RS</text>
      <text x={x0 + w / 2} y={yBase + 12} fill={strokeColor} fontSize="8" textAnchor="middle">Neckline</text>
    </g>
  );
}

function renderElliottWave({ drawing: d, onClick }: RenderCtx) {
  const strokeColor = d.color || "#2962FF";
  const w = Math.max(Math.abs(d.endX - d.startX), 140);
  const x0 = Math.min(d.startX, d.endX);
  const y0 = d.startY;

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <polyline
        points={`${x0},${y0} ${x0 + w * 0.2},${y0 - 50} ${x0 + w * 0.4},${y0 - 20} ${x0 + w * 0.7},${y0 - 80} ${x0 + w * 0.85},${y0 - 55} ${x0 + w},${y0 - 110}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
      />
      <text x={x0 + w * 0.2} y={y0 - 56} fill={strokeColor} fontSize="10" fontWeight="bold">(1)</text>
      <text x={x0 + w * 0.4} y={y0 - 10} fill={strokeColor} fontSize="10" fontWeight="bold">(2)</text>
      <text x={x0 + w * 0.7} y={y0 - 86} fill={strokeColor} fontSize="10" fontWeight="bold">(3)</text>
      <text x={x0 + w * 0.85} y={y0 - 45} fill={strokeColor} fontSize="10" fontWeight="bold">(4)</text>
      <text x={x0 + w} y={y0 - 116} fill={strokeColor} fontSize="10" fontWeight="bold">(5)</text>
    </g>
  );
}

function renderHarmonicPattern({ drawing: d, onClick }: RenderCtx) {
  const strokeColor = d.color || "#2962FF";
  const w = Math.max(Math.abs(d.endX - d.startX), 130);
  const x0 = Math.min(d.startX, d.endX);
  const y0 = d.startY;

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <polygon
        points={`${x0},${y0} ${x0 + w * 0.25},${y0 - 60} ${x0 + w * 0.5},${y0 - 20} ${x0 + w * 0.75},${y0 - 60} ${x0 + w},${y0}`}
        fill={`${strokeColor}18`}
        stroke={strokeColor}
        strokeWidth="2"
      />
      <text x={x0 + w * 0.5} y={y0 - 68} fill={strokeColor} fontSize="9" fontWeight="bold" textAnchor="middle">
        {d.name || "Harmonic Bat / Butterfly"}
      </text>
    </g>
  );
}

function renderLongPosition({ drawing: d, isSelected, onClick }: RenderCtx) {
  const entryY = d.startY;
  const tpY = Math.min(d.startY, d.endY);
  const slY = d.startY + Math.abs(d.startY - tpY) * 0.5;
  const leftX = Math.min(d.startX, d.endX);
  const width = Math.max(Math.abs(d.endX - d.startX), 130);

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <rect x={leftX} y={tpY} width={width} height={entryY - tpY} fill="rgba(8, 153, 129, 0.25)" stroke="#089981" strokeWidth={isSelected ? "2.5" : "1.5"} />
      <text x={leftX + 8} y={tpY + 15} fill="#089981" fontSize="9" fontWeight="bold" fontFamily="monospace">LONG TP +2.0R</text>
      <rect x={leftX} y={entryY} width={width} height={slY - entryY} fill="rgba(242, 54, 69, 0.25)" stroke="#f23645" strokeWidth={isSelected ? "2.5" : "1.5"} />
      <text x={leftX + 8} y={slY - 7} fill="#f23645" fontSize="9" fontWeight="bold" fontFamily="monospace">LONG SL -1.0R</text>
      <line x1={leftX} y1={entryY} x2={leftX + width} y2={entryY} stroke="#ffffff" strokeWidth="1.5" />
    </g>
  );
}

function renderShortPosition({ drawing: d, isSelected, onClick }: RenderCtx) {
  const entryY = d.startY;
  const slY = Math.min(d.startY, d.endY);
  const tpY = d.startY + Math.abs(d.startY - slY) * 2.0;
  const leftX = Math.min(d.startX, d.endX);
  const width = Math.max(Math.abs(d.endX - d.startX), 130);

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <rect x={leftX} y={slY} width={width} height={entryY - slY} fill="rgba(242, 54, 69, 0.25)" stroke="#f23645" strokeWidth={isSelected ? "2.5" : "1.5"} />
      <text x={leftX + 8} y={slY + 15} fill="#f23645" fontSize="9" fontWeight="bold" fontFamily="monospace">SHORT SL -1.0R</text>
      <rect x={leftX} y={entryY} width={width} height={tpY - entryY} fill="rgba(8, 153, 129, 0.25)" stroke="#089981" strokeWidth={isSelected ? "2.5" : "1.5"} />
      <text x={leftX + 8} y={tpY - 7} fill="#089981" fontSize="9" fontWeight="bold" fontFamily="monospace">SHORT TP +2.0R</text>
      <line x1={leftX} y1={entryY} x2={leftX + width} y2={entryY} stroke="#ffffff" strokeWidth="1.5" />
    </g>
  );
}

function renderMeasurement({ drawing: d, isSelected, onClick }: RenderCtx) {
  const x = Math.min(d.startX, d.endX);
  const y = Math.min(d.startY, d.endY);
  const w = Math.max(Math.abs(d.endX - d.startX), 80);
  const h = Math.max(Math.abs(d.endY - d.startY), 35);

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <rect x={x} y={y} width={w} height={h} fill="rgba(41, 98, 255, 0.15)" stroke="#2962FF" strokeWidth={isSelected ? "2" : "1.2"} strokeDasharray="4 2" />
      <rect x={x + 4} y={y + 4} width="92" height="16" rx="3" fill="#2962FF" />
      <text x={x + 8} y={y + 15} fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
        Δ {Math.round(h)} px | {Math.round(w / 12)} bars
      </text>
    </g>
  );
}

function renderTextAnnotation({ drawing: d, isSelected, isDark, onClick }: RenderCtx) {
  const strokeColor = d.color || "#2962FF";
  const width = Math.max((d.label?.length || 8) * 7.5 + 16, 75);

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <rect
        x={d.startX - 4}
        y={d.startY - 17}
        width={width}
        height="24"
        rx="4"
        fill={isDark ? "#1e222d" : "#f1f5f9"}
        stroke={strokeColor}
        strokeWidth={isSelected ? "2.5" : "1.5"}
        filter="drop-shadow(0 2px 5px rgba(0,0,0,0.25))"
      />
      <text x={d.startX + 4} y={d.startY - 1} fill={strokeColor} fontSize="10" fontWeight="bold" fontFamily="sans-serif">
        {d.label || "Analysis Note"}
      </text>
      {isSelected && <circle cx={d.startX - 4} cy={d.startY - 17} r="3.5" fill="#fff" stroke={strokeColor} strokeWidth="1.5" />}
    </g>
  );
}

function renderIconSticker({ drawing: d, isSelected, onClick }: RenderCtx) {
  const strokeColor = d.color || "#2962FF";
  const glyph = ICON_GLYPHS[d.type] || "📍";

  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer select-none">
      <text x={d.startX} y={d.startY} fontSize={isSelected ? "26" : "20"} textAnchor="middle">
        {glyph}
      </text>
      {isSelected && <circle cx={d.startX} cy={d.startY - 7} r="15" fill="none" stroke={strokeColor} strokeWidth="2" strokeDasharray="3 3" />}
    </g>
  );
}

function renderGenericFallback({ drawing: d, isSelected, onClick }: RenderCtx) {
  const strokeColor = d.color || "#2962FF";
  return (
    <g key={d.id} onClick={onClick} className="cursor-pointer">
      <line x1={d.startX} y1={d.startY} x2={d.endX} y2={d.endY} stroke={strokeColor} strokeWidth={isSelected ? "3" : "2"} />
    </g>
  );
}

/**
 * Dispatches a single drawing to the correct renderer based on its `type`.
 * This is the only place that needs to change when adding a brand-new tool.
 */
export function renderDrawing(ctx: RenderCtx): React.ReactElement | null {
  const { type } = ctx.drawing;

  if (type === "fvg_bull" || type === "fvg_bear") return renderFvg(ctx);

  if (type.includes("block") || type === "imbalance_void" || type === "liquidity_sweep") return renderOrderBlock(ctx);

  if (type === "choch" || type === "bos" || type === "eqh_eql") return renderStructureBreak(ctx);

  if (type === "trendline" || type === "info_line" || type === "trend_angle" || type === "regression_line") {
    return renderTrendline(ctx);
  }

  if (type === "ray" || type === "extended_line") return renderRayOrExtendedLine(ctx);

  if (type === "horizontal" || type === "horizontal_ray") return renderHorizontalLine(ctx);

  if (type === "vertical") return renderVerticalLine(ctx);

  if (type === "cross_line") return renderCrossLine(ctx);

  if (type === "channel" || type === "disjoint_channel" || type === "flat_top_bottom" || type === "regression_channel") {
    return renderChannel(ctx);
  }

  if (type.includes("fib") || type === "premium_discount") return renderFibonacci(ctx);

  if (type.includes("pitchfork")) return renderPitchfork(ctx);

  if (type === "rectangle" || type === "rotated_rectangle" || type === "gann_box" || type === "gann_square") {
    return renderRectangle(ctx);
  }

  if (type === "circle" || type === "ellipse" || type === "arc") return renderEllipse(ctx);

  if (type === "triangle" || type === "rising_wedge" || type === "falling_wedge") return renderTriangle(ctx);

  if (type === "brush" || type === "highlighter") return renderFreehand(ctx);

  if (type === "head_and_shoulders") return renderHeadAndShoulders(ctx);

  if (type.includes("wave")) return renderElliottWave(ctx);

  if (type.includes("pattern") || type === "double_top" || type === "double_bottom") return renderHarmonicPattern(ctx);

  if (type === "long_position") return renderLongPosition(ctx);

  if (type === "short_position") return renderShortPosition(ctx);

  if (type === "measure" || type === "date_and_price" || type === "price_range") return renderMeasurement(ctx);

  if (
    type === "text" ||
    type === "anchored_text" ||
    type === "note" ||
    type === "callout" ||
    type === "comment" ||
    type === "price_label"
  ) {
    return renderTextAnnotation(ctx);
  }

  if (type.startsWith("icon_")) return renderIconSticker(ctx);

  return renderGenericFallback(ctx);
}

interface DrawingLayerProps {
  drawings: DrawingItem[];
  currentDrawing: DrawingItem | null;
  activeTool: string;
  selectedDrawingId: string | null;
  isDark: boolean;
  onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseUp: () => void;
  onEraseDrawing: (id: string) => void;
  onSelectDrawing: (id: string) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

/**
 * The full-canvas SVG overlay that hosts every drawing. In cursor mode it
 * ignores pointer events (so the chart underneath can pan/zoom); individual
 * drawings opt back in to pointer events so they remain clickable/erasable.
 */
export function DrawingLayer({
  drawings,
  currentDrawing,
  activeTool,
  selectedDrawingId,
  isDark,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onEraseDrawing,
  onSelectDrawing,
  svgRef,
}: DrawingLayerProps) {
  const isCursorMode = activeTool === "cursor";
  const isEraserMode = activeTool === "eraser";

  const allDrawings = currentDrawing ? [...drawings, currentDrawing] : drawings;

  return (
    <svg
      ref={svgRef}
      className={`absolute inset-0 z-10 w-full h-full ${
        isCursorMode ? "pointer-events-none" : isEraserMode ? "pointer-events-auto cursor-pointer" : "pointer-events-auto cursor-crosshair"
      }`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      <g style={{ pointerEvents: isCursorMode || isEraserMode ? "auto" : "none" }}>
        {allDrawings.map((drawing) => {
          const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (isEraserMode) {
              onEraseDrawing(drawing.id);
            } else if (isCursorMode) {
              onSelectDrawing(drawing.id);
            }
          };

          return renderDrawing({
            drawing,
            isSelected: selectedDrawingId === drawing.id,
            isDark,
            onClick: handleClick,
          });
        })}
      </g>
    </svg>
  );
}
