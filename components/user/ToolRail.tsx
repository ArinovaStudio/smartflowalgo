"use client";

import React, { useRef, useState, useEffect } from "react";
import { Eye, EyeOff, Lock, Unlock, Trash2, Star } from "lucide-react";
import { TOOL_CATEGORIES } from "./constants";
import type { ToolDef } from "./types";

interface ToolRailProps {
  activeTool: string;
  categoryLastTool: Record<string, string>;
  favorites: string[];
  stayInDrawMode: boolean;
  showDrawings: boolean;
  hasSelection: boolean;
  hasAnyDrawings: boolean;
  onSelectTool: (toolId: string) => void;
  onOpenFlyout: (categoryId: string, anchorTop: number) => void;
  onToggleStayInDrawMode: () => void;
  onToggleShowDrawings: () => void;
  onDeleteSelected: () => void;
  onClearAll: () => void;
  sidebarRef: React.RefObject<HTMLDivElement | null>;
}

/** The narrow docked icon rail on the left edge of the chart (TradingView-style). */
export function ToolRail({
  activeTool,
  categoryLastTool,
  stayInDrawMode,
  showDrawings,
  hasSelection,
  hasAnyDrawings,
  onSelectTool,
  onOpenFlyout,
  onToggleStayInDrawMode,
  onToggleShowDrawings,
  onDeleteSelected,
  onClearAll,
  sidebarRef,
}: ToolRailProps) {
  return (
    <div
      ref={sidebarRef}
      className="w-11 shrink-0 border-r border-slate-200 dark:border-[#2a2e39] bg-slate-50 dark:bg-[#131722] flex flex-col items-center py-1.5 gap-0.5 z-20 overflow-y-auto select-none no-scrollbar"
      style={{ scrollbarWidth: "none" }}
    >
      {TOOL_CATEGORIES.map((cat) => {
        const currentSelectedToolId = categoryLastTool[cat.id] || cat.tools[0].id;
        const currentToolDef = cat.tools.find((t) => t.id === currentSelectedToolId) || cat.tools[0];
        const isCategoryActive = activeTool === currentSelectedToolId || cat.tools.some((t) => t.id === activeTool);
        const IconComp = currentToolDef.icon;

        return (
          <div key={cat.id} className="relative w-full flex justify-center py-0.5">
            <div
              className={`w-8 h-8 rounded-md flex items-center justify-center relative group transition-colors duration-100 ${
                isCategoryActive
                  ? "bg-[#2962FF] text-white shadow-sm"
                  : "text-slate-500 dark:text-[#787b86] hover:bg-slate-200/80 dark:hover:bg-[#2a2e39] hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <button
                type="button"
                title={currentToolDef.name}
                onClick={() => onSelectTool(currentSelectedToolId)}
                className="w-full h-full flex items-center justify-center cursor-pointer"
              >
                <IconComp className="h-4 w-4" />
              </button>

              <button
                type="button"
                title={`More ${cat.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const btnRect = e.currentTarget.getBoundingClientRect();
                  const parentRect = sidebarRef.current?.getBoundingClientRect();
                  const relTop = parentRect ? btnRect.top - parentRect.top : 8;
                  onOpenFlyout(cat.id, Math.max(4, Math.min(relTop - 8, 220)));
                }}
                className={`absolute bottom-0 right-0 w-3 h-3 flex items-center justify-center cursor-pointer rounded-br-md text-[7px] leading-none opacity-60 hover:opacity-100 ${
                  isCategoryActive ? "text-white" : "text-slate-400 dark:text-[#787b86]"
                }`}
              >
                ▾
              </button>
            </div>
          </div>
        );
      })}

      <div className="w-5 h-px bg-slate-200 dark:bg-[#2a2e39] my-1 shrink-0" />

      <button
        type="button"
        title={stayInDrawMode ? "Stay in Drawing Mode: ON" : "Stay in Drawing Mode: OFF"}
        onClick={onToggleStayInDrawMode}
        className={`w-8 h-8 rounded-md cursor-pointer flex items-center justify-center transition-colors duration-100 ${
          stayInDrawMode
            ? "bg-[#2962FF]/20 text-[#2962FF]"
            : "text-slate-500 dark:text-[#787b86] hover:bg-slate-200/80 dark:hover:bg-[#2a2e39] hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        {stayInDrawMode ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
      </button>

      <button
        type="button"
        title={showDrawings ? "Hide All Drawings" : "Show All Drawings"}
        onClick={onToggleShowDrawings}
        className={`w-8 h-8 rounded-md cursor-pointer flex items-center justify-center transition-colors duration-100 ${
          !showDrawings
            ? "text-rose-500 bg-rose-500/10"
            : "text-slate-500 dark:text-[#787b86] hover:bg-slate-200/80 dark:hover:bg-[#2a2e39] hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        {showDrawings ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>

      {hasSelection && (
        <button
          type="button"
          title="Delete Selected Drawing"
          onClick={onDeleteSelected}
          className="w-8 h-8 rounded-md bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 cursor-pointer flex items-center justify-center transition-colors duration-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      <button
        type="button"
        title="Clear All Drawings"
        disabled={!hasAnyDrawings}
        onClick={onClearAll}
        className="w-8 h-8 rounded-md text-slate-500 dark:text-[#787b86] hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center transition-colors duration-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface ToolFlyoutProps {
  categoryId: string;
  activeTool: string;
  favorites: string[];
  top: number;
  onSelectTool: (categoryId: string, toolId: string) => void;
  onToggleFavorite: (toolId: string, e: React.MouseEvent) => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
}

/** The expanded vertical list of every tool within one category. */
export function ToolFlyout({ categoryId, activeTool, favorites, top, onSelectTool, onToggleFavorite, panelRef }: ToolFlyoutProps) {
  const category = TOOL_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return null;

  const groups: { name: string; tools: ToolDef[] }[] = [];
  for (const tool of category.tools) {
    const groupName = tool.group || category.name;
    let group = groups.find((g) => g.name === groupName);
    if (!group) {
      group = { name: groupName, tools: [] };
      groups.push(group);
    }
    group.tools.push(tool);
  }

  return (
    <div
      ref={panelRef}
      className="absolute left-11 z-[9999] pointer-events-auto animate-in fade-in slide-in-from-left-2 duration-150 select-none"
      style={{ top: `${top}px`, maxHeight: "calc(100vh - 160px)" }}
    >
      <div className="w-72 rounded-xl border border-slate-200 dark:border-[#2a2e39] bg-white dark:bg-[#1e222d] text-slate-800 dark:text-[#d1d4dc] shadow-2xl overflow-hidden flex flex-col py-1 backdrop-blur-xl">
        <div className="overflow-y-auto max-h-[380px] no-scrollbar py-0.5" style={{ scrollbarWidth: "none" }}>
          {groups.map((group, groupIdx) => (
            <div key={group.name} className="flex flex-col">
              {groupIdx > 0 && <div className="h-px bg-slate-100 dark:bg-[#2a2e39]/80 mx-2.5 my-1" />}
              <div className="px-3 pt-2 pb-1">
                <p className="text-[10px] font-bold text-slate-400 dark:text-[#787b86] uppercase tracking-wider">{group.name}</p>
              </div>
              <div className="space-y-0.5 px-1.5">
                {group.tools.map((tool) => {
                  const ToolIcon = tool.icon;
                  const isSelected = activeTool === tool.id;
                  const isFavorite = favorites.includes(tool.id);

                  return (
                    <div
                      key={tool.id}
                      onClick={() => onSelectTool(categoryId, tool.id)}
                      className={`group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-slate-100 text-slate-900 font-bold dark:bg-[#2a2e39] dark:text-white"
                          : "text-slate-700 dark:text-[#d1d4dc] hover:bg-slate-100 dark:hover:bg-[#2a2e39]/60 hover:text-slate-950 dark:hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ToolIcon
                          className={`h-4 w-4 shrink-0 ${
                            isSelected ? "text-[#2962FF]" : "text-slate-500 dark:text-[#787b86] group-hover:text-slate-900 dark:group-hover:text-white"
                          }`}
                        />
                        <span className="truncate text-xs">{tool.name}</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => onToggleFavorite(tool.id, e)}
                        className="p-1 rounded text-slate-400 hover:text-amber-400 transition-colors shrink-0"
                        title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                      >
                        <Star className={`h-3.5 w-3.5 ${isFavorite ? "fill-amber-400 text-amber-400 opacity-100" : "opacity-0 group-hover:opacity-40"}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
