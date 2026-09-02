/* ===================================================================
   A carrier's badge for the "we shop these carriers" strip.

   These are typeset marks - a monogram tile in the carrier's own colour
   next to its name - not the companies' actual logo artwork. A logo is a
   trademark: reproducing the real files needs permission from each
   carrier, and they hand those out in a media kit once you are appointed
   with them.

   To use the real thing later, put the file in client/public/carriers/
   and give that carrier a `src`. The badge swaps automatically, keeps
   the same size and spacing, and falls back to the monogram if the image
   is missing - so a wrong filename degrades quietly rather than leaving
   a hole in the row.
   =================================================================== */
import { useState } from "react";

export default function CarrierMark({ name, initials, colour, src }) {
  const [failed, setFailed] = useState(false);
  const useImage = src && !failed;

  return (
    <span className="carrier" title={name}>
      {useImage ? (
        <img
          className="carrier-logo"
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <span className="carrier-tile" style={{ "--tile": colour }} aria-hidden="true">
            {initials}
          </span>
          <span className="carrier-name">{name}</span>
        </>
      )}
    </span>
  );
}
