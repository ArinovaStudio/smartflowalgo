/**
 * SmartFlowAlgo Dev Runner
 * Spawns the Next.js Frontend.
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

console.log("\n========================================================");
console.log("   🚀 SmartFlowAlgo - Starting Frontend Environment");
console.log("   • Frontend (Next.js):     http://localhost:3000");
console.log("========================================================\n");

const next = spawn("npm", ["run", "dev"], {
  cwd: rootDir,
  stdio: ["inherit", "pipe", "pipe"],
  shell: true,
});

next.stdout.on("data", (data) => {
  process.stdout.write(`\x1b[32m[NEXT-APP]\x1b[0m ${data.toString()}`);
});

next.stderr.on("data", (data) => {
  process.stderr.write(`\x1b[33m[NEXT-APP-ERR]\x1b[0m ${data.toString()}`);
});

function cleanup() {
  try {
    next.kill();
  } catch {}
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
