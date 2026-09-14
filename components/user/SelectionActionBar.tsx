"use client";

import React from "react";
import { Palette, Type, Trash2, X } from "lucide-react";
import { COLOR_SWATCHES } from "./constants";
import type { DrawingItem } from "./types";

interface SelectionActionBarProps {
  drawing: DrawingItem;
  colorPickerOpen: boolean;
  onToggleColorPicker: () => void;
  onPickColor: (color: string) => void;
  onEditLabel: () => void;
  onDelete: () => void;
  onDeselect: () => void;
}

/** Small floating pill of actions (color, edit text, delete, close) shown above a selected drawing. */
export function SelectionActionBar({
  drawing,
  colorPickerOpen,
  onToggleColorPicker,
  onPickColor,
  onEditLabel,
  onDelete,
  onDeselect,
}: SelectionActionBarProps) {
  const top = Math.min(Math.max(drawing.startY - 44, 10), 500);
  const left = Math.min(Math.max(Math.min(drawing.startX, drawing.endX) + 10, 20), 800);

  return (
    <div
      className="absolute z-30 flex items-center gap-1.5 p-1 rounded-xl bg-white/95 dark:bg-[#1e222d]/95 border border-slate-200 dark:border-[#2a2e39] shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      style={{ top, left }}
    >
      <div className="relative">
        <button
          type="button"
          title="Change Color"
          onClick={onToggleColorPicker}
          className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-[#2a2e39] bg-slate-50 dark:bg-[#131722] hover:bg-slate-100 dark:hover:bg-[#2a2e39] transition-colors cursor-pointer"
        >
          <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: drawing.color || "#2962FF" }} />
          <Palette className="w-3 h-3 text-slate-400" />
        </button>

        {colorPickerOpen && (
          <div className="absolute top-full left-0 mt-1 flex items-center gap-1 p-1.5 rounded-xl bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-xl z-50">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                onClick={() => onPickColor(c.value)}
                className="w-4 h-4 rounded-full border border-black/20 hover:scale-125 transition-transform cursor-pointer"
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        title="Edit Label / Text"
        onClick={onEditLabel}
        className="p-1 rounded-lg border border-slate-200 dark:border-[#2a2e39] bg-slate-50 dark:bg-[#131722] hover:bg-slate-100 dark:hover:bg-[#2a2e39] text-xs font-semibold px-1.5 transition-colors cursor-pointer flex items-center gap-1"
      >
        <Type className="w-3 h-3 text-slate-400" />
        <span className="text-[10px]">Text</span>
      </button>

      <button
        type="button"
        title="Delete Drawing (Del / Backspace)"
        onClick={onDelete}
        className="p-1 rounded-lg bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 transition-colors cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        title="Deselect (Esc)"
        onClick={onDeselect}
        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2e39] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
