import { useEffect, useState } from "react";
import { REDUCED } from "./Fx.jsx";
import manifest from "../logo.json";

/* ===================================================================
   The opening.

   The logo's rings draw themselves, hold for a beat, then the curtain
   lifts. It is the one moment on the site that has the reader's whole
   attention, so it is the brand mark and nothing else - no spinner, no
   percentage, no invented loading bar pretending to measure something.

   It is short on purpose. Under two seconds, once per session, and
   skipped entirely for anyone who has asked for less motion or who is
   coming back to a page they already loaded.
   =================================================================== */
export default function Preloader() {
  const [phase, setPhase] = useState(() => {
    if (REDUCED) return "gone";
    try {
      if (sessionStorage.getItem("vouch_seen")) return "gone";
    } catch { /* private mode: just play it */ }
    return "in";
  });

  useEffect(() => {
    if (phase === "gone") return;

    // Nothing behind the curtain should scroll while it is up.
    document.body.style.overflow = "hidden";
    try { sessionStorage.setItem("vouch_seen", "1"); } catch { /* private mode */ }

    const lift = setTimeout(() => setPhase("out"), 1500);
    const done = setTimeout(() => {
      setPhase("gone");
      document.body.style.overflow = "";
    }, 2400);

    return () => {
      clearTimeout(lift);
      clearTimeout(done);
      document.body.style.overflow = "";
    };
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div className={"preload" + (phase === "out" ? " is-out" : "")} aria-hidden="true">
      <div className="preload-mark">
        <svg viewBox="-110 -110 220 220" width="230" height="230" fill="none">
          {/* Each ring is a dashed circle whose dash offset animates from
              fully hidden to fully drawn, so they inscribe themselves
              around the mark. */}
          {[
            { r: 92, w: 11, d: 0 },
            { r: 76, w: 10, d: 0.12 },
          ].map((c, i) => (
            <circle
              key={i}
              r={c.r}
              stroke={i % 2 ? "#1b3fc4" : "#2e7fd4"}
              strokeWidth={c.w}
              strokeLinecap="round"
              style={{ animationDelay: `${c.d}s` }}
              className="preload-ring"
            />
          ))}
        </svg>

        {/* The real logo, at the centre. The plate behind it is the same
            navy the logo file already carries, so the JPEG's own
            background melts into it instead of showing as a square. */}
        {manifest.src && <img className="preload-logo" src={manifest.src} alt="" />}

        <span className="preload-word">VOUCH</span>
      </div>
    </div>
  );
}
