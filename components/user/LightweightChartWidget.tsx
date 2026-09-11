"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
  ColorType,
  IChartApi,
  ISeriesApi,
  SeriesMarker,
  Time,
  CandlestickData,
  LineData,
} from "lightweight-charts";
import {
  LineChart,
  Sparkles,
  Search,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  X,
  RefreshCw,
  Server,
  ShieldAlert,
  MousePointer,
  Dot,
  Eraser,
  TrendingUp,
  TrendingDown,
  Minus,
  Square,
  Triangle,
  Layers,
  Target,
  Circle as CircleIcon,
  Trash2,
  Undo2,
  MoveUpRight,
  ArrowUpRight,
  ArrowRight,
  Ruler,
  MessageSquare,
  Type,
  Split,
  Paintbrush,
  Highlighter,
  StickyNote,
  Pin,
  Flag,
  Calendar,
  DollarSign,
  Maximize2,
  BarChart2,
  Sliders,
  Palette,
  Crosshair,
  Flame,
  Zap,
  Award,
  Shield,
  Compass,
  Activity,
  Grid,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Magnet,
} from "lucide-react";
import { PineScriptEngine, CandleData, TranspiledIndicatorOutput } from "@/lib/transpiler";
import SymbolSelectModal from "./SymbolSelectModal";

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

interface LightweightChartWidgetProps {
  initialSymbol?: string;
  initialTimeframe?: string;
  theme?: "dark" | "light";
  activeIndicators?: IndicatorMeta[];
  onIndicatorToggle?: (id: string) => void;
}

const TIMEFRAMES = [
  { label: "1m", value: "1m", secs: 60 },
  { label: "5m", value: "5m", secs: 300 },
  { label: "15m", value: "15m", secs: 900 },
  { label: "30m", value: "30m", secs: 1800 },
  { label: "1H", value: "1h", secs: 3600 },
  { label: "4H", value: "4h", secs: 14400 },
  { label: "1D", value: "1D", secs: 86400 },
];

const BUILTIN_SCRIPTS: Record<string, string> = {
  supertrend: `//@version=5
indicator("Supertrend Strategy", overlay=true)
factor = input.float(3.0, "Factor")
atrPeriod = input.int(10, "ATR Period")
[superTrend, direction] = ta.supertrend(factor, atrPeriod)
plot(superTrend, "Supertrend", color=direction < 0 ? color.green : color.red)
`,
  ema_cross: `//@version=5
indicator("EMA Dual Crossover", overlay=true)
fast = ta.ema(close, 9)
slow = ta.ema(close, 21)
plot(fast, "EMA 9", color=color.blue)
plot(slow, "EMA 21", color=color.orange)
buy = ta.crossover(fast, slow)
sell = ta.crossunder(fast, slow)
plotshape(buy, "Buy Signal", style=shape.triangleup, color=color.green, text="BUY")
plotshape(sell, "Sell Signal", style=shape.triangledown, color=color.red, text="SELL")
`,
  bollinger: `//@version=5
indicator("Bollinger Bands", overlay=true)
[basis, upper, lower] = ta.bb(close, 20, 2)
plot(upper, "Upper", color=color.blue)
plot(basis, "Basis", color=color.orange)
plot(lower, "Lower", color=color.blue)
`,
};

// ── Comprehensive 100+ TradingView Pro Tools Library Across 9 Categories ─────────
interface ToolDef {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface CategoryDef {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  tools: ToolDef[];
}

const TOOL_CATEGORIES: CategoryDef[] = [
  {
    id: "cursors",
    name: "Cursors & Pan",
    icon: Crosshair,
    tools: [
      { id: "cursor", name: "Crosshair (Pan/Scroll)", icon: Crosshair, description: "Select & pan chart freely" },
      { id: "dot", name: "Dot Cursor", icon: Dot, description: "Precise dot pointer" },
      { id: "arrow_pointer", name: "Arrow Pointer", icon: MoveUpRight, description: "Standard cursor arrow" },
      { id: "eraser", name: "Eraser Tool", icon: Eraser, description: "Click any drawing to erase it" },
    ],
  },
  {
    id: "smc_ict",
    name: "Smart Money (SMC / ICT)",
    icon: Flame,
    tools: [
      { id: "fvg_bull", name: "Bullish Fair Value Gap (+FVG)", icon: Layers, description: "Institutional buying demand zone" },
      { id: "fvg_bear", name: "Bearish Fair Value Gap (-FVG)", icon: Layers, description: "Institutional selling supply zone" },
      { id: "order_block_bull", name: "Bullish Order Block (+OB)", icon: Square, description: "Institutional demand block" },
      { id: "order_block_bear", name: "Bearish Order Block (-OB)", icon: Square, description: "Institutional supply block" },
      { id: "breaker_block", name: "Breaker Block (BB)", icon: Split, description: "Failed OB flipped into support/res" },
      { id: "choch", name: "Change of Character (CHoCH)", icon: RefreshCw, description: "Trend transition structural line" },
      { id: "bos", name: "Break of Structure (BOS)", icon: TrendingUp, description: "Trend continuation structural break" },
      { id: "liquidity_sweep", name: "Liquidity Sweep (BSL/SSL)", icon: DollarSign, description: "Stop hunt sweep zone" },
      { id: "eqh_eql", name: "Equal Highs / Equal Lows", icon: Minus, description: "Liquidity pool double level" },
      { id: "mitigation_block", name: "Mitigation Block", icon: Square, description: "Order mitigation recovery zone" },
      { id: "premium_discount", name: "Premium / Discount Zone", icon: Sliders, description: "50% equilibrium fib zone" },
      { id: "imbalance_void", name: "Liquidity Void", icon: Maximize2, description: "Gap between price inefficiencies" },
    ],
  },
  {
    id: "trends",
    name: "Trend Lines & Channels",
    icon: TrendingUp,
    tools: [
      { id: "trendline", name: "Trend Line", icon: TrendingUp, description: "Line with angle & slope" },
      { id: "ray", name: "Ray", icon: ArrowUpRight, description: "One-way infinite line" },
      { id: "info_line", name: "Info Line", icon: Sliders, description: "Line showing price delta & distance" },
      { id: "trend_angle", name: "Trend Angle", icon: MoveUpRight, description: "Fixed angle slope projection" },
      { id: "horizontal", name: "Horizontal Line", icon: Minus, description: "Infinite horizontal key level" },
      { id: "horizontal_ray", name: "Horizontal Ray", icon: ArrowRight, description: "Rightward ray level" },
      { id: "vertical", name: "Vertical Line", icon: Split, description: "Vertical timeline mark" },
      { id: "cross_line", name: "Cross Line", icon: Maximize2, description: "Dual time & price cross" },
      { id: "channel", name: "Parallel Channel", icon: Layers, description: "Equidistant channel with median" },
      { id: "disjoint_channel", name: "Disjoint Channel", icon: Layers, description: "Diverging channel lines" },
      { id: "flat_top_bottom", name: "Flat Top/Bottom", icon: Minus, description: "Support/resistance channel" },
      { id: "extended_line", name: "Extended Line", icon: ArrowRight, description: "Bidirectional infinite trend" },
      { id: "regression_line", name: "Linear Regression Line", icon: Activity, description: "Statistical mean line" },
      { id: "regression_channel", name: "Regression Channel", icon: Grid, description: "Standard deviation channel" },
    ],
  },
  {
    id: "fib_gann",
    name: "Gann & Fibonacci",
    icon: Layers,
    tools: [
      { id: "fibonacci", name: "Fib Retracement", icon: Layers, description: "7 standard Fibonacci levels" },
      { id: "fib_extension", name: "Fib Extension", icon: TrendingUp, description: "Trend-based fib expansion (161.8%)" },
      { id: "fib_channel", name: "Fib Channel", icon: Layers, description: "Diagonal Fibonacci channel bands" },
      { id: "fib_timezone", name: "Fib Time Zone", icon: Calendar, description: "Fib sequence vertical time intervals" },
      { id: "fib_fan", name: "Fib Fan", icon: MoveUpRight, description: "Radiating speed resistance fan rays" },
      { id: "fib_spiral", name: "Fib Spiral", icon: Compass, description: "Logarithmic golden spiral" },
      { id: "gann_box", name: "Gann Box", icon: Square, description: "4x4 geometric Gann square grid" },
      { id: "gann_fan", name: "Gann Fan", icon: TrendingUp, description: "1x1, 1x2, 2x1 geometric fan lines" },
      { id: "gann_square", name: "Gann Square", icon: Square, description: "Square of 9 price-time block" },
      { id: "pitchfork", name: "Andrews Pitchfork", icon: Split, description: "Median line with parallel prongs" },
      { id: "schiff_pitchfork", name: "Schiff Pitchfork", icon: Split, description: "Modified shallow pitchfork" },
    ],
  },
  {
    id: "shapes",
    name: "Geometric Shapes & Brushes",
    icon: Square,
    tools: [
      { id: "brush", name: "Brush", icon: Paintbrush, description: "Freeform smooth stroke" },
      { id: "highlighter", name: "Highlighter", icon: Highlighter, description: "Wide translucent highlight" },
      { id: "rectangle", name: "Rectangle", icon: Square, description: "Supply/Demand zone box" },
      { id: "rotated_rectangle", name: "Rotated Rectangle", icon: Square, description: "Angled rectangular zone" },
      { id: "circle", name: "Circle / Oval", icon: CircleIcon, description: "Circular pivot highlight" },
      { id: "ellipse", name: "Ellipse", icon: CircleIcon, description: "Horizontal oval projection" },
      { id: "triangle", name: "Triangle", icon: Triangle, description: "3-point geometric wedge" },
      { id: "polyline", name: "Polyline", icon: TrendingUp, description: "Multi-point connected path" },
      { id: "curve", name: "Curve", icon: Sliders, description: "Curved bezier line" },
      { id: "double_curve", name: "Double Curve", icon: Activity, description: "S-shape sinusoidal curve" },
      { id: "arc", name: "Arc", icon: CircleIcon, description: "Curved cyclical arc" },
    ],
  },
  {
    id: "annotations",
    name: "Annotation & Text",
    icon: Type,
    tools: [
      { id: "text", name: "Text", icon: Type, description: "Custom text annotation" },
      { id: "anchored_text", name: "Anchored Text", icon: Type, description: "Pinned fixed text note" },
      { id: "note", name: "Sticky Note", icon: StickyNote, description: "Card note with backdrop" },
      { id: "pin", name: "Pin", icon: Pin, description: "Map marker pin on candle" },
      { id: "callout", name: "Callout", icon: MessageSquare, description: "Speech bubble callout" },
      { id: "comment", name: "Comment Box", icon: MessageSquare, description: "Rounded comment label" },
      { id: "price_label", name: "Price Label", icon: DollarSign, description: "TradingView style price tag" },
      { id: "price_note", name: "Price Note", icon: DollarSign, description: "Price tag with connector" },
      { id: "arrow_marker", name: "Arrow Marker", icon: ArrowUpRight, description: "Bullish/Bearish signal arrow" },
      { id: "flag", name: "Milestone Flag", icon: Flag, description: "Waving milestone flag" },
      { id: "signpost", name: "Signpost", icon: Compass, description: "Directional milestone sign" },
    ],
  },
  {
    id: "patterns",
    name: "Patterns & Harmonics",
    icon: BarChart2,
    tools: [
      { id: "head_and_shoulders", name: "Head & Shoulders", icon: BarChart2, description: "Left, Head, Right + Neckline" },
      { id: "xabcd_pattern", name: "XABCD Pattern", icon: Sliders, description: "5-point harmonic pattern" },
      { id: "cypher_pattern", name: "Cypher Pattern", icon: Sliders, description: "Cypher harmonic reversal" },
      { id: "bat_pattern", name: "Bat Pattern", icon: Activity, description: "0.886 retracement harmonic" },
      { id: "butterfly_pattern", name: "Butterfly Pattern", icon: Activity, description: "1.27 extension harmonic" },
      { id: "shark_pattern", name: "Shark Pattern", icon: Activity, description: "Deep 1.13 harmonic structure" },
      { id: "elliott_wave_impulse", name: "Elliott Wave (12345)", icon: TrendingUp, description: "5-wave impulse cycle" },
      { id: "elliott_wave_corrective", name: "Elliott Wave (ABC)", icon: TrendingDown, description: "3-wave corrective cycle" },
      { id: "triangle_pattern", name: "Triangle Pattern (ABCDE)", icon: Triangle, description: "Symmetrical wedge pattern" },
      { id: "double_top", name: "Double Top (M Pattern)", icon: TrendingDown, description: "Bearish reversal pattern" },
      { id: "double_bottom", name: "Double Bottom (W Pattern)", icon: TrendingUp, description: "Bullish reversal pattern" },
      { id: "rising_wedge", name: "Rising Wedge", icon: Triangle, description: "Bearish narrowing wedge" },
      { id: "falling_wedge", name: "Falling Wedge", icon: Triangle, description: "Bullish narrowing wedge" },
      { id: "triple_tap", name: "Three Drives Pattern", icon: BarChart2, description: "Triple harmonic tap reversal" },
    ],
  },
  {
    id: "prediction",
    name: "Prediction & Measurement",
    icon: Target,
    tools: [
      { id: "long_position", name: "Long Position", icon: Target, description: "Long R:R box (TP +2R / SL -1R)" },
      { id: "short_position", name: "Short Position", icon: ShieldAlert, description: "Short R:R box (TP +2R / SL -1R)" },
      { id: "forecast", name: "Forecast", icon: MoveUpRight, description: "Price target forecast path" },
      { id: "measure", name: "Measure (Ruler)", icon: Ruler, description: "Measure bars, pips & % change" },
      { id: "date_range", name: "Date Range", icon: Calendar, description: "Time duration highlight" },
      { id: "price_range", name: "Price Range", icon: BarChart2, description: "Price span & pip delta" },
      { id: "date_and_price", name: "Date & Price Range", icon: Square, description: "2D time & price dimension box" },
      { id: "bars_pattern", name: "Ghost Bars", icon: BarChart2, description: "Historical bar ghost projection" },
    ],
  },
  {
    id: "icons",
    name: "Icons & Stickers",
    icon: Sparkles,
    tools: [
      { id: "icon_star", name: "Star Landmark", icon: Sparkles, description: "Golden star landmark" },
      { id: "icon_target", name: "Sniper Target", icon: Target, description: "Sniper entry target" },
      { id: "icon_shield", name: "Defense Shield", icon: Shield, description: "Stop loss safety buffer" },
      { id: "icon_check", name: "Checkmark", icon: Check, description: "Validated milestone" },
      { id: "icon_dollar", name: "Liquidity Pool", icon: DollarSign, description: "Liquidity cash pool" },
      { id: "icon_flag", name: "Checkpoint Flag", icon: Flag, description: "Key reaction level" },
      { id: "icon_fire", name: "Hot Reaction Zone", icon: Flame, description: "High volume volatility" },
      { id: "icon_zap", name: "Breakout Lightning", icon: Zap, description: "Fast momentum breakout" },
      { id: "icon_award", name: "Profit Milestone", icon: Award, description: "Take profit hit" },
    ],
  },
];

const COLOR_SWATCHES = [
  { name: "TradingView Blue", value: "#2962FF" },
  { name: "Sky Blue", value: "#38bdf8" },
  { name: "Emerald Green", value: "#089981" },
  { name: "Rose Red", value: "#f23645" },
  { name: "Amber Orange", value: "#ff9800" },
  { name: "Purple", value: "#ab47bc" },
  { name: "Pure White", value: "#ffffff" },
  { name: "Yellow", value: "#fbc02d" },
];

export default function LightweightChartWidget({
  initialSymbol = "",
  initialTimeframe = "1m",
  theme: themeProp,
  activeIndicators = [],
}: LightweightChartWidgetProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const markersRef = useRef<any>(null);

  // Tracks whether the initial snapshot has been fitted once, preventing auto-snap on subsequent ticks/drag
  const hasFittedInitialSnapshot = useRef(false);

  // Portal mount check for SSR safe portals
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ── Dynamic Theme Synchronization ───────────────────────────────────────
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

  // Dynamic Symbol & Timeframe State (Defaults empty until MT5 reports symbols)
  const [symbol, setSymbol] = useState(initialSymbol || "");
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [symbolsList, setSymbolsList] = useState<any[]>([]);

  // Candles & Live Tick State
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [currentTick, setCurrentTick] = useState<{ price: number; time: number; change: number; changePercent: number }>({
    price: 0,
    time: Math.floor(Date.now() / 1000),
    change: 0,
    changePercent: 0,
  });

  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);

  // UI Modals & Popovers
  const [symbolModalOpen, setSymbolModalOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState("");
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxCode, setSandboxCode] = useState(BUILTIN_SCRIPTS.supertrend);

  // Indicators
  const [activeBuiltins, setActiveBuiltins] = useState<string[]>([]);

  // ── 100+ TradingView Drawing Tools State & Toggles ────────────────────────
  const [activeTool, setActiveTool] = useState<string>("cursor");
  const [activeCategoryFlyout, setActiveCategoryFlyout] = useState<string | null>(null);
  const [stayInDrawMode, setStayInDrawMode] = useState<boolean>(false);
  const [showDrawings, setShowDrawings] = useState<boolean>(true);
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingItem | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const drawingSvgRef = useRef<SVGSVGElement | null>(null);

  // WebSocket Connection State
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>("Connecting to MT5 Python Bridge...");
  const [brokerInfo, setBrokerInfo] = useState<any>({});
  const wsRef = useRef<WebSocket | null>(null);

  // Unique client/chart ID for multi-user multiplexing
  const clientId = useMemo(() => {
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
      return "chart_" + window.crypto.randomUUID();
    }
    return "chart_" + Math.random().toString(36).substring(2, 11);
  }, []);

  // 1. Fetch Dynamic Symbols from Python server.py (port 8000)
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/symbols")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setSymbolsList(json.data);
          setSymbol((prev) => {
            if (prev && json.data.some((s: any) => s.symbol === prev)) return prev;
            if (json.data.some((s: any) => s.symbol === "EURUSD")) return "EURUSD";
            return json.data[0].symbol;
          });
          setWsError(null);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Initialize Lightweight Chart Canvas
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? "#131722" : "#ffffff" },
        textColor: isDark ? "#d1d4dc" : "#131722",
        fontSize: 11,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif",
      },
      grid: {
        vertLines: { color: isDark ? "rgba(42, 46, 57, 0.4)" : "rgba(226, 232, 240, 0.8)" },
        horzLines: { color: isDark ? "rgba(42, 46, 57, 0.4)" : "rgba(226, 232, 240, 0.8)" },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: "#2962FF", width: 1, style: 3, labelBackgroundColor: "#2962FF" },
        horzLine: { color: "#2962FF", width: 1, style: 3, labelBackgroundColor: "#2962FF" },
      },
      timeScale: {
        borderColor: isDark ? "#2a2e39" : "#e0e3eb",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 15,
        shiftVisibleRangeOnNewBar: false,
        fixLeftEdge: false,
        fixRightEdge: false,
        minBarSpacing: 0.5,
      },
      rightPriceScale: { borderColor: isDark ? "#2a2e39" : "#e0e3eb", scaleMargins: { top: 0.1, bottom: 0.1 } },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    // Main Candlestick Series (TradingView colors)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#089981",
      downColor: "#f23645",
      borderVisible: false,
      wickUpColor: "#089981",
      wickDownColor: "#f23645",
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.seriesData.get(candleSeries)) {
        const data = param.seriesData.get(candleSeries) as any;
        if (data) {
          setHoveredCandle({
            time: typeof param.time === "number" ? param.time : Math.floor(Date.now() / 1000),
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            volume: 0,
          });
        }
      } else {
        setHoveredCandle(null);
      }
    });

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && chartRef.current) {
          chartRef.current.applyOptions({ width, height });
        }
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [isDark]);

  // 3. Connect to Python Bridge WebSocket (ws://127.0.0.1:8000/ws)
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isDisposed = false;

    const connectWs = () => {
      if (isDisposed) return;
      try {
        ws = new WebSocket("ws://127.0.0.1:8000/ws");
        wsRef.current = ws;

        ws.onopen = () => {
          if (isDisposed) return;
          setWsConnected(true);
          setWsError(null);
          ws?.send(JSON.stringify({ type: "get_symbols", client_id: clientId }));
          if (symbol) {
            ws?.send(JSON.stringify({ type: "subscribe", client_id: clientId, symbol, timeframe }));
          }
        };

        ws.onmessage = (event) => {
          if (isDisposed) return;
          try {
            const msg = JSON.parse(event.data);

            if (msg.type === "broker_status") {
              setBrokerInfo(msg.broker || {});
              if (msg.connected) {
                setWsError(null);
              } else {
                setWsError(msg.error || "Awaiting connection to MT5 RPC bridge...");
              }
            }

            if (msg.type === "symbols_list" && Array.isArray(msg.data) && msg.data.length > 0) {
              setSymbolsList(msg.data);
              setSymbol((prev) => {
                if (prev && msg.data.some((s: any) => s.symbol === prev)) return prev;
                if (msg.data.some((s: any) => s.symbol === "EURUSD")) return "EURUSD";
                return msg.data[0]?.symbol || "";
              });
              setWsError(null);
            }

            if (msg.type === "snapshot" && Array.isArray(msg.data)) {
              if (!msg.client_id || msg.client_id === clientId) {
                setCandles(msg.data);
                setWsError(null);
                if (candleSeriesRef.current && msg.data.length > 0) {
                  const formatted: CandlestickData<Time>[] = msg.data.map((c: any) => ({
                    time: c.time as Time,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                  }));
                  candleSeriesRef.current.setData(formatted);

                  if (!hasFittedInitialSnapshot.current) {
                    chartRef.current?.timeScale().fitContent();
                    hasFittedInitialSnapshot.current = true;
                  }
                }

                if (msg.data.length > 0) {
                  const last = msg.data[msg.data.length - 1];
                  const first = msg.data[0];
                  const chg = last.close - first.open;
                  const chgPct = first.open > 0 ? (chg / first.open) * 100 : 0;
                  setCurrentTick({
                    price: last.close,
                    time: last.time,
                    change: chg,
                    changePercent: chgPct,
                  });
                }
              }
            }

            if (msg.type === "candle_update" && msg.candle) {
              if (msg.symbol === symbol && msg.timeframe === timeframe) {
                const updated = msg.candle as CandleData;
                if (candleSeriesRef.current) {
                  candleSeriesRef.current.update({
                    time: updated.time as Time,
                    open: updated.open,
                    high: updated.high,
                    low: updated.low,
                    close: updated.close,
                  });
                }

                setCandles((prev) => {
                  if (prev.length === 0) return [updated];
                  const last = prev[prev.length - 1];
                  if (last.time === updated.time) {
                    const next = [...prev];
                    next[next.length - 1] = updated;
                    return next;
                  } else if (updated.time > last.time) {
                    return [...prev.slice(-499), updated];
                  }
                  return prev;
                });

                if (msg.tick) {
                  setCurrentTick((prev) => ({
                    price: msg.tick.price || updated.close,
                    time: msg.tick.time || updated.time,
                    change: updated.close - (prev.price || updated.close),
                    changePercent: prev.price > 0 ? ((updated.close - prev.price) / prev.price) * 100 : 0,
                  }));
                }
              }
            }
          } catch (e) {
            console.error("WS Parse error:", e);
          }
        };

        ws.onerror = () => {
          setWsConnected(false);
          setWsError("Cannot reach MT5 bridge at ws://127.0.0.1:8000/ws");
        };

        ws.onclose = () => {
          setWsConnected(false);
          if (!isDisposed) {
            reconnectTimer = setTimeout(connectWs, 2500);
          }
        };
      } catch {
        setWsConnected(false);
        if (!isDisposed) {
          reconnectTimer = setTimeout(connectWs, 2500);
        }
      }
    };

    connectWs();

    return () => {
      isDisposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [clientId, symbol, timeframe]);

  // 4. Send dynamic subscribe when symbol or timeframe changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && symbol) {
      setCandles([]);
      hasFittedInitialSnapshot.current = false;
      wsRef.current.send(JSON.stringify({ type: "subscribe", client_id: clientId, symbol, timeframe }));
    }
  }, [symbol, timeframe, clientId]);

  // 5. Update Indicators
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;

    const formattedCandles: CandlestickData<Time>[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeriesRef.current.setData(formattedCandles);

    const activeScriptsToRun: Array<{ id: string; name: string; script: string }> = [];
    activeBuiltins.forEach((key) => {
      if (BUILTIN_SCRIPTS[key]) activeScriptsToRun.push({ id: key, name: key, script: BUILTIN_SCRIPTS[key] });
    });
    activeIndicators.forEach((ind) => {
      const scriptCode = ind.latestVersion?.script;
      if (scriptCode) activeScriptsToRun.push({ id: ind.id, name: ind.name, script: scriptCode });
    });
    if (sandboxOpen && sandboxCode) {
      activeScriptsToRun.push({ id: "sandbox", name: "Custom Sandbox Script", script: sandboxCode });
    }

    const currentIndicatorIds = new Set(activeScriptsToRun.map((s) => s.id));
    indicatorSeriesRef.current.forEach((series, key) => {
      if (!currentIndicatorIds.has(key.split("_")[0]) && chartRef.current) {
        try {
          chartRef.current.removeSeries(series);
        } catch {}
        indicatorSeriesRef.current.delete(key);
      }
    });

    const allMarkers: SeriesMarker<Time>[] = [];
    activeScriptsToRun.forEach((item) => {
      const output = PineScriptEngine.execute(item.script, candles);
      output.plots.forEach((plot, pIdx) => {
        const lineKey = `${item.id}_plot_${pIdx}`;
        let lineSeries = indicatorSeriesRef.current.get(lineKey);
        if (!lineSeries && chartRef.current) {
          lineSeries = chartRef.current.addSeries(LineSeries, {
            color: plot.color || "#2962FF",
            lineWidth: 2,
            title: plot.title || item.name,
            priceScaleId: plot.overlay ? "right" : "",
          });
          indicatorSeriesRef.current.set(lineKey, lineSeries);
        }
        if (lineSeries) {
          const lineData: LineData<Time>[] = plot.data
            .filter((d) => !isNaN(d.value) && d.value !== null)
            .map((d) => ({ time: d.time as Time, value: d.value }));
          lineSeries.setData(lineData);
        }
      });

      output.markers?.forEach((marker) => {
        allMarkers.push({
          time: marker.time as Time,
          position: marker.position,
          color: marker.color || "#089981",
          shape: marker.shape,
          text: marker.text || "SIGNAL",
        });
      });
    });

    if (candleSeriesRef.current) {
      try {
        if (markersRef.current && typeof markersRef.current.setMarkers === "function") {
          markersRef.current.setMarkers(allMarkers);
        } else {
          markersRef.current = createSeriesMarkers(candleSeriesRef.current, allMarkers);
        }
      } catch {}
    }
  }, [candles, activeBuiltins, activeIndicators, sandboxOpen, sandboxCode]);

  // ── Global Keyboard Shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);

      if (e.key === "Escape") {
        setSymbolModalOpen(false);
        setActiveCategoryFlyout(null);
        setSelectedDrawingId(null);
        setColorPickerOpen(false);
        if (activeTool !== "cursor") setActiveTool("cursor");
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedDrawingId && !isInputActive) {
        setDrawings((prev) => prev.filter((d) => d.id !== selectedDrawingId));
        setSelectedDrawingId(null);
        return;
      }

      // Quick symbol search shortcut: Pressing any letter/number on the chart opens pair search!
      if (
        !isInputActive &&
        !symbolModalOpen &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        e.key.length === 1 &&
        /^[a-zA-Z0-9]$/.test(e.key)
      ) {
        e.preventDefault();
        setSymbolSearch(e.key);
        setSymbolModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [selectedDrawingId, symbolModalOpen, activeTool]);


  const activeSymbolInfo = useMemo(() => {
    if (!symbol) {
      return { symbol: "", name: "Awaiting broker stream...", category: "Forex", digits: 5 };
    }
    return (
      symbolsList.find((s) => s.symbol === symbol) || {
        symbol: symbol,
        name: symbol,
        category: "Forex",
        digits: 5,
      }
    );
  }, [symbol, symbolsList]);

  // ── Smart Drawing Creation (Handles Both Click and Drag Seamlessly!) ──────────
  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === "cursor") {
      setSelectedDrawingId(null);
      return;
    }

    if (activeTool === "eraser") {
      return;
    }

    // Determine standard color based on tool type
    let toolColor = "#2962FF";
    if (activeTool.includes("bull") || activeTool === "long_position") toolColor = "#089981";
    if (activeTool.includes("bear") || activeTool === "short_position") toolColor = "#f23645";
    if (activeTool === "choch" || activeTool === "breaker_block") toolColor = "#ab47bc";
    if (activeTool === "horizontal" || activeTool === "eqh_eql") toolColor = "#ff9800";

    setCurrentDrawing({
      id: `draw_${Date.now()}`,
      type: activeTool,
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      color: toolColor,
      points: activeTool === "brush" || activeTool === "highlighter" ? [{ x, y }] : undefined,
    });
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!currentDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentDrawing.type === "brush" || currentDrawing.type === "highlighter") {
      setCurrentDrawing((prev) =>
        prev ? { ...prev, endX: x, endY: y, points: [...(prev.points || []), { x, y }] } : null
      );
    } else {
      setCurrentDrawing((prev) => (prev ? { ...prev, endX: x, endY: y } : null));
    }
  };

  const handleSvgMouseUp = () => {
    if (!currentDrawing) return;

    let finalDrawing = { ...currentDrawing };
    const dist = Math.hypot(finalDrawing.endX - finalDrawing.startX, finalDrawing.endY - finalDrawing.startY);

    // If user clicked without dragging (or dragged < 8px), generate professional default dimensions!
    if (dist < 8) {
      const { startX: x, startY: y, type } = finalDrawing;
      if (type === "trendline" || type === "info_line" || type === "trend_angle" || type === "regression_line") {
        finalDrawing.endX = x + 160;
        finalDrawing.endY = y - 40;
      } else if (type === "ray" || type === "extended_line") {
        finalDrawing.endX = x + 180;
        finalDrawing.endY = y - 30;
      } else if (type === "horizontal" || type === "horizontal_ray") {
        finalDrawing.startX = type === "horizontal_ray" ? x : 0;
        finalDrawing.endX = 9999;
        finalDrawing.endY = y;
      } else if (type === "vertical") {
        finalDrawing.startY = 0;
        finalDrawing.endY = 9999;
      } else if (type === "fvg_bull" || type === "fvg_bear") {
        finalDrawing.endX = x + 160;
        finalDrawing.endY = y + 28;
      } else if (type.includes("block") || type === "rectangle" || type === "gann_box" || type === "imbalance_void") {
        finalDrawing.endX = x + 160;
        finalDrawing.endY = y + 45;
      } else if (type === "choch" || type === "bos" || type === "eqh_eql") {
        finalDrawing.startX = Math.max(0, x - 50);
        finalDrawing.endX = x + 90;
        finalDrawing.label = type === "choch" ? "CHoCH" : type === "bos" ? "BOS" : "EQH / EQL";
      } else if (type === "premium_discount") {
        finalDrawing.endX = x + 200;
        finalDrawing.endY = y + 80;
      } else if (type === "long_position") {
        finalDrawing.endX = x + 160;
        finalDrawing.endY = y - 50; // TP height
      } else if (type === "short_position") {
        finalDrawing.endX = x + 160;
        finalDrawing.endY = y + 50; // SL height
      } else if (type === "measure" || type === "price_range" || type === "date_and_price") {
        finalDrawing.endX = x + 140;
        finalDrawing.endY = y + 50;
      } else if (type === "circle" || type === "ellipse") {
        finalDrawing.endX = x + 90;
        finalDrawing.endY = y + 60;
      } else if (type === "triangle" || type === "rising_wedge" || type === "falling_wedge") {
        finalDrawing.endX = x + 150;
        finalDrawing.endY = y + 60;
      } else if (type.includes("fib") || type.includes("pitchfork")) {
        finalDrawing.endX = x + 200;
        finalDrawing.endY = y + 100;
      } else if (type.includes("pattern") || type.includes("wave") || type === "head_and_shoulders" || type === "double_top" || type === "double_bottom") {
        finalDrawing.endX = x + 180;
        finalDrawing.endY = y + 70;
      } else if (type === "text" || type === "note" || type === "callout") {
        finalDrawing.endX = x + 100;
        finalDrawing.endY = y + 30;
        finalDrawing.label = prompt("Enter chart annotation text:", "Key Level / Reaction") || "Analysis Note";
      } else if (type.startsWith("icon_")) {
        finalDrawing.endX = x + 24;
        finalDrawing.endY = y + 24;
      }
    }

    setDrawings((prev) => [...prev, finalDrawing]);
    setSelectedDrawingId(finalDrawing.id);
    setCurrentDrawing(null);

    // If not in stay-in-drawing mode, switch back to cursor so user can select & inspect right away
    if (!stayInDrawMode) {
      setActiveTool("cursor");
    }
  };

  // Drawing Actions: Change Color, Edit Label, Delete
  const selectedDrawing = useMemo(
    () => drawings.find((d) => d.id === selectedDrawingId) || null,
    [drawings, selectedDrawingId]
  );

  const handleUpdateSelectedColor = (newColor: string) => {
    if (!selectedDrawingId) return;
    setDrawings((prev) =>
      prev.map((d) => (d.id === selectedDrawingId ? { ...d, color: newColor } : d))
    );
    setColorPickerOpen(false);
  };

  const handleEditSelectedLabel = () => {
    if (!selectedDrawing) return;
    const current = selectedDrawing.label || selectedDrawing.name || "Analysis Note";
    const next = prompt("Edit annotation text:", current);
    if (next !== null) {
      setDrawings((prev) =>
        prev.map((d) => (d.id === selectedDrawingId ? { ...d, label: next } : d))
      );
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedDrawingId) return;
    setDrawings((prev) => prev.filter((d) => d.id !== selectedDrawingId));
    setSelectedDrawingId(null);
  };

  const handleCloseSymbolModal = useCallback(() => {
    setSymbolModalOpen(false);
    setSymbolSearch("");
  }, []);

  const handleSelectSymbolFromModal = useCallback((sName: string) => {
    setSymbol(sName);
    setSymbolModalOpen(false);
    setSymbolSearch("");
    hasFittedInitialSnapshot.current = false;
  }, []);

  const handleSelectTimeframe = (tfVal: string) => {
    setTimeframe(tfVal);
    hasFittedInitialSnapshot.current = false;
  };

  return (
    <div
      className="flex flex-col h-full w-full rounded-2xl border border-slate-200 dark:border-[#2a2e39] bg-white dark:bg-[#131722] text-slate-900 dark:text-[#d1d4dc] shadow-2xl relative transition-colors overflow-hidden min-h-0"
      style={{ isolation: "isolate" }}
    >
      {/* ═══════════════════════════════════════════
          TRADINGVIEW TOP TOOLBAR
      ═══════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-200 dark:border-[#2a2e39] bg-slate-50/90 dark:bg-[#131722] shrink-0 z-30 relative select-none">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Symbol Search Pop-up Modal Trigger */}
          <button
            type="button"
            onClick={() => {
              setSymbolModalOpen(true);
              setSymbolSearch("");
            }}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 dark:bg-[#1e222d] dark:hover:bg-[#2a2e39] border border-slate-200 dark:border-[#2a2e39] text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            {symbol ? (
              <>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#2962FF]/15 text-[#2962FF] border border-[#2962FF]/30">
                  {activeSymbolInfo.category || "Forex"}
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">{symbol}</span>
                <span className="text-slate-500 dark:text-[#787b86] font-normal hidden md:inline text-[11px]">
                  {activeSymbolInfo.name}
                </span>
              </>
            ) : (
              <span className="text-amber-500 flex items-center gap-1.5 font-semibold text-xs animate-pulse">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Connecting MT5...
              </span>
            )}
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-[#2a2e39] mx-0.5 hidden sm:block" />

          {/* Timeframe Selector Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-[#1e222d] rounded-lg p-0.5 border border-slate-200/80 dark:border-[#2a2e39]">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                type="button"
                onClick={() => handleSelectTimeframe(tf.value)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  timeframe === tf.value
                    ? "bg-[#2962FF] text-white shadow-xs"
                    : "text-slate-600 dark:text-[#787b86] hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-[#2a2e39] mx-0.5 hidden sm:block" />

          {/* Pine Script Sandbox Button */}
          <button
            type="button"
            onClick={() => setSandboxOpen(!sandboxOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
              sandboxOpen
                ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                : "bg-white hover:bg-slate-100 dark:bg-[#1e222d] dark:hover:bg-[#2a2e39] border-slate-200 dark:border-[#2a2e39] text-slate-700 dark:text-[#d1d4dc]"
            }`}
          >
            <Code2 className="h-3.5 w-3.5 text-purple-400" />
            <span className="hidden sm:inline">Pine Script</span>
          </button>
        </div>

        {/* Live Broker Status Tag */}
        <div className="flex items-center gap-2">
          {wsConnected && !wsError ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>MT5 Live ({brokerInfo.server || "Port 8001"})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>Awaiting MT5</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          TRADINGVIEW OHLC REAL-TIME BAR
      ═══════════════════════════════════════════ */}
      <div className="flex items-center gap-3 px-3 py-1 text-[11px] font-mono border-b border-slate-100 dark:border-[#2a2e39]/60 bg-white/40 dark:bg-[#131722]/90 overflow-x-auto shrink-0 select-none">
        {symbol ? (
          <>
            <span className="font-extrabold text-[#2962FF]">{symbol}</span>
            <span>
              O: <strong>{hoveredCandle ? hoveredCandle.open.toFixed(activeSymbolInfo.digits) : currentTick.price.toFixed(activeSymbolInfo.digits)}</strong>
            </span>
            <span>
              H: <strong className="text-[#089981]">{hoveredCandle ? hoveredCandle.high.toFixed(activeSymbolInfo.digits) : currentTick.price.toFixed(activeSymbolInfo.digits)}</strong>
            </span>
            <span>
              L: <strong className="text-[#f23645]">{hoveredCandle ? hoveredCandle.low.toFixed(activeSymbolInfo.digits) : currentTick.price.toFixed(activeSymbolInfo.digits)}</strong>
            </span>
            <span>
              C: <strong>{hoveredCandle ? hoveredCandle.close.toFixed(activeSymbolInfo.digits) : currentTick.price.toFixed(activeSymbolInfo.digits)}</strong>
            </span>
            <span className={currentTick.change >= 0 ? "text-[#089981] font-bold" : "text-[#f23645] font-bold"}>
              {currentTick.change >= 0 ? "+" : ""}
              {currentTick.change.toFixed(activeSymbolInfo.digits)} ({currentTick.changePercent.toFixed(2)}%)
            </span>
            {activeSymbolInfo.spread !== undefined && (
              <span className="text-slate-400 text-[10px]">Spread: {activeSymbolInfo.spread}</span>
            )}
          </>
        ) : (
          <span className="text-slate-400 italic">Streaming tick feed...</span>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          MAIN WORKSPACE: DOCKED PRO SIDEBAR + CHART
      ═══════════════════════════════════════════ */}
      <div className="relative flex-1 w-full h-full min-h-0 flex flex-row overflow-hidden">
        {/* PRO DOCKED TOOLBAR (TradingView Charcoal Style w-11) */}
        <div className="w-11 shrink-0 border-r border-slate-200 dark:border-[#2a2e39] bg-slate-50 dark:bg-[#131722] flex flex-col items-center py-1.5 gap-1 z-20 overflow-y-auto scrollbar-none select-none">
          {TOOL_CATEGORIES.map((cat) => {
            const isCategoryActive = cat.tools.some((t) => t.id === activeTool);
            const activeToolDef = cat.tools.find((t) => t.id === activeTool) || cat.tools[0];
            const IconComp = isCategoryActive ? activeToolDef.icon : cat.icon;
            const isFlyoutOpen = activeCategoryFlyout === cat.id;

            return (
              <div key={cat.id} className="relative">
                <button
                  type="button"
                  title={cat.name}
                  onClick={() => {
                    setActiveCategoryFlyout(isFlyoutOpen ? null : cat.id);
                  }}
                  className={`w-8 h-8 rounded-lg transition-all cursor-pointer flex items-center justify-center relative group ${
                    isCategoryActive
                      ? "bg-[#2962FF] text-white shadow-md shadow-blue-500/20"
                      : "text-slate-600 dark:text-[#787b86] hover:bg-slate-200/70 dark:hover:bg-[#2a2e39] hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <IconComp className="h-4 w-4" />
                  <span className="absolute bottom-0 right-0 text-[6px] opacity-70">▾</span>
                </button>

                {/* Flyout Submenu for Category Tools (100+ tools accessible) */}
                {isFlyoutOpen && (
                  <div className="absolute left-full top-0 ml-1.5 w-72 rounded-2xl border border-slate-200 dark:border-[#2a2e39] bg-white dark:bg-[#1e222d] shadow-2xl p-1.5 z-[9999] space-y-1 animate-in fade-in slide-in-from-left-2 duration-150 backdrop-blur-xl">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-[#787b86] uppercase tracking-wider border-b border-slate-100 dark:border-[#2a2e39] flex items-center justify-between">
                      <span>{cat.name}</span>
                      <span className="text-[9px] text-[#2962FF] font-mono font-bold">{cat.tools.length} Tools</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto space-y-0.5 py-1 pr-0.5">
                      {cat.tools.map((tool) => {
                        const TIcon = tool.icon;
                        const isSelected = activeTool === tool.id;
                        return (
                          <button
                            key={tool.id}
                            type="button"
                            onClick={() => {
                              setActiveTool(tool.id);
                              setActiveCategoryFlyout(null);
                            }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                              isSelected
                                ? "bg-[#2962FF] text-white font-bold"
                                : "text-slate-700 dark:text-[#d1d4dc] hover:bg-slate-100 dark:hover:bg-[#2a2e39]"
                            }`}
                          >
                            <TIcon className="h-4 w-4 shrink-0" />
                            <div className="truncate">
                              <p className="font-semibold leading-tight text-[11px]">{tool.name}</p>
                              {tool.description && (
                                <p
                                  className={`text-[9px] truncate ${
                                    isSelected ? "text-blue-100" : "text-slate-400 dark:text-[#787b86]"
                                  }`}
                                >
                                  {tool.description}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="w-5 h-px bg-slate-200 dark:bg-[#2a2e39] my-1" />

          {/* Stay in Drawing Mode Lock Button */}
          <button
            type="button"
            title={stayInDrawMode ? "Stay in Drawing Mode: ON (Click to toggle)" : "Stay in Drawing Mode: OFF"}
            onClick={() => setStayInDrawMode(!stayInDrawMode)}
            className={`w-8 h-8 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
              stayInDrawMode
                ? "bg-[#2962FF]/20 text-[#2962FF] border border-[#2962FF]/40"
                : "text-slate-600 dark:text-[#787b86] hover:bg-slate-200/70 dark:hover:bg-[#2a2e39]"
            }`}
          >
            {stayInDrawMode ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          </button>

          {/* Hide / Show All Drawings Toggle */}
          <button
            type="button"
            title={showDrawings ? "Hide All Drawings" : "Show All Drawings"}
            onClick={() => setShowDrawings(!showDrawings)}
            className={`w-8 h-8 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
              !showDrawings
                ? "text-rose-500 bg-rose-500/10"
                : "text-slate-600 dark:text-[#787b86] hover:bg-slate-200/70 dark:hover:bg-[#2a2e39]"
            }`}
          >
            {showDrawings ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>

          {/* Delete Selected Tool */}
          {selectedDrawingId && (
            <button
              type="button"
              title="Delete Selected (Del / Backspace)"
              onClick={handleDeleteSelected}
              className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 transition-all cursor-pointer flex items-center justify-center"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Clear All Drawings */}
          <button
            type="button"
            title="Clear All Drawings"
            disabled={drawings.length === 0}
            onClick={() => {
              setDrawings([]);
              setSelectedDrawingId(null);
              setActiveTool("cursor");
            }}
            className="w-8 h-8 rounded-lg hover:bg-rose-500/15 hover:text-rose-500 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center text-slate-600 dark:text-[#787b86]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* CHART DISPLAY AREA */}
        <div className="relative flex-1 h-full min-h-0 overflow-hidden bg-white dark:bg-[#131722]">
          {/* Lightweight Charts Canvas */}
          <div className="absolute inset-0" ref={chartContainerRef} />

          {/* SVG DRAWING LAYER:
              In cursor mode, pointerEvents: 'none' on SVG allows full scroll, zoom, pan on chart!
              Individual drawings have pointerEvents: 'auto' so clicking any drawing selects it.
          */}
          {showDrawings && (
            <svg
              ref={drawingSvgRef}
              className={`absolute inset-0 z-10 w-full h-full ${
                activeTool === "cursor"
                  ? "pointer-events-none"
                  : activeTool === "eraser"
                  ? "pointer-events-auto cursor-pointer"
                  : "pointer-events-auto cursor-crosshair"
              }`}
              onMouseDown={handleSvgMouseDown}
              onMouseMove={handleSvgMouseMove}
              onMouseUp={handleSvgMouseUp}
            >
              <g style={{ pointerEvents: activeTool === "cursor" || activeTool === "eraser" ? "auto" : "none" }}>
                {[...drawings, ...(currentDrawing ? [currentDrawing] : [])].map((d) => {
                  const isSelected = selectedDrawingId === d.id;
                  const strokeColor = d.color || "#2962FF";

                  const handleClick = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (activeTool === "eraser") {
                      setDrawings((prev) => prev.filter((item) => item.id !== d.id));
                      if (selectedDrawingId === d.id) setSelectedDrawingId(null);
                    } else if (activeTool === "cursor") {
                      setSelectedDrawingId(d.id);
                    }
                  };

                  // ── 1. SMC / ICT RENDERERS ──
                  if (d.type === "fvg_bull" || d.type === "fvg_bear") {
                    const x = Math.min(d.startX, d.endX);
                    const y = Math.min(d.startY, d.endY);
                    const w = Math.max(Math.abs(d.endX - d.startX), 80);
                    const h = Math.max(Math.abs(d.endY - d.startY), 18);
                    const isBull = d.type === "fvg_bull";
                    const fvgColor = isBull ? "#089981" : "#f23645";
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          fill={isBull ? "rgba(8, 153, 129, 0.2)" : "rgba(242, 54, 69, 0.2)"}
                          stroke={fvgColor}
                          strokeWidth={isSelected ? "2.5" : "1.5"}
                          strokeDasharray={isSelected ? "4 2" : undefined}
                        />
                        <rect x={x + 4} y={y + 3} width={76} height={13} rx={2.5} fill={fvgColor} />
                        <text x={x + 7} y={y + 12} fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
                          {isBull ? "+FVG Demand" : "-FVG Supply"}
                        </text>
                        {isSelected && <circle cx={x + w} cy={y + h / 2} r="4" fill="#fff" stroke={fvgColor} strokeWidth="1.5" />}
                      </g>
                    );
                  }

                  if (d.type.includes("block") || d.type === "imbalance_void" || d.type === "liquidity_sweep") {
                    const x = Math.min(d.startX, d.endX);
                    const y = Math.min(d.startY, d.endY);
                    const w = Math.max(Math.abs(d.endX - d.startX), 90);
                    const h = Math.max(Math.abs(d.endY - d.startY), 22);
                    const isBull = d.type.includes("bull");
                    const blockColor = isBull ? "#089981" : d.type === "breaker_block" ? "#ab47bc" : "#f23645";
                    const blockName = d.type === "breaker_block" ? "Breaker Block" : isBull ? "+OB Institutional" : "-OB Institutional";
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          fill={`${blockColor}22`}
                          stroke={blockColor}
                          strokeWidth={isSelected ? "2.5" : "1.5"}
                          rx={3}
                        />
                        <rect x={x + 4} y={y + 3} width={88} height={14} rx={2.5} fill={blockColor} />
                        <text x={x + 7} y={y + 13} fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
                          {blockName}
                        </text>
                      </g>
                    );
                  }

                  if (d.type === "choch" || d.type === "bos" || d.type === "eqh_eql") {
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <line
                          x1={d.startX}
                          y1={d.startY}
                          x2={d.endX}
                          y2={d.startY}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? "3" : "2"}
                          strokeDasharray="4 2"
                        />
                        <rect x={(d.startX + d.endX) / 2 - 28} y={d.startY - 16} width="56" height="15" rx="3" fill={strokeColor} />
                        <text x={(d.startX + d.endX) / 2} y={d.startY - 5} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                          {d.label || d.type.toUpperCase()}
                        </text>
                      </g>
                    );
                  }

                  // ── 2. TREND TOOLS RENDERERS ──
                  if (d.type === "trendline" || d.type === "info_line" || d.type === "trend_angle" || d.type === "regression_line") {
                    const dx = d.endX - d.startX;
                    const dy = d.endY - d.startY;
                    const angle = (Math.atan2(dy, dx) * (180 / Math.PI)).toFixed(1);
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <line
                          x1={d.startX}
                          y1={d.startY}
                          x2={d.endX}
                          y2={d.endY}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? "3.5" : "2"}
                          strokeDasharray={isSelected ? "6 3" : undefined}
                          strokeLinecap="round"
                        />
                        <circle cx={d.startX} cy={d.startY} r={isSelected ? 5 : 3.5} fill={strokeColor} stroke="#ffffff" strokeWidth="1.5" />
                        <circle cx={d.endX} cy={d.endY} r={isSelected ? 5 : 3.5} fill={strokeColor} stroke="#ffffff" strokeWidth="1.5" />
                        <text x={(d.startX + d.endX) / 2} y={(d.startY + d.endY) / 2 - 8} fill={strokeColor} fontSize="10" fontFamily="monospace" textAnchor="middle" className="font-bold">
                          {angle}° {d.type === "info_line" ? `(dx: ${Math.round(dx)})` : ""}
                        </text>
                      </g>
                    );
                  }

                  if (d.type === "ray" || d.type === "extended_line") {
                    const dx = d.endX - d.startX;
                    const dy = d.endY - d.startY;
                    const len = Math.hypot(dx, dy) || 1;
                    const extX = d.startX + (dx / len) * 4000;
                    const extY = d.startY + (dy / len) * 4000;
                    const backX = d.type === "extended_line" ? d.startX - (dx / len) * 4000 : d.startX;
                    const backY = d.type === "extended_line" ? d.startY - (dy / len) * 4000 : d.startY;
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <line x1={backX} y1={backY} x2={extX} y2={extY} stroke={strokeColor} strokeWidth={isSelected ? "3" : "2"} strokeDasharray="6 3" />
                        <circle cx={d.startX} cy={d.startY} r={isSelected ? 5 : 3.5} fill={strokeColor} stroke="#fff" />
                        <circle cx={d.endX} cy={d.endY} r="3" fill={strokeColor} />
                      </g>
                    );
                  }

                  if (d.type === "horizontal" || d.type === "horizontal_ray") {
                    const xStart = d.type === "horizontal_ray" ? d.startX : 0;
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <line x1={xStart} y1={d.startY} x2={9999} y2={d.startY} stroke={strokeColor} strokeWidth={isSelected ? "3" : "2"} strokeDasharray={isSelected ? "8 4" : "4 4"} />
                        <rect x={Math.max(xStart + 10, 10)} y={d.startY - 17} width="78" height="15" rx="3" fill={strokeColor} />
                        <text x={Math.max(xStart + 14, 14)} y={d.startY - 6} fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
                          {d.label || "KEY LEVEL"}
                        </text>
                        {isSelected && <circle cx={xStart + 10} cy={d.startY} r="5" fill="#fff" stroke={strokeColor} strokeWidth="2" />}
                      </g>
                    );
                  }

                  if (d.type === "vertical") {
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <line x1={d.startX} y1={0} x2={d.startX} y2={9999} stroke={strokeColor} strokeWidth={isSelected ? "3" : "1.5"} strokeDasharray="4 4" />
                        <rect x={d.startX - 22} y="10" width="44" height="15" rx="3" fill={strokeColor} />
                        <text x={d.startX} y="21" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                          {d.label || "TIME"}
                        </text>
                      </g>
                    );
                  }

                  if (d.type === "cross_line") {
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <line x1={0} y1={d.startY} x2={9999} y2={d.startY} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3 3" />
                        <line x1={d.startX} y1={0} x2={d.startX} y2={9999} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3 3" />
                        <circle cx={d.startX} cy={d.startY} r={isSelected ? 6 : 4} fill={strokeColor} stroke="#fff" strokeWidth="2" />
                      </g>
                    );
                  }

                  if (d.type === "channel" || d.type === "disjoint_channel" || d.type === "flat_top_bottom" || d.type === "regression_channel") {
                    const chH = 45;
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <polygon points={`${d.startX},${d.startY} ${d.endX},${d.endY} ${d.endX},${d.endY + chH} ${d.startX},${d.startY + chH}`} fill={`${strokeColor}22`} />
                        <line x1={d.startX} y1={d.startY} x2={d.endX} y2={d.endY} stroke={strokeColor} strokeWidth={isSelected ? "3" : "2"} />
                        <line x1={d.startX} y1={d.startY + chH} x2={d.endX} y2={d.endY + chH} stroke={strokeColor} strokeWidth={isSelected ? "3" : "2"} />
                        <line x1={d.startX} y1={d.startY + chH / 2} x2={d.endX} y2={d.endY + chH / 2} stroke={strokeColor} strokeWidth="1" strokeDasharray="4 4" />
                      </g>
                    );
                  }

                  // ── 3. FIBONACCI & GANN RENDERERS ──
                  if (d.type.includes("fib") || d.type === "premium_discount") {
                    const minY = Math.min(d.startY, d.endY);
                    const maxY = Math.max(d.startY, d.endY);
                    const diff = Math.max(maxY - minY, 30);
                    const fibLevels =
                      d.type === "premium_discount"
                        ? [
                            { ratio: 0.0, color: "#f23645", label: "Premium (100%)" },
                            { ratio: 0.5, color: "#ab47bc", label: "50% Equilibrium (EQ)" },
                            { ratio: 1.0, color: "#089981", label: "Discount (0%)" },
                          ]
                        : [
                            { ratio: 0.0, color: "#787b86", label: "0.0%" },
                            { ratio: 0.236, color: "#38bdf8", label: "23.6%" },
                            { ratio: 0.382, color: "#ab47bc", label: "38.2%" },
                            { ratio: 0.5, color: "#089981", label: "50.0% (EQ)" },
                            { ratio: 0.618, color: "#ff9800", label: "61.8% (Golden)" },
                            { ratio: 0.786, color: "#ec4899", label: "78.6%" },
                            { ratio: 1.0, color: "#f23645", label: "100.0%" },
                          ];

                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        {fibLevels.map((fib, idx) => {
                          const y = minY + diff * fib.ratio;
                          return (
                            <g key={idx}>
                              <line x1={0} y1={y} x2={9999} y2={y} stroke={fib.color} strokeWidth={isSelected ? "2" : "1.2"} strokeDasharray="3 3" />
                              <rect x="60" y={y - 13} width="96" height="13" rx="2.5" fill={fib.color} fillOpacity="0.2" />
                              <text x="64" y={y - 3} fill={fib.color} fontSize="9" fontWeight="bold" fontFamily="monospace">
                                {fib.label}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    );
                  }

                  if (d.type.includes("pitchfork")) {
                    const midX = (d.startX + d.endX) / 2;
                    const midY = (d.startY + d.endY) / 2;
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <line x1={d.startX} y1={d.startY} x2={midX + 250} y2={midY - 40} stroke={strokeColor} strokeWidth="2" />
                        <line x1={d.startX} y1={d.startY - 30} x2={midX + 250} y2={midY - 70} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 2" />
                        <line x1={d.startX} y1={d.startY + 30} x2={midX + 250} y2={midY - 10} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 2" />
                        <text x={d.startX + 10} y={d.startY - 35} fill={strokeColor} fontSize="9" fontWeight="bold">Andrews Pitchfork</text>
                      </g>
                    );
                  }

                  // ── 4. SHAPES & BRUSHES ──
                  if (d.type === "rectangle" || d.type === "rotated_rectangle" || d.type === "gann_box" || d.type === "gann_square") {
                    const x = Math.min(d.startX, d.endX);
                    const y = Math.min(d.startY, d.endY);
                    const w = Math.max(Math.abs(d.endX - d.startX), 30);
                    const h = Math.max(Math.abs(d.endY - d.startY), 20);
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          fill={`${strokeColor}18`}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? "2.5" : "1.5"}
                          strokeDasharray={isSelected ? "5 3" : undefined}
                          rx="3"
                        />
                        <text x={x + 6} y={y + 13} fill={strokeColor} fontSize="9" fontWeight="bold" fontFamily="sans-serif">
                          {d.label || (d.type === "rectangle" ? "Zone Block" : "Gann Box")}
                        </text>
                        {isSelected && <circle cx={x + w} cy={y + h} r="4" fill="#fff" stroke={strokeColor} strokeWidth="1.5" />}
                      </g>
                    );
                  }

                  if (d.type === "circle" || d.type === "ellipse" || d.type === "arc") {
                    const cx = (d.startX + d.endX) / 2;
                    const cy = (d.startY + d.endY) / 2;
                    const rx = Math.max(Math.abs(d.endX - d.startX) / 2, 20);
                    const ry = Math.max(Math.abs(d.endY - d.startY) / 2, 20);
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`${strokeColor}18`} stroke={strokeColor} strokeWidth={isSelected ? "2.5" : "1.5"} />
                        {isSelected && <circle cx={cx + rx} cy={cy} r="4" fill="#fff" stroke={strokeColor} strokeWidth="1.5" />}
                      </g>
                    );
                  }

                  if (d.type === "triangle" || d.type === "rising_wedge" || d.type === "falling_wedge") {
                    const x1 = d.startX;
                    const y1 = d.startY;
                    const x2 = d.endX;
                    const y2 = d.endY;
                    const x3 = d.startX - (d.endX - d.startX);
                    const y3 = d.endY;
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <polygon points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} fill={`${strokeColor}18`} stroke={strokeColor} strokeWidth={isSelected ? "2.5" : "1.5"} />
                      </g>
                    );
                  }

                  if (d.type === "brush" || d.type === "highlighter") {
                    if (!d.points || d.points.length === 0) return null;
                    const pathData = d.points.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`, "");
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <path
                          d={pathData}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={d.type === "highlighter" ? "12" : isSelected ? "3.5" : "2"}
                          strokeOpacity={d.type === "highlighter" ? "0.35" : "1"}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                    );
                  }

                  // ── 5. PATTERNS (Harmonics, Elliott Wave, Head & Shoulders) ──
                  if (d.type === "head_and_shoulders") {
                    const w = Math.max(Math.abs(d.endX - d.startX), 140);
                    const x0 = Math.min(d.startX, d.endX);
                    const yBase = Math.max(d.startY, d.endY);
                    const lsX = x0 + w * 0.2, lsY = yBase - 40;
                    const hX = x0 + w * 0.5, hY = yBase - 80;
                    const rsX = x0 + w * 0.8, rsY = yBase - 40;
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <polyline points={`${x0},${yBase} ${lsX},${lsY} ${x0 + w * 0.35},${yBase} ${hX},${hY} ${x0 + w * 0.65},${yBase} ${rsX},${rsY} ${x0 + w},${yBase}`} fill="none" stroke={strokeColor} strokeWidth="2" />
                        <line x1={x0} y1={yBase} x2={x0 + w} y2={yBase} stroke={strokeColor} strokeWidth="2" strokeDasharray="4 2" />
                        <text x={lsX} y={lsY - 8} fill={strokeColor} fontSize="9" fontWeight="bold" textAnchor="middle">LS</text>
                        <text x={hX} y={hY - 8} fill={strokeColor} fontSize="9" fontWeight="bold" textAnchor="middle">HEAD</text>
                        <text x={rsX} y={rsY - 8} fill={strokeColor} fontSize="9" fontWeight="bold" textAnchor="middle">RS</text>
                        <text x={x0 + w / 2} y={yBase + 12} fill={strokeColor} fontSize="8" textAnchor="middle">Neckline</text>
                      </g>
                    );
                  }

                  if (d.type.includes("wave")) {
                    const w = Math.max(Math.abs(d.endX - d.startX), 140);
                    const x0 = Math.min(d.startX, d.endX);
                    const y0 = d.startY;
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <polyline points={`${x0},${y0} ${x0 + w * 0.2},${y0 - 50} ${x0 + w * 0.4},${y0 - 20} ${x0 + w * 0.7},${y0 - 80} ${x0 + w * 0.85},${y0 - 55} ${x0 + w},${y0 - 110}`} fill="none" stroke={strokeColor} strokeWidth="2" />
                        <text x={x0 + w * 0.2} y={y0 - 56} fill={strokeColor} fontSize="10" fontWeight="bold">(1)</text>
                        <text x={x0 + w * 0.4} y={y0 - 10} fill={strokeColor} fontSize="10" fontWeight="bold">(2)</text>
                        <text x={x0 + w * 0.7} y={y0 - 86} fill={strokeColor} fontSize="10" fontWeight="bold">(3)</text>
                        <text x={x0 + w * 0.85} y={y0 - 45} fill={strokeColor} fontSize="10" fontWeight="bold">(4)</text>
                        <text x={x0 + w} y={y0 - 116} fill={strokeColor} fontSize="10" fontWeight="bold">(5)</text>
                      </g>
                    );
                  }

                  if (d.type.includes("pattern") || d.type === "double_top" || d.type === "double_bottom") {
                    const w = Math.max(Math.abs(d.endX - d.startX), 130);
                    const x0 = Math.min(d.startX, d.endX);
                    const y0 = d.startY;
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <polygon points={`${x0},${y0} ${x0 + w * 0.25},${y0 - 60} ${x0 + w * 0.5},${y0 - 20} ${x0 + w * 0.75},${y0 - 60} ${x0 + w},${y0}`} fill={`${strokeColor}18`} stroke={strokeColor} strokeWidth="2" />
                        <text x={x0 + w * 0.5} y={y0 - 68} fill={strokeColor} fontSize="9" fontWeight="bold" textAnchor="middle">
                          {d.name || "Harmonic Bat / Butterfly"}
                        </text>
                      </g>
                    );
                  }

                  // ── 6. PREDICTION & MEASUREMENT ──
                  if (d.type === "long_position") {
                    const entryY = d.startY;
                    const tpY = Math.min(d.startY, d.endY);
                    const slY = d.startY + Math.abs(d.startY - tpY) * 0.5;
                    const leftX = Math.min(d.startX, d.endX);
                    const width = Math.max(Math.abs(d.endX - d.startX), 130);
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <rect x={leftX} y={tpY} width={width} height={entryY - tpY} fill="rgba(8, 153, 129, 0.25)" stroke="#089981" strokeWidth={isSelected ? "2.5" : "1.5"} />
                        <text x={leftX + 8} y={tpY + 15} fill="#089981" fontSize="9" fontWeight="bold" fontFamily="monospace">LONG TP +2.0R</text>
                        <rect x={leftX} y={entryY} width={width} height={slY - entryY} fill="rgba(242, 54, 69, 0.25)" stroke="#f23645" strokeWidth={isSelected ? "2.5" : "1.5"} />
                        <text x={leftX + 8} y={slY - 7} fill="#f23645" fontSize="9" fontWeight="bold" fontFamily="monospace">LONG SL -1.0R</text>
                        <line x1={leftX} y1={entryY} x2={leftX + width} y2={entryY} stroke="#ffffff" strokeWidth="1.5" />
                      </g>
                    );
                  }

                  if (d.type === "short_position") {
                    const entryY = d.startY;
                    const slY = Math.min(d.startY, d.endY);
                    const tpY = d.startY + Math.abs(d.startY - slY) * 2.0;
                    const leftX = Math.min(d.startX, d.endX);
                    const width = Math.max(Math.abs(d.endX - d.startX), 130);
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <rect x={leftX} y={slY} width={width} height={entryY - slY} fill="rgba(242, 54, 69, 0.25)" stroke="#f23645" strokeWidth={isSelected ? "2.5" : "1.5"} />
                        <text x={leftX + 8} y={slY + 15} fill="#f23645" fontSize="9" fontWeight="bold" fontFamily="monospace">SHORT SL -1.0R</text>
                        <rect x={leftX} y={entryY} width={width} height={tpY - entryY} fill="rgba(8, 153, 129, 0.25)" stroke="#089981" strokeWidth={isSelected ? "2.5" : "1.5"} />
                        <text x={leftX + 8} y={tpY - 7} fill="#089981" fontSize="9" fontWeight="bold" fontFamily="monospace">SHORT TP +2.0R</text>
                        <line x1={leftX} y1={entryY} x2={leftX + width} y2={entryY} stroke="#ffffff" strokeWidth="1.5" />
                      </g>
                    );
                  }

                  if (d.type === "measure" || d.type === "date_and_price" || d.type === "price_range") {
                    const x = Math.min(d.startX, d.endX);
                    const y = Math.min(d.startY, d.endY);
                    const w = Math.max(Math.abs(d.endX - d.startX), 80);
                    const h = Math.max(Math.abs(d.endY - d.startY), 35);
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <rect x={x} y={y} width={w} height={h} fill="rgba(41, 98, 255, 0.15)" stroke="#2962FF" strokeWidth={isSelected ? "2" : "1.2"} strokeDasharray="4 2" />
                        <rect x={x + 4} y={y + 4} width="92" height="16" rx="3" fill="#2962FF" />
                        <text x={x + 8} y={y + 15} fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
                          Δ {Math.round(h)} px | {Math.round(w / 12)} bars
                        </text>
                      </g>
                    );
                  }

                  // ── 7. ANNOTATIONS & LABELS ──
                  if (d.type === "text" || d.type === "anchored_text" || d.type === "note" || d.type === "callout" || d.type === "comment" || d.type === "price_label") {
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer">
                        <rect
                          x={d.startX - 4}
                          y={d.startY - 17}
                          width={Math.max((d.label?.length || 8) * 7.5 + 16, 75)}
                          height="24"
                          rx="4"
                          fill={isDark ? "#1e222d" : "#f1f5f9"}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? "2.5" : "1.5"}
                          filter="drop-shadow(0 2px 5px rgba(0,0,0,0.25))"
                        />
                        <text x={d.startX + 4} y={d.startY - 1} fill={strokeColor} fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                          {d.label || "Analysis Note"}
                        </text>
                        {isSelected && <circle cx={d.startX - 4} cy={d.startY - 17} r="3.5" fill="#fff" stroke={strokeColor} strokeWidth="1.5" />}
                      </g>
                    );
                  }

                  // ── 8. ICONS & STICKERS ──
                  if (d.type.startsWith("icon_")) {
                    const iconMap: Record<string, string> = {
                      icon_star: "⭐",
                      icon_target: "🎯",
                      icon_shield: "🛡️",
                      icon_check: "✅",
                      icon_dollar: "💵",
                      icon_flag: "🚩",
                      icon_fire: "🔥",
                      icon_zap: "⚡",
                      icon_award: "🏆",
                    };
                    const glyph = iconMap[d.type] || "📍";
                    return (
                      <g key={d.id} onClick={handleClick} className="cursor-pointer select-none">
                        <text x={d.startX} y={d.startY} fontSize={isSelected ? "26" : "20"} textAnchor="middle">
                          {glyph}
                        </text>
                        {isSelected && <circle cx={d.startX} cy={d.startY - 7} r="15" fill="none" stroke={strokeColor} strokeWidth="2" strokeDasharray="3 3" />}
                      </g>
                    );
                  }

                  // Fallback generic line / box for any other tool
                  return (
                    <g key={d.id} onClick={handleClick} className="cursor-pointer">
                      <line x1={d.startX} y1={d.startY} x2={d.endX} y2={d.endY} stroke={strokeColor} strokeWidth={isSelected ? "3" : "2"} />
                    </g>
                  );
                })}
              </g>
            </svg>
          )}

          {/* TRADINGVIEW FLOATING QUICK ACTION TOOLBAR */}
          {selectedDrawing && (
            <div
              className="absolute z-30 flex items-center gap-1.5 p-1 rounded-xl bg-white/95 dark:bg-[#1e222d]/95 border border-slate-200 dark:border-[#2a2e39] shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
              style={{
                top: Math.min(Math.max(selectedDrawing.startY - 44, 10), 500),
                left: Math.min(Math.max(Math.min(selectedDrawing.startX, selectedDrawing.endX) + 10, 20), 800),
              }}
            >
              {/* Color Swatch Picker */}
              <div className="relative">
                <button
                  type="button"
                  title="Change Color"
                  onClick={() => setColorPickerOpen(!colorPickerOpen)}
                  className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-[#2a2e39] bg-slate-50 dark:bg-[#131722] hover:bg-slate-100 dark:hover:bg-[#2a2e39] transition-colors cursor-pointer"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/20"
                    style={{ backgroundColor: selectedDrawing.color || "#2962FF" }}
                  />
                  <Palette className="w-3 h-3 text-slate-400" />
                </button>

                {colorPickerOpen && (
                  <div className="absolute top-full left-0 mt-1 flex items-center gap-1 p-1.5 rounded-xl bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-xl z-50">
                    {COLOR_SWATCHES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        title={c.name}
                        onClick={() => handleUpdateSelectedColor(c.value)}
                        className="w-4 h-4 rounded-full border border-black/20 hover:scale-125 transition-transform cursor-pointer"
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Edit Text Button */}
              <button
                type="button"
                title="Edit Label / Text"
                onClick={handleEditSelectedLabel}
                className="p-1 rounded-lg border border-slate-200 dark:border-[#2a2e39] bg-slate-50 dark:bg-[#131722] hover:bg-slate-100 dark:hover:bg-[#2a2e39] text-xs font-semibold px-1.5 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Type className="w-3 h-3 text-slate-400" />
                <span className="text-[10px]">Text</span>
              </button>

              {/* Delete Button */}
              <button
                type="button"
                title="Delete Drawing (Del / Backspace)"
                onClick={handleDeleteSelected}
                className="p-1 rounded-lg bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Close / Deselect */}
              <button
                type="button"
                title="Deselect (Esc)"
                onClick={() => setSelectedDrawingId(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2e39] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          HIGH-PERFORMANCE DYNAMIC SYMBOL SEARCH MODAL
      ═══════════════════════════════════════════ */}
      <SymbolSelectModal
        isOpen={symbolModalOpen}
        onClose={handleCloseSymbolModal}
        onSelect={handleSelectSymbolFromModal}
        symbolsList={symbolsList}
        currentSymbol={symbol}
        initialSearch={symbolSearch}
      />

      {/* Pine Script Sandbox Modal */}
      {isMounted &&
        sandboxOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150"
            onClick={() => setSandboxOpen(false)}
          >
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
                <button
                  type="button"
                  onClick={() => setSandboxOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#2a2e39] text-slate-400 hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                <textarea
                  value={sandboxCode}
                  onChange={(e) => setSandboxCode(e.target.value)}
                  rows={12}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-[#2a2e39] bg-slate-50 dark:bg-[#131722] font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-[#2a2e39] flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-[#131722]/50">
                <button
                  type="button"
                  onClick={() => setSandboxOpen(false)}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors"
                >
                  Apply to Chart
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
