"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_CATEGORY_LAST_TOOL, DEFAULT_FAVORITE_TOOLS, getDefaultToolColor } from "./constants";
import { applyDefaultDrawingGeometry, CLICK_VS_DRAG_THRESHOLD_PX } from "./drawingDefaults";
import type { DrawingItem } from "./types";

interface UseDrawingToolsArgs {
  /** Called whenever Escape is pressed or a symbol-search shortcut should open the modal. */
  onOpenSymbolSearch: (initialChar: string) => void;
  onCloseSymbolModal: () => void;
  isSymbolModalOpen: boolean;
}

/**
 * Encapsulates every piece of state and interaction logic needed to draw,
 * select, edit, and delete chart annotations — independent of the chart
 * itself, so it can be unit tested or reused without a real chart instance.
 */
export function useDrawingTools({ onOpenSymbolSearch, onCloseSymbolModal, isSymbolModalOpen }: UseDrawingToolsArgs) {
  const [activeTool, setActiveTool] = useState<string>("cursor");
  const [stayInDrawMode, setStayInDrawMode] = useState(false);
  const [showDrawings, setShowDrawings] = useState(true);
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingItem | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(DEFAULT_FAVORITE_TOOLS);
  const [categoryLastTool, setCategoryLastTool] = useState<Record<string, string>>(DEFAULT_CATEGORY_LAST_TOOL);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const rafMouseMoveRef = useRef<number | null>(null);
  const pendingMousePosRef = useRef<{ x: number; y: number } | null>(null);

  const selectedDrawing = useMemo(
    () => drawings.find((d) => d.id === selectedDrawingId) || null,
    [drawings, selectedDrawingId]
  );

  const toggleFavorite = useCallback((toolId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => (prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]));
  }, []);

  const selectToolFromFlyout = useCallback((categoryId: string, toolId: string) => {
    setActiveTool(toolId);
    setCategoryLastTool((prev) => ({ ...prev, [categoryId]: toolId }));
  }, []);

  // ── Pointer handlers for creating a new drawing ─────────────────────────
  const handleSvgMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (activeTool === "cursor") {
        setSelectedDrawingId(null);
        return;
      }
      if (activeTool === "eraser") return;

      setCurrentDrawing({
        id: `draw_${Date.now()}`,
        type: activeTool,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        color: getDefaultToolColor(activeTool),
        points: activeTool === "brush" || activeTool === "highlighter" ? [{ x, y }] : undefined,
      });
    },
    [activeTool]
  );

  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    pendingMousePosRef.current = {
      x: e.clientX - e.currentTarget.getBoundingClientRect().left,
      y: e.clientY - e.currentTarget.getBoundingClientRect().top,
    };

    if (rafMouseMoveRef.current !== null) return;

    rafMouseMoveRef.current = requestAnimationFrame(() => {
      rafMouseMoveRef.current = null;
      const pos = pendingMousePosRef.current;
      if (!pos) return;

      setCurrentDrawing((prev) => {
        if (!prev) return null;
        if (prev.type === "brush" || prev.type === "highlighter") {
          return { ...prev, endX: pos.x, endY: pos.y, points: [...(prev.points || []), pos] };
        }
        return { ...prev, endX: pos.x, endY: pos.y };
      });
    });
  }, []);

  const handleSvgMouseUp = useCallback(() => {
    if (rafMouseMoveRef.current !== null) {
      cancelAnimationFrame(rafMouseMoveRef.current);
      rafMouseMoveRef.current = null;
    }

    setCurrentDrawing((pending) => {
      if (!pending) return null;

      const dragDistance = Math.hypot(pending.endX - pending.startX, pending.endY - pending.startY);
      const finalDrawing =
        dragDistance < CLICK_VS_DRAG_THRESHOLD_PX ? applyDefaultDrawingGeometry(pending) : pending;

      setDrawings((prev) => [...prev, finalDrawing]);
      setSelectedDrawingId(finalDrawing.id);

      return null;
    });

    setActiveTool((prevTool) => {
      // Read the latest stayInDrawMode via functional update isn't possible here since
      // stayInDrawMode isn't part of this updater's closure; handled by the effect below.
      return prevTool;
    });
  }, []);

  // Because handleSvgMouseUp is memoized without `stayInDrawMode` in scope, switch
  // back to the cursor tool in a small follow-up effect keyed off drawings length.
  const prevDrawingsCountRef = useRef(0);
  useEffect(() => {
    if (drawings.length > prevDrawingsCountRef.current && !stayInDrawMode) {
      setActiveTool("cursor");
    }
    prevDrawingsCountRef.current = drawings.length;
  }, [drawings.length, stayInDrawMode]);

  // ── Selected-drawing actions ─────────────────────────────────────────────
  const updateSelectedColor = useCallback(
    (newColor: string) => {
      if (!selectedDrawingId) return;
      setDrawings((prev) => prev.map((d) => (d.id === selectedDrawingId ? { ...d, color: newColor } : d)));
      setColorPickerOpen(false);
    },
    [selectedDrawingId]
  );

  const editSelectedLabel = useCallback(() => {
    if (!selectedDrawing) return;
    const current = selectedDrawing.label || selectedDrawing.name || "Analysis Note";
    const next = prompt("Edit annotation text:", current);
    if (next !== null) {
      setDrawings((prev) => prev.map((d) => (d.id === selectedDrawingId ? { ...d, label: next } : d)));
    }
  }, [selectedDrawing, selectedDrawingId]);

  const deleteSelected = useCallback(() => {
    if (!selectedDrawingId) return;
    setDrawings((prev) => prev.filter((d) => d.id !== selectedDrawingId));
    setSelectedDrawingId(null);
  }, [selectedDrawingId]);

  const eraseDrawing = useCallback(
    (id: string) => {
      setDrawings((prev) => prev.filter((d) => d.id !== id));
      if (selectedDrawingId === id) setSelectedDrawingId(null);
    },
    [selectedDrawingId]
  );

  const clearAllDrawings = useCallback(() => {
    setDrawings([]);
    setSelectedDrawingId(null);
    setActiveTool("cursor");
  }, []);

  // ── Global keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive =
        !!activeEl &&
        (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || (activeEl as HTMLElement).isContentEditable);

      if (e.key === "Escape") {
        onCloseSymbolModal();
        setSelectedDrawingId(null);
        setColorPickerOpen(false);
        setActiveTool((prev) => (prev !== "cursor" ? "cursor" : prev));
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedDrawingId && !isInputActive) {
        eraseDrawing(selectedDrawingId);
        return;
      }

      // Typing any letter/number while nothing is focused opens quick symbol search.
      if (!isInputActive && !isSymbolModalOpen && !e.ctrlKey && !e.metaKey && !e.altKey && /^[a-zA-Z0-9]$/.test(e.key)) {
        e.preventDefault();
        onOpenSymbolSearch(e.key);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [selectedDrawingId, isSymbolModalOpen, onCloseSymbolModal, onOpenSymbolSearch, eraseDrawing]);

  return {
    // state
    activeTool,
    setActiveTool,
    stayInDrawMode,
    setStayInDrawMode,
    showDrawings,
    setShowDrawings,
    drawings,
    currentDrawing,
    selectedDrawingId,
    setSelectedDrawingId,
    selectedDrawing,
    colorPickerOpen,
    setColorPickerOpen,
    favorites,
    categoryLastTool,
    svgRef,

    // actions
    toggleFavorite,
    selectToolFromFlyout,
    handleSvgMouseDown,
    handleSvgMouseMove,
    handleSvgMouseUp,
    updateSelectedColor,
    editSelectedLabel,
    deleteSelected,
    eraseDrawing,
    clearAllDrawings,
  };
}
