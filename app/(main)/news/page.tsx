"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Info,
  Loader2,
  Minus,
  Newspaper,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  X,
} from "lucide-react";
import {
  getEventInfo,
  getSourceUrl,
  getSpeaker,
  usualEffectText,
  type EventInfo,
  type UsualEffect,
} from "@/lib/event-info";
import AdminSidebar from "@/sections/other/AdminSidebar";
import AdminContentWrapper from "@/components/admin/AdminContentWrapper";

// ── Types ───────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
  url?: string;
}

interface HistoryRow {
  date: string; // release date as Forex Factory writes it, e.g. "Sep 17, 2026"
  releaseDate: string;
  actual: string;
  actualValue: number;
  previous: string | null;
  previousValue: number | null;
  forecast?: string;
}

interface DetailsResponse {
  mapped: boolean;
  configured: boolean;
  seriesTitle?: string;
  releaseName?: string;
  releaseUrl?: string;
  nextRelease?: string;
  history?: HistoryRow[];
}

interface Story {
  title: string;
  url: string;
  source: string;
  date: string | null;
  image: string | null;
  summary: string;
  official: boolean;
}

interface StoriesResponse {
  stories: Story[];
  feeds?: { name: string; ok: boolean; count: number; error?: string }[];
}

type Loadable<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

// ── Constants ───────────────────────────────────────────────────────────────

const IMPACT_LEVELS = ["High", "Medium", "Low"];
const DEFAULT_IMPACTS = ["High", "Medium"];
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];
const HISTORY_PREVIEW = 5;

const IMPACT_STYLES: Record<string, { dot: string; chip: string }> = {
  High: {
    dot: "bg-red-500",
    chip: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  },
  Medium: {
    dot: "bg-orange-500",
    chip: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  },
  Low: {
    dot: "bg-yellow-500",
    chip: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  },
  Holiday: {
    dot: "bg-slate-400",
    chip: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700",
  },
};

const selectCls =
  "rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-sky-500 focus:outline-none cursor-pointer";

const labelCls =
  "text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1";

const cardCls =
  "overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60";

const cardHeadCls =
  "flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/90 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400";

// ── Helpers ─────────────────────────────────────────────────────────────────

function impactStyle(impact: string) {
  return IMPACT_STYLES[impact] ?? IMPACT_STYLES.Holiday;
}

function formatRelative(target: number, now: number) {
  const diff = target - now;
  const mins = Math.round(Math.abs(diff) / 60000);
  if (mins < 1) return "now";
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const text = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  return diff > 0 ? `in ${text}` : `${text} ago`;
}

function parseValue(v: string) {
  const m = v.trim().match(/^(-?\d+(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  return {
    num: parseFloat(m[1]),
    suffix: m[2].trim(),
    decimals: (m[1].split(".")[1] ?? "").length,
  };
}

// Forecast minus previous, when both are plain numbers with the same unit.
function changeBetween(forecast: string, previous: string) {
  const f = parseValue(forecast);
  const p = parseValue(previous);
  if (!f || !p || f.suffix !== p.suffix) return null;
  const delta = f.num - p.num;
  const decimals = Math.max(f.decimals, p.decimals);
  if (Math.abs(delta) < 1e-9) return { delta: 0, text: `0${f.suffix}` };
  return {
    delta,
    text: `${delta > 0 ? "+" : ""}${delta.toFixed(decimals)}${f.suffix}`,
  };
}

// "2026-10-15" -> "Oct 15, 2026 (in 25 days)"
function formatReleaseDate(iso: string, now: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - today.getTime()) / 86400000);
  const label = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (days > 1) return `${label} (in ${days} days)`;
  if (days === 1) return `${label} (tomorrow)`;
  if (days === 0) return `${label} (today)`;
  return label;
}

function formatStoryDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Good / bad for the currency, using the usual effect of the event.
function tone(actual: number, reference: number | null, effect?: UsualEffect) {
  if (reference === null || !effect || Math.abs(actual - reference) < 1e-9)
    return "neutral";
  const better = effect === "higher" ? actual > reference : actual < reference;
  return better ? "good" : "bad";
}

const TONE_CLS: Record<string, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  bad: "text-red-600 dark:text-red-400",
  neutral: "text-slate-800 dark:text-slate-200",
};

// Loads a URL once per key and keeps the result, so flipping between events is instant.
// retry() tries again after a failure.
function useRemote<T>(
  key: string | null,
  url: string | null,
): [Loadable<T> | null, () => void] {
  const requested = useRef(new Set<string>());
  const [data, setData] = useState<Record<string, Loadable<T>>>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!key || !url || requested.current.has(key)) return;
    requested.current.add(key);
    setData((d) => ({ ...d, [key]: { status: "loading" } }));

    fetch(url)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        setData((d) => ({ ...d, [key]: { status: "ready", data: body as T } }));
      })
      .catch((err: Error) => {
        requested.current.delete(key); // allow a retry the next time it is opened
        setData((d) => ({
          ...d,
          [key]: { status: "error", message: err.message },
        }));
      });
  }, [key, url, attempt]);

  const retry = () => {
    if (key) requested.current.delete(key);
    setAttempt((n) => n + 1);
  };

  if (!key) return [null, retry];
  return [data[key] ?? { status: "loading" }, retry];
}

// ── Small components ────────────────────────────────────────────────────────

function ImpactChip({
  impact,
  suffix = "",
}: {
  impact: string;
  suffix?: string;
}) {
  const s = impactStyle(impact);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${s.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {impact}
      {suffix}
    </span>
  );
}

function SkeletonLines({ rows }: { rows: number }) {
  return (
    <div className="space-y-3 p-4" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-4 animate-pulse rounded bg-slate-100 dark:bg-slate-800"
        />
      ))}
    </div>
  );
}

function Sparkline({ rows }: { rows: HistoryRow[] }) {
  const pts = [...rows].reverse(); // oldest to newest
  if (pts.length < 2) return null;

  const W = 560;
  const H = 150;
  const P = 28;
  const vals = pts.map((p) => p.actualValue);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i: number) => P + (i * (W - 2 * P)) / (pts.length - 1);
  const y = (v: number) => H - P - ((v - min) / span) * (H - 2 * P);
  const path = pts
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.actualValue).toFixed(1)}`,
    )
    .join(" ");
  const hi = vals.indexOf(max);
  const lo = vals.indexOf(min);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full text-sky-500"
      role="img"
      aria-label="Chart of the recent actual values"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.actualValue)}
          r={i === pts.length - 1 ? 4 : 2.5}
          fill="currentColor"
        />
      ))}
      <text
        x={x(hi)}
        y={y(max) - 8}
        textAnchor="middle"
        fontSize="11"
        className="fill-slate-500 dark:fill-slate-400"
      >
        {pts[hi].actual}
      </text>
      {lo !== hi && (
        <text
          x={x(lo)}
          y={y(min) + 16}
          textAnchor="middle"
          fontSize="11"
          className="fill-slate-500 dark:fill-slate-400"
        >
          {pts[lo].actual}
        </text>
      )}
      <text
        x={P}
        y={H - 6}
        textAnchor="start"
        fontSize="10"
        className="fill-slate-400"
      >
        {pts[0].date}
      </text>
      <text
        x={W - P}
        y={H - 6}
        textAnchor="end"
        fontSize="10"
        className="fill-slate-400"
      >
        {pts[pts.length - 1].date}
      </text>
    </svg>
  );
}

type SpecRow = { label: string; value: ReactNode };

function buildSpecRows(
  info: EventInfo | null,
  speaker: string | null,
  currency: string,
  details: DetailsResponse | null,
  now: number,
): SpecRow[] {
  const rows: SpecRow[] = [];
  if (info?.description)
    rows.push({ label: "Description", value: info.description });
  if (speaker) rows.push({ label: "Speaker", value: speaker });
  if (info?.source) {
    rows.push({
      label: "Source",
      value: (
        <>
          {getSourceUrl(info.source) ? (
            <a
              href={getSourceUrl(info.source)!}
              target="_blank"
              rel="noreferrer"
              className="text-sky-600 dark:text-sky-400 underline underline-offset-2 hover:text-sky-500"
            >
              {info.source}
            </a>
          ) : (
            info.source
          )}
          {details?.releaseUrl && (
            <>
              {" "}
              (
              <a
                href={details.releaseUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 dark:text-sky-400 underline underline-offset-2 hover:text-sky-500"
              >
                latest release
              </a>
              )
            </>
          )}
        </>
      ),
    });
  }
  if (info?.measures) rows.push({ label: "Measures", value: info.measures });
  if (info?.usualEffect)
    rows.push({
      label: "Usual effect",
      value: usualEffectText(info.usualEffect, currency),
    });
  if (info?.frequency) rows.push({ label: "Frequency", value: info.frequency });
  if (details?.nextRelease)
    rows.push({
      label: "Next release",
      value: formatReleaseDate(details.nextRelease, now),
    });
  if (info?.notes) rows.push({ label: "Notes", value: info.notes });
  if (info?.whyTradersCare)
    rows.push({ label: "Why traders care", value: info.whyTradersCare });
  if (info?.alsoCalled)
    rows.push({ label: "Also called", value: info.alsoCalled });
  return rows;
}

function HistoryCard({
  state,
  effect,
  onRetry,
}: {
  state: Loadable<DetailsResponse> | null;
  effect?: UsualEffect;
  onRetry: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [graph, setGraph] = useState(false);

  let body: ReactNode;
  let footer: ReactNode = null;

  if (!state || state.status === "loading") {
    body = <SkeletonLines rows={6} />;
  } else if (state.status === "error") {
    body = (
      <div className="space-y-2 p-4 text-xs text-red-500">
        <p className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Could not load history: {state.message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          Try again
        </button>
      </div>
    );
  } else if (!state.data.mapped) {
    body = (
      <p className="p-4 text-xs text-slate-500 dark:text-slate-400">
        No history source is set up for this event yet.
      </p>
    );
  } else if (!state.data.configured) {
    body = (
      <div className="space-y-2 p-4 text-xs text-slate-500 dark:text-slate-400">
        <p>
          To load history and the next release date, add a free FRED API key:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-slate-100 dark:bg-slate-900 p-2.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
          FRED_API_KEY=your_key_here
        </pre>
        <p>
          Put it in .env.local and restart the dev server. Keys are issued at
          fred.stlouisfed.org.
        </p>
      </div>
    );
  } else {
    const rows = state.data.history ?? [];
    const hasForecast = rows.some((r) => r.forecast);
    const shown = expanded ? rows : rows.slice(0, HISTORY_PREVIEW);

    body =
      rows.length === 0 ? (
        <p className="p-4 text-xs text-slate-500 dark:text-slate-400">
          No history is available.
        </p>
      ) : (
        <>
          {graph && (
            <div className="border-b border-slate-100 dark:border-slate-800/60 p-4">
              <Sparkline rows={rows} />
            </div>
          )}
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2">Date</th>
                <th className="px-3 py-2 text-right">Actual</th>
                {hasForecast && (
                  <th className="px-3 py-2 text-right">Forecast</th>
                )}
                <th className="px-4 py-2 text-right">Previous</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {shown.map((r) => {
                // Compare like with like: actual vs forecast both use the displayed unit
                // (e.g. "196K" and "207K"), actual vs previous both use raw values.
                const shownActual = parseValue(r.actual)?.num;
                const shownForecast = r.forecast
                  ? parseValue(r.forecast)?.num
                  : undefined;
                const verdict =
                  shownActual !== undefined && shownForecast !== undefined
                    ? tone(shownActual, shownForecast, effect)
                    : tone(r.actualValue, r.previousValue, effect);
                return (
                  <tr key={r.releaseDate}>
                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {r.date}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono text-sm font-bold ${TONE_CLS[verdict]}`}
                    >
                      {r.actual}
                    </td>
                    {hasForecast && (
                      <td className="px-3 py-2.5 text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                        {r.forecast ?? "–"}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right font-mono text-sm text-slate-500 dark:text-slate-400">
                      {r.previous ?? "–"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      );

    footer = rows.length > 0 && (
      <div className="border-t border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold">
          {rows.length > HISTORY_PREVIEW ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-sky-500 cursor-pointer"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
              {expanded ? "Less" : "More"}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => setGraph((v) => !v)}
            aria-pressed={graph}
            className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-sky-500 cursor-pointer"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Graph
          </button>
        </div>
        <p className="border-t border-slate-100 dark:border-slate-800/60 px-4 py-2 text-[11px] leading-relaxed text-slate-400">
          {effect
            ? hasForecast
              ? "Green means better than the forecast, red means worse (rows with no saved forecast are compared with the previous reading). "
              : "Green means better than the previous reading, red means worse. "
            : ""}
          Actual and previous are shown as published on each release day,
          rebuilt from FRED&apos;s stored versions. Forecasts come from your own
          saved copy of the calendar feed, so older rows stay blank.
        </p>
      </div>
    );
  }

  return (
    <div className={cardCls}>
      <div className={cardHeadCls}>
        <span>History</span>
        {state?.status === "ready" && state.data.seriesTitle && (
          <span className="truncate text-[10px] font-medium normal-case tracking-normal text-slate-400">
            {state.data.seriesTitle}
          </span>
        )}
      </div>
      {body}
      {footer}
    </div>
  );
}

function StoriesCard({
  state,
  onRetry,
}: {
  state: Loadable<StoriesResponse> | null;
  onRetry: () => void;
}) {
  let body: ReactNode;
  let footer: ReactNode = null;

  if (!state || state.status === "loading") {
    body = <SkeletonLines rows={4} />;
  } else if (state.status === "error") {
    body = (
      <div className="space-y-2 p-4 text-xs text-slate-500 dark:text-slate-400">
        <p className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          {state.message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          Try again
        </button>
      </div>
    );
  } else if (state.data.stories.length === 0) {
    body = (
      <p className="p-4 text-xs text-slate-500 dark:text-slate-400">
        No recent stories mention this event yet. Check back after the release.
      </p>
    );
  } else {
    body = (
      <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {state.data.stories.map((s) => (
          <li key={s.url} className="flex gap-3 p-4">
            {s.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.image}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 dark:border-slate-800 object-cover"
              />
            )}
            <div className="min-w-0">
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-bold leading-snug text-slate-900 dark:text-white underline-offset-2 hover:text-sky-500 hover:underline"
              >
                {s.title}
              </a>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-sky-600 dark:text-sky-400">
                  {s.source}
                </span>
                {s.official && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Official
                  </span>
                )}
                {s.date && <span>· {formatStoryDate(s.date)}</span>}
              </p>
              {s.summary &&
                s.summary.toLowerCase() !== s.title.toLowerCase() && (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {s.summary}
                  </p>
                )}
            </div>
          </li>
        ))}
      </ul>
    );

    const live = (state.data.feeds ?? []).filter((f) => f.ok).length;
    const total = (state.data.feeds ?? []).length;
    footer =
      total > 0 ? (
        <p className="border-t border-slate-100 dark:border-slate-800/60 px-4 py-2 text-[11px] text-slate-400">
          Matched from {live} of {total} news and agency feeds, refreshed every
          few minutes.
        </p>
      ) : null;
  }

  return (
    <div className={cardCls}>
      <div className={cardHeadCls}>
        <span className="inline-flex items-center gap-1.5">
          <Newspaper className="h-3.5 w-3.5" /> Related stories
        </span>
      </div>
      {body}
      {footer}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function EconomicCalendarPage() {
  const [week, setWeek] = useState<"this" | "next">("this");
  const [currency, setCurrency] = useState("USD");
  const [impacts, setImpacts] = useState<string[]>(DEFAULT_IMPACTS);
  const [search, setSearch] = useState("");

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const modalBodyRef = useRef<HTMLDivElement>(null);

  // Keep countdowns fresh.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Load the whole week for the chosen currency. Impact filtering happens
  // client-side so the impact pills and KPI cards respond instantly.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setEvents([]);

    const params = new URLSearchParams({
      week,
      currency,
      impact: "High,Medium,Low",
    });

    fetch(`/api/calendar?${params}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        setEvents(body.events as CalendarEvent[]);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [week, currency, reloadKey]);

  // ── Derived data ──
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter(
      (e) =>
        impacts.includes(e.impact) && (!q || e.title.toLowerCase().includes(q)),
    );
  }, [events, impacts, search]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: CalendarEvent[] }>();
    for (const e of visible) {
      const d = new Date(e.date);
      const key = d.toDateString();
      if (!map.has(key)) {
        map.set(key, {
          label: d.toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          }),
          items: [],
        });
      }
      map.get(key)!.items.push(e);
    }
    return [...map.entries()].map(([key, g]) => ({ key, ...g }));
  }, [visible]);

  const highCount = events.filter((e) => e.impact === "High").length;
  const mediumCount = events.filter((e) => e.impact === "Medium").length;
  const nextUp = visible.find((e) => new Date(e.date).getTime() > now) ?? null;
  const todayKey = new Date(now).toDateString();

  const selectedIndex = selectedId
    ? visible.findIndex((e) => e.id === selectedId)
    : -1;
  const selected = selectedIndex >= 0 ? visible[selectedIndex] : null;
  const prevEvent = selectedIndex > 0 ? visible[selectedIndex - 1] : null;
  const nextEvent =
    selectedIndex >= 0 && selectedIndex < visible.length - 1
      ? visible[selectedIndex + 1]
      : null;
  const prevId = prevEvent?.id ?? null;
  const nextId = nextEvent?.id ?? null;

  const filtersActive =
    search.trim() !== "" ||
    currency !== "USD" ||
    week !== "this" ||
    impacts.join(",") !== DEFAULT_IMPACTS.join(",");

  function toggleImpact(level: string) {
    const next = impacts.includes(level)
      ? impacts.filter((l) => l !== level)
      : [...impacts, level];
    setImpacts(IMPACT_LEVELS.filter((l) => next.includes(l))); // keep a stable order
  }

  function resetFilters() {
    setWeek("this");
    setCurrency("USD");
    setImpacts(DEFAULT_IMPACTS);
    setSearch("");
  }

  // Dialog keyboard shortcuts: Esc closes, arrow keys move between events.
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedId(null);
      } else if (e.key === "ArrowDown" && nextId) {
        e.preventDefault();
        setSelectedId(nextId);
      } else if (e.key === "ArrowUp" && prevId) {
        e.preventDefault();
        setSelectedId(prevId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, prevId, nextId]);

  // Jump back to the top of the dialog when switching events.
  useEffect(() => {
    modalBodyRef.current?.scrollTo({ top: 0 });
  }, [selectedId]);

  // ── Dialog data ──
  // Forex Factory's history and "next release" depend on WHICH release was opened,
  // so the details are keyed by the event's own date (its US Eastern date).
  const eventDay = selected ? selected.date.slice(0, 10) : "";
  const titleKey = selected ? `${selected.country}|${selected.title}` : null;
  const titleQuery = selected
    ? new URLSearchParams({
        title: selected.title,
        currency: selected.country,
      }).toString()
    : null;
  const [detailsState, retryDetails] = useRemote<DetailsResponse>(
    titleKey ? `${titleKey}|${eventDay}` : null,
    titleQuery ? `/api/calendar/details?${titleQuery}&date=${eventDay}` : null,
  );
  const [storiesState, retryStories] = useRemote<StoriesResponse>(
    titleKey,
    titleQuery ? `/api/calendar/stories?${titleQuery}` : null,
  );

  const info = selected ? getEventInfo(selected.title, selected.country) : null;
  const speaker = selected ? getSpeaker(selected.title) : null;
  const detailsData =
    detailsState?.status === "ready" ? detailsState.data : null;
  const specRows = selected
    ? buildSpecRows(info, speaker, selected.country, detailsData, now)
    : [];
  const change = selected
    ? changeBetween(selected.forecast, selected.previous)
    : null;
  const selectedTime = selected ? new Date(selected.date) : null;
  const isUpcoming = selectedTime ? selectedTime.getTime() > now : false;
  const sameDay = selected
    ? visible.filter(
        (e) =>
          e.id !== selected.id &&
          new Date(e.date).toDateString() ===
            new Date(selected.date).toDateString(),
      )
    : [];

  return (
    <div className="space-y-6">
      <AdminSidebar />
      <AdminContentWrapper>
        {/* ── Top Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500">
                <CalendarDays className="h-4 w-4" />
              </div>
              <span>Economic Calendar</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Upcoming market-moving releases with impact filters. Click any
              event for its specs, history and related stories, and use the
              arrow keys to move between events.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
            title="Refresh calendar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ── Summary KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Events shown
            </p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {visible.length}
              </span>
              <span className="text-xs text-sky-500 font-bold">
                {week === "this" ? "This week" : "Next week"}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              High impact
            </p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-red-500">
                {highCount}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-red-500 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {currency}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Medium impact
            </p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-orange-500">
                {mediumCount}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-orange-500 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                {currency}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm min-w-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Next release
            </p>
            {nextUp ? (
              <button
                type="button"
                onClick={() => setSelectedId(nextUp.id)}
                className="mt-2 block w-full text-left cursor-pointer"
              >
                <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">
                  {nextUp.title}
                </span>
                <span className="text-[11px] font-semibold text-indigo-500">
                  {formatRelative(new Date(nextUp.date).getTime(), now)}
                </span>
              </button>
            ) : (
              <p className="mt-2 text-sm font-semibold text-slate-400">
                Nothing scheduled
              </p>
            )}
          </div>
        </div>

        {/* ── Filter & Search Toolbar ── */}
        <div className="rounded-2xl my-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events, e.g. CPI, Non-Farm, FOMC..."
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">

              {/* Impact pills */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={labelCls}>
                  <SlidersHorizontal className="h-3 w-3" /> Impact:
                </span>
                {IMPACT_LEVELS.map((level) => {
                  const on = impacts.includes(level);
                  const s = impactStyle(level);
                  return (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleImpact(level)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                        on
                          ? s.chip
                          : "border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${on ? s.dot : "bg-slate-300 dark:bg-slate-600"}`}
                      />
                      {level}
                    </button>
                  );
                })}
              </div>

              {filtersActive && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {(search.trim() || currency !== "USD") && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 mr-1">
                <Filter className="h-3 w-3 text-sky-500" /> Active Filters:
              </span>

              {search.trim() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[11px] font-semibold">
                  <span>Search: &quot;{search.trim()}&quot;</span>
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Remove search filter"
                    className="hover:text-sky-800 dark:hover:text-white cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {currency !== "USD" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[11px] font-semibold">
                  <span>Currency: {currency}</span>
                  <button
                    type="button"
                    onClick={() => setCurrency("USD")}
                    aria-label="Reset currency"
                    className="hover:text-indigo-800 dark:hover:text-white cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Events Table ── */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/90 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Impact</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Forecast</th>
                  <th className="px-4 py-3">Previous</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-xs text-slate-400"
                    >
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-sky-500 mb-2" />
                      Loading economic calendar...
                    </td>
                  </tr>
                )}

                {error && !loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-xs text-red-500"
                    >
                      <AlertCircle className="h-5 w-5 mx-auto mb-1.5" />
                      Could not load the calendar: {error}. Wait a few minutes
                      and refresh.
                    </td>
                  </tr>
                )}

                {!loading && !error && visible.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-xs text-slate-400"
                    >
                      <CalendarDays className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                      No events match these filters.
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  groups.map((g) => (
                    <Fragment key={g.key}>
                      <tr className="bg-slate-50/75 dark:bg-slate-900/90">
                        <td
                          colSpan={6}
                          className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300"
                        >
                          <span className="inline-flex items-center gap-2">
                            {g.label}
                            {g.key === todayKey && (
                              <span className="rounded-full bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-500">
                                Today
                              </span>
                            )}
                            <span className="font-medium text-slate-400">
                              {g.items.length} event
                              {g.items.length === 1 ? "" : "s"}
                            </span>
                          </span>
                        </td>
                      </tr>

                      {g.items.map((e) => {
                        const time = new Date(e.date).getTime();
                        const isPast = time <= now;
                        const isNext = nextUp?.id === e.id;
                        return (
                          <tr
                            key={e.id}
                            onClick={() => setSelectedId(e.id)}
                            className={`cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                              isPast ? "opacity-60" : ""
                            }`}
                          >
                            <td className="px-4 py-3.5 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {new Date(e.date).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>

                            <td className="px-4 py-3.5">
                              <ImpactChip impact={e.impact} />
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                                  {e.country}
                                </span>
                                <button
                                  type="button"
                                  className="text-left text-sm font-bold text-slate-900 dark:text-white hover:text-sky-500 transition-colors cursor-pointer"
                                >
                                  {e.title}
                                </button>
                                {isNext && (
                                  <span className="shrink-0 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-500">
                                    Next
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3.5 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {e.forecast || "–"}
                            </td>

                            <td className="px-4 py-3.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                              {e.previous || "–"}
                            </td>

                            <td className="px-4 py-3.5 text-right">
                              <button
                                type="button"
                                title="View details"
                                aria-label={`View details for ${e.title}`}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-sky-500/40 hover:text-sky-500 transition-colors cursor-pointer"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
              </tbody>
            </table>
          </div>

          {!loading && !error && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <span>
                Showing {visible.length} of {events.length} events
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Times shown in your local time zone
              </span>
            </div>
          )}
        </div>

        {/* ==================== EVENT DETAILS DIALOG ==================== */}
        <AnimatePresence>
          {selected && selectedTime && (
            <motion.div
              key="event-dialog"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 dark:bg-black/80 p-4"
              onClick={() => setSelectedId(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={selected.title}
                className="flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl"
              >
                {/* Header */}
                <div className="shrink-0 space-y-3 border-b border-slate-200 dark:border-slate-800 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ImpactChip impact={selected.impact} suffix=" impact" />
                      <span className="font-mono text-[10px] font-bold px-1.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {selected.country}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                          isUpcoming
                            ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        {isUpcoming ? "Upcoming" : "Released"} ·{" "}
                        {formatRelative(selectedTime.getTime(), now)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => prevId && setSelectedId(prevId)}
                        disabled={!prevId}
                        title="Previous event (Arrow Up)"
                        aria-label="Previous event"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => nextId && setSelectedId(nextId)}
                        disabled={!nextId}
                        title="Next event (Arrow Down)"
                        aria-label="Next event"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        title="Close (Esc)"
                        aria-label="Close details"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <h2 className="text-xl font-bold leading-snug text-slate-900 dark:text-white">
                    {selected.title}
                  </h2>

                  <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-500" />
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {selectedTime.toLocaleString(undefined, {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      </p>
                      <p>
                        {selectedTime.toLocaleString("en-GB", {
                          timeZone: "UTC",
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}{" "}
                        UTC
                      </p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div
                  ref={modalBodyRef}
                  className="flex-1 space-y-5 overflow-y-auto p-5"
                >
                  {/* Release numbers */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Forecast
                      </p>
                      <p className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-white">
                        {selected.forecast || "–"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Previous
                      </p>
                      <p className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-white">
                        {selected.previous || "–"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Forecast change
                      </p>
                      <p className="mt-1 flex items-center gap-1 font-mono text-lg font-bold text-sky-500">
                        {change ? (
                          <>
                            {change.delta > 0 ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : change.delta < 0 ? (
                              <ArrowDownRight className="h-4 w-4" />
                            ) : (
                              <Minus className="h-4 w-4" />
                            )}
                            {change.text}
                          </>
                        ) : (
                          <span className="text-slate-400">–</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Two columns: Specs on the left, History and Stories on the right */}
                  <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
                    {/* Specs */}
                    <div className={cardCls}>
                      <div className={cardHeadCls}>
                        <span className="inline-flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5" /> Specs
                        </span>
                      </div>

                      {specRows.length > 0 ? (
                        <dl className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {specRows.map((row) => (
                            <div
                              key={row.label}
                              className="grid grid-cols-[8.5rem_1fr]"
                            >
                              <dt className="bg-slate-50 dark:bg-slate-900/80 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {row.label}
                              </dt>
                              <dd className="px-4 py-3 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                                {row.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="p-4 text-xs text-slate-500 dark:text-slate-400">
                          No extra notes are available for this event yet. The
                          time, impact, forecast and previous values come
                          straight from the calendar.
                        </p>
                      )}
                    </div>

                    <div className="space-y-5">
                      <HistoryCard
                        state={detailsState}
                        effect={info?.usualEffect}
                        onRetry={retryDetails}
                      />
                      <StoriesCard
                        state={storiesState}
                        onRetry={retryStories}
                      />
                    </div>
                  </div>

                  {/* Other events the same day */}
                  {sameDay.length > 0 && (
                    <div className={cardCls}>
                      <div className={cardHeadCls}>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" /> Also on this
                          day
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {sameDay.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => setSelectedId(e.id)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                          >
                            <span className="w-20 shrink-0 whitespace-nowrap font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {new Date(e.date).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${impactStyle(e.impact).dot}`}
                            />
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {e.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-5 py-3">
                  <p className="text-[11px] text-slate-400">
                    Calendar times and forecasts: Forex Factory feed. History:
                    FRED. Stories: agency and market news feeds.
                  </p>
                  {selected.url && (
                    <a
                      href={selected.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-400 active:bg-sky-600 transition-all"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View full details for {selected.title}
                    </a>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AdminContentWrapper>
    </div>
  );
}
