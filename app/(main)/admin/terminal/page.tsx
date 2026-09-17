"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, LineChart, Play, Sparkles } from "lucide-react";
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
    const [activeView, setActiveView] = useState<"grid" | "chart">("grid");
    const [appliedToast, setAppliedToast] = useState<string | null>(null);
    const [theme] = useState<"light" | "dark">("dark");
    const [loading, setLoading] = useState<boolean>(true);

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

    const selectedIndicator =
        indicators.find((ind) => selectedIndicatorIds.includes(ind.id)) || null;

    useEffect(() => {
        const getIndicators = async () => {
            try {
                setLoading(true);
                const res = await fetch("/api/admin/allindicators", {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store",
                });

                if (!res.ok) {
                    throw new Error("Failed to fetch indicators");
                }

                const data: AllIndicatorsResponse = await res.json();

                if (!data.success || !Array.isArray(data.data)) {
                    throw new Error("Invalid indicators response");
                }

                setIndicators(data.data);
            } catch (error) {
                console.error("Failed to load indicators:", error);
                setIndicators([]);
            } finally {
                setLoading(false);
            }
        };

        getIndicators();
    }, []);

    const handleLaunchChart = (ind: Indicator) => {
        setSelectedIndicatorIds([ind.id]);
        setActiveView("chart");
        setAppliedToast(`Loaded "${ind.name}" on Live Chart!`);
        setTimeout(() => {
            setAppliedToast(null);
        }, 2500);
    };

    const handleBackToIndicators = () => {
        setActiveView("grid");
    };

    const chartSymbol =
        selectedIndicator?.symbol && selectedIndicator.symbol.trim() !== ""
            ? selectedIndicator.symbol.trim()
            : "EURUSD";

    const chartInterval =
        selectedIndicator?.timeframe && selectedIndicator.timeframe.trim() !== ""
            ? selectedIndicator.timeframe.trim()
            : "1m";

    return (
        <div className="w-full min-h-[80%] flex flex-col space-y-4">
            {/* ═══════════════════════════════════════════
                VIEW 1: UNLOCKED INDICATORS GRID (DEFAULT VIEW)
            ═══════════════════════════════════════════ */}
            {activeView === "grid" && (
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                                <Sparkles className="h-6 w-6 text-sky-500" />
                                <span>My Unlocked Indicators ({indicators.length})</span>
                            </h2>
                            <p className="text-xs text-slate-400 mt-1">
                                Proprietary algorithmic indicators repository. Click Launch Chart to open the live TradingView terminal with candles and indicators.
                            </p>
                        </div>
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {[1, 2, 3].map((n) => (
                                <div
                                    key={n}
                                    className="h-48 rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse"
                                />
                            ))}
                        </div>
                    ) : indicators.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {indicators.map((ind) => {
                                const isSelected = selectedIndicatorIds.includes(ind.id);

                                return (
                                    <div
                                        key={ind.id}
                                        className={`rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                                            isSelected
                                                ? "border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/10"
                                                : "border-slate-800 bg-slate-900/80 hover:border-sky-500/40"
                                        }`}
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div
                                                        className={`p-2.5 rounded-xl border shrink-0 ${
                                                            isSelected
                                                                ? "bg-sky-500 text-white border-sky-400"
                                                                : "bg-sky-500/10 text-sky-500 border-sky-500/20"
                                                        }`}
                                                    >
                                                        <LineChart className="h-5 w-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-sm text-white truncate">
                                                            {ind.name}
                                                        </h4>
                                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                                            Version:{" "}
                                                            <span className="font-mono font-semibold text-sky-400">
                                                                {ind.currentVersion || ind.latestVersion?.version || "v1.0.0"}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>

                                                {isSelected ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold uppercase shrink-0">
                                                        Loaded
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-semibold shrink-0">
                                                        Ready
                                                    </span>
                                                )}
                                            </div>

                                            {ind.description && (
                                                <p className="text-xs text-slate-400 line-clamp-2">
                                                    {ind.description}
                                                </p>
                                            )}

                                            {(ind.market || ind.timeframe || ind.symbol) && (
                                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                                    {ind.symbol && (
                                                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 font-mono text-sky-400">
                                                            {ind.symbol}
                                                        </span>
                                                    )}
                                                    {ind.market && (
                                                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60">
                                                            {ind.market}
                                                        </span>
                                                    )}
                                                    {ind.timeframe && (
                                                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60">
                                                            {ind.timeframe}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Button: ONLY Launch Chart button (select button removed) */}
                                        <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center">
                                            <button
                                                type="button"
                                                onClick={() => handleLaunchChart(ind)}
                                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.99] text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
                                            >
                                                <Play className="h-3.5 w-3.5 fill-current" />
                                                <span>Launch Chart</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center space-y-3 bg-slate-900/40">
                            <div className="h-12 w-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <h4 className="text-base font-bold text-white">
                                No Indicators Available
                            </h4>
                            <p className="text-xs text-slate-400 max-w-md mx-auto">
                                No indicators found in the database. Please create or configure indicators in the admin panel.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════
                VIEW 2: LIVE CHART PLATFORM (AFTER LAUNCH)
            ═══════════════════════════════════════════ */}
            {activeView === "chart" && (
                <div className="flex flex-col space-y-1">
                    {/* Top Control Bar with Back Button & Indicator Info */}
                    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-slate-800/80 bg-slate-900/90 shadow-sm">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleBackToIndicators}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                <span>Back to Indicators</span>
                            </button>

                            {selectedIndicator && (
                                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                    <span className="font-bold text-white">{selectedIndicator.name}</span>
                                    <span className="font-mono text-[11px] text-slate-400">
                                        ID: {selectedIndicator.id}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Indicator switcher dropdown */}
                        <div className="flex items-center gap-2">
                            <span className="hidden md:inline text-[11px] font-semibold text-slate-400">
                                Active Indicator:
                            </span>
                            <select
                                aria-label="Switch active indicator"
                                value={selectedIndicatorIds[0] || ""}
                                onChange={(e) => {
                                    const ind = indicators.find((item) => item.id === e.target.value);
                                    if (ind) {
                                        setSelectedIndicatorIds([ind.id]);
                                        setAppliedToast(`Switched to "${ind.name}"`);
                                        setTimeout(() => setAppliedToast(null), 2500);
                                    }
                                }}
                                className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-100 outline-none focus:border-sky-500 transition-colors"
                            >
                                {indicators.map((ind) => (
                                    <option key={ind.id} value={ind.id}>
                                        {ind.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Pure TradingView Chart Widget with Guaranteed Height */}
                    <div className="w-full h-[calc(100vh-145px)] min-h-[620px] overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900 shadow-2xl">
                        <TradingViewWidget
                            symbol={chartSymbol}
                            interval={chartInterval}
                            theme={theme}
                            activeIndicators={activeIndicatorsList}
                        />
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {appliedToast && (
                <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-slate-900 border border-sky-500/40 px-4 py-2.5 text-xs font-bold text-white shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <Sparkles className="h-4 w-4 text-sky-400" />
                    <span>{appliedToast}</span>
                </div>
            )}
        </div>
    );
};

export default Terminal;
