import fs from "fs";
import { runPineScriptOnCandles } from "../lib/pineJsLightweightAdapter.ts";

// Generate 2000 candles with realistic swings so pivot highs and lows are guaranteed
const candles = [];
let price = 1.1370;
for (let i = 0; i < 2000; i++) {
  const wave = Math.sin(i / 20) * 0.0050 + Math.sin(i / 100) * 0.0100;
  const o = price;
  const c = 1.1370 + wave + (Math.sin(i) * 0.0005);
  const h = Math.max(o, c) + 0.0008;
  const l = Math.min(o, c) - 0.0008;
  candles.push({
    time: 1727000000 + i * 60,
    open: o,
    high: h,
    low: l,
    close: c,
    volume: 100,
  });
  price = c;
}

const script = fs.readFileSync("backend-data/WHALE_ZONES_STIKE.pine", "utf-8");

console.log("Running runPineScriptOnCandles with 2000 wavy candles...");
const start = performance.now();
const result = await runPineScriptOnCandles(
  script,
  "whale",
  "WHALE ZONES STIKE",
  candles,
  "EURUSD",
  "1m"
);
console.log(`Execution took ${(performance.now() - start).toFixed(1)}ms`);
console.log("Error:", result.error);
console.log("Plots count:", result.plots.length);
console.log("VisualEvents count:", result.visualEvents.length);

const calls = {};
for (const ev of result.visualEvents) {
  calls[ev.call] = (calls[ev.call] || 0) + 1;
}
console.log("Visual events by call:", calls);

const boxEvents = result.visualEvents.filter((ev) => ev.call.startsWith("box."));
console.log("Box events count:", boxEvents.length);
for (const ev of boxEvents) {
  console.log("  ", ev.call, "args:", JSON.stringify(ev.args).slice(0, 100));
}
