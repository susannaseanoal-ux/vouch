import express from "express";
import News from "../models/News.js";

/* ------------------------------------------------------------------
   News, as the public sees it.

   Read-only, and drafts are invisible: `published: true` is part of
   every query rather than something the caller can ask to skip.
   ------------------------------------------------------------------ */
const router = express.Router();

const present = (n) => ({
  slug: n.slug,
  title: n.title,
  summary: n.summary,
  body: n.body,
  imageUrl: n.imageUrl,
  pinned: n.pinned,
  publishedAt: n.publishedAt,
  author: n.author,
});

/** The list. Pinned posts first, then newest. */
router.get("/news", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const per = Math.min(50, Math.max(3, Number(req.query.per) || 12));

    const where = { published: true, publishedAt: { $lte: new Date() } };

    const [rows, total] = await Promise.all([
      News.find(where).sort(News.publicSort).skip((page - 1) * per).limit(per),
      News.countDocuments(where),
    ]);

    res.json({
      ok: true,
      page, per, total,
      pages: Math.max(1, Math.ceil(total / per)),
      /* The list does not need every article's full text - it is the
         single heaviest field and nothing on the page shows it. */
      news: rows.map((n) => ({ ...present(n), body: undefined })),
    });
  } catch (err) { next(err); }
});

/** One article, by slug. */
router.get("/news/:slug", async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").toLowerCase().slice(0, 200);

    const item = await News.findOne({
      slug,
      published: true,
      publishedAt: { $lte: new Date() },
    });

    if (!item) {
      return res.status(404).json({ ok: false, error: "We could not find that article." });
    }

    /* Two or three siblings to carry the reader onwards. */
    const more = await News.find({
      published: true,
      publishedAt: { $lte: new Date() },
      slug: { $ne: slug },
    })
      .sort(News.publicSort)
      .limit(3);

    res.json({
      ok: true,
      article: present(item),
      more: more.map((n) => ({ ...present(n), body: undefined })),
    });
  } catch (err) { next(err); }
});

export default router;
