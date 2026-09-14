"use client";

import React from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { TIMEFRAMES } from "./constants";
import type { SymbolInfo, TickState, CandleData } from "./types";

interface SymbolAndTimeframeBarProps {
  symbol: string;
  timeframe: string;
  activeSymbolInfo: SymbolInfo;
  wsConnected: boolean;
  wsError: string | null;
  onOpenSymbolModal: () => void;
  onSelectTimeframe: (value: string) => void;
}

/** Top toolbar: symbol picker, timeframe pills, and the live/awaiting connection badge. */
export function SymbolAndTimeframeBar({
  symbol,
  timeframe,
  activeSymbolInfo,
  wsConnected,
  wsError,
  onOpenSymbolModal,
  onSelectTimeframe,
}: SymbolAndTimeframeBarProps) {
  const isLive = wsConnected && !wsError;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-200 dark:border-[#2a2e39] bg-slate-50/90 dark:bg-[#131722] shrink-0 z-30 relative select-none">
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <button
          type="button"
          onClick={onOpenSymbolModal}
          className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 dark:bg-[#1e222d] dark:hover:bg-[#2a2e39] border border-slate-200 dark:border-[#2a2e39] text-xs font-bold transition-all cursor-pointer shadow-xs"
        >
          {symbol ? (
            <>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#2962FF]/15 text-[#2962FF] border border-[#2962FF]/30">
                {activeSymbolInfo.category || "Forex"}
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white">{symbol}</span>
              <span className="text-slate-500 dark:text-[#787b86] font-normal hidden md:inline text-[11px]">{activeSymbolInfo.name}</span>
            </>
          ) : (
            <span className="text-amber-500 flex items-center gap-1.5 font-semibold text-xs animate-pulse">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Connecting MT5...
            </span>
          )}
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-[#2a2e39] mx-0.5 hidden sm:block" />

        <div className="flex items-center bg-slate-100 dark:bg-[#1e222d] rounded-lg p-0.5 border border-slate-200/80 dark:border-[#2a2e39]">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              type="button"
              onClick={() => onSelectTimeframe(tf.value)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                timeframe === tf.value ? "bg-[#2962FF] text-white shadow-xs" : "text-slate-600 dark:text-[#787b86] hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isLive ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Server Live</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>Awaiting Server</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface OhlcStripProps {
  symbol: string;
  activeSymbolInfo: SymbolInfo;
  hoveredCandle: CandleData | null;
  currentTick: TickState;
}

/** Thin real-time OHLC readout bar just under the top toolbar. */
export function OhlcStrip({ symbol, activeSymbolInfo, hoveredCandle, currentTick }: OhlcStripProps) {
  const digits = activeSymbolInfo.digits ?? 5;
  const fallbackPrice = currentTick.price.toFixed(digits);

  return (
    <div className="flex items-center gap-3 px-3 py-1 text-[11px] font-mono border-b border-slate-100 dark:border-[#2a2e39]/60 bg-white/40 dark:bg-[#131722]/90 overflow-x-auto shrink-0 select-none">
      {symbol ? (
        <>
          <span className="font-extrabold text-[#2962FF]">{symbol}</span>
          <span>
            O: <strong>{hoveredCandle ? hoveredCandle.open.toFixed(digits) : fallbackPrice}</strong>
          </span>
          <span>
            H: <strong className="text-[#089981]">{hoveredCandle ? hoveredCandle.high.toFixed(digits) : fallbackPrice}</strong>
          </span>
          <span>
            L: <strong className="text-[#f23645]">{hoveredCandle ? hoveredCandle.low.toFixed(digits) : fallbackPrice}</strong>
          </span>
          <span>
            C: <strong>{hoveredCandle ? hoveredCandle.close.toFixed(digits) : fallbackPrice}</strong>
          </span>
          <span className={currentTick.change >= 0 ? "text-[#089981] font-bold" : "text-[#f23645] font-bold"}>
            {currentTick.change >= 0 ? "+" : ""}
            {currentTick.change.toFixed(digits)} ({currentTick.changePercent.toFixed(2)}%)
          </span>
          {activeSymbolInfo.spread !== undefined && <span className="text-slate-400 text-[10px]">Spread: {String(activeSymbolInfo.spread)}</span>}
        </>
      ) : (
        <span className="text-slate-400 italic">Streaming tick feed...</span>
      )}
    </div>
  );
}
