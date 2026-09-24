import fs from "fs";
import { runPineScriptOnCandles } from "../lib/pineJsLightweightAdapter.ts";

// Fetch or generate 500 candles matching EURUSD
const candles = [];
let price = 1.1370;
for (let i = 0; i < 500; i++) {
  const o = price;
  const h = o + 0.0003;
  const l = o - 0.0003;
  const c = l + 0.0004;
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

console.log("Running runPineScriptOnCandles...");
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

// Print some box events if any
const boxEvents = result.visualEvents.filter((ev) => ev.call.startsWith("box."));
console.log("Box events count:", boxEvents.length);
for (const ev of boxEvents.slice(0, 10)) {
  console.log("  ", ev.call, "args:", JSON.stringify(ev.args).slice(0, 100));
}

// Print some label events if any
const labelEvents = result.visualEvents.filter((ev) => ev.call.startsWith("label."));
console.log("Label events count:", labelEvents.length);
for (const ev of labelEvents.slice(0, 10)) {
  console.log("  ", ev.call, "args:", JSON.stringify(ev.args).slice(0, 100));
}
