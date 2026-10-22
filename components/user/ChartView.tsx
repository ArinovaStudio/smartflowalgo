"use client";

import { Sparkles } from "lucide-react";
import { usePortal } from "./PortalContext";
import TradingViewWidget from "./TradingViewWidget";

export default function ChartView() {
    const { indicators, selectedIndicatorIds, toggleIndicatorSelection, clearIndicatorSelection, theme } = usePortal();
    const activeIndicatorsList = indicators.filter((ind) => selectedIndicatorIds.includes(ind.id));

    return (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-col space-y-1.5 overflow-hidden">
            {indicators.length > 0 && (
                <div className="flex shrink-0 flex-col items-stretch justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/90 sm:flex-row sm:items-center">
                    <label className="flex min-w-0 flex-col gap-2 py-0.5 sm:w-full sm:flex-row sm:items-center sm:justify-between">
                        <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                            <Sparkles className="h-3.5 w-3.5 text-sky-500" /><span>Smartflow Live Terminal</span>
                        </span>
                        <select
                            aria-label="Select custom indicator"
                            value={selectedIndicatorIds[0] || ""}
                            onChange={(event) => {
                                const indicator = indicators.find((item) => item.id === event.target.value);
                                if (indicator) toggleIndicatorSelection(indicator.id, indicator.name);
                                else clearIndicatorSelection();
                            }}
                            className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none transition-colors focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 sm:max-w-[280px]"
                        >
                            <option value="">No indicator selected</option>
                            {indicators.map((ind) => <option key={ind.id} value={ind.id}>{ind.name}</option>)}
                        </select>
                    </label>
                    {/* <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-semibold text-emerald-400">
                            {selectedIndicatorIds.length === 1 ? "1 Active on Chart" : "No Active Indicator"}
                        </span>
                    </div> */}
                </div>
            )}
            <div className="h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden">
                <TradingViewWidget symbol="XAUUSD" interval="1m" theme={"light"} activeIndicators={activeIndicatorsList} />
            </div>
        </div>
    );
}