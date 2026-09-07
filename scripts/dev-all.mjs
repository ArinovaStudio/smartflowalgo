/**
 * SmartFlowAlgo Unified Dev Runner
 * Spawns both the Next.js Frontend and the MT5 Bridge Server simultaneously.
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

console.log("\n========================================================");
console.log("   🚀 SmartFlowAlgo - Starting Full Stack Environment");
console.log("   • Frontend (Next.js):     http://localhost:3000");
console.log("   • MT5 WebSocket Bridge:   ws://localhost:8000/ws");
console.log("========================================================\n");

// 1. Start MT5 Bridge Server
const bridge = spawn("python", ["backend-data/server.py"], {
  cwd: rootDir,
  stdio: ["inherit", "pipe", "pipe"],
  shell: true,
});

bridge.stdout.on("data", (data) => {
  process.stdout.write(`\x1b[36m[MT5-BRIDGE]\x1b[0m ${data.toString()}`);
});

bridge.stderr.on("data", (data) => {
  process.stderr.write(`\x1b[31m[MT5-BRIDGE-ERR]\x1b[0m ${data.toString()}`);
});

// 2. Start Next.js Development Server
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

// Graceful cleanup
function cleanup() {
  console.log("\n\nShutting down all servers...");
  try {
    bridge.kill();
  } catch {}
  try {
    next.kill();
  } catch {}
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
