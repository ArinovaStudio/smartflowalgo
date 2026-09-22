import { NextRequest, NextResponse } from "next/server";
import { getStories } from "@/lib/news";

// GET /api/calendar/stories?title=Unemployment%20Claims&currency=USD
// Answers from the in-memory feed cache, so it returns immediately after the first load.
export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title")?.trim();
  const currency = req.nextUrl.searchParams.get("currency") ?? "USD";
  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  try {
    const { stories, feeds, updatedAt } = await getStories(title, currency);

    // Only an error when nothing at all could be downloaded.
    if (stories.length === 0 && feeds.length > 0 && feeds.every((f) => !f.ok)) {
      const detail = feeds.map((f) => `${f.name}: ${f.error}`).join("; ");
      return NextResponse.json(
        { error: `None of the news feeds could be reached (${detail}).` },
        { status: 502 }
      );
    }

    return NextResponse.json({ stories, feeds, updatedAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load stories";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}