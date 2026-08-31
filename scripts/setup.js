/* First-run setup: installs both halves and creates server/.env with a
   real generated JWT secret, so the only thing left to fill in by hand
   is the database connection string.

   Safe to run again — an existing .env is never overwritten. */

import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const part of ["server", "client"]) {
  console.log(`\n  Installing ${part}…`);
  execSync("npm install --no-audit --no-fund", {
    cwd: path.join(root, part),
    stdio: "inherit",
  });
}

const envPath = path.join(root, "server", ".env");

if (fs.existsSync(envPath)) {
  console.log("\n  server/.env already exists — leaving it alone.");
} else {
  const example = fs.readFileSync(path.join(root, "server", ".env.example"), "utf8");

  const written = example
    .replace(/^MONGODB_URI=.*$/m, "MONGODB_URI=")
    .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${crypto.randomBytes(48).toString("hex")}`);

  fs.writeFileSync(envPath, written);
  console.log("\n  Created server/.env with a generated JWT_SECRET.");
}

const env = fs.readFileSync(envPath, "utf8");
const uri = /^MONGODB_URI=(.*)$/m.exec(env)?.[1]?.trim();

console.log("\n  ────────────────────────────────────────────────");
if (uri) {
  console.log("  Ready. Start everything with:   npm run dev");
} else {
  console.log("  One thing left: the database.\n");
  console.log("  1. Get a free cluster at https://www.mongodb.com/atlas");
  console.log("  2. Connect → Drivers → copy the connection string");
  console.log("  3. Paste it after MONGODB_URI= in server/.env");
  console.log("  4. npm run seed     (creates your admin account)");
  console.log("  5. npm run dev\n");
  console.log("  To see just the website first:   npm run dev:client");
}
console.log("  ────────────────────────────────────────────────\n");
