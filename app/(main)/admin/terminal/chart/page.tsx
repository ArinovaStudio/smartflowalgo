"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Sparkles, Loader2, Activity } from "lucide-react";
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

function TerminalChartContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tokenParam = searchParams.get("token") || "";

    const [indicators, setIndicators] = useState<Indicator[]>([]);
    const [resolvedId, setResolvedId] = useState<string>("");
    const [selectedId, setSelectedId] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [appliedToast, setAppliedToast] = useState<string | null>(null);
    const [theme] = useState<"light" | "dark">("dark");

    // Step 1: Decrypt the URL token → real indicator ID (server-side AES-256-GCM)
    useEffect(() => {
        if (!tokenParam) {
            // No token at all → back to terminal
            router.replace("/admin/terminal");
            return;
        }

        let isMounted = true;

        const decryptToken = async () => {
            try {
                const res = await fetch(
                    `/api/admin/indicator-token?token=${encodeURIComponent(tokenParam)}`,
                    { credentials: "include" }
                );
                const data = await res.json();
                if (!res.ok || !data.success || !data.indicatorId) {
                    throw new Error("Invalid token");
                }
                if (isMounted) {
                    setResolvedId(data.indicatorId);
                    setSelectedId(data.indicatorId);
                }
            } catch {
                if (isMounted) router.replace("/admin/terminal");
            }
        };

        decryptToken();
        return () => { isMounted = false; };
    }, [tokenParam, router]);

    // Step 2: Fetch all indicators once we have the decrypted ID
    useEffect(() => {
        if (!resolvedId) return;

        let isMounted = true;

        const getIndicators = async () => {
            try {
                const res = await fetch("/api/admin/allindicators", {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store",
                });

                if (!res.ok) throw new Error("Failed to fetch indicators");

                const data: AllIndicatorsResponse = await res.json();
                if (!data.success || !Array.isArray(data.data)) {
                    throw new Error("Invalid indicators response");
                }

                if (isMounted) {
                    setIndicators(data.data);
                }
            } catch (error) {
                console.error("Failed to load indicators:", error);
                if (isMounted) setIndicators([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        getIndicators();

        return () => {
            isMounted = false;
        };
    }, [resolvedId]);

    // Guard: redirect if decrypted ID is not found in the indicator list
    useEffect(() => {
        if (!loading && resolvedId && indicators.length > 0) {
            if (!indicators.some((ind) => ind.id === resolvedId)) {
                router.replace("/admin/terminal");
            }
        }
    }, [loading, resolvedId, indicators, router]);

    const selectedIndicator =
        indicators.find((ind) => ind.id === selectedId) ||
        indicators.find((ind) => ind.id === resolvedId) ||
        null;

    const activeIndicatorsList = selectedIndicator
        ? [
            {
                ...selectedIndicator,
                latestVersion:
                    selectedIndicator.latestVersion ||
                    (Array.isArray(selectedIndicator.versions) && selectedIndicator.versions.length > 0
                        ? [...selectedIndicator.versions].sort(
                            (a: any, b: any) =>
                                new Date(b.createdAt || 0).getTime() -
                                new Date(a.createdAt || 0).getTime()
                        )[0]
                        : null),
            },
        ]
        : [];

    const chartSymbol =
        selectedIndicator?.symbol && selectedIndicator.symbol.trim() !== ""
            ? selectedIndicator.symbol.trim()
            : "XAUUSD";

    const chartInterval =
        selectedIndicator?.timeframe && selectedIndicator.timeframe.trim() !== ""
            ? selectedIndicator.timeframe.trim()
            : "1m";

    // Switch indicator: encrypt new ID server-side → replace URL with new token
    const handleSwitchIndicator = async (newId: string) => {
        const ind = indicators.find((item) => item.id === newId);
        if (!ind) return;

        try {
            const res = await fetch("/api/admin/indicator-token", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ indicatorId: ind.id }),
            });
            const data = await res.json();
            if (!data.success || !data.token) throw new Error("Token error");
            setSelectedId(ind.id);
            router.replace(`/admin/terminal/chart?token=${encodeURIComponent(data.token)}`);
            setAppliedToast(`Switched to "${ind.name}"`);
            setTimeout(() => setAppliedToast(null), 2500);
        } catch {
            // silently keep current indicator if encryption fails
        }
    };

    if (loading) {
        return (
            <div className="w-full h-full min-h-0 flex-1 flex flex-col items-center justify-center gap-3 bg-slate-900/40 rounded-2xl border border-slate-800">
                <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
                <p className="text-xs font-semibold text-slate-400">Loading terminal &amp; indicators...</p>
            </div>
        );
    }

    if (!selectedIndicator) {
        return null;
    }

    return (
        <div className="w-full h-full min-h-0 flex-1 flex flex-col space-y-1.5 overflow-hidden">
            {/* Top Control Bar with Back Button & Indicator Info */}
            <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl border border-slate-800/80 bg-slate-900/90 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push("/admin/terminal")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Back to Indicators</span>
                    </button>

                    <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="font-bold text-white">{selectedIndicator.name}</span>
                        {/* ID intentionally not shown */}
                    </div>
                </div>
                <div className="flex items-center justify-center gap-2">
                    <Activity className="h-4 w-4 shrink-0 text-sky-400" />
                    <span className="whitespace-nowrap text-sm font-extrabold tracking-tight text-white sm:text-base">
                        Smartflow <span className="text-sky-400">Trade Terminal</span>
                    </span>
                </div>
                {/* Indicator switcher dropdown */}
                <div className="flex items-center gap-2">
                    <span className="hidden md:inline text-[11px] font-semibold text-slate-400">
                        Active Indicator:
                    </span>
                    <select
                        aria-label="Switch active indicator"
                        value={selectedIndicator.id}
                        onChange={(e) => handleSwitchIndicator(e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-100 outline-none focus:border-sky-500 transition-colors cursor-pointer"
                    >
                        {indicators.map((ind) => (
                            <option key={ind.id} value={ind.id}>
                                {ind.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* TradingView Live Chart Widget - Full Height, Zero Overflow */}
            <div className="flex-1 w-full min-h-0 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900 shadow-2xl">
                <TradingViewWidget
                    symbol={chartSymbol}
                    interval={chartInterval}
                    theme={"light"}
                    activeIndicators={activeIndicatorsList}
                />
            </div>

            {/* Toast Notification */}
            {appliedToast && (
                <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-slate-900 border border-sky-500/40 px-4 py-2.5 text-xs font-bold text-white shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <Sparkles className="h-4 w-4 text-sky-400" />
                    <span>{appliedToast}</span>
                </div>
            )}
        </div>
    );
}

export default function TerminalChartPage() {
    return (
        <Suspense
            fallback={
                <div className="w-full h-full min-h-0 flex-1 flex flex-col items-center justify-center gap-3 bg-slate-900/40 rounded-2xl border border-slate-800">
                    <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
                    <p className="text-xs font-semibold text-slate-400">Loading terminal...</p>
                </div>
            }
        >
            <TerminalChartContent />
        </Suspense>
    );
}
