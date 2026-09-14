"use client";

import React from "react";
import { createPortal } from "react-dom";
import { Code2, X } from "lucide-react";

interface PineScriptSandboxModalProps {
  isOpen: boolean;
  isMounted: boolean;
  code: string;
  onChangeCode: (code: string) => void;
  onClose: () => void;
}

/** A simple client-side Pine Script editor, portalled above everything else. */
export function PineScriptSandboxModal({ isOpen, isMounted, code, onChangeCode, onClose }: PineScriptSandboxModalProps) {
  if (!isMounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-[#2a2e39] flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base flex items-center gap-2 text-slate-900 dark:text-white">
              <Code2 className="h-4 w-4 text-purple-400" />
              <span>Pine Script Engine (Pure Client-Side)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#787b86] mt-0.5">Test custom Pine Script indicators on live candles</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#2a2e39] text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          <textarea
            value={code}
            onChange={(e) => onChangeCode(e.target.value)}
            rows={12}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-[#2a2e39] bg-slate-50 dark:bg-[#131722] font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-[#2a2e39] flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-[#131722]/50">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors">
            Apply to Chart
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
