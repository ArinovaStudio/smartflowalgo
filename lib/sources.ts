// Server-only helpers for the event details dialog.
//
//  - History, next release date and release link come from FRED (St. Louis Fed).
//    It is free: create a key at https://fred.stlouisfed.org/docs/api/api_key.html
//    and put FRED_API_KEY=... in .env.local.
//  - Related stories live in news.ts (free RSS feeds, no key needed).
//
// How history matches Forex Factory's layout
// ------------------------------------------
// Forex Factory lists one row per RELEASE DATE and shows the number as it was
// first published, with "previous" as it stood on that day (revised if it had
// been revised). FRED normally shows reference periods and today's revised
// numbers, so this file asks FRED for every stored version of each value
// (real-time period 1776-07-04 .. 9999-12-31) and rebuilds each release as it
// looked on the day it happened.
//
// What FRED cannot give: forecasts. Those are filled from a local log of the
// calendar feed (see forecast-log.ts), which only grows from the day you start
// running the app.

const FRED = "https://api.stlouisfed.org/fred";
const HISTORY_ROWS = 12;

// ── Tiny cache with in-flight de-duplication ────────────────────────────────

type Entry = { at: number; value?: unknown; promise?: Promise<unknown> };
const g = globalThis as unknown as { __calCache?: Map<string, Entry> };
const store = (g.__calCache ??= new Map<string, Entry>());

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit) {
    if (hit.promise) return hit.promise as Promise<T>;
    if (Date.now() - hit.at < ttlMs) return hit.value as T;
  }
  const promise = load().then(
    (value) => {
      store.set(key, { at: Date.now(), value });
      return value;
    },
    (err) => {
      store.delete(key);
      throw err;
    }
  );
  store.set(key, { at: Date.now(), promise });
  return promise;
}

// ── FRED series mapping ─────────────────────────────────────────────────────

type ValueFormat =
  | "pct1"
  | "k"
  | "kFromUnits"
  | "mFromK"
  | "bFromM"
  | "index1";

export interface SeriesSpec {
  id: string;
  /** lin = level, chg = change, pch = % change, pc1 = % change from a year ago */
  units: "lin" | "chg" | "pch" | "pc1";
  format: ValueFormat;
}

// First match wins. Only US (USD) events are mapped, and only events where the
// FRED series is the same number Forex Factory lists (for example FRED holds the
// FINAL University of Michigan reading, so only the "Revised" event is mapped,
// and only the advance GDP estimate).
const SERIES_RULES: { match: RegExp; spec: SeriesSpec }[] = [
  { match: /^core cpi.*m\/m/i, spec: { id: "CPILFESL", units: "pch", format: "pct1" } },
  { match: /^core cpi.*y\/y/i, spec: { id: "CPILFESL", units: "pc1", format: "pct1" } },
  { match: /^cpi.*y\/y/i, spec: { id: "CPIAUCNS", units: "pc1", format: "pct1" } },
  { match: /^cpi.*m\/m/i, spec: { id: "CPIAUCSL", units: "pch", format: "pct1" } },
  { match: /^core pce.*m\/m/i, spec: { id: "PCEPILFE", units: "pch", format: "pct1" } },
  { match: /^core pce.*y\/y/i, spec: { id: "PCEPILFE", units: "pc1", format: "pct1" } },
  { match: /^pce price index.*m\/m/i, spec: { id: "PCEPI", units: "pch", format: "pct1" } },
  { match: /^pce price index.*y\/y/i, spec: { id: "PCEPI", units: "pc1", format: "pct1" } },
  { match: /^average hourly earnings/i, spec: { id: "CES0500000003", units: "pch", format: "pct1" } },
  { match: /^non-?farm/i, spec: { id: "PAYEMS", units: "chg", format: "k" } },
  { match: /^unemployment rate/i, spec: { id: "UNRATE", units: "lin", format: "pct1" } },
  { match: /^unemployment claims/i, spec: { id: "ICSA", units: "lin", format: "kFromUnits" } },
  { match: /^jolts/i, spec: { id: "JTSJOL", units: "lin", format: "mFromK" } },
  { match: /^retail sales m\/m/i, spec: { id: "RSAFS", units: "pch", format: "pct1" } },
  { match: /^advance gdp q\/q/i, spec: { id: "A191RL1Q225SBEA", units: "lin", format: "pct1" } },
  { match: /^industrial production m\/m/i, spec: { id: "INDPRO", units: "pch", format: "pct1" } },
  { match: /^housing starts/i, spec: { id: "HOUST", units: "lin", format: "mFromK" } },
  { match: /^building permits/i, spec: { id: "PERMIT", units: "lin", format: "mFromK" } },
  { match: /^new home sales/i, spec: { id: "HSN1F", units: "lin", format: "mFromK" } },
  { match: /^revised uom consumer sentiment/i, spec: { id: "UMCSENT", units: "lin", format: "index1" } },
  { match: /^trade balance/i, spec: { id: "BOPGSTB", units: "lin", format: "bFromM" } },
];

export function getSeriesSpec(title: string, currency: string): SeriesSpec | null {
  if (currency.toUpperCase() !== "USD") return null;
  return SERIES_RULES.find((r) => r.match.test(title))?.spec ?? null;
}

// "-0.0" -> "0.0"
function fx(v: number, digits: number) {
  const s = v.toFixed(digits);
  return Number(s) === 0 ? (0).toFixed(digits) : s;
}

function formatValue(v: number, f: ValueFormat): string {
  switch (f) {
    case "pct1":
      return `${fx(v, 1)}%`;
    case "k":
      return `${Math.round(v)}K`;
    case "kFromUnits":
      return `${Math.round(v / 1000)}K`;
    case "mFromK":
      return `${fx(v / 1000, 2)}M`;
    case "bFromM":
      return `${fx(v / 1000, 1)}B`;
    case "index1":
      return fx(v, 1);
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-09-17" -> "Sep 17, 2026" (the format Forex Factory uses)
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export interface ReleaseRow {
  releaseDate: string; // YYYY-MM-DD (US Eastern date of the release)
  actual: string;
  actualValue: number;
  previous: string | null;
  previousValue: number | null;
}

export interface HistoryRow extends ReleaseRow {
  date: string; // formatted release date, e.g. "Sep 17, 2026"
  /** Filled from the local forecast log when the app has seen that release. */
  forecast?: string;
}

export interface FredDetails {
  seriesTitle?: string;
  releaseName?: string;
  releaseUrl?: string;
  /** Every release rebuilt as first published, newest first. */
  releases: ReleaseRow[];
  /** The source's published release dates (past and scheduled). */
  scheduled: string[];
}

async function fred<T>(key: string, path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${FRED}/${path}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("file_type", "json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(25000) });
  const body = (await res.json().catch(() => null)) as (T & { error_message?: string }) | null;
  if (!res.ok || !body) {
    // Never include the URL here: it contains the API key.
    throw new Error(body?.error_message ?? `FRED returned HTTP ${res.status}`);
  }
  return body;
}

// How far back to load, by series frequency. Year-over-year needs 13 extra periods.
function lookbackDays(freq: string) {
  switch (freq) {
    case "W":
    case "BW":
      return 500;
    case "Q":
      return 2500;
    case "A":
      return 5000;
    default:
      return 1300; // monthly
  }
}

type Version = { start: string; value: number };

export async function loadFred(spec: SeriesSpec, key: string): Promise<FredDetails> {
  const meta = await fred<{ seriess?: { title: string; frequency_short: string }[] }>(key, "series", {
    series_id: spec.id,
  });
  const series = meta.seriess?.[0];
  const freq = series?.frequency_short ?? "M";
  const observationStart = new Date(Date.now() - lookbackDays(freq) * 86400000)
    .toISOString()
    .slice(0, 10);

  const [rel, obs] = await Promise.all([
    fred<{ releases?: { id: number; name: string; link?: string }[] }>(key, "series/release", {
      series_id: spec.id,
    }),
    // One row per stored VERSION of each observation:
    // { date, value, realtime_start, realtime_end } means "this value was current
    // from realtime_start until realtime_end".
    fred<{ observations?: { date: string; value: string; realtime_start: string }[] }>(
      key,
      "series/observations",
      {
        series_id: spec.id,
        units: "lin",
        observation_start: observationStart,
        realtime_start: "1776-07-04",
        realtime_end: "9999-12-31",
        sort_order: "asc",
        limit: "100000",
      }
    ),
  ]);
  const release = rel.releases?.[0];

  // observation date -> versions, oldest first
  const versions = new Map<string, Version[]>();
  for (const o of obs.observations ?? []) {
    const value = parseFloat(o.value);
    if (o.value === "." || !Number.isFinite(value)) continue;
    const list = versions.get(o.date) ?? [];
    list.push({ start: o.realtime_start, value });
    versions.set(o.date, list);
  }
  for (const list of versions.values()) list.sort((a, b) => (a.start < b.start ? -1 : 1));
  const dates = [...versions.keys()].sort();

  // The value of an observation as it stood on a given day.
  const asOf = (date: string | undefined, day: string): number | null => {
    const list = date ? versions.get(date) : undefined;
    if (!list) return null;
    let out: number | null = null;
    for (const v of list) {
      if (v.start <= day) out = v.value;
      else break;
    }
    return out;
  };

  const byRelease = new Map<string, ReleaseRow>();
  dates.forEach((date, i) => {
    const releaseDate = versions.get(date)![0].start; // first time this value existed
    const level = (back: number) => asOf(dates[i - back], releaseDate);

    // shift 0 = this release, shift 1 = the reading before it (as revised that day)
    const compute = (shift: number): number | null => {
      const a = level(shift);
      if (a === null) return null;
      switch (spec.units) {
        case "lin":
          return a;
        case "chg": {
          const b = level(shift + 1);
          return b === null ? null : a - b;
        }
        case "pch": {
          const b = level(shift + 1);
          return b === null || b === 0 ? null : (a / b - 1) * 100;
        }
        case "pc1": {
          const b = level(shift + 12);
          return b === null || b === 0 ? null : (a / b - 1) * 100;
        }
      }
    };

    const actual = compute(0);
    if (actual === null) return;
    const previous = compute(1);
    byRelease.set(releaseDate, {
      releaseDate,
      actual: formatValue(actual, spec.format),
      actualValue: actual,
      previous: previous === null ? null : formatValue(previous, spec.format),
      previousValue: previous,
    });
  });

  const releases = [...byRelease.values()].sort((a, b) => (a.releaseDate < b.releaseDate ? 1 : -1));

  // The source's own release calendar, used for "Next release".
  let scheduled: string[] = [];
  if (release) {
    try {
      const cal = await fred<{ release_dates?: { date: string }[] }>(key, "release/dates", {
        release_id: String(release.id),
        include_release_dates_with_no_data: "true",
        sort_order: "desc",
        limit: "200",
      });
      scheduled = (cal.release_dates ?? []).map((d) => d.date);
    } catch {
      /* optional */
    }
  }

  return {
    seriesTitle: series?.title,
    releaseName: release?.name,
    releaseUrl: release?.link,
    releases,
    scheduled,
  };
}

/**
 * Forex Factory's panel is relative to the event you opened: history lists the
 * releases BEFORE it, and "next release" is the one AFTER it.
 * eventDate is the US Eastern date of the opened event (YYYY-MM-DD).
 */
export function viewForEvent(details: FredDetails, eventDate: string) {
  const history: HistoryRow[] = details.releases
    .filter((r) => r.releaseDate < eventDate)
    .slice(0, HISTORY_ROWS)
    .map((r) => ({ ...r, date: formatDate(r.releaseDate) }));

  const nextRelease = details.scheduled.filter((d) => d > eventDate).sort()[0];
  return { history, nextRelease };
}