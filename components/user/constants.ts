import {
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
  Crosshair,
  Flame,
  Zap,
  Award,
  Shield,
  Compass,
  Activity,
  Grid,
  ShieldAlert,
  RefreshCw,
  Sparkles,
  Check,
} from "lucide-react";
import type { CategoryDef } from "./types";

export const TIMEFRAMES = [
  { label: "1m", value: "1m", secs: 60 },
  { label: "5m", value: "5m", secs: 300 },
  { label: "15m", value: "15m", secs: 900 },
  { label: "30m", value: "30m", secs: 1800 },
  { label: "1H", value: "1h", secs: 3600 },
  { label: "4H", value: "4h", secs: 14400 },
  { label: "1D", value: "1D", secs: 86400 },
] as const;

export const BUILTIN_SCRIPTS: Record<string, string> = {
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

/**
 * The full drawing-tool library, grouped into toolbar categories.
 * Each category renders as one icon in the docked rail; clicking the
 * corner arrow opens a flyout listing every tool in that category.
 */
export const TOOL_CATEGORIES: CategoryDef[] = [
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

export const COLOR_SWATCHES = [
  { name: "TradingView Blue", value: "#2962FF" },
  { name: "Sky Blue", value: "#38bdf8" },
  { name: "Emerald Green", value: "#089981" },
  { name: "Rose Red", value: "#f23645" },
  { name: "Amber Orange", value: "#ff9800" },
  { name: "Purple", value: "#ab47bc" },
  { name: "Pure White", value: "#ffffff" },
  { name: "Yellow", value: "#fbc02d" },
];

/** Default favorited tool ids shown at the top of each flyout. */
export const DEFAULT_FAVORITE_TOOLS = [
  "long_position",
  "short_position",
  "price_range",
  "date_and_price",
  "trendline",
  "horizontal",
  "fibonacci",
  "rectangle",
];

/** Remembers the last-used tool per category so the rail icon reflects recent activity. */
export const DEFAULT_CATEGORY_LAST_TOOL: Record<string, string> = {
  cursors: "cursor",
  trends: "trendline",
  fib_gann: "fibonacci",
  shapes: "brush",
  annotations: "text",
  patterns: "head_and_shoulders",
  prediction: "long_position",
  smc_ict: "fvg_bull",
  icons: "icon_star",
};

/** Picks a sensible default stroke color based on the tool's semantics (bullish/bearish/etc). */
export function getDefaultToolColor(toolId: string): string {
  if (toolId.includes("bull") || toolId === "long_position") return "#089981";
  if (toolId.includes("bear") || toolId === "short_position") return "#f23645";
  if (toolId === "choch" || toolId === "breaker_block") return "#ab47bc";
  if (toolId === "horizontal" || toolId === "eqh_eql") return "#ff9800";
  return "#2962FF";
}
