"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SymbolSelectModal from "./SymbolSelectModal";
import { BUILTIN_SCRIPTS } from "./constants";
import { DrawingLayer } from "./DrawingLayer";
import { ToolRail, ToolFlyout } from "./ToolRail";
import { SymbolAndTimeframeBar, OhlcStrip } from "./ChartToolbar";
import { SelectionActionBar } from "./SelectionActionBar";
import { PineScriptSandboxModal } from "./PineScriptSandboxModal";
import { useClientId, useInitialSymbols, useLightweightChart, useMarketSocket } from "./useMarketData";
import { useIndicatorPlots } from "./useIndicatorPlots";
import { PineVisualLayer } from "./PineVisualLayer";
import { useDrawingTools } from "./useDrawingTools";
import type { LightweightChartWidgetProps, SymbolInfo } from "./types";

/** Re-exported for convenience so consumers can `import type { DrawingItem } from ".../LightweightChartWidget"`. */
export type { DrawingItem, IndicatorMeta } from "./types";

export default function LightweightChartWidget({
  initialSymbol = "",
  initialTimeframe = "1m",
  theme: themeProp,
  activeIndicators = [],
}: LightweightChartWidgetProps) {
  // ── SSR-safe portal mount flag ────────────────────────────────────────────
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // ── Theme (prop override, else follows the `dark` class on <html>) ───────
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">(() => {
    if (themeProp) return themeProp;
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "dark";
  });

  useEffect(() => {
    if (themeProp) setCurrentTheme(themeProp);
  }, [themeProp]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const syncTheme = () => setCurrentTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const isDark = currentTheme === "dark";

  // ── Symbol / timeframe selection ─────────────────────────────────────────
  const [symbol, setSymbol] = useState(initialSymbol || "");
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [symbolModalOpen, setSymbolModalOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState("");

  const { symbolsList, setSymbolsList } = useInitialSymbols(setSymbol);
  const activeSymbolInfo: SymbolInfo = useMemo(() => {
    if (!symbol) return { symbol: "", name: "Awaiting broker stream...", category: "Forex", digits: 5 };
    return symbolsList.find((s) => s.symbol === symbol) || { symbol, name: symbol, category: "Forex", digits: 5 };
  }, [symbol, symbolsList]);

  // ── Chart instance + market data streaming ───────────────────────────────
  const clientId = useClientId();
  const { containerRef, chartRef, candleSeriesRef, hasFittedInitialSnapshot, hoveredCandle } = useLightweightChart({
    isDark,
    pricePrecision: activeSymbolInfo.digits,
  });

  const { wsConnected, wsError, candles, currentTick, snapshotSubscription } = useMarketSocket({
    clientId,
    symbol,
    timeframe,
    candleSeriesRef,
    chartRef,
    hasFittedInitialSnapshot,
    setSymbolsList,
    setSymbol,
  });

  // ── Indicators (built-in + externally supplied + sandbox) ────────────────
  const [activeBuiltins] = useState<string[]>([]);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxCode, setSandboxCode] = useState(BUILTIN_SCRIPTS.supertrend);

  const { visualEvents } = useIndicatorPlots({
    candles,
    symbol,
    timeframe,
    marketDataReady: snapshotSubscription?.symbol === symbol && snapshotSubscription.timeframe === timeframe,
    activeBuiltins,
    activeIndicators,
    sandboxOpen,
    sandboxCode,
    chartRef,
    candleSeriesRef,
  });

  // ── Symbol modal open/close handlers (used by drawing-tools keyboard shortcuts too) ──
  const handleCloseSymbolModal = useCallback(() => {
    setSymbolModalOpen(false);
    setSymbolSearch("");
  }, []);

  const handleOpenSymbolSearch = useCallback((initialChar: string) => {
    setSymbolSearch(initialChar);
    setSymbolModalOpen(true);
  }, []);

  const handleSelectSymbolFromModal = useCallback((sName: string) => {
    setSymbol(sName);
    setSymbolModalOpen(false);
    setSymbolSearch("");
    hasFittedInitialSnapshot.current = false;
  }, [hasFittedInitialSnapshot]);

  const handleSelectTimeframe = useCallback((tfVal: string) => {
    setTimeframe(tfVal);
    hasFittedInitialSnapshot.current = false;
  }, [hasFittedInitialSnapshot]);

  // ── Drawing tools (creation, selection, editing, shortcuts) ──────────────
  const drawingTools = useDrawingTools({
    onOpenSymbolSearch: handleOpenSymbolSearch,
    onCloseSymbolModal: handleCloseSymbolModal,
    isSymbolModalOpen: symbolModalOpen,
  });

  // ── Category flyout (which drawing-tool submenu is open, and where) ─────
  const [activeCategoryFlyout, setActiveCategoryFlyout] = useState<string | null>(null);
  const [flyoutTop, setFlyoutTop] = useState(8);
  const flyoutPanelRef = useRef<HTMLDivElement | null>(null);
  const flyoutSidebarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeCategoryFlyout) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const sidebar = flyoutSidebarRef.current;
      const panel = flyoutPanelRef.current;
      if (sidebar && !sidebar.contains(e.target as Node) && panel && !panel.contains(e.target as Node)) {
        setActiveCategoryFlyout(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [activeCategoryFlyout]);

  // Close the flyout automatically whenever Escape resets the active tool via the drawing-tools hook.
  useEffect(() => {
    if (drawingTools.activeTool === "cursor") setActiveCategoryFlyout(null);
  }, [drawingTools.activeTool]);

  return (
    <div
      className="flex flex-col h-full w-full rounded-2xl border border-slate-200 dark:border-[#2a2e39] bg-white dark:bg-[#131722] text-slate-900 dark:text-[#d1d4dc] shadow-2xl relative transition-colors overflow-hidden min-h-0"
      style={{ isolation: "isolate" }}
    >
      <SymbolAndTimeframeBar
        symbol={symbol}
        timeframe={timeframe}
        activeSymbolInfo={activeSymbolInfo}
        wsConnected={wsConnected}
        wsError={wsError}
        onOpenSymbolModal={() => {
          setSymbolModalOpen(true);
          setSymbolSearch("");
        }}
        onSelectTimeframe={handleSelectTimeframe}
      />

      <OhlcStrip symbol={symbol} activeSymbolInfo={activeSymbolInfo} hoveredCandle={hoveredCandle} currentTick={currentTick} />

      <div className="relative flex-1 w-full h-full min-h-0 flex flex-row overflow-hidden">
        <ToolRail
          activeTool={drawingTools.activeTool}
          categoryLastTool={drawingTools.categoryLastTool}
          favorites={drawingTools.favorites}
          stayInDrawMode={drawingTools.stayInDrawMode}
          showDrawings={drawingTools.showDrawings}
          hasSelection={!!drawingTools.selectedDrawingId}
          hasAnyDrawings={drawingTools.drawings.length > 0}
          sidebarRef={flyoutSidebarRef}
          onSelectTool={(toolId) => drawingTools.setActiveTool(toolId)}
          onOpenFlyout={(categoryId, top) => {
            setFlyoutTop(top);
            setActiveCategoryFlyout((prev) => (prev === categoryId ? null : categoryId));
          }}
          onToggleStayInDrawMode={() => drawingTools.setStayInDrawMode((v) => !v)}
          onToggleShowDrawings={() => drawingTools.setShowDrawings((v) => !v)}
          onDeleteSelected={drawingTools.deleteSelected}
          onClearAll={drawingTools.clearAllDrawings}
        />

        {activeCategoryFlyout && (
          <ToolFlyout
            categoryId={activeCategoryFlyout}
            activeTool={drawingTools.activeTool}
            favorites={drawingTools.favorites}
            top={flyoutTop}
            panelRef={flyoutPanelRef}
            onSelectTool={(categoryId, toolId) => {
              drawingTools.selectToolFromFlyout(categoryId, toolId);
              setActiveCategoryFlyout(null);
            }}
            onToggleFavorite={drawingTools.toggleFavorite}
          />
        )}

        <div className="relative flex-1 h-full min-h-0 overflow-hidden bg-white dark:bg-[#131722]">
          <div className="absolute inset-0" ref={containerRef} />

          <div className="absolute bottom-8 left-4 z-[5] pointer-events-none select-none flex items-center gap-2 opacity-50 hover:opacity-80 transition-opacity">
            <img src="/logo.jpg" alt="SmartFlowAlgo" className="h-5 w-auto rounded object-contain" />
            <span className="text-[11px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">SmartFlowAlgo</span>
          </div>

          <PineVisualLayer events={visualEvents} candles={candles} chartRef={chartRef} candleSeriesRef={candleSeriesRef} />

          {drawingTools.showDrawings && (
            <DrawingLayer
              drawings={drawingTools.drawings}
              currentDrawing={drawingTools.currentDrawing}
              activeTool={drawingTools.activeTool}
              selectedDrawingId={drawingTools.selectedDrawingId}
              isDark={isDark}
              svgRef={drawingTools.svgRef}
              onMouseDown={drawingTools.handleSvgMouseDown}
              onMouseMove={drawingTools.handleSvgMouseMove}
              onMouseUp={drawingTools.handleSvgMouseUp}
              onEraseDrawing={drawingTools.eraseDrawing}
              onSelectDrawing={(id) => drawingTools.setSelectedDrawingId(id)}
            />
          )}

          {drawingTools.selectedDrawing && (
            <SelectionActionBar
              drawing={drawingTools.selectedDrawing}
              colorPickerOpen={drawingTools.colorPickerOpen}
              onToggleColorPicker={() => drawingTools.setColorPickerOpen((v) => !v)}
              onPickColor={drawingTools.updateSelectedColor}
              onEditLabel={drawingTools.editSelectedLabel}
              onDelete={drawingTools.deleteSelected}
              onDeselect={() => drawingTools.setSelectedDrawingId(null)}
            />
          )}
        </div>
      </div>

      <SymbolSelectModal
        isOpen={symbolModalOpen}
        onClose={handleCloseSymbolModal}
        onSelect={handleSelectSymbolFromModal}
        symbolsList={symbolsList}
        currentSymbol={symbol}
        initialSearch={symbolSearch}
      />

      {/* <PineScriptSandboxModal
        isOpen={sandboxOpen}
        isMounted={isMounted}
        code={sandboxCode}
        onChangeCode={setSandboxCode}
        onClose={() => setSandboxOpen(false)}
      /> */}
    </div>
  );
}
