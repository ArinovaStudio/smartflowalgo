"use client";

import React, { useState, useEffect, useMemo, useDeferredValue, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, X, ChevronRight } from "lucide-react";

export interface SymbolItem {
  symbol: string;
  name?: string;
  category?: string;
  spread?: number;
  bid?: number;
  digits?: number;
  [key: string]: any;
}

interface SymbolSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (symbolName: string) => void;
  symbolsList: SymbolItem[];
  currentSymbol: string;
  initialSearch?: string;
}

const PAGE_SIZE = 50;

function SymbolSelectModalComponent({
  isOpen,
  onClose,
  onSelect,
  symbolsList,
  currentSymbol,
  initialSearch = "",
}: SymbolSelectModalProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [mounted, setMounted] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Sync mounted state for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // When modal opens, sync search and focus
  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialSearch);
      setVisibleLimit(PAGE_SIZE);
      if (listContainerRef.current) {
        listContainerRef.current.scrollTop = 0;
      }
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          if (initialSearch) {
            searchInputRef.current.setSelectionRange(initialSearch.length, initialSearch.length);
          }
        }
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialSearch]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Categories extracted from symbols list
  const categories = useMemo(() => {
    const cats = new Set<string>(["All"]);
    for (let i = 0; i < symbolsList.length; i++) {
      const cat = symbolsList[i]?.category;
      if (cat) cats.add(cat);
    }
    return Array.from(cats);
  }, [symbolsList]);

  // Deferred search value keeps UI typing 100% responsive and unblocked
  const deferredQuery = useDeferredValue(searchQuery);

  // Filter symbols based on category & search query
  const filteredSymbols = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const hasCategory = selectedCategory !== "All";
    const targetCat = selectedCategory.toLowerCase();

    const result: SymbolItem[] = [];
    const len = symbolsList.length;

    for (let i = 0; i < len; i++) {
      const item = symbolsList[i];
      if (!item) continue;

      if (hasCategory && item.category?.toLowerCase() !== targetCat) {
        continue;
      }

      if (!q) {
        result.push(item);
        continue;
      }

      const symMatch = item.symbol?.toLowerCase().includes(q);
      const nameMatch = item.name ? item.name.toLowerCase().includes(q) : false;
      const catMatch = item.category ? item.category.toLowerCase().includes(q) : false;

      if (symMatch || nameMatch || catMatch) {
        result.push(item);
      }
    }

    return result;
  }, [symbolsList, selectedCategory, deferredQuery]);

  // Slice visible items to prevent thousands of DOM nodes from being rendered simultaneously
  const visibleSymbols = useMemo(() => {
    return filteredSymbols.slice(0, visibleLimit);
  }, [filteredSymbols, visibleLimit]);

  // Infinite scroll on the symbols container
  const handleScroll = useCallback(() => {
    const container = listContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollTop + clientHeight >= scrollHeight - 120) {
      setVisibleLimit((prev) => {
        if (prev < filteredSymbols.length) {
          return prev + PAGE_SIZE;
        }
        return prev;
      });
    }
  }, [filteredSymbols.length]);

  const handleSelect = useCallback(
    (sym: string) => {
      onSelect(sym);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && visibleSymbols.length > 0) {
        e.preventDefault();
        handleSelect(visibleSymbols[0].symbol);
      }
    },
    [visibleSymbols, handleSelect]
  );

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] rounded-3xl shadow-2xl w-full max-w-xl h-[85vh] max-h-[640px] flex flex-col overflow-hidden text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 dark:border-[#2a2e39] flex items-center justify-between gap-4 shrink-0">
          <div>
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <span>Select Trading Pair</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-[#2962FF]/15 text-[#2962FF] border border-[#2962FF]/30">
                {symbolsList.length} Available
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#787b86] mt-0.5">
              Live MetaTrader 5 broker feed
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#2a2e39] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close symbol selector"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-[#2a2e39] bg-slate-50/50 dark:bg-[#131722]/50 space-y-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleLimit(PAGE_SIZE);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Search pairs, gold, crypto (e.g. EURUSD, XAUUSD, BTC)..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-[#2a2e39] bg-white dark:bg-[#131722] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#2962FF] shadow-xs"
              autoComplete="off"
              spellCheck="false"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setVisibleLimit(PAGE_SIZE);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setVisibleLimit(PAGE_SIZE);
                  if (listContainerRef.current) listContainerRef.current.scrollTop = 0;
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#2962FF] text-white shadow-xs"
                    : "bg-white dark:bg-[#1e222d] text-slate-600 dark:text-[#787b86] hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-[#2a2e39]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Symbols List (Virtual slice with smooth infinite scroll) */}
        <div
          ref={listContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100 dark:divide-[#2a2e39]/50"
        >
          {visibleSymbols.length > 0 ? (
            <>
              {visibleSymbols.map((s) => {
                const isSelected = currentSymbol === s.symbol;
                return (
                  <button
                    key={s.symbol}
                    type="button"
                    onClick={() => handleSelect(s.symbol)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs transition-colors cursor-pointer group text-left ${
                      isSelected
                        ? "bg-[#2962FF]/15 text-[#2962FF] border border-[#2962FF]/30 font-bold"
                        : "hover:bg-slate-50 dark:hover:bg-[#2a2e39]/60 text-slate-800 dark:text-[#d1d4dc]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] px-2 py-1 rounded-lg font-mono font-bold bg-slate-100 dark:bg-[#131722] text-slate-600 dark:text-[#787b86] border border-slate-200 dark:border-[#2a2e39]">
                        {s.category || "Forex"}
                      </span>
                      <div>
                        <p className="font-extrabold text-sm leading-tight text-slate-900 dark:text-white">
                          {s.symbol}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-[#787b86] truncate max-w-xs sm:max-w-sm">
                          {s.name && s.name !== s.symbol ? s.name : "Active Pair"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      {s.spread !== undefined && (
                        <div className="hidden sm:block text-right">
                          <span className="text-[10px] text-slate-400 dark:text-[#787b86]">Spread</span>
                          <p className="font-mono font-bold text-slate-700 dark:text-[#d1d4dc]">{s.spread}</p>
                        </div>
                      )}
                      {s.bid !== undefined && s.bid > 0 && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 dark:text-[#787b86]">Bid</span>
                          <p className="font-mono font-bold text-slate-800 dark:text-white">
                            {s.bid.toFixed(s.digits || 4)}
                          </p>
                        </div>
                      )}
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })}

              {visibleLimit < filteredSymbols.length && (
                <div className="p-3 text-center text-xs text-slate-400 dark:text-slate-500">
                  Showing {visibleSymbols.length} of {filteredSymbols.length} results. Scroll for more...
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-[#787b86]">
              <Search className="h-8 w-8 mx-auto text-slate-400 mb-2 opacity-40" />
              <p className="font-semibold text-sm">
                No symbols matching "{searchQuery}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export const SymbolSelectModal = React.memo(SymbolSelectModalComponent);
export default SymbolSelectModal;
