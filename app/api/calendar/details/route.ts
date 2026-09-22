import { NextRequest, NextResponse } from "next/server";
import { cached, getSeriesSpec, loadFred, viewForEvent } from "@/lib/sources";
import { getForecast } from "@/lib/forecast-logs";

const SIX_HOURS = 6 * 60 * 60 * 1000;

// GET /api/calendar/details?title=Unemployment%20Claims&currency=USD&date=2026-09-24
//
// `date` is the US Eastern date of the event that was opened (the first 10
// characters of the feed's date). History lists the releases before it and
// "next release" is the one after it, like Forex Factory's panel.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const title = params.get("title")?.trim();
  const currency = params.get("currency") ?? "USD";
  const dateParam = params.get("date") ?? "";
  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : new Date().toISOString().slice(0, 10);

  // No data series is known for this event (or it is not a US event).
  const spec = getSeriesSpec(title, currency);
  if (!spec) return NextResponse.json({ mapped: false, configured: true });

  const key = process.env.FRED_API_KEY;
  if (!key) return NextResponse.json({ mapped: true, configured: false });

  try {
    const data = await cached(`fred|${spec.id}`, SIX_HOURS, () => loadFred(spec, key));
    const view = viewForEvent(data, eventDate);

    const history = await Promise.all(
      view.history.map(async (row) => ({
        ...row,
        forecast: await getForecast(currency, title, row.releaseDate),
      }))
    );

    return NextResponse.json({
      mapped: true,
      configured: true,
      seriesTitle: data.seriesTitle,
      releaseName: data.releaseName,
      releaseUrl: data.releaseUrl,
      nextRelease: view.nextRelease,
      history,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load history";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}