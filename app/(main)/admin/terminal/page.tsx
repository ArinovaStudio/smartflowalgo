"use client";

import React, { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import TradingViewWidget from "@/components/user/TradingViewWidget";

interface IndicatorVersion {
    id: string;
    version: string;
    script: string | null;
    createdAt?: string;
}

interface Indicator {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    symbol: string | null;
    market: string | null;
    timeframe: string | null;
    status: string;
    currentVersion: string | null;
    tradingViewId: string | null;
    tradingViewUrl: string | null;
    distributionType: string | null;
    versions: IndicatorVersion[];
    latestVersion?: IndicatorVersion | null;
}

interface AllIndicatorsResponse {
    success: boolean;
    data: Indicator[];
}

const Terminal = () => {
    const [indicators, setIndicators] = useState<Indicator[]>([]);
    const [selectedIndicatorIds, setSelectedIndicatorIds] = useState<string[]>([]);
    const [appliedToast, setAppliedToast] = useState<string | null>(null);
    const [theme, setTheme] = useState<"light" | "dark">("dark");


    const activeIndicatorsList = indicators
        .filter((ind) => selectedIndicatorIds.includes(ind.id))
        .map((ind) => {
            // Pick the latest version from versions array if latestVersion is not already populated
            const latest =
                ind.latestVersion ||
                (Array.isArray(ind.versions) && ind.versions.length > 0
                    ? [...ind.versions].sort(
                        (a: any, b: any) =>
                            new Date(b.createdAt || 0).getTime() -
                            new Date(a.createdAt || 0).getTime()
                    )[0]
                    : null);

            return {
                ...ind,
                latestVersion: latest,
            };
        });

    useEffect(() => {
        const getUserPlan = async () => {
            try {
                const res = await fetch("/api/admin/allindicators", {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store",
                });

                if (!res.ok) {
                    throw new Error("Failed to fetch indicators");
                }

                const data: AllIndicatorsResponse = await res.json();

                console.log(data);

                if (!data.success || !Array.isArray(data.data)) {
                    throw new Error("Invalid indicators response");
                }

                setIndicators(data.data);
            } catch (error) {
                console.error("Failed to load indicators:", error);
                setIndicators([]);
            }
        };

        getUserPlan();
    }, []);

    const toggleIndicatorSelection = (id: string, name?: string) => {
        setSelectedIndicatorIds((prev) => {
            const exists = prev.includes(id);

            const next = exists
                ? prev.filter((item) => item !== id)
                : [...prev, id];

            if (!exists && name) {
                setAppliedToast(`Added "${name}" to Live Chart!`);

                setTimeout(() => {
                    setAppliedToast(null);
                }, 2500);
            }

            return next;
        });
    };

    return (
        <div className="w-full h-full min-h-0 flex flex-col overflow-hidden bg-slate-950">

            {/* Custom Indicators */}
            <div className="flex-none px-2 pt-2">
                <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl border border-slate-800/80 bg-slate-900/90 shadow-sm">

                    <div className="flex items-center gap-2 min-w-0 overflow-x-auto py-0.5 scrollbar-none">

                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                            <span>Custom Indicators:</span>
                        </span>

                        {indicators.map((ind) => {
                            const isSelected = selectedIndicatorIds.includes(ind.id);

                            return (
                                <button
                                    key={ind.id}
                                    type="button"
                                    onClick={() =>
                                        toggleIndicatorSelection(
                                            ind.id,
                                            ind.name
                                        )
                                    }
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${isSelected
                                            ? "bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/30"
                                            : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200"
                                        }`}
                                >
                                    <div
                                        className={`h-3 w-3 rounded flex items-center justify-center border ${isSelected
                                                ? "bg-white text-sky-500 border-white"
                                                : "border-slate-500"
                                            }`}
                                    >
                                        {isSelected && (
                                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                                        )}
                                    </div>

                                    <span>{ind.name}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-semibold text-emerald-400 whitespace-nowrap">
                            {selectedIndicatorIds.length} Active on Chart
                        </span>
                    </div>
                </div>
            </div>

            {/* TradingView */}
            <div className="flex-1 min-h-0 w-full px-2 pt-2 pb-2 overflow-hidden">
                <div className="w-full h-full min-h-0 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900">
                    <div className="w-full h-[80vh] min-h-0">
                        <TradingViewWidget
                            symbol="XAUUSD"
                            interval="1m"
                            theme={theme}
                            activeIndicators={activeIndicatorsList}
                        />
                    </div>
                </div>
            </div>

            {/* Toast */}
            {appliedToast && (
                <div className="fixed bottom-5 right-5 z-50 rounded-lg bg-slate-900 border border-slate-700 px-4 py-2 text-sm text-white shadow-lg">
                    {appliedToast}
                </div>
            )}
        </div>
    );
};

export default Terminal;
