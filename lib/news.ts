import { getSpeaker } from "./event-info";

interface FeedDef {
  id: string;
  label: string;
  url: string;
  official?: boolean;
}

const FEEDS: FeedDef[] = [
  { id: "fed-monetary", label: "Federal Reserve", url: "https://www.federalreserve.gov/feeds/press_monetary.xml", official: true },
  { id: "fed-speeches", label: "Federal Reserve", url: "https://www.federalreserve.gov/feeds/speeches_and_testimony.xml", official: true },
  { id: "bls", label: "US Bureau of Labor Statistics", url: "https://www.bls.gov/feed/bls_latest.rss", official: true },
  { id: "dol", label: "US Department of Labor", url: "https://www.dol.gov/rss/releases.xml", official: true },
  { id: "il-news", label: "investingLive", url: "https://investinglive.com/feed/news/" },
  { id: "il-cb", label: "investingLive", url: "https://investinglive.com/feed/centralbank/" },
  { id: "fxstreet", label: "FXStreet", url: "https://www.fxstreet.com/rss/news" },
];

const FINNHUB = "https://finnhub.io/api/v1/news";
const FINNHUB_CATEGORIES = ["general", "forex"];

const REFRESH_MS = 5 * 60 * 1000;
const FEED_TIMEOUT_MS = 8000;
const MAX_ARTICLES = 600;

export interface Story {
  title: string;
  url: string;
  source: string;
  date: string | null;
  image: string | null;
  summary: string;
  official: boolean;
}

interface Article extends Story {
  haystackTitle: string;
  haystackAll: string;
}

export interface FeedStatus {
  name: string;
  ok: boolean;
  count: number;
  error?: string;
}

interface NewsState {
  articles: Article[];
  at: number; // 0 = never loaded
  refreshing?: Promise<void>;
  status: FeedStatus[];
}

const g = globalThis as unknown as { __news?: NewsState };
const state = (g.__news ??= { articles: [], at: 0, status: [] });

// ── Tiny XML helpers (RSS 2.0 and Atom) ─────────────────────────────────────

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  hellip: "…",
};

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

function unwrap(raw: string): string {
  const cdata = raw.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return cdata ? cdata[1] : decode(raw);
}

function plain(html: string): string {
  return decode(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? unwrap(m[1]).trim() : null;
}

function attr(block: string, tagName: string, attribute: string, filter?: RegExp): string | null {
  for (const m of block.matchAll(new RegExp(`<${tagName}\\b([^>]*?)/?>`, "gi"))) {
    if (filter && !filter.test(m[1])) continue;
    const a = m[1].match(new RegExp(`${attribute}\\s*=\\s*["']([^"']+)["']`, "i"));
    if (a) return decode(a[1]);
  }
  return null;
}

function firstImage(block: string, body: string): string | null {
  const candidates = [
    attr(block, "media:content", "url", /image|medium=["']image/i) ?? attr(block, "media:content", "url"),
    attr(block, "media:thumbnail", "url"),
    attr(block, "enclosure", "url", /type=["']image/i),
    body.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null,
  ];
  const found = candidates.find((c) => c && /^https:\/\//i.test(c));
  return found ? decode(found) : null;
}

function parseFeed(xml: string, feed: FeedDef): Article[] {
  const out: Article[] = [];
  for (const m of xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)) {
    const block = m[0];
    const title = plain(tag(block, "title") ?? "");
    const link =
      (tag(block, "link") && /^https?:\/\//i.test(tag(block, "link")!) ? tag(block, "link") : null) ??
      attr(block, "link", "href", /rel=["']alternate["']/i) ??
      attr(block, "link", "href") ??
      tag(block, "guid");
    if (!title || !link || !/^https?:\/\//i.test(link)) continue;

    const rawBody =
      tag(block, "content:encoded") ?? tag(block, "description") ?? tag(block, "summary") ?? tag(block, "content") ?? "";
    const dateText = tag(block, "pubDate") ?? tag(block, "dc:date") ?? tag(block, "published") ?? tag(block, "updated");
    const parsed = dateText ? new Date(dateText) : null;
    const summary = plain(rawBody).slice(0, 260);

    out.push(makeArticle({
      title,
      url: link,
      source: feed.label,
      date: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
      image: firstImage(block, rawBody),
      summary,
      official: !!feed.official,
    }));
  }
  return out;
}

function makeArticle(s: Story): Article {
  return {
    ...s,
    haystackTitle: s.title.toLowerCase(),
    haystackAll: `${s.title} ${s.summary}`.toLowerCase(),
  };
}

// ── Downloading ─────────────────────────────────────────────────────────────

async function fetchFeed(feed: FeedDef): Promise<Article[]> {
  const res = await fetch(feed.url, {
    cache: "no-store",
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PersonalEconomicCalendar/1.0)",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const articles = parseFeed(await res.text(), feed);
  if (articles.length === 0) throw new Error("no items found in the feed");
  return articles;
}

async function fetchFinnhub(category: string, key: string): Promise<Article[]> {
  const res = await fetch(`${FINNHUB}?category=${category}&token=${encodeURIComponent(key)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = (await res.json()) as {
    headline?: string;
    summary?: string;
    url?: string;
    source?: string;
    image?: string;
    datetime?: number;
  }[];
  return rows
    .filter((r) => r.headline && r.url)
    .map((r) =>
      makeArticle({
        title: r.headline!.trim(),
        url: r.url!,
        source: r.source || "Finnhub",
        date: r.datetime ? new Date(r.datetime * 1000).toISOString() : null,
        image: r.image && /^https:\/\//i.test(r.image) ? r.image : null,
        summary: (r.summary ?? "").slice(0, 260),
        official: false,
      })
    );
}

async function refresh(): Promise<void> {
  if (state.refreshing) return state.refreshing;

  state.refreshing = (async () => {
    const jobs: { name: string; run: () => Promise<Article[]> }[] = FEEDS.map((f) => ({
      name: `${f.label} (${f.id})`,
      run: () => fetchFeed(f),
    }));
    const finnhubKey = process.env.FINNHUB_API_KEY;
    if (finnhubKey) {
      for (const c of FINNHUB_CATEGORIES) {
        jobs.push({ name: `Finnhub (${c})`, run: () => fetchFinnhub(c, finnhubKey) });
      }
    }

    // Feeds load in parallel, and one slow or broken feed never blocks the others.
    const results = await Promise.allSettled(jobs.map((j) => j.run()));

    const status: FeedStatus[] = [];
    const fresh: Article[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        fresh.push(...r.value);
        status.push({ name: jobs[i].name, ok: true, count: r.value.length });
      } else {
        const msg = r.reason instanceof Error ? r.reason.message : "failed";
        status.push({ name: jobs[i].name, ok: false, count: 0, error: msg });
      }
    });

    const anyOk = status.some((s) => s.ok);
    if (anyOk) {
      // Keep older items for feeds that failed this round, then de-duplicate.
      const seen = new Set<string>();
      const merged = [...fresh, ...state.articles]
        .filter((a) => {
          const key = a.url;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
        .slice(0, MAX_ARTICLES);
      state.articles = merged;
    }
    state.status = status;
    // If everything failed, try again in about 30 seconds instead of five minutes.
    state.at = anyOk ? Date.now() : Date.now() - REFRESH_MS + 30_000;
  })().finally(() => {
    state.refreshing = undefined;
  });

  return state.refreshing;
}

/** Start loading in the background without waiting (safe to call often). */
export function warmNews() {
  if (state.at === 0 || Date.now() - state.at > REFRESH_MS) refresh().catch(() => {});
}

async function ensureNews() {
  if (state.at === 0) {
    await refresh(); // first ever load: wait, bounded by the per-feed timeout
  } else if (Date.now() - state.at > REFRESH_MS) {
    refresh().catch(() => {}); // later: answer from memory, refresh behind the scenes
  }
}

// ── Matching stories to an event ────────────────────────────────────────────

// First match wins. Terms are lowercase phrases; short ones match whole words only.
const TERM_RULES: { match: RegExp; terms: string[] }[] = [
  { match: /adp/i, terms: ["adp national employment", "adp employment", "adp private payrolls", "adp report"] },
  { match: /average hourly earnings/i, terms: ["average hourly earnings", "hourly earnings"] },
  { match: /non-?farm/i, terms: ["nonfarm payroll", "non-farm payroll", "nfp", "jobs report", "payroll employment", "employment situation"] },
  { match: /unemployment rate/i, terms: ["unemployment rate", "jobs report", "employment situation"] },
  { match: /unemployment claims|jobless claims/i, terms: ["jobless claims", "initial claims", "unemployment claims", "unemployment insurance weekly claims", "weekly claims"] },
  { match: /jolts/i, terms: ["jolts", "job openings"] },
  { match: /\bcpi\b/i, terms: ["consumer price index", "cpi", "consumer prices"] },
  { match: /\bppi\b/i, terms: ["producer price index", "ppi", "producer prices"] },
  { match: /pce/i, terms: ["pce", "personal consumption expenditures"] },
  { match: /retail sales/i, terms: ["retail sales"] },
  { match: /gdp/i, terms: ["gdp", "gross domestic product"] },
  { match: /durable goods/i, terms: ["durable goods"] },
  { match: /trade balance/i, terms: ["trade balance", "trade deficit"] },
  { match: /industrial production/i, terms: ["industrial production"] },
  { match: /\bism\b/i, terms: ["ism manufacturing", "ism services", "ism pmi", "ism non-manufacturing"] },
  { match: /flash (manufacturing|services) pmi|s&p global/i, terms: ["s&p global", "flash pmi"] },
  { match: /empire state/i, terms: ["empire state", "empire manufacturing"] },
  { match: /philly fed/i, terms: ["philadelphia fed", "philly fed"] },
  { match: /uom inflation expectations/i, terms: ["inflation expectations", "university of michigan"] },
  { match: /uom consumer sentiment/i, terms: ["consumer sentiment", "university of michigan"] },
  { match: /cb consumer confidence/i, terms: ["conference board", "consumer confidence"] },
  { match: /housing starts/i, terms: ["housing starts"] },
  { match: /building permits/i, terms: ["building permits"] },
  { match: /existing home sales/i, terms: ["existing home sales"] },
  { match: /new home sales/i, terms: ["new home sales"] },
  { match: /crude oil inventories/i, terms: ["crude inventories", "crude oil inventories", "crude stocks"] },
  { match: /bond auction|note auction|bill auction/i, terms: ["treasury auction", "bond auction", "note auction", "auction"] },
  { match: /federal funds rate/i, terms: ["fomc", "interest rate decision", "federal funds rate", "rate decision", "fed hikes", "fed cuts", "fed holds"] },
  { match: /fomc statement/i, terms: ["fomc statement", "fomc"] },
  { match: /fomc press conference/i, terms: ["press conference", "fomc"] },
  { match: /fomc (meeting )?minutes/i, terms: ["fomc minutes", "minutes"] },
  { match: /fomc economic projections/i, terms: ["dot plot", "economic projections", "fomc"] },
  { match: /beige book/i, terms: ["beige book"] },
];

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole-word match, so "cpi" does not match "precipitation".
const termRe = (term: string) => new RegExp(`(^|[^a-z0-9])${escapeRe(term)}([^a-z0-9]|$)`, "i");

function termsFor(title: string, currency: string): { terms: string[]; minWords?: string[] } {
  const speaker = getSpeaker(title);
  if (speaker) {
    const lastName = (speaker.split(/\s+/).pop() ?? speaker).toLowerCase();
    return { terms: [lastName] };
  }
  if (currency.toUpperCase() === "USD") {
    const rule = TERM_RULES.find((r) => r.match.test(title));
    if (rule) return { terms: rule.terms };
  }
  // Unknown event: the cleaned title as a phrase, or at least two of its words.
  const clean = title
    .replace(/\b(m\/m|q\/q|y\/y|prelim|preliminary|final|flash|revised|advance)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const words = clean
    .split(/[^a-z0-9&]+/)
    .filter((w) => w.length >= 4 && !["index", "rate", "data"].includes(w));
  return { terms: clean ? [clean] : [], minWords: words.length >= 2 ? words : undefined };
}

function score(article: Article, terms: string[], words?: string[]): number {
  let s = 0;
  for (const t of terms) {
    const re = termRe(t);
    if (re.test(article.haystackTitle)) s += 3;
    else if (re.test(article.haystackAll)) s += 1;
  }
  if (s === 0 && words) {
    const hits = words.filter((w) => termRe(w).test(article.haystackAll)).length;
    if (hits >= 2) s = hits;
  }
  return s;
}

export async function getStories(title: string, currency: string) {
  await ensureNews();

  const { terms, minWords } = termsFor(title, currency);
  const ranked = state.articles
    .map((a) => ({ a, s: score(a, terms, minWords) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => {
      const bonus = (x.a.official ? 0.5 : 0) - (y.a.official ? 0.5 : 0);
      const byScore = y.s - x.s - bonus;
      if (Math.abs(byScore) > 0.01) return byScore;
      return (y.a.date ?? "").localeCompare(x.a.date ?? "");
    });

  const stories: Story[] = [];
  const seenTitles = new Set<string>();
  for (const { a } of ranked) {
    const key = a.haystackTitle;
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    stories.push({
      title: a.title,
      url: a.url,
      source: a.source,
      date: a.date,
      image: a.image,
      summary: a.summary,
      official: a.official,
    });
    if (stories.length === 6) break;
  }

  return { stories, feeds: state.status, updatedAt: state.at };
}