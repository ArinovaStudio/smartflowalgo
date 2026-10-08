import type { BarRange, DataProvider, OHLCV, SymbolDescriptor, SymbolInfo } from "@luxalgo/vela";
import {
  aggregateBars,
  aggregateTail,
  bucketOpen,
  cleanTicker,
  mergeSorted,
  nativeKindOf,
  nativeMsOf,
  planTimeframe,
  type Bar,
  type NativeCode,
  type TfKind,
  type TimeframePlan,
} from "./mt5Timeframes";

/**
 * Vela DataProvider backed by the app's MT5 bridge.
 *
 *   history  GET  /api/mt5/history   short JSON requests, ranged, any number in parallel
 *   live     POST /api/mt5/live      ONE tick stream per symbol, candles built here
 *
 * How request.security() is served
 *   Vela's fetchSeries gateway does no timeframe aggregation: it calls
 *   getBars(ticker, "<exact timeframe the script asked for>", range). So this
 *   provider accepts ANY timeframe. MT5-native ones ("60" -> H1, "D", "W", "M")
 *   are downloaded directly; the rest ("45", "90", "2D", "3M" ...) are resampled
 *   from the best native timeframe. Each (symbol, native timeframe) is stored once
 *   and shared by every consumer.
 */

const DEFAULT_HISTORY_ENDPOINT = "/api/mt5/history";
const DEFAULT_LIVE_ENDPOINT = "/api/mt5/live";
const DEFAULT_BARS = 1_500;
/** Never ask the bridge for more native bars than this in one request. */
const MAX_FETCH = 50_000;
/** A series that has not been touched by a tick or a fetch for this long is re-synced on read. */
const STALE_TAIL_MS = 3_000;
/** Keep the tick stream open briefly after the last subscriber leaves (market switches resubscribe fast). */
const FEED_CLOSE_GRACE_MS = 3_000;
const DEFAULT_LIVE_THROTTLE_MS = 250;
const SERVER_CLOCK_SAMPLE_COUNT = 9;

/**
 * TradingView-style exchange prefixes that scripts commonly use, e.g. "TVC:DXY",
 * "OANDA:XAUUSD", "BINANCE:BTCUSDT". Each one is registered as an alias of this
 * provider so those symbols resolve to MT5. Edit freely. These aliases are
 * reachable only through an explicit prefix; they do not appear in symbol search.
 */
export const MT5_ALIAS_PREFIXES: readonly string[] = [
  "tvc", "fx", "fx_idc", "oanda", "forexcom", "capitalcom", "pepperstone", "icmarkets",
  "fxcm", "eightcap", "saxo", "vantage", "binance", "bitstamp", "coinbase", "kraken", "bybit", "okx",
];

const SYMBOLS: SymbolDescriptor[] = [
  { ticker: "EURUSD", description: "Euro / US Dollar", type: "forex" },
  { ticker: "GBPUSD", description: "British Pound / US Dollar", type: "forex" },
  { ticker: "USDJPY", description: "US Dollar / Japanese Yen", type: "forex" },
  { ticker: "AUDUSD", description: "Australian Dollar / US Dollar", type: "forex" },
  { ticker: "USDCAD", description: "US Dollar / Canadian Dollar", type: "forex" },
  { ticker: "USDCHF", description: "US Dollar / Swiss Franc", type: "forex" },
  { ticker: "NZDUSD", description: "New Zealand Dollar / US Dollar", type: "forex" },
  { ticker: "XAUUSD", description: "Gold / US Dollar", type: "metals" },
  { ticker: "BTCUSD", description: "Bitcoin / US Dollar", type: "crypto" },
  { ticker: "ETHUSD", description: "Ethereum / US Dollar", type: "crypto" },
];

export interface Mt5VelaProviderOptions {
  historyEndpoint?: string;
  liveEndpoint?: string;
  /** Minimum gap between live bar updates pushed to one subscriber. New bars are always pushed immediately. */
  liveThrottleMs?: number;
  /** Override the symbol list used for search / bare-symbol resolution. */
  symbols?: SymbolDescriptor[];
  /** Called with a readable message when MT5 data cannot be loaded (deduplicated). */
  onError?: (message: string) => void;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function rangeBars(bars: Bar[], range: BarRange): Bar[] {
  let out = bars;
  if (range.from != null) {
    const from = range.from;
    out = out.filter((b) => b.time >= from);
  }
  if (range.to != null) {
    const to = range.to;
    out = out.filter((b) => b.time <= to);
  }
  if (range.limit != null && range.limit > 0 && out.length > range.limit) out = out.slice(-range.limit);
  return out === bars ? bars.slice() : out;
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown } | null;
    if (body && typeof body.error === "string") return body.error;
  } catch {
    /* not JSON */
  }
  return `${fallback} (HTTP ${res.status})`;
}

function inferDigits(bars: readonly Bar[]): number | null {
  if (!bars.length) return null;
  let max = 0;
  for (let i = Math.max(0, bars.length - 50); i < bars.length; i++) {
    for (const value of [bars[i].open, bars[i].close]) {
      const s = String(value);
      if (s.includes("e")) continue;
      const dot = s.indexOf(".");
      if (dot >= 0) max = Math.max(max, s.length - dot - 1);
    }
  }
  return Math.min(max, 8);
}

function guessDigits(upper: string): number {
  if (upper.includes("JPY")) return 3;
  if (upper.startsWith("XAU") || upper.startsWith("XAG")) return 2;
  if (upper.startsWith("BTC") || upper.startsWith("ETH")) return 2;
  if (["DXY", "USDX", "DX"].includes(upper)) return 3;
  return 5;
}

// ---------------------------------------------------------------------------
// One native MT5 timeframe of one symbol
// ---------------------------------------------------------------------------

class NativeSeries {
  bars: Bar[] = [];
  /** True once the bridge returned fewer bars than requested: there is nothing older to fetch. */
  genesis = false;
  /** Last time this series was updated by a fetch or a tick. */
  lastSync = 0;

  readonly nativeMs: number;
  private readonly kind: TfKind;
  private maxPulled = 0;
  private chain: Promise<unknown> = Promise.resolve();
  private latestLiveBar: Bar | null = null;
  private latestLiveAt = 0;

  constructor(
    readonly symbol: string,
    readonly native: NativeCode,
    private readonly endpoint: string,
  ) {
    this.nativeMs = nativeMsOf(native);
    this.kind = nativeKindOf(native);
  }

  last(): Bar | undefined {
    return this.bars[this.bars.length - 1];
  }

  /** Serialise network work per series so concurrent callers never download the same thing twice. */
  private run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.chain.then(task);
    this.chain = result.catch(() => undefined);
    return result;
  }

  private countAtOrBefore(t: number): number {
    let lo = 0;
    let hi = this.bars.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.bars[mid].time <= t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private async download(count: number): Promise<Bar[]> {
    const url =
      `${this.endpoint}?symbol=${encodeURIComponent(this.symbol)}` +
      `&timeframe=${this.native}&count=${count}`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(45_000) });
    if (!res.ok) throw new Error(await readError(res, `MT5 history for ${this.symbol} ${this.native} failed`));
    const payload = (await res.json()) as { bars?: unknown } | null;
    const rows = Array.isArray(payload?.bars) ? (payload!.bars as unknown[]) : [];
    const out: Bar[] = [];
    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      const [time, open, high, low, close, volume] = row.map(Number);
      if (![time, open, high, low, close].every(Number.isFinite)) continue;
      out.push({ time, open, high, low, close, volume: Number.isFinite(volume) ? volume : 0 });
    }
    return out;
  }

  /** Make sure the store holds at least `want` target bars that end at or before `toMs`. */
  ensure(want: number, factor: number, toMs: number): Promise<void> {
    return this.run(async () => {
      const need = (want + 1) * factor + 5;
      const first = this.bars[0];
      if (first && this.genesis) return;

      let count: number;
      if (!first || toMs < first.time) {
        // Nothing at or before `toMs` yet: the bridge only returns the NEWEST n bars,
        // so n must reach back past `toMs`. (Calendar time over-counts weekends; that is fine.)
        count = Math.ceil((Date.now() - Math.min(toMs, Date.now())) / this.nativeMs) + need;
      } else {
        const have = this.countAtOrBefore(toMs);
        if (have >= need) return;
        count = this.bars.length - have + need;
      }
      count = Math.min(count, MAX_FETCH);
      if (count <= this.maxPulled) return; // already asked for at least this much

      const rows = await this.download(count);
      this.maxPulled = Math.max(this.maxPulled, count);
      if (rows.length < count) this.genesis = true;
      this.mergeHistory(rows);
      this.lastSync = Date.now();
    });
  }

  /** Re-download the newest few bars and merge them in (heals gaps, refreshes the forming bar). */
  refreshTail(): Promise<void> {
    return this.run(async () => {
      const lastTime = this.last()?.time ?? 0;
      const gap = lastTime ? Math.ceil((Date.now() - lastTime) / this.nativeMs) : 1_000;
      const count = Math.min(Math.max(gap + 3, 3), 1_000);
      const rows = await this.download(count);
      this.mergeHistory(rows);
      this.lastSync = Date.now();
    });
  }

  refreshIfStale(maxAgeMs: number): Promise<void> {
    if (!this.bars.length || Date.now() - this.lastSync < maxAgeMs) return Promise.resolve();
    return this.refreshTail();
  }

  /**
   * Fold one tick into the forming bar, or open a new bar.
   * New bars are aligned to the previous bar's real open time, so whatever the broker's
   * session offset is, live candles line up with history. Returns null if not applicable.
   */
  applyTick(price: number, t: number, volume: number): Bar | null {
    const last = this.last();
    if (!last || t < last.time) return null;
    const open = this.kind === "month"
      ? bucketOpen("month", 1, t)
      : last.time + Math.floor((t - last.time) / this.nativeMs) * this.nativeMs;
    const v = volume > 0 ? volume : 1; // MT5 history counts ticks, so count ticks live too
    this.lastSync = Date.now();

    if (open === last.time) {
      // Replace instead of mutating: earlier getBars() results may still reference the old object.
      const next: Bar = {
        time: last.time,
        open: last.open,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price,
        volume: last.volume + v,
      };
      this.bars[this.bars.length - 1] = next;
      this.latestLiveBar = next;
      this.latestLiveAt = Date.now();
      return next;
    }
    if (open < last.time) return null;
    const bar: Bar = { time: open, open: price, high: price, low: price, close: price, volume: v };
    this.bars.push(bar);
    this.latestLiveBar = bar;
    this.latestLiveAt = Date.now();
    return bar;
  }

  /**
   * Keep a recently tick-updated forming candle when MT5 returns an older snapshot.
   * History still reconciles the candle after live ticks stop, and real gaps remain
   * intact because this only preserves the candle at its original timestamp.
   */
  private mergeHistory(rows: Bar[]): void {
    this.bars = mergeSorted(this.bars, rows);
    const liveBar = this.latestLiveBar;
    const newestHistoryTime = rows.length ? rows[rows.length - 1].time : 0;
    const liveIsFresh = Date.now() - this.latestLiveAt <= 15_000;
    if (!liveBar || !liveIsFresh || newestHistoryTime > liveBar.time) return;

    const index = this.bars.findIndex((bar) => bar.time === liveBar.time);
    if (index >= 0) {
      this.bars[index] = liveBar;
      return;
    }
    const insertAt = this.countAtOrBefore(liveBar.time);
    this.bars.splice(insertAt, 0, liveBar);
  }
}

// ---------------------------------------------------------------------------
// Live tick feed: one SSE stream per symbol
// ---------------------------------------------------------------------------

interface Tick {
  t: number;
  p: number;
  v: number;
}

class TickFeed {
  private closed = false;
  private controller: AbortController | null = null;
  private seenReady = false;
  private reported = false;

  constructor(
    private readonly symbol: string,
    private readonly endpoint: string,
    private readonly cb: {
      onTick: (tick: Tick) => void;
      onReconnect: () => void;
      onError: (message: string) => void;
    },
  ) {
    void this.run();
  }

  close(): void {
    this.closed = true;
    this.controller?.abort();
  }

  private async run(): Promise<void> {
    let retry = 0;
    while (!this.closed) {
      try {
        await this.connect();
        retry = 0;
      } catch (error) {
        if (this.closed || (error as { name?: string })?.name === "AbortError") return;
        if (!this.reported) {
          this.reported = true;
          this.cb.onError(`Live MT5 ticks for ${this.symbol} interrupted: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (this.closed) return;
      retry++;
      await sleep(Math.min(1_000 * 2 ** Math.min(retry, 4), 10_000));
    }
  }

  private async connect(): Promise<void> {
    this.controller = new AbortController();
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: this.symbol }),
      signal: this.controller.signal,
      cache: "no-store",
    });
    if (!res.ok || !res.body) throw new Error(await readError(res, "MT5 live stream failed"));

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (!this.closed) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";
      for (const frame of frames) this.handleFrame(frame);
    }
  }

  private handleFrame(frame: string): void {
    let event = "message";
    const data: string[] = [];
    for (const line of frame.split(/\r?\n/)) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (event === "ready") {
      if (this.seenReady) this.cb.onReconnect(); // we may have missed ticks: re-sync the tail
      this.seenReady = true;
      this.reported = false;
      return;
    }
    if (!data.length) return; // heartbeat comment
    try {
      const parsed = JSON.parse(data.join("\n")) as { t?: unknown; p?: unknown; v?: unknown; message?: unknown };
      if (event === "error") {
        if (typeof parsed.message === "string") this.cb.onError(parsed.message);
        return;
      }
      const t = Number(parsed.t);
      const p = Number(parsed.p);
      if (Number.isFinite(t) && Number.isFinite(p) && p > 0) {
        this.cb.onTick({ t, p, v: Number(parsed.v) || 0 });
      }
    } catch {
      /* ignore malformed frame */
    }
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface Subscriber {
  plan: TimeframePlan;
  onBar: (bar: OHLCV) => void;
  lastTime: number;
  lastAt: number;
  pending: Bar | null;
  timer: ReturnType<typeof setTimeout> | null;
}

class SymbolState {
  readonly series = new Map<NativeCode, NativeSeries>();
  readonly subs = new Set<Subscriber>();
  feed: TickFeed | null = null;
  closeTimer: ReturnType<typeof setTimeout> | null = null;
  constructor(readonly symbol: string) { }
}

export class Mt5VelaProvider implements DataProvider {
  private readonly states = new Map<string, SymbolState>();
  private readonly historyEndpoint: string;
  private readonly liveEndpoint: string;
  private readonly throttleMs: number;
  private readonly symbols: SymbolDescriptor[];
  private lastReport = { message: "", at: 0 };
  private readonly serverClockOffsets: number[] = [];
  private disposed = false;

  constructor(private readonly options: Mt5VelaProviderOptions = {}) {
    this.historyEndpoint = options.historyEndpoint ?? DEFAULT_HISTORY_ENDPOINT;
    this.liveEndpoint = options.liveEndpoint ?? DEFAULT_LIVE_ENDPOINT;
    this.throttleMs = options.liveThrottleMs ?? DEFAULT_LIVE_THROTTLE_MS;
    this.symbols = options.symbols ?? SYMBOLS;
  }

  info() {
    return {
      name: "mt5",
      displayName: "MT5",
      requiresApiKey: false,
      // MT5-native timeframes shown in the toolbar. Any other timeframe a script
      // requests (45, 90, 2D, 3M ...) is still served by resampling.
      supportedTimeframes: ["1", "2", "3", "4", "5", "6", "10", "12", "15", "20", "30", "60", "120", "180", "240", "360", "480", "720", "D", "W", "M"],
      capabilities: { enumerate: true, stream: true, symbolInfo: true },
    };
  }

  /** Current MT5 server-clock epoch, used only by the chart's candle countdown. */
  chartNow(): number {
    if (this.serverClockOffsets.length === 0) return Date.now();
    const sorted = [...this.serverClockOffsets].sort((a, b) => a - b);
    return Date.now() + sorted[Math.floor(sorted.length / 2)];
  }

  async getBars(ticker: string, timeframe: string, range: BarRange = {}): Promise<OHLCV[]> {
    try {
      const plan = planTimeframe(timeframe);
      const series = this.seriesFor(cleanTicker(ticker), plan.native);
      const now = Date.now();

      // How many target bars does this request need?
      let want: number;
      if (range.from != null) {
        const end = Math.min(range.to ?? now, now);
        const span = Math.max(0, Math.ceil((end - range.from) / plan.ms)) + 3;
        want = range.limit != null ? Math.min(range.limit, span) : span;
      } else {
        want = range.limit ?? DEFAULT_BARS;
      }
      want = Math.max(2, Math.floor(want));

      await series.ensure(want, plan.factor, range.to ?? Number.POSITIVE_INFINITY);
      if (range.to == null || range.to >= now - plan.ms) await series.refreshIfStale(STALE_TAIL_MS);

      const bars = aggregateBars(series.bars, plan, !series.genesis);
      return rangeBars(bars, range);
    } catch (error) {
      this.report(error);
      throw error;
    }
  }

  subscribe(ticker: string, timeframe: string, onBar: (bar: OHLCV) => void): () => void {
    let plan: TimeframePlan;
    try {
      plan = planTimeframe(timeframe);
    } catch (error) {
      this.report(error);
      return () => { };
    }
    const state = this.stateFor(cleanTicker(ticker));
    const sub: Subscriber = { plan, onBar, lastTime: 0, lastAt: 0, pending: null, timer: null };
    state.subs.add(sub);
    this.attach(state);

    return () => {
      if (sub.timer) clearTimeout(sub.timer);
      sub.timer = null;
      sub.pending = null;
      state.subs.delete(sub);
      this.detach(state);
    };
  }

  async listSymbols(): Promise<SymbolDescriptor[]> {
    return this.symbols;
  }

  async getSymbolInfo(ticker: string): Promise<SymbolInfo> {
    const symbol = cleanTicker(ticker);
    const upper = symbol.toUpperCase();
    const descriptor = this.symbols.find((entry) => entry.ticker.toUpperCase() === upper);

    let digits: number | null = null;
    const loaded = this.states.get(symbol);
    if (loaded) {
      for (const series of loaded.series.values()) {
        digits = inferDigits(series.bars);
        if (digits !== null) break;
      }
    }
    const d = digits ?? guessDigits(upper);

    return {
      ticker: symbol,
      name: descriptor?.description ?? symbol,
      description: descriptor?.description ?? symbol,
      type: descriptor?.type ?? "forex",
      prefix: "MT5",
      root: symbol,
      timezone: "Etc/UTC",
      session: "24x7",
      mintick: 10 ** -d,
      pricescale: 10 ** d,
      minmove: 1,
      pointvalue: 1,
      currency: symbol.length >= 6 ? symbol.slice(-3) : "USD",
      basecurrency: symbol.length >= 6 ? symbol.slice(0, 3) : symbol,
    };
  }

  /**
   * A view of this provider to register under another name ("tvc", "oanda" ...).
   * It shares all data and streams but lists no symbols, so symbol search is not duplicated.
   */
  alias(name: string): DataProvider {
    return {
      info: () => ({ ...this.info(), name, displayName: name.toUpperCase(), capabilities: { enumerate: false, stream: true, symbolInfo: true } }),
      getBars: (ticker: string, timeframe: string, range: BarRange) => this.getBars(ticker, timeframe, range),
      subscribe: (ticker: string, timeframe: string, onBar: (bar: OHLCV) => void) => this.subscribe(ticker, timeframe, onBar),
      getSymbolInfo: (ticker: string) => this.getSymbolInfo(ticker),
      listSymbols: async () => [],
    };
  }

  dispose(): void {
    this.disposed = true;
    for (const state of this.states.values()) {
      if (state.closeTimer) clearTimeout(state.closeTimer);
      state.feed?.close();
      state.feed = null;
      for (const sub of state.subs) if (sub.timer) clearTimeout(sub.timer);
      state.subs.clear();
    }
    this.states.clear();
  }

  // ---- internals ----------------------------------------------------------

  private stateFor(symbol: string): SymbolState {
    let state = this.states.get(symbol);
    if (!state) {
      state = new SymbolState(symbol);
      this.states.set(symbol, state);
    }
    return state;
  }

  private seriesFor(symbol: string, native: NativeCode): NativeSeries {
    const state = this.stateFor(symbol);
    let series = state.series.get(native);
    if (!series) {
      series = new NativeSeries(symbol, native, this.historyEndpoint);
      state.series.set(native, series);
    }
    return series;
  }

  private attach(state: SymbolState): void {
    if (state.closeTimer) {
      clearTimeout(state.closeTimer);
      state.closeTimer = null;
    }
    if (state.feed || this.disposed) return;
    state.feed = new TickFeed(state.symbol, this.liveEndpoint, {
      onTick: (tick) => this.onTick(state, tick),
      onReconnect: () => void this.heal(state),
      onError: (message) => this.report(new Error(message)),
    });
  }

  private detach(state: SymbolState): void {
    if (state.subs.size > 0) return;
    if (state.closeTimer) clearTimeout(state.closeTimer);
    state.closeTimer = setTimeout(() => {
      state.closeTimer = null;
      if (state.subs.size === 0) {
        state.feed?.close();
        state.feed = null;
      }
    }, FEED_CLOSE_GRACE_MS);
  }

  /** A tick updates EVERY loaded timeframe of that symbol, so request.security() HTF data stays live too. */
  private onTick(state: SymbolState, tick: Tick): void {
    const offset = tick.t - Date.now();
    // MT5 server clocks are normally within one day of UTC. Ignore bad timestamps,
    // then use the median of recent ticks to smooth out network/clock jitter.
    if (Number.isFinite(offset) && Math.abs(offset) <= 24 * 60 * 60 * 1_000) {
      this.serverClockOffsets.push(offset);
      if (this.serverClockOffsets.length > SERVER_CLOCK_SAMPLE_COUNT) this.serverClockOffsets.shift();
    }
    for (const series of state.series.values()) {
      if (series.applyTick(tick.p, tick.t, tick.v)) this.fanOut(state, series);
    }
  }

  private fanOut(state: SymbolState, series: NativeSeries): void {
    const last = series.last();
    if (!last) return;
    for (const sub of state.subs) {
      if (sub.plan.native !== series.native) continue;
      const bar = sub.plan.factor === 1 ? last : aggregateTail(series.bars, sub.plan, last.time);
      if (bar) this.push(sub, bar);
    }
  }

  private async heal(state: SymbolState): Promise<void> {
    for (const series of state.series.values()) {
      try {
        await series.refreshTail();
        this.fanOut(state, series);
      } catch {
        /* the next tick or read will re-sync */
      }
    }
  }

  /** Emit a new bar at once; coalesce updates to the forming bar so heavy scripts are not re-run per tick. */
  private push(sub: Subscriber, bar: Bar): void {
    const now = Date.now();
    if (bar.time !== sub.lastTime || now - sub.lastAt >= this.throttleMs) {
      if (sub.timer) clearTimeout(sub.timer);
      sub.timer = null;
      sub.pending = null;
      this.deliver(sub, bar, now);
      return;
    }
    sub.pending = bar;
    if (!sub.timer) {
      sub.timer = setTimeout(() => {
        sub.timer = null;
        const pending = sub.pending;
        sub.pending = null;
        if (pending) this.deliver(sub, pending, Date.now());
      }, Math.max(0, this.throttleMs - (now - sub.lastAt)));
    }
  }

  private deliver(sub: Subscriber, bar: Bar, now: number): void {
    sub.lastTime = bar.time;
    sub.lastAt = now;
    try {
      sub.onBar(bar);
    } catch (error) {
      console.error("[MT5 Vela] subscriber failed:", error);
    }
  }

  private report(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    const now = Date.now();
    if (message === this.lastReport.message && now - this.lastReport.at < 10_000) return;
    this.lastReport = { message, at: now };
    console.error("[MT5 Vela]", message);
    try {
      this.options.onError?.(message);
    } catch {
      /* reporting must never throw */
    }
  }
}
