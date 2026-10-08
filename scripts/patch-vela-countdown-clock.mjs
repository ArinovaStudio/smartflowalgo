import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "node_modules", "@luxalgo", "vela", "dist");
const from = "countdownText(last.time, coords.barInterval, Date.now())";
const to = "countdownText(last.time, coords.barInterval, globalThis.__velaChartNow?.() ?? Date.now())";
let patchedCount = 0;

async function patchTree(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await patchTree(path);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      const source = await readFile(path, "utf8");
      const count = source.split(from).length - 1;
      if (count) {
        await writeFile(path, source.replaceAll(from, to), "utf8");
        patchedCount += count;
      } else if (source.includes(to)) {
        patchedCount++;
      }
    }
  }
}

await patchTree(dist);
if (!patchedCount) {
  throw new Error("Vela countdown call was not found; check @luxalgo/vela before building.");
}
console.log(`MT5 candle countdown clock patch active (${patchedCount} Vela bundle${patchedCount === 1 ? "" : "s"}).`);
