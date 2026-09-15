import { canTranspilePineScript, transpileToPineJS } from "@opus-aether-ai/pine-transpiler";
import type { CandleData } from "@/components/user/types";

export interface PinePlot {
  id: string;
  title: string;
  color: string;
  lineWidth: number;
  overlay: boolean;
  data: Array<{ time: number; value: number }>;
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
    // v0.4.11 has no box.set_text stub. Route a box caption through the
    // supported text-color event with a private marker; PineVisualLayer reads
    // the marker as text and leaves the next real text-color call intact.
    .replace(/^([ \t]*)box\.set_text\(\s*([A-Za-z_$][\w$]*)\s*,\s*(.+)\)\s*;?\s*$/gm, '$1box.set_text_color($2, "__PINE_BOX_TEXT__" + ($3))')
    .replace(
    /^\s*box\.(set_[A-Za-z0-9_]+)\s*\([^\n]*\)\s*;?\s*$/gm,
    (statement, method: string) => supportedBoxSetters.has(method) ? statement : "",
  // The installed compiler maps `timenow` incorrectly in its factory path,
  // leaving it as an unbound identifier. `time` below is supplied in Pine's
  // native milliseconds, so it is the deterministic per-candle fallback.
  ).replace(/\btimenow\b/g, "time")
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
  console.log(compiled);
  
  return compiled as ReturnType<typeof transpileToPineJS>;
}

/** A Pine series stores the present value plus its completed-bar history. */
class Series {
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
      const values = source(input)?.valuesFromNewest(length) ?? [];
      return values.length === length && values.every(finite) ? average(values) : Number.NaN;
    },
    wma: (input: unknown, length: number) => {
      const values = source(input)?.valuesFromNewest(length) ?? [];
      if (values.length !== length || !values.every(finite)) return Number.NaN;
      const divisor = length * (length + 1) / 2;
      return values.reduce((sum, value, index) => sum + value * (index + 1), 0) / divisor;
    },
    ema: (input: unknown, length: number, ctx: RuntimeContext) => {
      const series = source(input);
      if (!series || !Number.isFinite(length) || length <= 0) return Number.NaN;
      const values = series.valuesFromNewest(ctx.barIndex + 1);
      if (values.length < length || !values.slice(0, length).every(finite)) return Number.NaN;
      const alpha = 2 / (length + 1);
      let result = average(values.slice(0, length));
      for (let i = length; i < values.length; i += 1) result = alpha * values[i] + (1 - alpha) * result;
      return result;
    },
    rma: (input: unknown, length: number, ctx: RuntimeContext) => {
      const series = source(input);
      if (!series || length <= 0) return Number.NaN;
      const values = series.valuesFromNewest(ctx.barIndex + 1);
      if (values.length < length || !values.slice(0, length).every(finite)) return Number.NaN;
      let result = average(values.slice(0, length));
      for (let i = length; i < values.length; i += 1) result = (result * (length - 1) + values[i]) / length;
      return result;
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
      const values = source(input)?.valuesFromNewest(length) ?? [];
      return values.length === length ? Math.max(...values) : Number.NaN;
    },
    lowest: (input: unknown, length: number) => {
      const values = source(input)?.valuesFromNewest(length) ?? [];
      return values.length === length ? Math.min(...values) : Number.NaN;
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
  const values = series.valuesFromNewest(left + right + 1);
  if (values.length !== left + right + 1 || !values.every(finite)) return Number.NaN;
  const candidate = values[values.length - 1 - right];
  return values.every((value, index) => index === values.length - 1 - right || (high ? candidate > value : candidate < value)) ? candidate : Number.NaN;
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
    objects.set(objectKey, { create: event, updates: new Map() });
    return;
  }
  if (action === "delete") {
    objects.delete(objectKey);
    return;
  }
  const state = objects.get(objectKey);
  if (!state) return;
    // table.cell uses its own row/column identity; all other setter calls have
    // one final value per operation for the drawing handle.
  const cellOffset = typeof event.args[0] === "number" ? 0 : 1;
  const updateKey = event.call === "table.cell"
    ? `${event.call}:${event.args[cellOffset]}:${event.args[cellOffset + 1]}`
    : event.call;
  state.updates.set(updateKey, event);
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

/** Runs compiler output without relying on TradingView's Charting Library. */
export async function runPineScriptOnCandles(script: string, indicatorId: string, indicatorName: string, candles: CandleData[], symbol = "CUSTOM", timeframe = "1m"): Promise<PineRunResult> {
  const compiled = getFactory(script, indicatorId, indicatorName, symbol);
  if (!compiled.success || !compiled.indicatorFactory) return { name: indicatorName, overlay: true, plots: [], visualEvents: [], error: compiled.error || "Pine compilation failed" };
  try {
    const indicator = compiled.indicatorFactory(makePineJsRuntime() as any);
    const instance = new (indicator.constructor as any)();
    const context = makeContext(symbol, timeframe);
    (context as any).__candles = candles;
    const inputValues = indicator.metainfo.inputs.map((input: any) => input.defval);
    instance.init?.(context, (index: number) => inputValues[index]);
    const plots: PinePlot[] = indicator.metainfo.plots.map((plot: any, index: number): PinePlot => {
      const style = indicator.metainfo.defaults.styles[plot.id] || {};
      return { id: plot.id || `plot_${index}`, title: plot.id || indicatorName, color: style.color || "#2962FF", lineWidth: style.linewidth || 2, overlay: indicator.metainfo.is_price_study !== false, data: [] };
    });
    const visualObjectState = new Map<string, VisualObjectState>();
    let workSliceStarted = performance.now();
    for (let index = 0; index < candles.length; index += 1) {
      const candle = candles[index];
      context.beginBar(candle, index, candles.length);
      const values: number[] = instance.main(context, (inputIndex: number) => inputValues[inputIndex]);
      values.forEach((value, plotIndex) => {
        if (plots[plotIndex] && finite(value)) plots[plotIndex].data.push({ time: candle.time, value });
      });
      const events = (values as any).__visualEvents;
      if (Array.isArray(events)) for (const event of events) recordVisualEvent(visualObjectState, event);
      // Yield after a short CPU slice. 5,000 candles still get full Pine
      // history, but drawing and navigation remain responsive while replaying.
      if (index % 16 === 15 && performance.now() - workSliceStarted >= 8) {
        await yieldToBrowser();
        workSliceStarted = performance.now();
      }
    }
    return { name: indicator.name || indicatorName, overlay: indicator.metainfo.is_price_study !== false, plots, visualEvents: visualEventsFromState(visualObjectState) };
  } catch (error) {
    return { name: indicatorName, overlay: true, plots: [], visualEvents: [], error: error instanceof Error ? error.message : String(error) };
  }
}
