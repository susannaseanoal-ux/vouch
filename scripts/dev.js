/* Starts the API and the front end together, so `npm run dev` works from
   the project root rather than needing two terminals in two folders.

   No dependencies on purpose — this has to work straight after cloning,
   before anything is installed at the root. */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

/* ---- checks that save a confusing failure later ------------------- */
const problems = [];

for (const part of ["server", "client"]) {
  if (!fs.existsSync(path.join(root, part, "node_modules"))) {
    problems.push(`${part}/node_modules is missing — run:  npm run setup`);
  }
}

const envPath = path.join(root, "server", ".env");
if (!fs.existsSync(envPath)) {
  problems.push("server/.env is missing — run:  npm run setup");
} else {
  const env = fs.readFileSync(envPath, "utf8");
  const uri = /^MONGODB_URI=(.*)$/m.exec(env)?.[1]?.trim();
  if (!uri) {
    problems.push(
      "MONGODB_URI is empty in server/.env.\n" +
      "    The API cannot start without a database. Get a free connection\n" +
      "    string at https://www.mongodb.com/atlas and paste it in."
    );
  }
}

if (problems.length) {
  console.error("\n  Cannot start yet:\n");
  for (const p of problems) console.error("  • " + p);
  console.error("\n  The front end alone still works:  npm run dev:client\n");
  process.exit(1);
}

/* ---- run both ----------------------------------------------------- */
const COLOURS = { server: "\x1b[36m", client: "\x1b[35m" };
const RESET = "\x1b[0m";

const children = [];

function start(name) {
  const child = spawn("npm", ["run", "dev"], {
    cwd: path.join(root, name),
    shell: isWin,               // npm is a .cmd on Windows
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
    if (code && code !== 0) {
      console.error(`${tag}exited with code ${code}`);
    }
  });

  children.push(child);
  return child;
}

console.log("\n  Starting Vouch…");
console.log("  API      http://localhost:4000");
console.log("  Website  http://localhost:5173");
console.log("  Press Ctrl+C to stop both.\n");

start("server");
start("client");

/* One Ctrl+C should take both processes down, not orphan one. */
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
