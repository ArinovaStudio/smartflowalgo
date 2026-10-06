/**
 * mt5Timeframes.ts
 * ---------------------------------------------------------------------------
 * Single source of truth for timeframe handling between Vela / Pine and MT5.
 * Pure functions only: no I/O, no imports.
 *
 * Why this exists
 *   Pine scripts can ask request.security() for ANY timeframe string ("60",
 *   "240", "D", "3D", "45", "1W", "3M", ...). MT5 only serves a fixed set of
 *   native timeframes (M1..M30, H1..H12, D1, W1, MN1). Anything else must be
 *   built by resampling a smaller native timeframe, which is what planTimeframe()
 *   works out.
 *
 *   Time convention: every timestamp is epoch milliseconds, exactly as MT5
 *   reports it (broker server time encoded as if it were UTC).
 */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;
/** 1970-01-04 was a Sunday. MT5 weekly bars open on Sunday. */
export const WEEK_ANCHOR = 3 * DAY;

export interface Bar {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export type TfKind = "min" | "day" | "week" | "month";

export const NATIVE_CODES = [
    "M1", "M2", "M3", "M4", "M5", "M6", "M10", "M12", "M15", "M20", "M30",
    "H1", "H2", "H3", "H4", "H6", "H8", "H12",
    "D1", "W1", "MN1",
] as const;
export type NativeCode = (typeof NATIVE_CODES)[number];

/** Native intraday sizes in minutes (H1 = 60 ... H12 = 720). */
const NATIVE_MINUTES = [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60, 120, 180, 240, 360, 480, 720];
const NATIVE_MINUTES_DESC = [...NATIVE_MINUTES].reverse();

export interface TimeframeSpec {
    kind: TfKind | "sec";
    n: number;
}

/**
 * Parse any timeframe notation we may meet:
 *   Pine / Vela : "1" "60" "240" "D" "2D" "W" "M" "3M" "15S"
 *   MT5         : "M5" "H4" "D1" "W1" "MN1"
 *   Human       : "1m" "5m" "4h" "1d" "1w" "1M"   (lowercase m = minutes, uppercase M = months)
 */
export function parseTimeframe(input: unknown): TimeframeSpec | null {
    const raw = String(input ?? "").trim().replace(/\s+/g, "");
    if (!raw) return null;

    // MT5 style, letter first: M5, H4, D1, W1, MN1
    let m = /^(MN|M|H|D|W)(\d+)$/i.exec(raw);
    if (m) {
        const n = Number(m[2]);
        if (!(n >= 1)) return null;
        switch (m[1].toUpperCase()) {
            case "MN": return { kind: "month", n };
            case "M": return { kind: "min", n };
            case "H": return { kind: "min", n: n * 60 };
            case "D": return { kind: "day", n };
            default: return { kind: "week", n };
        }
    }

    // A bare number is minutes (Pine / TradingView convention).
    m = /^(\d+)$/.exec(raw);
    if (m) {
        const n = Number(m[1]);
        return n >= 1 ? { kind: "min", n } : null;
    }

    // Number first, then a unit: D, 2D, W, 3M (months), 5m (minutes), 4h, 15S
    m = /^(\d*)([A-Za-z]{1,2})$/.exec(raw);
    if (m) {
        const n = m[1] === "" ? 1 : Number(m[1]);
        if (!(n >= 1)) return null;
        switch (m[2]) {
            case "S": case "s": return { kind: "sec", n };
            case "m": return { kind: "min", n };
            case "M": case "MN": case "Mn": case "mn": return { kind: "month", n };
            case "h": case "H": return { kind: "min", n: n * 60 };
            case "d": case "D": return { kind: "day", n };
            case "w": case "W": return { kind: "week", n };
        }
    }
    return null;
}

function normalizeSpec(spec: { kind: TfKind; n: number }): { kind: TfKind; n: number } {
    // 10080 minutes is one week; 1440 is one day, 2880 is two days, and so on.
    if (spec.kind === "min" && spec.n % 10080 === 0) return { kind: "week", n: spec.n / 10080 };
    if (spec.kind === "min" && spec.n % 1440 === 0) return { kind: "day", n: spec.n / 1440 };
    return spec;
}

function formatVela(kind: TfKind, n: number): string {
    switch (kind) {
        case "min": return String(n);
        case "day": return n === 1 ? "D" : `${n}D`;
        case "week": return n === 1 ? "W" : `${n}W`;
        case "month": return n === 1 ? "M" : `${n}M`;
    }
}

/** Convert any stored label ("1m", "H4", "D1", "MN1", "60") to Vela / Pine notation. */
export function toVelaTimeframe(value: unknown): string {
    const spec = parseTimeframe(value);
    if (!spec || spec.kind === "sec") return "1";
    const { kind, n } = normalizeSpec({ kind: spec.kind, n: spec.n });
    return formatVela(kind, n);
}

const NATIVE_MS: Record<NativeCode, number> = (() => {
    const out = {} as Record<NativeCode, number>;
    for (const code of NATIVE_CODES) {
        const m = /^(MN|M|H|D|W)(\d+)$/.exec(code)!;
        const n = Number(m[2]);
        out[code] = m[1] === "M" ? n * MINUTE
            : m[1] === "H" ? n * HOUR
                : m[1] === "D" ? n * DAY
                    : m[1] === "W" ? n * WEEK
                        : 30 * DAY; // MN1: nominal, only used for estimating how many bars to ask for
    }
    return out;
})();

export function nativeMsOf(code: NativeCode): number {
    return NATIVE_MS[code];
}

export function nativeKindOf(code: NativeCode): TfKind {
    if (code === "MN1") return "month";
    if (code === "W1") return "week";
    if (code === "D1") return "day";
    return "min";
}

function nativeCodeForMinutes(n: number): NativeCode | null {
    if (!NATIVE_MINUTES.includes(n)) return null;
    return (n < 60 ? `M${n}` : `H${n / 60}`) as NativeCode;
}

export interface TimeframePlan {
    /** What the caller asked for. */
    input: string;
    /** Canonical Vela / Pine notation. */
    vela: string;
    /** Target timeframe, normalised ("1440" minutes becomes 1 day). */
    kind: TfKind;
    n: number;
    /** MT5 timeframe we actually download. */
    native: NativeCode;
    /** Native bars per target bar. 1 means MT5 serves it directly. */
    factor: number;
    /** Nominal target bar length in ms (a month counts as 30 days). */
    ms: number;
    nativeMs: number;
}

/** Work out how to serve an arbitrary timeframe from MT5. Throws a readable Error if impossible. */
export function planTimeframe(input: unknown): TimeframePlan {
    const label = String(input ?? "");
    const spec = parseTimeframe(input);
    if (!spec) throw new Error(`Invalid timeframe "${label}"`);
    if (spec.kind === "sec") {
        throw new Error(`Timeframe "${label}" is below one minute and MT5 has no sub-minute bars`);
    }
    const { kind, n } = normalizeSpec({ kind: spec.kind, n: spec.n });

    const make = (native: NativeCode, factor: number): TimeframePlan => ({
        input: label,
        vela: formatVela(kind, n),
        kind,
        n,
        native,
        factor,
        ms: kind === "min" ? n * MINUTE : kind === "day" ? n * DAY : kind === "week" ? n * WEEK : n * 30 * DAY,
        nativeMs: NATIVE_MS[native],
    });

    switch (kind) {
        case "min": {
            const direct = nativeCodeForMinutes(n);
            if (direct) return make(direct, 1);
            // Largest native size that divides evenly: 45 -> M15 x3, 90 -> M30 x3, 7 -> M1 x7.
            const base = NATIVE_MINUTES_DESC.find((d) => d < n && n % d === 0) ?? 1;
            return make(nativeCodeForMinutes(base)!, n / base);
        }
        case "day": return make("D1", n);
        case "week": return make("W1", n);
        case "month": return make("MN1", n);
    }
}

/**
 * Open time of the target-timeframe bar that contains `t`.
 * Intraday buckets restart at each server-day start, day buckets are aligned to
 * the epoch day, week buckets to Sunday, and month buckets to the calendar.
 */
export function bucketOpen(kind: TfKind, n: number, t: number, weekAnchor: number = WEEK_ANCHOR): number {
    switch (kind) {
        case "min": {
            const step = n * MINUTE;
            if (step >= DAY) return Math.floor(t / step) * step;
            const day = Math.floor(t / DAY) * DAY;
            return day + Math.floor((t - day) / step) * step;
        }
        case "day":
            return Math.floor(Math.floor(t / DAY) / n) * n * DAY;
        case "week": {
            const idx = Math.floor((t - weekAnchor) / WEEK);
            return weekAnchor + Math.floor(idx / n) * n * WEEK;
        }
        case "month": {
            const d = new Date(t);
            const monthIndex = d.getUTCFullYear() * 12 + d.getUTCMonth();
            const b = Math.floor(monthIndex / n) * n;
            return Date.UTC(Math.floor(b / 12), b % 12, 1);
        }
    }
}

/** Resample sorted native bars into the plan's timeframe. Always returns a new array. */
export function aggregateBars(natives: readonly Bar[], plan: TimeframePlan, dropLeadingPartial = false): Bar[] {
    if (plan.factor === 1) return natives.slice();
    const out: Bar[] = [];
    let cur: Bar | null = null;
    for (const b of natives) {
        const open = bucketOpen(plan.kind, plan.n, b.time);
        if (cur && cur.time === open) {
            if (b.high > cur.high) cur.high = b.high;
            if (b.low < cur.low) cur.low = b.low;
            cur.close = b.close;
            cur.volume += b.volume;
        } else {
            cur = { time: open, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume };
            out.push(cur);
        }
    }
    // The oldest bucket is incomplete when our data starts mid-bucket: drop it.
    if (dropLeadingPartial && out.length > 1 && natives[0].time > out[0].time) out.shift();
    return out;
}

/** Build only the newest target bar (the one containing time `t`). Used for live updates. */
export function aggregateTail(natives: readonly Bar[], plan: TimeframePlan, t: number): Bar | null {
    const open = bucketOpen(plan.kind, plan.n, t);
    let i = natives.length - 1;
    while (i >= 0 && natives[i].time >= open) i--;
    i++;
    if (i >= natives.length) return null;
    const first = natives[i];
    const bar: Bar = { time: open, open: first.open, high: first.high, low: first.low, close: first.close, volume: first.volume };
    for (let j = i + 1; j < natives.length; j++) {
        const b = natives[j];
        if (b.high > bar.high) bar.high = b.high;
        if (b.low < bar.low) bar.low = b.low;
        bar.close = b.close;
        bar.volume += b.volume;
    }
    return bar;
}

/** Merge two time-sorted bar arrays. On equal timestamps the incoming bar wins. */
export function mergeSorted(existing: Bar[], incoming: Bar[]): Bar[] {
    if (!existing.length) return incoming.slice();
    if (!incoming.length) return existing;
    const out: Bar[] = [];
    let i = 0;
    let j = 0;
    while (i < existing.length || j < incoming.length) {
        if (j >= incoming.length || (i < existing.length && existing[i].time < incoming[j].time)) {
            out.push(existing[i++]);
        } else if (i >= existing.length || incoming[j].time < existing[i].time) {
            out.push(incoming[j++]);
        } else {
            out.push(incoming[j]);
            i++;
            j++;
        }
    }
    return out;
}

/** "MT5:EURUSD" / "tvc:DXY" / " EURUSD " -> "EURUSD". Vela strips the prefix, but be defensive. */
export function cleanTicker(value: unknown): string {
    return String(value ?? "").trim().replace(/^[A-Za-z0-9_]+:/, "");
}