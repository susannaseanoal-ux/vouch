/* ===================================================================
   A carrier's badge for the "we shop these carriers" strip.

   Where a usable logo file exists it sits inside the tile; where one
   does not, the tile carries the carrier's initials in its brand colour
   instead. Both are the same 30px rounded tile followed by the name, so
   the row reads as one set either way rather than as a mix.

   A logo is a trademark. These files came from each carrier's own public
   site icons; the real artwork comes in the media kit a carrier gives
   you once you are appointed with them, and that is what should end up
   here. Drop a better file into client/public/carriers/ and point the
   carrier's `src` at it - nothing else needs changing.
   =================================================================== */
import { useState } from "react";

export default function CarrierMark({ name, initials, colour, src }) {
  const [failed, setFailed] = useState(false);
  const showLogo = src && !failed;

  return (
    <span className="carrier" title={name}>
      <span
        className={"carrier-tile" + (showLogo ? " has-logo" : "")}
        style={showLogo ? undefined : { "--tile": colour }}
        aria-hidden="true"
      >
        {showLogo ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            /* A missing or broken file falls back to the monogram rather
               than leaving a hole in the row. */
            onError={() => setFailed(true)}
          />
        ) : (
          initials
        )}
      </span>
      <span className="carrier-name">{name}</span>
    </span>
  );
}
