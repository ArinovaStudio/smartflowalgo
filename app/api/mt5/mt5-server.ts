/**
 * app/api/mt5/mt5-server.ts
 * ---------------------------------------------------------------------------
 * Server-only helpers shared by /api/mt5/history and /api/mt5/live.
 *
 * Environment variables
 *   MT5_API_KEY         required
 *   MT5_WS_URL          default ws://127.0.0.1:8001
 *   MT5_HTTP_URL        optional, defaults to MT5_WS_URL with ws -> http
 *   MT5_SYMBOL_MAP      optional JSON, e.g. {"DXY":"USDX","XAUUSD":"GOLD"}
 *   MT5_SYMBOL_SUFFIX   optional broker suffix tried as a fallback, e.g. "m" or ".a"
 */

export class HttpError extends Error {
    constructor(readonly status: number, message: string) {
        super(message);
    }
}

export const NATIVE_TIMEFRAMES = [
    "M1", "M2", "M3", "M4", "M5", "M6", "M10", "M12", "M15", "M20", "M30",
    "H1", "H2", "H3", "H4", "H6", "H8", "H12", "D1", "W1", "MN1",
] as const;
export type NativeTimeframe = (typeof NATIVE_TIMEFRAMES)[number];

export function isNativeTimeframe(value: string): value is NativeTimeframe {
    return (NATIVE_TIMEFRAMES as readonly string[]).includes(value);
}

export interface Mt5Env {
    apiKey: string;
    httpBase: string;
    wsBase: string;
}

export function getEnv(): Mt5Env {
    const apiKey = process.env.MT5_API_KEY;
    if (!apiKey) throw new HttpError(500, "MT5_API_KEY is missing");
    const wsBase = (process.env.MT5_WS_URL || "ws://127.0.0.1:8001").replace(/\/+$/, "");
    const httpBase = (process.env.MT5_HTTP_URL || wsBase.replace(/^ws:\/\//i, "http://").replace(/^wss:\/\//i, "https://")).replace(/\/+$/, "");
    return { apiKey, wsBase, httpBase };
}

export function cleanSymbol(value: unknown): string {
    return String(value ?? "").trim().replace(/^[A-Za-z0-9_]+:/, "");
}

export function errorResponse(error: unknown): Response {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected MT5 bridge error";
    if (status >= 500) console.error("[MT5]", message);
    return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

// ---------------------------------------------------------------------------
// Process-wide state. Stored on globalThis so Next.js dev hot-reload keeps it.
// ---------------------------------------------------------------------------

interface Mt5State {
    /** requested symbol (upper-case) -> symbol that exists on the broker */
    resolved: Map<string, string>;
    inflight: Map<string, Promise<unknown>>;
    /** largest `count` the MT5 service accepted after we had to step down */
    countCap: number;
}
const globalState = globalThis as unknown as { __mt5State?: Mt5State };
const state: Mt5State = (globalState.__mt5State ??= {
    resolved: new Map(),
    inflight: new Map(),
    countCap: Number.POSITIVE_INFINITY,
});

/** Share one upstream request between identical concurrent callers. */
export function dedupe<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = state.inflight.get(key) as Promise<T> | undefined;
    if (existing) return existing;
    const promise = factory().finally(() => state.inflight.delete(key));
    state.inflight.set(key, promise);
    return promise;
}

// ---------------------------------------------------------------------------
// Symbols
// ---------------------------------------------------------------------------

const DXY_NAMES = ["DXY", "USDX", "DX", "USDIDX", "DOLLAR_INDEX", "USDOLLAR"];
const DXY_ALIASES = [
    "DXY", "USDX", "DX", "USDIDX", "DXY.cash", "DXY.c", "USDX.c", "DX.f",
    "DOLLAR_INDEX", "USDOLLAR", "USDollar", "$DXY",
];

function readSymbolMap(): Record<string, string> {
    const raw = process.env.MT5_SYMBOL_MAP;
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const out: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed)) {
            if (typeof value === "string" && value) out[key.toUpperCase()] = value;
        }
        return out;
    } catch {
        console.warn("[MT5] MT5_SYMBOL_MAP is not valid JSON, ignoring it");
        return {};
    }
}

/** Broker spellings to try for a symbol, best guess first. */
export function symbolCandidates(requested: string): string[] {
    const out: string[] = [];
    const add = (value?: string) => {
        if (value && !out.includes(value)) out.push(value);
    };
    const upper = requested.toUpperCase();
    const suffix = process.env.MT5_SYMBOL_SUFFIX || "";

    add(readSymbolMap()[upper]);
    add(requested);
    if (suffix) add(requested + suffix);
    if (upper.endsWith("USDT")) {
        const usd = requested.slice(0, -4) + "USD";
        add(usd);
        if (suffix) add(usd + suffix);
    }
    if (DXY_NAMES.includes(upper)) for (const alias of DXY_ALIASES) add(alias);
    return out;
}

// ---------------------------------------------------------------------------
// Rates
// ---------------------------------------------------------------------------

export interface Rate {
    /** bar open time, epoch ms */
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

type RatesOutcome =
    | { ok: true; rates: Rate[] }
    | { ok: false; status: number; error: string };

const RATES_TIMEOUT_MS = 20_000;
const COUNT_LADDER = [20_000, 10_000, 5_000, 3_000, 1_500];

function parseTime(value: unknown): number | null {
    if (typeof value === "number") {
        return Number.isFinite(value) && value > 0 ? (value < 1e12 ? value * 1000 : value) : null;
    }
    if (typeof value === "string") {
        const s = value.trim();
        if (!s) return null;
        if (/^\d+(\.\d+)?$/.test(s)) return parseTime(Number(s));
        // Timestamps without a zone are MT5 server time encoded as UTC.
        const iso = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(s) ? s : `${s.replace(" ", "T")}Z`;
        const ms = Date.parse(iso);
        return Number.isFinite(ms) ? ms : null;
    }
    return null;
}

function normalizeRates(list: unknown[]): Rate[] {
    const byTime = new Map<number, Rate>();
    for (const item of list) {
        if (!item || typeof item !== "object") continue;
        const row = item as Record<string, unknown>;
        const time = parseTime(row.time);
        const open = Number(row.open);
        const high = Number(row.high);
        const low = Number(row.low);
        const close = Number(row.close);
        if (time === null || ![open, high, low, close].every(Number.isFinite) || open <= 0) continue;
        const volume = Number(row.volume || row.tick_volume || row.real_volume || 0);
        byTime.set(time, { time, open, high, low, close, volume: Number.isFinite(volume) ? volume : 0 });
    }
    return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
}

function upstreamMessage(text: string): string {
    try {
        const body = JSON.parse(text) as Record<string, unknown>;
        const detail = body.detail ?? body.error ?? body.message;
        if (typeof detail === "string") return detail;
        if (detail !== undefined) return JSON.stringify(detail).slice(0, 300);
    } catch {
        /* not JSON */
    }
    return text.slice(0, 300);
}

async function requestRates(env: Mt5Env, symbol: string, timeframe: string, count: number): Promise<RatesOutcome> {
    const url = `${env.httpBase}/rates/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}&count=${count}`;
    try {
        const res = await fetch(url, {
            headers: { "X-API-Key": env.apiKey },
            cache: "no-store",
            signal: AbortSignal.timeout(RATES_TIMEOUT_MS),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            return { ok: false, status: res.status, error: upstreamMessage(text) || `HTTP ${res.status}` };
        }
        const data = (await res.json()) as unknown;
        const container = data as Record<string, unknown> | null;
        const list = Array.isArray(data) ? data
            : Array.isArray(container?.rates) ? container.rates as unknown[]
                : Array.isArray(container?.bars) ? container.bars as unknown[]
                    : Array.isArray(container?.candles) ? container.candles as unknown[]
                        : [];
        return { ok: true, rates: normalizeRates(list) };
    } catch (error) {
        return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
    }
}

/** Ask for `wanted` bars; if the MT5 service rejects a large count, step down and remember the limit. */
async function ratesWithLadder(env: Mt5Env, symbol: string, timeframe: string, wanted: number): Promise<RatesOutcome> {
    let count = Math.min(wanted, state.countCap);
    let lowered = false;
    for (; ;) {
        const result = await requestRates(env, symbol, timeframe, count);
        if (result.ok) {
            if (lowered) state.countCap = count;
            return result;
        }
        const lower = COUNT_LADDER.find((step) => step < count);
        if ((result.status === 400 || result.status === 422) && count > 1_500 && lower !== undefined) {
            count = lower;
            lowered = true;
            continue;
        }
        return result;
    }
}

/**
 * Load bars for a symbol, trying broker spellings until one exists.
 * The spelling that worked is remembered for the life of the process.
 */
export async function loadRates(
    env: Mt5Env,
    requested: string,
    timeframe: NativeTimeframe,
    count: number,
): Promise<{ symbol: string; rates: Rate[] }> {
    const key = requested.toUpperCase();
    const cached = state.resolved.get(key);
    const candidates = cached ? [cached] : symbolCandidates(requested);
    let failure: { status: number; error: string } | null = null;

    for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];

        // After the first spelling, check the symbol exists with a tiny request
        // before paying for a large download.
        if (i > 0) {
            const probe = await requestRates(env, candidate, "H1", 2);
            if (!probe.ok || probe.rates.length === 0) {
                if (!failure) failure = probe.ok ? { status: 404, error: `no bars for ${candidate}` } : probe;
                if (!probe.ok && (probe.status === 0 || probe.status >= 500)) break;
                continue;
            }
        }

        const result = await ratesWithLadder(env, candidate, timeframe, count);
        if (result.ok && result.rates.length > 0) {
            state.resolved.set(key, candidate);
            return { symbol: candidate, rates: result.rates };
        }
        const current = result.ok ? { status: 404, error: `no ${timeframe} bars returned for ${candidate}` } : result;
        if (!failure) failure = current;
        if (current.status === 0 || current.status >= 500) break;
    }

    if (cached) state.resolved.delete(key);
    if (failure && (failure.status === 0 || failure.status >= 500)) {
        throw new HttpError(502, `MT5 service unreachable or failing: ${failure.error}`);
    }
    const tried = (cached ? [cached] : candidates).join(", ");
    throw new HttpError(
        404,
        `Symbol "${requested}" is not available on MT5 (tried: ${tried}). ` +
        `Make sure it is visible in Market Watch, or set MT5_SYMBOL_MAP='{"${requested}":"<broker symbol>"}'.` +
        (failure ? ` Upstream said: ${failure.error}` : ""),
    );
}

/** Find the broker-side spelling of a symbol for the live tick socket. Never throws. */
export async function resolveBrokerSymbol(env: Mt5Env, requested: string): Promise<string> {
    const key = requested.toUpperCase();
    const cached = state.resolved.get(key);
    if (cached) return cached;
    for (const candidate of symbolCandidates(requested)) {
        const probe = await requestRates(env, candidate, "H1", 2);
        if (probe.ok && probe.rates.length > 0) {
            state.resolved.set(key, candidate);
            return candidate;
        }
        if (!probe.ok && (probe.status === 0 || probe.status >= 500)) break;
    }
    return requested;
}