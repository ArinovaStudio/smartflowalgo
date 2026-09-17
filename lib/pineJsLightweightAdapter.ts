import { canTranspilePineScript, transpileToPineJS } from "@opus-aether-ai/pine-transpiler";
import type { CandleData } from "@/components/user/types";

export interface PinePlot {
  id: string;
  title: string;
  color: string;
  lineWidth: number;
  overlay: boolean;
  times?: Float64Array;
  values?: Float64Array;
  data?: Array<{ time: number; value: number }>;
}

export interface PineVisualEvent {
  call: string;
  args: unknown[];
  barIndex: number;
  pineHandleId?: number;
  indicatorId?: string;
  style?: Record<string, unknown>;
}

export interface PineRunResult {
  name: string;
  overlay: boolean;
  plots: PinePlot[];
  visualEvents: PineVisualEvent[];
  error?: string;
}

// Compilation uses `new Function` internally and is expensive. A live bar
// changes candle values, not the source code, so retain the factory until the
// script text or indicator id changes.
const factoryCache = new Map<string, ReturnType<typeof transpileToPineJS>>();
const MAX_CACHED_FACTORIES = 32;

function getFactory(script: string, indicatorId: string, indicatorName: string, symbol: string) {
  // v0.4.11 only exposes these box setters in its generated drawing namespace.
  // Skip unsupported text-format mutations (set_text, set_text_size, etc.) so
  // they cannot abort the entire indicator; geometry/color still render.
  const supportedBoxSetters = new Set([
    "set_left", "set_right", "set_top", "set_bottom", "set_extend",
    "set_bgcolor", "set_border_color", "set_border_width", "set_text_color",
  ]);
  const compatibleScript = script
    // Table setters rewrite to table.cell with named parameters so the transpiler emits valid events
    .replace(/\btable\.set_cell_text\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, text = $4)")
    .replace(/\btable\.set_cell_bgcolor\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, bgcolor = $4)")
    .replace(/\btable\.set_cell_text_color\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, text_color = $4)")
    .replace(/\btable\.set_cell_value\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, text = str.tostring($4))")
    .replace(/\btable\.set_cell_text_size\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, text_size = $4)")
    .replace(/\btable\.set_cell_text_halign\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, text_halign = $4)")
    .replace(/\btable\.set_cell_text_valign\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, text_valign = $4)")
    .replace(/\btable\.set_cell_tooltip\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, tooltip = $4)")
    .replace(/\btable\.set_cell_width\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, width = $4)")
    .replace(/\btable\.set_cell_height\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, height = $4)")
    .replace(/\btable\.delete\s*\(\s*([^)]+)\)/g, "table.clear($1)")
    // Method-call syntax on table handles (e.g. t.set_cell_text(col, row, text))
    .replace(/([A-Za-z_$][\w$]*)\.set_cell_text\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "$1.cell($2, $3, text = $4)")
    .replace(/([A-Za-z_$][\w$]*)\.set_cell_bgcolor\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "$1.cell($2, $3, bgcolor = $4)")
    .replace(/([A-Za-z_$][\w$]*)\.set_cell_text_color\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "$1.cell($2, $3, text_color = $4)")
    .replace(/([A-Za-z_$][\w$]*)\.set_cell_value\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "$1.cell($2, $3, text = str.tostring($4))")
    .replace(/([A-Za-z_$][\w$]*)\.set_cell_text_size\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "$1.cell($2, $3, text_size = $4)")
    // Table position setters (function and method syntax)
    .replace(/\btable\.set_position\s*\(\s*([^,]+)\s*,\s*([^)]+)\)/g, 'table.cell($1, 0, 0, tooltip = "__PINE_TABLE_POS__" + str.tostring($2))')
    .replace(/([A-Za-z_$][\w$]*)\.set_position\s*\(\s*([^)]+)\)/g, '$1.cell(0, 0, tooltip = "__PINE_TABLE_POS__" + str.tostring($2))')
    // Table bgcolor setters
    .replace(/\btable\.set_bgcolor\s*\(\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, 0, 0, bgcolor = $2)")
    .replace(/([A-Za-z_$][\w$]*)\.set_bgcolor\s*\(\s*([^)]+)\)/g, "$1.cell(0, 0, bgcolor = $2)")
    // Method-call syntax for delete
    .replace(/([A-Za-z_$][\w$]*)\.delete\s*\(\s*\)/g, "$1.clear()")
    // General fallback for remaining unsupported table setters so they do not crash instance.main
    .replace(/\btable\.set_([a-zA-Z0-9_]+)\s*\(\s*([^,]+)\s*(?:,[^)]*)?\)/g, 'table.cell($2, 0, 0, tooltip = "__PINE_TABLE_IGNORE__")')
    .replace(/([A-Za-z_$][\w$]*)\.set_(columns|rows|frame_color|frame_width|border_color|border_width)\s*\(\s*([^)]*)\)/g, '$1.cell(0, 0, tooltip = "__PINE_TABLE_IGNORE__")')
    // v0.4.11 has no box.set_text stub. Route a box caption through the
    // supported text-color event with a private marker; PineVisualLayer reads
    // the marker as text and leaves the next real text-color call intact.
    .replace(/^([ \t]*)box\.set_text\(\s*([A-Za-z_$][\w$]*)\s*,\s*(.+)\)\s*;?\s*$/gm, '$1box.set_text_color($2, "__PINE_BOX_TEXT__" + ($3))')
    .replace(
      /^\s*box\.(set_[A-Za-z0-9_]+)\s*\([^\n]*\)\s*;?\s*$/gm,
      (statement, method: string) => supportedBoxSetters.has(method) ? statement : "",
    )
    // The installed compiler maps `timenow` incorrectly in its factory path,
    // leaving it as an unbound identifier. `time` below is supplied in Pine's
    // native milliseconds, so it is the deterministic per-candle fallback.
    .replace(/\btimenow\b/g, "time")
    // The factory path in v0.4.11 does not bind Pine's `font` namespace.
    // Lightweight Charts uses the browser font stack, so retain execution by
    // substituting an equivalent CSS-family string for font constants.
    .replace(/\bfont\.[A-Za-z0-9_]+\b/g, '"monospace"')
    // The package's factory path currently hardcodes syminfo.ticker to
    // "TICKER". Bake the subscribed symbol into the generated source until
    // that upstream runtime surface is exposed.
    .replace(/\bsyminfo\.(?:ticker|tickerid)\b/g, JSON.stringify(symbol));
  const cacheKey = `${indicatorId}\u0000${compatibleScript}`;
  const cached = factoryCache.get(cacheKey);
  if (cached) return cached;
  const syntax = canTranspilePineScript(compatibleScript);
  const compiled = syntax.valid
    ? transpileToPineJS(compatibleScript, indicatorId, indicatorName, { autoBgColorerForBoxes: false })
    : { success: false, error: syntax.reason || "Invalid Pine Script" };
  if (factoryCache.size >= MAX_CACHED_FACTORIES) factoryCache.delete(factoryCache.keys().next().value!);
  factoryCache.set(cacheKey, compiled as ReturnType<typeof transpileToPineJS>);
  return compiled as ReturnType<typeof transpileToPineJS>;
}

/** A Pine series stores the present value plus its completed-bar history. */
class Series {
  private static nextId = 1;
  public readonly id = Series.nextId++;
  private values: number[] = [];

  get length() {
    return this.values.length;
  }

  push(value: unknown) {
    // Pine stores bools in series too (for example the condition passed to
    // ta.valuewhen). Preserve them as 1/0 so historical truth values remain
    // available while keeping numeric indicators fast.
    this.values.push(typeof value === "boolean" ? (value ? 1 : 0) : typeof value === "number" && Number.isFinite(value) ? value : Number.NaN);
  }

  get(offset = 0) {
    const value = this.values[this.values.length - 1 - Math.max(0, Math.trunc(offset))];
    return value ?? Number.NaN;
  }

  valuesFromNewest(length: number) {
    const count = Math.max(0, Math.trunc(length));
    return this.values.slice(Math.max(0, this.values.length - count));
  }

  sma(length: number): number {
    const len = Math.trunc(length);
    if (len <= 0 || this.values.length < len) return Number.NaN;
    let sum = 0;
    const end = this.values.length;
    const start = end - len;
    for (let i = start; i < end; i++) {
      const v = this.values[i];
      if (!Number.isFinite(v)) return Number.NaN;
      sum += v;
    }
    return sum / len;
  }

  wma(length: number): number {
    const len = Math.trunc(length);
    if (len <= 0 || this.values.length < len) return Number.NaN;
    const divisor = len * (len + 1) / 2;
    let sum = 0;
    const end = this.values.length;
    const start = end - len;
    for (let i = start, w = 1; i < end; i++, w++) {
      const v = this.values[i];
      if (!Number.isFinite(v)) return Number.NaN;
      sum += v * w;
    }
    return sum / divisor;
  }

  highest(length: number): number {
    const len = Math.trunc(length);
    if (len <= 0 || this.values.length < len) return Number.NaN;
    let max = Number.NEGATIVE_INFINITY;
    const end = this.values.length;
    const start = end - len;
    for (let i = start; i < end; i++) {
      const v = this.values[i];
      if (!Number.isFinite(v)) return Number.NaN;
      if (v > max) max = v;
    }
    return max === Number.NEGATIVE_INFINITY ? Number.NaN : max;
  }

  lowest(length: number): number {
    const len = Math.trunc(length);
    if (len <= 0 || this.values.length < len) return Number.NaN;
    let min = Number.POSITIVE_INFINITY;
    const end = this.values.length;
    const start = end - len;
    for (let i = start; i < end; i++) {
      const v = this.values[i];
      if (!Number.isFinite(v)) return Number.NaN;
      if (v < min) min = v;
    }
    return min === Number.POSITIVE_INFINITY ? Number.NaN : min;
  }
}

type RuntimeContext = {
  barIndex: number;
  totalBars: number;
  candle: CandleData;
  symbol: Record<string, unknown>;
  timeframe: string;
  beginBar: (candle: CandleData, index: number, total: number) => void;
  new_var: (value: unknown) => Series;
  __atrState?: Map<number, { index: number; value: number; firstTr: number[] }>;
  __dmiState?: Map<string, any>;
  __emaState?: Map<string, { count: number; sum: number; value: number; lastBarIndex: number }>;
  __rmaState?: Map<string, { count: number; sum: number; value: number; lastBarIndex: number }>;
  __valueWhenCallSlot?: number;
  __valueWhenState?: Map<number, Array<{ condition: boolean; value: unknown }>>;
};

const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value);
const number = (value: unknown) => (finite(value) ? value : Number.NaN);
const source = (value: unknown) => (value instanceof Series ? value : null);
const current = (value: unknown) => source(value)?.get(0) ?? number(value);
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : Number.NaN;
const isPineNa = (value: unknown) => {
  const resolved = source(value)?.get(0) ?? value;
  return resolved === null || resolved === undefined || (typeof resolved === "number" && !Number.isFinite(resolved));
};

function timeframeToPinePeriod(timeframe: string) {
  const value = timeframe.trim().toLowerCase();
  const match = value.match(/^(\d+)(m|h|d|w|mn)$/);
  if (!match) return "1";
  const [, amount, unit] = match;
  if (unit === "m") return amount;
  if (unit === "h") return String(Number(amount) * 60);
  if (unit === "d") return Number(amount) === 1 ? "D" : `${amount}D`;
  if (unit === "w") return Number(amount) === 1 ? "W" : `${amount}W`;
  return Number(amount) === 1 ? "M" : `${amount}M`;
}

function timeframeToMilliseconds(timeframe: string) {
  const value = timeframe.trim().toLowerCase();
  const match = value.match(/^(\d+)(m|h|d|w|mn)$/);
  if (!match) return 60_000;
  const amount = Number(match[1]);
  const unit = match[2];
  const unitMs = unit === "m" ? 60_000
    : unit === "h" ? 3_600_000
      : unit === "d" ? 86_400_000
        : unit === "w" ? 604_800_000
          : 2_592_000_000;
  return amount * unitMs;
}

function makeContext(symbol = "CUSTOM", timeframe = "1m"): RuntimeContext {
  const slots: Series[] = [];
  let slot = 0;
  const context: RuntimeContext = {
    barIndex: 0,
    totalBars: 0,
    candle: { time: 0, open: 0, high: 0, low: 0, close: 0, volume: 0 },
    symbol: { tickerid: symbol, ticker: symbol, timezone: "Etc/UTC", minmov: 1, pricescale: 100000 },
    timeframe,
    beginBar(candle, index, total) {
      context.candle = candle;
      context.barIndex = index;
      context.totalBars = total;
      slot = 0;
      context.__valueWhenCallSlot = 0;
    },
    new_var(value) {
      const series = slots[slot] ?? (slots[slot] = new Series());
      slot += 1;
      series.push(value);
      return series;
    },
  };
  return context;
}

function makePineJsRuntime() {
  const std: Record<string, (...args: any[]) => any> = {
    open: (ctx: RuntimeContext) => ctx.candle.open,
    high: (ctx: RuntimeContext) => ctx.candle.high,
    low: (ctx: RuntimeContext) => ctx.candle.low,
    close: (ctx: RuntimeContext) => ctx.candle.close,
    volume: (ctx: RuntimeContext) => ctx.candle.volume ?? 0,
    // MT5 delivers epoch seconds; Pine's time/time_close APIs use milliseconds.
    // Supplying the correct unit is essential for request.security bucket logic.
    time: (ctx: RuntimeContext) => ctx.candle.time * 1000,
    time_close: (ctx: RuntimeContext) => ctx.candle.time * 1000 + timeframeToMilliseconds(ctx.timeframe),
    hl2: (ctx: RuntimeContext) => (ctx.candle.high + ctx.candle.low) / 2,
    hlc3: (ctx: RuntimeContext) => (ctx.candle.high + ctx.candle.low + ctx.candle.close) / 3,
    ohlc4: (ctx: RuntimeContext) => (ctx.candle.open + ctx.candle.high + ctx.candle.low + ctx.candle.close) / 4,
    hlcc4: (ctx: RuntimeContext) => (ctx.candle.high + ctx.candle.low + 2 * ctx.candle.close) / 4,
    // `na()` applies to floats and series, but a valid line/label/box/table
    // handle is an object. Treating it as a number made `na(myBox)` true on
    // every bar, defeating Pine's `var` drawing lifecycle.
    na: (value: unknown) => isPineNa(value),
    nz: (value: unknown, replacement = 0) => finite(current(value)) ? current(value) : replacement,
    abs: Math.abs, ceil: Math.ceil, floor: Math.floor, pow: Math.pow, sqrt: Math.sqrt,
    exp: Math.exp, log: Math.log, log10: Math.log10, sin: Math.sin, cos: Math.cos, tan: Math.tan,
    max: Math.max, min: Math.min,
    round: (value: number, precision = 0) => {
      const factor = 10 ** precision;
      return Math.round(value * factor) / factor;
    },
    sma: (input: unknown, length: number) => {
      const series = source(input);
      return series ? series.sma(length) : Number.NaN;
    },
    wma: (input: unknown, length: number) => {
      const series = source(input);
      return series ? series.wma(length) : Number.NaN;
    },
    ema: (input: unknown, length: number, ctx: RuntimeContext) => {
      const series = source(input);
      const len = Math.trunc(length);
      if (!series || !Number.isFinite(len) || len <= 0) return Number.NaN;
      const states = ctx.__emaState ?? (ctx.__emaState = new Map());
      const key = `${series.id}:${len}`;
      let state = states.get(key);
      if (!state) {
        state = { count: 0, sum: 0, value: Number.NaN, lastBarIndex: -1 };
        states.set(key, state);
      }
      if (state.lastBarIndex === ctx.barIndex) return state.value;
      const curr = series.get(0);
      if (!finite(curr)) return state.value;
      if (state.count < len) {
        state.sum += curr;
        state.count += 1;
        state.value = state.count === len ? state.sum / len : Number.NaN;
      } else {
        const alpha = 2 / (len + 1);
        state.value = alpha * curr + (1 - alpha) * state.value;
      }
      state.lastBarIndex = ctx.barIndex;
      return state.value;
    },
    rma: (input: unknown, length: number, ctx: RuntimeContext) => {
      const series = source(input);
      const len = Math.trunc(length);
      if (!series || !Number.isFinite(len) || len <= 0) return Number.NaN;
      const states = ctx.__rmaState ?? (ctx.__rmaState = new Map());
      const key = `${series.id}:${len}`;
      let state = states.get(key);
      if (!state) {
        state = { count: 0, sum: 0, value: Number.NaN, lastBarIndex: -1 };
        states.set(key, state);
      }
      if (state.lastBarIndex === ctx.barIndex) return state.value;
      const curr = series.get(0);
      if (!finite(curr)) return state.value;
      if (state.count < len) {
        state.sum += curr;
        state.count += 1;
        state.value = state.count === len ? state.sum / len : Number.NaN;
      } else {
        state.value = (state.value * (len - 1) + curr) / len;
      }
      state.lastBarIndex = ctx.barIndex;
      return state.value;
    },
    atr: (length: number, ctx: RuntimeContext) => {
      const history = (ctx as any).__candles as CandleData[] | undefined;
      if (!history || length <= 0) return Number.NaN;
      const states = ctx.__atrState ?? (ctx.__atrState = new Map());
      const state = states.get(length) ?? { index: -1, value: Number.NaN, firstTr: [] };
      if (state.index === ctx.barIndex) return state.value;
      // The runtime always processes candles in order. Keeping Wilder's prior
      // value makes ATR O(number of candles), rather than O(candles squared).
      const candle = history[ctx.barIndex];
      const previous = history[ctx.barIndex - 1];
      const tr = previous ? Math.max(candle.high - candle.low, Math.abs(candle.high - previous.close), Math.abs(candle.low - previous.close)) : candle.high - candle.low;
      if (ctx.barIndex < length) {
        state.firstTr.push(tr);
        state.value = ctx.barIndex === length - 1 ? average(state.firstTr) : Number.NaN;
      } else {
        state.value = (state.value * (length - 1) + tr) / length;
      }
      state.index = ctx.barIndex;
      states.set(length, state);
      return state.value;
    },
    dmi: (diLength: number, adxSmoothing: number, ctx: RuntimeContext) => {
      const history = (ctx as any).__candles as CandleData[] | undefined;
      if (!history || ctx.barIndex === 0 || diLength <= 0 || adxSmoothing <= 0) {
        return [Number.NaN, Number.NaN, Number.NaN, Number.NaN, Number.NaN];
      }

      // The former implementation recalculated all prior bars for every bar
      // (O(n²)). A 1,000-candle snapshot made that visible as chart lag. This
      // is Wilder's incremental smoothing: one constant-time update per bar.
      const states = ((ctx as any).__dmiState ??= new Map()) as Map<string, any>;
      const key = `${diLength}:${adxSmoothing}`;
      const state = states.get(key) ?? {
        index: 0, plusSeed: [] as number[], minusSeed: [] as number[], trSeed: [] as number[], dxSeed: [] as number[],
        plus: Number.NaN, minus: Number.NaN, tr: Number.NaN, adx: Number.NaN,
      };
      if (state.index === ctx.barIndex) return state.result ?? [Number.NaN, Number.NaN, Number.NaN, Number.NaN, Number.NaN];

      const candle = history[ctx.barIndex];
      const previous = history[ctx.barIndex - 1];
      const up = candle.high - previous.high;
      const down = previous.low - candle.low;
      const plusMove = up > down && up > 0 ? up : 0;
      const minusMove = down > up && down > 0 ? down : 0;
      const trueRange = Math.max(candle.high - candle.low, Math.abs(candle.high - previous.close), Math.abs(candle.low - previous.close));

      if (ctx.barIndex <= diLength) {
        state.plusSeed.push(plusMove);
        state.minusSeed.push(minusMove);
        state.trSeed.push(trueRange);
        if (ctx.barIndex === diLength) {
          state.plus = average(state.plusSeed);
          state.minus = average(state.minusSeed);
          state.tr = average(state.trSeed);
        }
      } else {
        state.plus = (state.plus * (diLength - 1) + plusMove) / diLength;
        state.minus = (state.minus * (diLength - 1) + minusMove) / diLength;
        state.tr = (state.tr * (diLength - 1) + trueRange) / diLength;
      }

      const plusDi = state.tr > 0 ? 100 * state.plus / state.tr : Number.NaN;
      const minusDi = state.tr > 0 ? 100 * state.minus / state.tr : Number.NaN;
      const denominator = plusDi + minusDi;
      const dx = denominator > 0 ? 100 * Math.abs(plusDi - minusDi) / denominator : Number.NaN;
      if (finite(dx)) {
        if (state.dxSeed.length < adxSmoothing) {
          state.dxSeed.push(dx);
          if (state.dxSeed.length === adxSmoothing) state.adx = average(state.dxSeed);
        } else {
          state.adx = (state.adx * (adxSmoothing - 1) + dx) / adxSmoothing;
        }
      }
      state.index = ctx.barIndex;
      state.result = [plusDi, minusDi, dx, state.adx, state.adx];
      states.set(key, state);
      return state.result;
    },
    adx: (diLength: number, adxSmoothing: number, ctx: RuntimeContext) => std.dmi(diLength, adxSmoothing, ctx)[3],
    highest: (input: unknown, length: number) => {
      const series = source(input);
      return series ? series.highest(length) : Number.NaN;
    },
    lowest: (input: unknown, length: number) => {
      const series = source(input);
      return series ? series.lowest(length) : Number.NaN;
    },
    valuewhen: (condition: unknown, value: unknown, occurrence = 0, context?: RuntimeContext) => {
      const conditions = source(condition);
      const values = source(value);
      if (occurrence < 0) return Number.NaN;

      // The transpiler sometimes emits `ta.valuewhen` as current scalar
      // arguments rather than historical Series arguments. Pine still needs
      // the previous truth/value pairs, so retain them per call site while the
      // complete candle history is replayed.
      if (!conditions && context) {
        const callSlot = context.__valueWhenCallSlot ?? 0;
        context.__valueWhenCallSlot = callSlot + 1;
        const state = context.__valueWhenState ?? (context.__valueWhenState = new Map());
        const history = state.get(callSlot) ?? [];
        history.push({ condition: Boolean(condition), value });
        state.set(callSlot, history);
        let matches = 0;
        for (let index = history.length - 1; index >= 0; index -= 1) {
          if (!history[index].condition) continue;
          if (matches === Math.trunc(occurrence)) return number(history[index].value);
          matches += 1;
        }
        return Number.NaN;
      }
      if (!conditions) return Number.NaN;
      let matches = 0;
      const limit = values ? Math.min(conditions.length, values.length) : conditions.length;
      for (let offset = 0; offset < limit; offset += 1) {
        if (!finite(conditions.get(offset)) || conditions.get(offset) === 0) continue;
        if (matches === Math.trunc(occurrence)) return values ? number(values.get(offset)) : current(value);
        matches += 1;
      }
      return Number.NaN;
    },
    pivothigh: (input: unknown, left: number, right: number) => pivot(source(input), left, right, true),
    pivotlow: (input: unknown, left: number, right: number) => pivot(source(input), left, right, false),
    crossover: (a: unknown, b: unknown) => cross(source(a), source(b), true),
    crossunder: (a: unknown, b: unknown) => cross(source(a), source(b), false),
    cross: (a: unknown, b: unknown) => cross(source(a), source(b), true) || cross(source(a), source(b), false),
    period: (ctx: RuntimeContext) => timeframeToPinePeriod(ctx.timeframe),
    interval: (ctx: RuntimeContext) => Math.max(1, Math.round(timeframeToMilliseconds(ctx.timeframe) / 60_000)),
    isintraday: (ctx: RuntimeContext) => /^(\d+)(m|h)$/i.test(ctx.timeframe),
    isdwm: (ctx: RuntimeContext) => /^(\d+)(d|w|mn)$/i.test(ctx.timeframe),
    isdaily: (ctx: RuntimeContext) => /^(\d+)d$/i.test(ctx.timeframe),
    isweekly: (ctx: RuntimeContext) => /^(\d+)w$/i.test(ctx.timeframe),
    ismonthly: (ctx: RuntimeContext) => /^(\d+)mn$/i.test(ctx.timeframe),
  };
  return { Std: new Proxy(std, { get(target, key: string) { return target[key] ?? (() => Number.NaN); } }) };
}

function pivot(series: Series | null, left: number, right: number, high: boolean) {
  if (!series) return Number.NaN;
  const total = Math.trunc(left) + Math.trunc(right) + 1;
  if (total <= 0 || series.length < total) return Number.NaN;
  const r = Math.trunc(right);
  const candidate = series.get(r);
  if (!finite(candidate)) return Number.NaN;
  for (let offset = 0; offset < total; offset += 1) {
    if (offset === r) continue;
    const v = series.get(offset);
    if (!finite(v)) return Number.NaN;
    if (high ? v >= candidate : v <= candidate) return Number.NaN;
  }
  return candidate;
}

function cross(a: Series | null, b: Series | null, up: boolean) {
  if (!a || !b) return false;
  const nowA = a.get(0), nowB = b.get(0), prevA = a.get(1), prevB = b.get(1);
  return [nowA, nowB, prevA, prevB].every(finite) && (up ? nowA > nowB && prevA <= prevB : nowA < nowB && prevA >= prevB);
}

/**
 * Pine emits every setter call during historical replay. The chart only needs
 * the final state of each live drawing/table cell, not thousands of obsolete
 * intermediate positions. Keeping this bounded avoids memory pressure and
 * prevents a spread call from overflowing the JavaScript call stack.
 */
type VisualObjectState = { create?: PineVisualEvent; updates: Map<string, PineVisualEvent> };

function recordVisualEvent(objects: Map<string, VisualObjectState>, event: PineVisualEvent) {
  const [namespace, action] = event.call.split(".");
  if (!namespace || namespace === "Std") return;
  const objectKey = `${namespace}:${event.pineHandleId ?? "new"}`;
  if (action === "new") {
    const existing = objects.get(objectKey);
    if (existing) {
      existing.create = event;
    } else {
      objects.set(objectKey, { create: event, updates: new Map() });
    }
    return;
  }
  if (action === "delete") {
    objects.delete(objectKey);
    return;
  }
  let state = objects.get(objectKey);
  if (!state) {
    state = { updates: new Map() };
    objects.set(objectKey, state);
  }

  if (namespace === "table") {
    // If event is table.cell, merge attributes so earlier text/colors aren't lost
    const cellOffset = typeof event.args[0] === "number" || typeof event.args[0] === "object" ? 1 : 0;
    const tooltip = event.args[cellOffset + 10];
    if (typeof tooltip === "string") {
      if (tooltip.startsWith("__PINE_TABLE_POS__")) {
        state.updates.set("__pos__", event);
        return;
      }
      if (tooltip.startsWith("__PINE_TABLE_IGNORE__")) {
        return;
      }
    }
    const col = event.args[cellOffset];
    const row = event.args[cellOffset + 1];
    const cellKey = `cell:${col}:${row}`;
    const prev = state.updates.get(cellKey);
    if (prev) {
      const mergedArgs = [...prev.args];
      for (let i = 0; i < event.args.length; i++) {
        if (event.args[i] !== null && event.args[i] !== undefined) {
          mergedArgs[i] = event.args[i];
        }
      }
      prev.args = mergedArgs;
      if (event.style) {
        prev.style = { ...(prev.style || {}), ...event.style };
      }
    } else {
      state.updates.set(cellKey, { ...event, args: [...event.args] });
    }
    return;
  }

  state.updates.set(event.call, event);
}

function visualEventsFromState(objects: Map<string, VisualObjectState>) {
  const result: PineVisualEvent[] = [];
  for (const state of objects.values()) {
    if (state.create) result.push(state.create);
    for (const update of state.updates.values()) result.push(update);
  }
  return result;
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Runs Pine Script compiler and indicator execution with pre-allocated Float64Array
 * memory buffers and cooperative CPU time-slicing to maintain 60 FPS UI responsiveness.
 */
export async function runPineScriptOnCandles(
  script: string,
  indicatorId: string,
  indicatorName: string,
  candles: CandleData[],
  symbol = "CUSTOM",
  timeframe = "1m"
): Promise<PineRunResult> {
  const compiled = getFactory(script, indicatorId, indicatorName, symbol);
  if (!compiled.success || !compiled.indicatorFactory) {
    return {
      name: indicatorName,
      overlay: true,
      plots: [],
      visualEvents: [],
      error: compiled.error || "Pine compilation failed",
    };
  }

  try {
    const indicator = compiled.indicatorFactory(makePineJsRuntime() as any);
    const instance = new (indicator.constructor as any)();
    const context = makeContext(symbol, timeframe);

    // Limit historical replay to the newest 2,000 candles to eliminate lag while ensuring technical indicator convergence
    const maxBars = 2000;
    const effectiveCandles = candles.length > maxBars ? candles.slice(-maxBars) : candles;
    (context as any).__candles = effectiveCandles;
    const inputValues = indicator.metainfo.inputs.map((input: any) => input.defval);
    instance.init?.(context, (index: number) => inputValues[index]);

    const numCandles = effectiveCandles.length;
    const rawPlots = indicator.metainfo.plots || [];
    const numPlots = rawPlots.length;

    // Pre-allocate typed arrays for high-performance zero-overhead series evaluation
    const timesBuffers: Float64Array[] = [];
    const valuesBuffers: Float64Array[] = [];
    const plotData: Array<Array<{ time: number; value: number }>> = [];

    for (let p = 0; p < numPlots; p++) {
      timesBuffers.push(new Float64Array(numCandles));
      valuesBuffers.push(new Float64Array(numCandles));
      plotData.push([]);
    }

    const visualObjectState = new Map<string, VisualObjectState>();
    let workSliceStarted = performance.now();

    for (let index = 0; index < numCandles; index += 1) {
      const candle = effectiveCandles[index];
      context.beginBar(candle, index, numCandles);
      const values: number[] = instance.main(context, (inputIndex: number) => inputValues[inputIndex]);
      const candleTime = candle.time;

      for (let p = 0; p < numPlots; p++) {
        timesBuffers[p][index] = candleTime;
        const val = values[p];
        const isFin = finite(val);
        valuesBuffers[p][index] = isFin ? (val as number) : Number.NaN;
        if (isFin) {
          plotData[p].push({ time: candleTime, value: val as number });
        }
      }

      const events = (values as any).__visualEvents;
      if (Array.isArray(events)) {
        for (const event of events) recordVisualEvent(visualObjectState, event);
      }

      // Yield after a short CPU slice (6ms) so chart pan/zoom remain locked at 60 FPS
      if ((index & 15) === 15 && performance.now() - workSliceStarted >= 6) {
        await yieldToBrowser();
        workSliceStarted = performance.now();
      }
    }

    const plots: PinePlot[] = rawPlots.map((plot: any, index: number): PinePlot => {
      const style = indicator.metainfo.defaults?.styles?.[plot.id] || {};
      return {
        id: plot.id || `plot_${index}`,
        title: plot.id || indicatorName,
        color: style.color || "#2962FF",
        lineWidth: style.linewidth || 2,
        overlay: indicator.metainfo.is_price_study !== false,
        times: timesBuffers[index],
        values: valuesBuffers[index],
        data: plotData[index],
      };
    });

    return {
      name: indicator.name || indicatorName,
      overlay: indicator.metainfo.is_price_study !== false,
      plots,
      visualEvents: visualEventsFromState(visualObjectState),
    };
  } catch (error) {
    return {
      name: indicatorName,
      overlay: true,
      plots: [],
      visualEvents: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
