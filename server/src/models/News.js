import mongoose from "mongoose";

/* ===================================================================
   A news post.

   Public pages read it by `slug`, so the URL says what the article is
   rather than carrying an id. `pinned` lifts a post above the rest
   regardless of its date - for a notice that has to stay at the top
   even once newer things are published.
   =================================================================== */
const newsSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true, maxlength: 200 },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    summary: { type: String, default: "", trim: true, maxlength: 500 },
    body: { type: String, default: "", maxlength: 40000 },

    /* An address, not a file. Nothing is uploaded to this server - see
       the note in routes/adminNews.js. */
    imageUrl: { type: String, default: "", trim: true, maxlength: 600 },

    pinned: { type: Boolean, default: false, index: true },
    published: { type: Boolean, default: true, index: true },

    /* Kept apart from createdAt: an article can be written today and
       dated to when the thing it describes actually happened. */
    publishedAt: { type: Date, default: Date.now, index: true },

    author: { type: String, default: "", maxlength: 64 },
  },
  { timestamps: true }
);

/* The public ordering, in one place so the list and the "more news"
   block can never disagree: pinned first, then newest. */
newsSchema.statics.publicSort = { pinned: -1, publishedAt: -1, _id: -1 };

/* Accent marks, written as escapes so the source stays plain ASCII. */
const COMBINING = new RegExp("[\\u0300-\\u036f]", "g");

/** "Rates are changing in April" -> "rates-are-changing-in-april" */
export function slugify(title) {
  return String(title)
    .toLowerCase()
    .normalize("NFKD").replace(COMBINING, "")   // drop accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";
}

export default mongoose.model("News", newsSchema);
