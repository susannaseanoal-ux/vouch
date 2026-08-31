/* Demo mode from the project root: the API against a throwaway in-memory
   MongoDB, plus the front end, in one terminal.

   Same shape as dev.js, minus the MONGODB_URI check — demo mode makes its
   own database, so an empty .env is fine here. */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

const missing = ["server", "client"].filter(
  (part) => !fs.existsSync(path.join(root, part, "node_modules"))
);
if (missing.length) {
  console.error(`\n  ${missing.join(" and ")} not installed — run:  npm run setup\n`);
  process.exit(1);
}

const COLOURS = { server: "\x1b[36m", client: "\x1b[35m" };
const RESET = "\x1b[0m";
const children = [];

function start(name, script) {
  const child = spawn("npm", ["run", script], {
    cwd: path.join(root, name),
    shell: isWin,
    env: process.env,
  });

  const tag = `${COLOURS[name]}[${name}]${RESET} `;
  const pipe = (stream, to) => {
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) to.write(tag + line + "\n");
    });
  };

  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on("exit", (code) => {
    if (code && code !== 0) console.error(`${tag}exited with code ${code}`);
  });

  children.push(child);
}

console.log("\n  Vouch — demo mode (nothing is saved)");
console.log("  Dashboard  http://localhost:5173/admin");
console.log("  Sign in    admin / demo123456");
console.log("  Press Ctrl+C to stop.\n");

start("server", "demo");
start("client", "dev");

const stopAll = () => {
  for (const c of children) {
    if (c.exitCode === null) {
      if (isWin) spawn("taskkill", ["/pid", c.pid, "/f", "/t"], { stdio: "ignore" });
      else c.kill("SIGTERM");
    }
  }
  process.exit(0);
};

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
