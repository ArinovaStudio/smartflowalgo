import { NextRequest, NextResponse } from "next/server";
import { recordForecasts } from "@/lib/forecast-logs";
import { warmNews } from "@/lib/news";

type FeedEvent = {
  title: string;
  country: string; // currency code, e.g. "USD"
  date: string; // ISO string with offset, e.g. "2026-09-22T08:30:00-04:00"
  impact: string; // "High" | "Medium" | "Low" | "Holiday"
  forecast: string;
  previous: string;
  url?: string;
};

const FEEDS = {
  this: "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  next: "https://nfs.faireconomy.media/ff_calendar_nextweek.json",
} as const;

// The feed is rate limited, so keep a copy for 15 minutes.
// Stored on globalThis so it survives hot reloads in `next dev`.
const TTL_MS = 15 * 60 * 1000;
const g = globalThis as unknown as {
  __ffCache?: Record<string, { at: number; data: FeedEvent[] }>;
};
const cache = (g.__ffCache ??= {});

async function getWeek(week: "this" | "next"): Promise<FeedEvent[]> {
  const hit = cache[week];
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  try {
    const res = await fetch(FEEDS[week], {
      headers: { "User-Agent": "Mozilla/5.0 (personal dashboard)" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Calendar feed returned HTTP ${res.status}`);

    const data = (await res.json()) as FeedEvent[];
    cache[week] = { at: Date.now(), data };
    // Keep each forecast so history rows can show it after the release.
    recordForecasts(data).catch(() => {});
    return data;
  } catch (err) {
    if (hit) return hit.data; // serve the stale copy rather than fail
    throw err;
  }
}

// GET /api/calendar?week=this|next&currency=USD,EUR&impact=High,Medium
export async function GET(req: NextRequest) {
  // Start downloading the news feeds now, so stories are ready when a dialog opens.
  warmNews();

  const params = req.nextUrl.searchParams;

  const week = params.get("week") === "next" ? "next" : "this";
  const currencies = (params.get("currency") ?? "USD")
    .toUpperCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const impacts = (params.get("impact") ?? "High,Medium")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const all = await getWeek(week);

    const events = all
      .filter(
        (e) =>
          currencies.includes(e.country.toUpperCase()) &&
          impacts.includes(e.impact.toLowerCase())
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((e) => ({ id: `${e.date}_${e.country}_${e.title}`, ...e }));

    return NextResponse.json({ week, count: events.length, events });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not load the calendar";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}