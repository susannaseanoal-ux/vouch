import express from "express";
import mongoose from "mongoose";
import News, { slugify } from "../models/News.js";
import { requireAdmin, requireFullAdmin } from "../middleware/auth.js";

/* ==================================================================
   News management.

   Reading is open to any signed-in admin; creating, editing, pinning
   and deleting need a full admin, checked here on the server rather
   than trusted from whatever the browser chose to show.

   NOTE ON IMAGES: a post carries an image *address*, not a file. This
   server stores nothing on disk, so there is no upload directory to
   fill up, back up, or serve by accident. Paste a link from wherever
   the picture already lives.
   ================================================================== */
const router = express.Router();
router.use(requireAdmin);

const isObjectId = (v) => mongoose.isValidObjectId(v);

const present = (n) => ({
  id: String(n._id),
  slug: n.slug,
  title: n.title,
  summary: n.summary,
  body: n.body,
  imageUrl: n.imageUrl,
  pinned: n.pinned,
  published: n.published,
  publishedAt: n.publishedAt,
  author: n.author,
  createdAt: n.createdAt,
  updatedAt: n.updatedAt,
});

/* An image address goes into an <img src>. Only http(s) is allowed
   through: "javascript:" and "data:" in that position are how a stored
   link becomes a script running on a reader's page. */
function cleanImageUrl(raw) {
  const value = String(raw || "").trim().slice(0, 600);
  if (!value) return { url: "" };
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { error: "An image link must start with http:// or https://" };
    }
    return { url: u.toString() };
  } catch {
    return { error: "That image link could not be read." };
  }
}

/** A slug that is not already taken, ignoring the post being edited. */
async function uniqueSlug(title, ignoreId = null) {
  const base = slugify(title);
  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    const clash = await News.findOne({ slug: candidate }).select("_id");
    if (!clash || (ignoreId && String(clash._id) === String(ignoreId))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/* Everything a post can be given, from a body that is whatever the
   browser sent. Returns an error string rather than throwing, so the
   caller gets 422 with a reason instead of a 500. */
function readPost(b) {
  const title = String(b.title || "").trim().slice(0, 200);
  if (!title) return { error: "A post needs a headline." };

  const image = cleanImageUrl(b.imageUrl);
  if (image.error) return { error: image.error };

  let publishedAt = new Date();
  if (b.publishedAt) {
    const d = new Date(b.publishedAt);
    if (Number.isNaN(d.getTime())) return { error: "That publication date could not be read." };
    publishedAt = d;
  }

  return {
    values: {
      title,
      summary: String(b.summary || "").trim().slice(0, 500),
      body: String(b.body || "").slice(0, 40000),
      imageUrl: image.url,
      pinned: b.pinned === true || b.pinned === "true",
      published: b.published === undefined ? true : (b.published === true || b.published === "true"),
      publishedAt,
    },
  };
}

/* ------------------------------------------------------------------
   List - drafts included, newest first
   ------------------------------------------------------------------ */
router.get("/", async (_req, res, next) => {
  try {
    const rows = await News.find({}).sort(News.publicSort).limit(200);
    res.json({
      ok: true,
      total: rows.length,
      news: rows.map(present),
    });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(404).json({ ok: false, error: "That post no longer exists." });
    }
    const item = await News.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "That post no longer exists." });
    res.json({ ok: true, post: present(item) });
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------
   Create
   ------------------------------------------------------------------ */
router.post("/", requireFullAdmin, async (req, res, next) => {
  try {
    const read = readPost(req.body || {});
    if (read.error) return res.status(422).json({ ok: false, error: read.error });

    const post = await News.create({
      ...read.values,
      slug: await uniqueSlug(read.values.title),
      author: req.admin.username,
    });

    res.status(201).json({ ok: true, message: "Post published.", post: present(post) });
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------
   Edit
   ------------------------------------------------------------------ */
router.patch("/:id", requireFullAdmin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(404).json({ ok: false, error: "That post no longer exists." });
    }
    const post = await News.findById(req.params.id);
    if (!post) return res.status(404).json({ ok: false, error: "That post no longer exists." });

    const read = readPost(req.body || {});
    if (read.error) return res.status(422).json({ ok: false, error: read.error });

    /* The slug only moves when the headline does, so a link that has
       been shared does not quietly stop working after a typo fix. */
    if (read.values.title !== post.title) {
      post.slug = await uniqueSlug(read.values.title, post._id);
    }

    Object.assign(post, read.values);
    await post.save();

    res.json({ ok: true, message: "Post updated.", post: present(post) });
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------
   Pin / unpin - its own route, so the dashboard can toggle it without
   sending the whole post back.
   ------------------------------------------------------------------ */
router.patch("/:id/pin", requireFullAdmin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(404).json({ ok: false, error: "That post no longer exists." });
    }
    const post = await News.findById(req.params.id);
    if (!post) return res.status(404).json({ ok: false, error: "That post no longer exists." });

    post.pinned = req.body?.pinned === undefined ? !post.pinned : req.body.pinned === true;
    await post.save();

    res.json({
      ok: true,
      message: post.pinned ? "Pinned to the top." : "Unpinned.",
      post: present(post),
    });
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------
   Delete
   ------------------------------------------------------------------ */
router.delete("/:id", requireFullAdmin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(404).json({ ok: false, error: "That post no longer exists." });
    }
    const gone = await News.findByIdAndDelete(req.params.id);
    if (!gone) return res.status(404).json({ ok: false, error: "That post no longer exists." });

    res.json({ ok: true, message: `"${gone.title}" deleted.` });
  } catch (err) { next(err); }
});

export default router;
