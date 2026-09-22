"use client";

import { Sparkles } from "lucide-react";
import { usePortal } from "./PortalContext";
import TradingViewWidget from "./TradingViewWidget";

export default function ChartView() {
    const { indicators, selectedIndicatorIds, toggleIndicatorSelection, clearIndicatorSelection, theme } = usePortal();
    const activeIndicatorsList = indicators.filter((ind) => selectedIndicatorIds.includes(ind.id));

    return (
        <div className="flex flex-col h-full w-full min-h-0 space-y-1.5 overflow-hidden">
            {indicators.length > 0 && (
                <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-sm shrink-0">
                    <label className="flex min-w-0 items-center gap-2 py-0.5">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-sky-500" /><span>Custom Indicators:</span>
                        </span>
                        <select
                            aria-label="Select custom indicator"
                            value={selectedIndicatorIds[0] || ""}
                            onChange={(event) => {
                                const indicator = indicators.find((item) => item.id === event.target.value);
                                if (indicator) toggleIndicatorSelection(indicator.id, indicator.name);
                                else clearIndicatorSelection();
                            }}
                            className="min-w-0 max-w-[280px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none transition-colors focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                            <option value="">No indicator selected</option>
                            {indicators.map((ind) => <option key={ind.id} value={ind.id}>{ind.name}</option>)}
                        </select>
                    </label>
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-semibold text-emerald-400">
                            {selectedIndicatorIds.length === 1 ? "1 Active on Chart" : "No Active Indicator"}
                        </span>
                    </div>
                </div>
            )}
            <div className="flex-1 w-full h-full min-h-0 overflow-hidden">
                <TradingViewWidget symbol="XAUUSD" interval="1m" theme={theme} activeIndicators={activeIndicatorsList} />
            </div>
        </div>
    );
}