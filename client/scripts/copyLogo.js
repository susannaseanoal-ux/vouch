import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* Takes whatever logo file is sitting in /logo and makes it available to
   the app at a predictable URL.

   The point is that you can drop in a file called anything at all —
   "WhatsApp Image 2026-08-29 at 9.03.58 PM.jpeg" included — and the app
   picks it up without anyone editing code. The file is copied into
   client/public under a clean name, and src/logo.json records where it
   landed so the Logo component knows what to render.

   Runs automatically before `npm run dev` and `npm run build`. */

const here = path.dirname(fileURLToPath(import.meta.url));
const from = path.resolve(here, "../../logo");
const toPublic = path.resolve(here, "../public");
const manifestPath = path.resolve(here, "../src/logo.json");

/* Best format first: an SVG scales and can be recoloured, a PNG usually
   has transparency, a JPEG never does. */
const RANK = { ".svg": 0, ".png": 1, ".webp": 2, ".jpg": 3, ".jpeg": 3 };

fs.mkdirSync(toPublic, { recursive: true });

const files = fs.existsSync(from)
  ? fs.readdirSync(from).filter((f) => RANK[path.extname(f).toLowerCase()] !== undefined)
  : [];

/* A file explicitly named logo.* always wins; otherwise take the best
   format available, and the newest if several tie. */
files.sort((a, b) => {
  const named = (f) => (path.basename(f, path.extname(f)).toLowerCase() === "logo" ? 0 : 1);
  if (named(a) !== named(b)) return named(a) - named(b);

  const ra = RANK[path.extname(a).toLowerCase()];
  const rb = RANK[path.extname(b).toLowerCase()];
  if (ra !== rb) return ra - rb;

  return fs.statSync(path.join(from, b)).mtimeMs - fs.statSync(path.join(from, a)).mtimeMs;
});

const manifest = { src: null, transparent: false };

if (files.length) {
  const chosen = files[0];
  const ext = path.extname(chosen).toLowerCase();
  const dest = `logo${ext}`;

  fs.copyFileSync(path.join(from, chosen), path.join(toPublic, dest));

  manifest.src = `/${dest}`;
  // A JPEG cannot carry transparency, so the logo arrives with its own
  // background baked in and has to be shown on a matching tile.
  manifest.transparent = ext !== ".jpg" && ext !== ".jpeg";

  console.log(`[logo] using "${chosen}" -> public/${dest}`);
  if (!manifest.transparent) {
    console.log("[logo] note: JPEG has no transparency, so it is shown on a navy tile.");
    console.log("[logo] a transparent PNG or an SVG would sit directly on white.");
  }
} else {
  console.log("[logo] no logo file found in /logo — using the text wordmark.");
}

/* Also mirror it as the favicon when we have nothing better. */
const favicon = path.join(from, "favicon.png");
if (fs.existsSync(favicon)) {
  fs.copyFileSync(favicon, path.join(toPublic, "favicon.png"));
} else if (manifest.src && manifest.src.endsWith(".png")) {
  fs.copyFileSync(path.join(toPublic, "logo.png"), path.join(toPublic, "favicon.png"));
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
