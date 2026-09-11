/**
 * SmartFlowAlgo — Custom Next.js Dev Launcher
 *
 * Reads PORT from .env (via dotenv) and starts `next dev` on that port.
 * Falls back to 3000 if PORT is not set in the environment or .env file.
 *
 * Usage: node scripts/run-dev.mjs
 * npm script: "dev": "node scripts/run-dev.mjs"
 */

import { spawn } from "child_process";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// ── Load .env manually (dotenv-style, no extra dependency needed) ─────────────
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, "utf-8");
  const vars = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes (" or ')
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

// Process env takes priority → then .env file → then default 3000
const envVars = loadEnvFile(path.join(rootDir, ".env"));

const port = process.env.PORT || envVars["PORT"] || "3000";

console.log(`\n🚀 Starting Next.js dev server on port ${port} ...\n`);

const next = spawn(
  "npx",
  ["next", "dev", "--port", port, "--hostname", "0.0.0.0"],
  {
    cwd: rootDir,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, PORT: port },
  }
);

next.on("close", (code) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => next.kill("SIGINT"));
process.on("SIGTERM", () => next.kill("SIGTERM"));
