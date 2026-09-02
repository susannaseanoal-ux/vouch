/* ===================================================================
   A carrier in the "we shop these carriers" strip.

   Every mark is rendered as a single-ink silhouette at one height. That
   is deliberate: these ten logos arrive in different shapes, at
   different resolutions, in ten clashing brand colours, and dropping
   them into a row as-is looks like a folder of app icons rather than a
   panel of insurers. Flattening them to one ink is what turns a
   collection of logos into a row that reads as a set - and it is why
   the same treatment is on nearly every "trusted by" strip worth
   copying.

   It also solves the dark theme outright: most of these marks are dark
   ink and would disappear, so the ink follows the theme instead.

   A logo is a trademark. These came from the carriers' own public
   assets; the definitive files are in the media kit each carrier gives
   you once you are appointed.
   =================================================================== */
import { useState } from "react";

export default function CarrierMark({ name, initials, colour, src, wordmark }) {
  const [failed, setFailed] = useState(false);
  const showLogo = src && !failed;

  return (
    <span className="carrier" title={name}>
      {showLogo ? (
        <img
          className={"carrier-logo" + (wordmark ? " is-wordmark" : "")}
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          /* A missing file falls back to the monogram rather than
             leaving a gap in the row. */
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="carrier-tile" style={{ "--tile": colour }} aria-hidden="true">
          {initials}
        </span>
      )}

      {/* A wordmark already says the company name; a square mark does
          not, so that one gets it typeset alongside. */}
      {!wordmark && <span className="carrier-name">{name}</span>}
    </span>
  );
}
