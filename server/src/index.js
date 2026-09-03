import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";

/* server/.env, found relative to this file rather than to whatever
   directory the process happened to start in. A host runs `npm start`
   from the project root, and plain `dotenv/config` would look for a
   .env there, find nothing, and the app would exit saying the database
   is not configured. Real environment variables always win: dotenv
   never overwrites something already set. */
const HERE = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(HERE, "../.env") });

import { connectDb, dbReady } from "./config/db.js";
import publicRoutes from "./routes/public.js";
import newsRoutes from "./routes/news.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import adminNewsRoutes from "./routes/adminNews.js";
import adminUserRoutes from "./routes/adminUsers.js";

const app = express();

/* Behind a proxy (Render, Railway, Nginx) req.ip must come from
   X-Forwarded-For, or every visitor looks like the proxy and the rate
   limiters treat the whole world as one caller.

   How many hops to trust depends on where this is deployed - one behind
   a single host proxy, two behind a CDN in front of that - so it is
   configuration. Trusting more hops than actually exist is worse than
   trusting none: the extra entries in X-Forwarded-For are whatever the
   caller wrote there. */
const trust = String(process.env.TRUST_PROXY ?? "1").trim();
app.set(
  "trust proxy",
  /^\d+$/.test(trust) ? Number(trust)
    : trust === "true" ? true
    : trust === "false" ? false
    : trust                                   // a list, e.g. "loopback, 10.0.0.0/8"
);

/* Helmet's defaults, with one change: a news post carries an image
   address that points wherever the picture actually lives, and the
   default img-src of 'self' data: blocks every one of them. Widened to
   any https source - scripts, frames and objects stay locked down. */
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: { "img-src": ["'self'", "data:", "https:"] },
    },
  })
);
app.use(express.json({ limit: "256kb" }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, service: "vouch-api", database: dbReady() ? "connected" : "unavailable" })
);

/* Everything below /api needs data. While the database is unreachable,
   say so plainly and with the right status code instead of letting each
   query hang until it times out. The website itself keeps working. */
app.use("/api", (req, res, next) => {
  if (req.path === "/health" || dbReady()) return next();
  res.status(503).json({
    ok: false,
    error: "The service is starting up or the database is unavailable. Please try again shortly.",
  });
});

app.use("/api", publicRoutes);
app.use("/api", newsRoutes);
app.use("/api/auth", authRoutes);

/* Mounted before the general admin router so /api/admin/news is matched
   here rather than falling through to it. */
app.use("/api/admin/news", adminNewsRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin", adminRoutes);

/* ------------------------------------------------------------------
   The built website, served by this same app.

   One service, one URL, no cross-origin setup and nothing to keep in
   step between two deployments. Skipped entirely when the build is not
   there, so `npm run dev` still uses Vite with hot reload.
   ------------------------------------------------------------------ */
const dist = path.resolve(HERE, "../../client/dist");

if (fs.existsSync(path.join(dist, "index.html"))) {
  app.use(express.static(dist, { maxAge: "1h", index: false }));

  /* A single-page app owns its routing: /track, /news, /admin are React
     routes, not files, so anything that is not an API call and not a
     real file is handed the app to resolve. */
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));

  console.log("[vouch] serving the built website from client/dist");
}

app.use((_req, res) => res.status(404).json({ ok: false, error: "Not found." }));

/* One place for unhandled failures. The real reason goes to the log; the
   caller gets something plain, so a stack trace never reaches a browser. */
app.use((err, _req, res, _next) => {
  console.error("[vouch]", err);
  res.status(500).json({ ok: false, error: "Something went wrong on our side. Please try again." });
});

const port = Number(process.env.PORT || 4000);

/* Listen regardless of the database. A host decides a deploy failed
   when nothing binds to the port, so exiting here would take the whole
   site down over a problem that only affects part of it. */
connectDb().then((ok) => {
  app.listen(port, () => {
    console.log(`[vouch] API listening on http://localhost:${port}`);
    if (!ok) console.warn("[vouch] serving without a database - data routes will return 503");
  });
});
