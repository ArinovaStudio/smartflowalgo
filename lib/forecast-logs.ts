// Neither FRED nor the weekly export has FORECAST history, so the app keeps its
// own. Every time the weekly calendar feed is loaded, the forecast for each event
// is saved here, keyed by currency, title and the event's US Eastern date. When
// the details dialog builds a history row, it looks up the same key.
//
// Limits: it only knows releases that were on a week you loaded while the app was
// running, so older rows show "-" and it fills in over time. It writes a small
// file next to your project (.data/forecast-log.json), which suits a local
// machine but not a read-only or serverless host. Add ".data" to .gitignore.

import { promises as fs } from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), ".data", "forecast-log.json");

type Log = Record<string, string>;
const g = globalThis as unknown as { __forecastLog?: Promise<Log> };

function load(): Promise<Log> {
  return (g.__forecastLog ??= fs
    .readFile(FILE, "utf8")
    .then((text) => JSON.parse(text) as Log)
    .catch(() => ({} as Log)));
}

const keyOf = (country: string, title: string, date: string) =>
  `${country.toUpperCase()}|${title}|${date.slice(0, 10)}`;

export async function recordForecasts(
  events: { title: string; country: string; date: string; forecast: string }[]
) {
  const log = await load();
  let changed = false;
  for (const e of events) {
    if (!e.forecast) continue;
    const key = keyOf(e.country, e.title, e.date);
    if (log[key] !== e.forecast) {
      log[key] = e.forecast;
      changed = true;
    }
  }
  if (!changed) return;
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(log));
  } catch {
    /* read-only disk: keep the in-memory copy */
  }
}

export async function getForecast(country: string, title: string, date: string) {
  const log = await load();
  return log[keyOf(country, title, date)];
}