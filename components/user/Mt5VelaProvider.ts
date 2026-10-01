import type { BarRange, DataProvider, OHLCV, SymbolDescriptor, SymbolInfo } from "@luxalgo/vela";

const MT5_ENDPOINT = "/api/mt5/live";
const MAX_BARS = 5_000;
const HISTORY_SETTLE_MS = 900;
const MAX_HISTORY_WAIT_MS = 12_000;

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

function mt5Timeframe(timeframe: string): string {
  const tf = String(timeframe || "1").trim();
  const upper = tf.toUpperCase();
  const mt5 = /^(MN|M|H|D|W)(\d+)$/i.exec(upper);
  if (mt5) return `${mt5[1].toUpperCase()}${mt5[2]}`;
  if (/^\d+$/.test(tf)) return `M${tf}`;
  const pine = /^(\d+)([mMHDW])$/.exec(tf);
  if (pine) {
    const n = Number(pine[1]);
    switch (pine[2].toUpperCase()) {
      // Pine's lowercase `m` is minutes; uppercase `M` is months.
      case "M": return pine[2] === "m" ? `M${n}` : `MN${n}`;
      case "H": return `H${n}`;
      case "D": return `D${n}`;
      case "W": return `W${n}`;
    }
  }
  if (upper === "D") return "D1";
  if (upper === "W") return "W1";
  if (upper === "M") return "MN1";
  return "M1";
}

function normalizeTime(value: unknown): number {
  const time = Number(value);
  if (!Number.isFinite(time) || time <= 0) return Date.now();
  return Math.floor(time < 1e12 ? time * 1000 : time);
}

function rangeBars(bars: Iterable<OHLCV>, range: BarRange = {}): OHLCV[] {
  let result = Array.from(bars).sort((a, b) => a.time - b.time);
  if (range.from != null) result = result.filter((bar) => bar.time >= range.from!);
  if (range.to != null) result = result.filter((bar) => bar.time <= range.to!);
  if (range.limit && result.length > range.limit) result = result.slice(-range.limit);
  return result;
}

class SharedMt5Stream {
  readonly key: string;
  readonly bars = new Map<number, OHLCV>();
  readonly listeners = new Set<(bar: OHLCV) => void>();
  refs = 0;
  closeTimer: ReturnType<typeof setTimeout> | null = null;
  error: Error | null = null;

  private closed = false;
  private settled = false;
  private newestTime = 0;
  private controller: AbortController | null = null;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  private maxTimer: ReturnType<typeof setTimeout> | null = null;
  private resolveReady!: () => void;
  private readonly readyPromise = new Promise<void>((resolve) => { this.resolveReady = resolve; });

  constructor(
    private readonly symbol: string,
    private readonly timeframe: string,
  ) {
    this.key = `${symbol}|${timeframe}`;
    this.maxTimer = setTimeout(() => this.markReady(), MAX_HISTORY_WAIT_MS);
    void this.run();
  }

  ready(): Promise<void> {
    return this.readyPromise;
  }

  addListener(listener: (bar: OHLCV) => void): () => void {
    this.listeners.add(listener);
    void this.ready().then(() => {
      const last = this.last();
      if (last && this.listeners.has(listener)) listener(last);
    });
    return () => this.listeners.delete(listener);
  }

  last(): OHLCV | undefined {
    let last: OHLCV | undefined;
    for (const bar of this.bars.values()) if (!last || bar.time > last.time) last = bar;
    return last;
  }

  snapshot(range?: BarRange): OHLCV[] {
    return rangeBars(this.bars.values(), range);
  }

  close(): void {
    this.closed = true;
    if (this.closeTimer) clearTimeout(this.closeTimer);
    if (this.settleTimer) clearTimeout(this.settleTimer);
    if (this.maxTimer) clearTimeout(this.maxTimer);
    this.listeners.clear();
    this.controller?.abort();
    this.markReady();
  }

  private markReady(): void {
    if (this.settled) return;
    this.settled = true;
    if (this.settleTimer) clearTimeout(this.settleTimer);
    if (this.maxTimer) clearTimeout(this.maxTimer);
    this.resolveReady();
  }

  private bumpSettleTimer(): void {
    if (this.settled) return;
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => this.markReady(), HISTORY_SETTLE_MS);
  }

  private async run(): Promise<void> {
    let retry = 0;
    while (!this.closed) {
      try {
        await this.connectOnce();
        retry = 0;
      } catch (error: any) {
        if (this.closed || error?.name === "AbortError") return;
        this.error = error instanceof Error ? error : new Error(String(error));
        console.error(`[MT5 Vela] ${this.symbol} ${this.timeframe} stream failed:`, this.error);
      }
      if (this.closed) return;
      this.markReady();
      retry++;
      await new Promise((resolve) => setTimeout(resolve, Math.min(1_000 * 2 ** Math.min(retry, 4), 10_000)));
    }
  }

  private async connectOnce(): Promise<void> {
    this.controller = new AbortController();
    const response = await fetch(MT5_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: this.symbol, timeframe: this.timeframe }),
      signal: this.controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`MT5 endpoint returned HTTP ${response.status}`);
    if (!response.body) throw new Error("MT5 stream response has no body");

    this.error = null;
    const reader = response.body.getReader();
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
    if (buffer.trim()) this.handleFrame(buffer);
  }

  private handleFrame(frame: string): void {
    const eventName = frame.split(/\r?\n/).find((line) => line.startsWith("event:"))?.slice(6).trim();
    const data = frame.split(/\r?\n/).filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart()).join("\n").trim();
    if (data) {
      try {
        const parsed = JSON.parse(data);
        const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.candles) ? parsed.candles : [parsed];
        for (const item of items) this.ingest(item);
        this.bumpSettleTimer();
      } catch (error) {
        console.error("[MT5 Vela] Could not parse candle frame:", error);
      }
    }
    if (eventName === "history_end") this.markReady();
  }

  private ingest(raw: any): void {
    const open = Number(raw?.open);
    const high = Number(raw?.high);
    const low = Number(raw?.low);
    const close = Number(raw?.close);
    if (![open, high, low, close].every(Number.isFinite) || open <= 0) return;
    const time = normalizeTime(raw?.time ?? raw?.openTime);
    const bar: OHLCV = { time, open, high, low, close, volume: Number(raw?.volume ?? raw?.tick_volume ?? 0) };
    this.bars.set(time, bar);
    const isTail = time >= this.newestTime;
    if (time > this.newestTime) this.newestTime = time;
    if (this.bars.size > MAX_BARS) {
      const oldest = Array.from(this.bars.keys()).sort((a, b) => a - b).slice(0, this.bars.size - MAX_BARS);
      for (const key of oldest) this.bars.delete(key);
    }
    if (isTail && this.settled) {
      for (const listener of this.listeners) {
        try { listener(bar); } catch (error) { console.error("[MT5 Vela] subscriber failed:", error); }
      }
    }
  }
}

/** Vela DataProvider backed by the application's MT5 history + live SSE route. */
export class Mt5VelaProvider implements DataProvider {
  private readonly streams = new Map<string, SharedMt5Stream>();

  info() {
    return {
      name: "mt5",
      displayName: "MT5",
      requiresApiKey: false,
      supportedTimeframes: ["1", "2", "3", "4", "5", "6", "10", "12", "15", "20", "30", "60", "120", "180", "240", "360", "480", "720", "D", "W", "M"],
      capabilities: { enumerate: true, stream: true, symbolInfo: true },
    };
  }

  async getBars(ticker: string, timeframe: string, range: BarRange): Promise<OHLCV[]> {
    const stream = this.acquire(ticker, timeframe);
    try {
      await stream.ready();
      if (stream.error && stream.snapshot().length === 0) throw stream.error;
      return stream.snapshot(range);
    } finally {
      this.release(stream, 8_000);
    }
  }

  subscribe(ticker: string, timeframe: string, onBar: (bar: OHLCV) => void): () => void {
    const stream = this.acquire(ticker, timeframe);
    const unsubscribeListener = stream.addListener(onBar);
    return () => {
      unsubscribeListener();
      this.release(stream, 3_000);
    };
  }

  async listSymbols(): Promise<SymbolDescriptor[]> {
    return SYMBOLS;
  }

  async getSymbolInfo(ticker: string): Promise<SymbolInfo> {
    const symbol = ticker.toUpperCase();
    const digits = symbol.includes("JPY") ? 3 : symbol.startsWith("XAU") ? 2 : 5;
    const descriptor = SYMBOLS.find((entry) => entry.ticker === symbol);
    return {
      ticker: symbol,
      name: descriptor?.description ?? symbol,
      description: descriptor?.description ?? symbol,
      type: descriptor?.type ?? "forex",
      prefix: "MT5",
      root: symbol,
      timezone: "Etc/UTC",
      session: "24x7",
      mintick: 10 ** -digits,
      pricescale: 10 ** digits,
      minmove: 1,
      pointvalue: 1,
      currency: symbol.slice(-3),
      basecurrency: symbol.slice(0, 3),
    };
  }

  dispose(): void {
    for (const stream of this.streams.values()) stream.close();
    this.streams.clear();
  }

  private acquire(ticker: string, timeframe: string): SharedMt5Stream {
    const code = mt5Timeframe(timeframe);
    const key = `${ticker}|${code}`;
    let stream = this.streams.get(key);
    if (!stream) {
      stream = new SharedMt5Stream(ticker, code);
      this.streams.set(key, stream);
    }
    stream.refs++;
    if (stream.closeTimer) {
      clearTimeout(stream.closeTimer);
      stream.closeTimer = null;
    }
    return stream;
  }

  private release(stream: SharedMt5Stream, graceMs: number): void {
    stream.refs = Math.max(0, stream.refs - 1);
    if (stream.refs > 0) return;
    if (stream.closeTimer) clearTimeout(stream.closeTimer);
    stream.closeTimer = setTimeout(() => {
      if (stream.refs > 0) return;
      stream.close();
      if (this.streams.get(stream.key) === stream) this.streams.delete(stream.key);
    }, graceMs);
  }
}
