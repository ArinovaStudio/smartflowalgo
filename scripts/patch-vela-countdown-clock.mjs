import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "node_modules", "@luxalgo", "vela", "dist");
const nextDir = join(root, ".next");

const callFrom = "countdownText(last.time, coords.barInterval, Date.now())";
const callTo = "countdownText(last.time, coords.barInterval, globalThis.__velaChartNow?.() ?? Date.now())";

const replacementFn = "function countdownText(barOpen, barMs, now2) { if (!(barMs > 0)) return null; let remaining = barOpen + barMs - now2; if (remaining > barMs || remaining <= 0) remaining = ((remaining % barMs) + barMs) % barMs; return formatCountdown(remaining); }";

function findFunctionRange(src, needle) {
  const start = src.indexOf(needle);
  if (start === -1) return null;
  const braceStart = src.indexOf("{", start);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return { start, end: i + 1, text: src.slice(start, i + 1) };
    }
  }
  return null;
}

export async function patchVelaCountdown() {
  let patchedCount = 0;

  async function patchFile(path) {
    let source = await readFile(path, "utf8");
    let changed = false;

    // 1. Patch call site to use synchronized chart clock
    if (source.includes(callFrom)) {
      source = source.replaceAll(callFrom, callTo);
      changed = true;
    }

    // 2. Patch function definition to prevent timezone/clock offset overflow
    const fnRange = findFunctionRange(source, "function countdownText(barOpen, barMs, now2)");
    if (fnRange && fnRange.text !== replacementFn) {
      source = source.slice(0, fnRange.start) + replacementFn + source.slice(fnRange.end);
      changed = true;
    }

    if (changed) {
      await writeFile(path, source, "utf8");
      patchedCount++;
    } else if (source.includes(callTo) || (fnRange && fnRange.text === replacementFn)) {
      patchedCount++;
    }
  }

  async function scanTree(dir) {
    if (!existsSync(dir)) return;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanTree(full);
      } else if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".mjs"))) {
        if (entry.name.endsWith(".map")) continue;
        const src = await readFile(full, "utf8");
        if (src.includes("countdownText")) {
          await patchFile(full);
        }
      }
    }
  }

  await scanTree(dist);
  if (existsSync(nextDir)) {
    const webpackCache = join(nextDir, "cache", "webpack");
    if (existsSync(webpackCache)) {
      try {
        rmSync(webpackCache, { recursive: true, force: true });
      } catch {}
    }
    await scanTree(nextDir);
  }

  console.log(`[MT5 Countdown Patch] Successfully verified/patched ${patchedCount} file(s).`);
  return patchedCount;
}

// Run immediately if executed directly via node
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  patchVelaCountdown().catch(console.error);
}
