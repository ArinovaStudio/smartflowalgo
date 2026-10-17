import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const velaPinetsDist = join(root, "node_modules", "@luxalgo", "vela-pinets", "dist");
const pinetsDist = join(root, "node_modules", "pinets", "dist");
const nextDir = join(root, ".next");

// PineTS request.security reads the captured expression series by key and bar index.
// Keep the variable names generic because the bundler renames them between builds.
const UNSAFE_PARAMS_REGEX = /(\b[A-Za-z_$][\w$]*\.params)\[([A-Za-z_$][\w$]*)\]\[([A-Za-z_$][\w$]*)\]/g;

function getSafeReplacement(obj, key, idx) {
  return `(${obj}?.[${key}]?.[${idx}] ?? ((_p,_k,_i)=>{if(!_p)return NaN;const _m=typeof _k==="string"?_k.match(/p\\d+$/)?.[0]:null;const _s=_p[_k]??(_m?(_p[_m]??Object.entries(_p).find(([k])=>k.endsWith(_m))?.[1]):undefined);if(_s){_p[_k]=_s;return _s[_i];}return NaN;})(${obj},${key},${idx}))`;
}

export async function patchPinetsSecurity() {
  let patchedCount = 0;

  async function patchFile(path) {
    let source = await readFile(path, "utf8");
    if (!UNSAFE_PARAMS_REGEX.test(source)) {
      if (source.includes("((_p,_k,_i)")) {
        patchedCount++;
      }
      return;
    }
    // Reset regex lastIndex
    UNSAFE_PARAMS_REGEX.lastIndex = 0;
    const modified = source.replace(UNSAFE_PARAMS_REGEX, (match, obj, key, idx) => getSafeReplacement(obj, key, idx));
    if (modified !== source) {
      await writeFile(path, modified, "utf8");
      patchedCount++;
    }
  }

  async function scanTree(dir) {
    if (!existsSync(dir)) return;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanTree(full);
      } else if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".cjs") || entry.name.endsWith(".mjs"))) {
        if (entry.name.endsWith(".map") || entry.name.endsWith(".d.ts") || entry.name.endsWith(".d.cts")) continue;
        await patchFile(full);
      }
    }
  }

  await scanTree(velaPinetsDist);
  await scanTree(pinetsDist);

  if (existsSync(nextDir)) {
    const webpackCache = join(nextDir, "cache", "webpack");
    if (existsSync(webpackCache)) {
      try {
        rmSync(webpackCache, { recursive: true, force: true });
      } catch {}
    }
    await scanTree(nextDir);
  }

  console.log(`[PineTS Security Patch] Successfully verified/patched ${patchedCount} file(s).`);
  return patchedCount;
}

// Run immediately if executed directly via node
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  patchPinetsSecurity().catch((error) => {
    console.error("[PineTS Security Patch] Failed:", error);
    process.exitCode = 1;
  });
}
