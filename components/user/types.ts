import type React from "react";
import type { CandleData } from "@/lib/transpiler";

/** A single user-created drawing/annotation on the chart overlay. */
export interface DrawingItem {
  id: string;
  type: string;
  name?: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color?: string;
  fillColor?: string;
  lineWidth?: number;
  label?: string;
  points?: Array<{ x: number; y: number }>;
}

/** Metadata describing a Pine-Script-backed indicator that can be toggled on the chart. */
export interface IndicatorMeta {
  id: string;
  name: string;
  slug?: string;
  currentVersion?: string | null;
  latestVersion?: {
    script?: string | null;
    version?: string | null;
  } | null;
  tradingViewId?: string | null;
}

export interface LightweightChartWidgetProps {
  initialSymbol?: string;
  initialTimeframe?: string;
  theme?: "dark" | "light";
  activeIndicators?: IndicatorMeta[];
  onIndicatorToggle?: (id: string) => void;
}

export interface ToolDef {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  group?: string;
}

export interface CategoryDef {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  tools: ToolDef[];
}

/** Live top-of-book style tick summary derived from the most recent candles. */
export interface TickState {
  price: number;
  time: number;
  change: number;
  changePercent: number;
}

/** Minimal shape of a symbol entry returned by the MT5 bridge / REST endpoint. */
export interface SymbolInfo {
  symbol: string;
  name?: string;
  category?: string;
  digits?: number;
  spread?: number;
  [key: string]: unknown;
}

export interface UserIndicator {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  symbol: string | null;
  market: string | null;
  timeframe: string | null;
  currentVersion: string | null;
  distributionType: string | null;
  tradingViewId: string | null;
  tradingViewUrl: string | null;
  publisher: string | null;
  latestVersion?: {
    id: string;
    version: string;
    script?: string | null;
    releaseNotes: string | null;
    releasedAt: string | null;
  } | null;
  accessSource?: string;
  expiresAt?: string | null;
}

export interface PortalUser {
  id: string;
  name: string | null;
  email: string;
  tradingViewId: string | null;
  broker?: string | null;
  mobile?: string | null;
  userType?: string | null;
  image?: string | null;
  experience?: string | null;
  interest?: string | null;
  createdAt?: string | null;
  planType: string | null;
  planDate?: string | null;
  renualDate?: string | null;
  plan?: { id: string; name: string; badge: string | null; price?: number | null } | null;
}

export type { CandleData };
