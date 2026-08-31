import { useState } from "react";

/* Small pieces shared by the news list, the article page and the admin
   manager, so the three can never present a post differently. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "12 Mar 2026" */
export function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * An article's picture.
 *
 * The address is typed by an admin and could be wrong, or the host could
 * be down. A broken image icon in the middle of a card looks like the
 * site is broken, so a failed load removes the picture instead - the
 * card simply reads as one without art.
 */
export function NewsImage({ src, alt = "", className = "" }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;

  return (
    <div className={"news-img " + className}>
      <img src={src} alt={alt} loading="lazy" decoding="async"
           onError={() => setFailed(true)} />
    </div>
  );
}

/**
 * An article body, as paragraphs.
 *
 * Deliberately rendered as text, never as HTML. A post is written in the
 * admin panel, and if that text were injected as markup then anyone who
 * ever got into the dashboard could run a script on every reader's
 * browser. Blank lines separate paragraphs; that is the whole format.
 */
export function ArticleBody({ text }) {
  const paragraphs = String(text || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (!paragraphs.length) return null;

  return (
    <div className="news-prose">
      {paragraphs.map((p, i) => (
        <p key={i}>
          {/* A single newline inside a paragraph stays a line break. */}
          {p.split("\n").map((line, j, all) => (
            <span key={j}>{line}{j < all.length - 1 && <br />}</span>
          ))}
        </p>
      ))}
    </div>
  );
}

export const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
       strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 3.6h6l-.8 5.2 3.1 3.1H6.7l3.1-3.1z" />
    <path d="M12 11.9V20.4" />
  </svg>
);
