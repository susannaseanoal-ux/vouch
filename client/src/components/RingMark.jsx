/**
 * The Vouch ring motif, taken straight from the logo: concentric arcs
 * with gaps in them, rotating at different speeds and in alternating
 * directions.
 *
 * This is the piece of the design nobody else has. It is drawn rather
 * than an image, so it scales to any size, recolours with the theme, and
 * costs nothing to load.
 *
 * `spin` = false gives the same mark, still — used where it decorates
 * rather than performs.
 */
export default function RingMark({ size = 420, spin = true, className = "", style }) {
  /* radius, stroke, dash pattern, seconds per turn, direction */
  const rings = [
    { r: 92, w: 13, dash: "150 44", dur: 46, dir: 1, c: "var(--azure)", o: 0.95 },
    { r: 72, w: 12, dash: "104 38", dur: 34, dir: -1, c: "var(--royal)", o: 0.95 },
    { r: 53, w: 10, dash: "70 30", dur: 26, dir: 1, c: "var(--azure)", o: 0.75 },
    { r: 36, w: 8, dash: "44 22", dur: 19, dir: -1, c: "var(--royal)", o: 0.6 },
  ];

  return (
    <svg
      className={"ringmark" + (spin ? " is-spinning" : "") + (className ? " " + className : "")}
      style={style}
      width={size}
      height={size}
      viewBox="-110 -110 220 220"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {rings.map((ring, i) => (
        <circle
          key={i}
          r={ring.r}
          stroke={ring.c}
          strokeWidth={ring.w}
          strokeDasharray={ring.dash}
          strokeLinecap="round"
          opacity={ring.o}
          style={{
            /* Each ring is its own animation, so they drift apart over
               time instead of turning as one rigid object. */
            animationDuration: `${ring.dur}s`,
            animationDirection: ring.dir === 1 ? "normal" : "reverse",
          }}
        />
      ))}
    </svg>
  );
}
