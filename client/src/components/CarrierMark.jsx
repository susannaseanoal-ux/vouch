/* ===================================================================
   A carrier's badge for the "we shop these carriers" strip.

   Carriers publish their marks in two shapes and both have to sit in the
   same row without one dwarfing the other:

   - a wordmark (Aetna, Prudential, Foresters, Americo) already contains
     the company name, so it is shown on its own at a fixed height;
   - a square mark (Transamerica, SBLI and the rest) is shown in a tile
     with the name typeset beside it.

   Either way the pill is the same height, so the row reads as one set.
   Wordmarks sit on white because most are dark ink that would vanish
   against the dark theme.

   A logo is a trademark. These came from the carriers' own public assets;
   the definitive versions are in the media kit each carrier gives you
   once you are appointed. Replace a file in client/public/carriers/ and
   nothing else needs to change.
   =================================================================== */
import { useState } from "react";

export default function CarrierMark({ name, initials, colour, src, wordmark }) {
  const [failed, setFailed] = useState(false);
  const showLogo = src && !failed;

  /* A file that fails to load falls back to the monogram rather than
     leaving a gap in the row. */
  const onError = () => setFailed(true);

  if (showLogo && wordmark) {
    return (
      <span className="carrier is-wordmark" title={name}>
        <img className="carrier-wordmark" src={src} alt={name}
             loading="lazy" decoding="async" onError={onError} />
      </span>
    );
  }

  return (
    <span className="carrier" title={name}>
      <span
        className={"carrier-tile" + (showLogo ? " has-logo" : "")}
        style={showLogo ? undefined : { "--tile": colour }}
        aria-hidden="true"
      >
        {showLogo
          ? <img src={src} alt="" loading="lazy" decoding="async" onError={onError} />
          : initials}
      </span>
      <span className="carrier-name">{name}</span>
    </span>
  );
}
