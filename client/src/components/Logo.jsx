import { Link } from "react-router-dom";
import { BRAND } from "../brand.js";
import manifest from "../logo.json";

/**
 * The brand mark.
 *
 * The logo file currently supplied is a JPEG, which cannot carry
 * transparency — it arrives with its own navy background attached. So
 * rather than pasting a navy square onto a white header, the image is
 * clipped to a circle: the mark itself is circular, so the plate reads
 * as a deliberate badge instead of a mistake.
 *
 * Supply a transparent PNG or an SVG and `transparent` flips to true,
 * dropping the badge and sitting the mark straight on the page. Nothing
 * else needs changing.
 */
export default function Logo({ to = "/", showName = true, invert = false, size = 40 }) {
  const src = manifest.src;
  const badge = src && !manifest.transparent;

  const mark = src ? (
    <span
      className={"logo-mark" + (badge ? " is-badge" : "")}
      style={{ width: size, height: size }}
    >
      <img src={src} alt="" width={size} height={size} />
    </span>
  ) : (
    /* No logo file yet — a lettermark keeps the header from collapsing. */
    <span className="logo-mark is-fallback" style={{ width: size, height: size }} aria-hidden="true">
      {BRAND.name.charAt(0)}
    </span>
  );

  const inner = (
    <>
      {mark}
      {showName && (
        <span className="logo-text">
          {BRAND.name}
          <small>{BRAND.tagline}</small>
        </span>
      )}
    </>
  );

  const className = "logo" + (invert ? " is-invert" : "");

  return to ? (
    <Link className={className} to={to} aria-label={`${BRAND.name} — home`}>{inner}</Link>
  ) : (
    <span className={className}>{inner}</span>
  );
}
