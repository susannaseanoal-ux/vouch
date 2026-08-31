import { useEffect, useRef, useState } from "react";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Reveals its children when they scroll into view.
 *
 * One observer per element, disconnected the moment it fires — the
 * animation is an entrance, not a state, so there is nothing to keep
 * watching afterwards.
 *
 * `i` staggers siblings: give each one an increasing index and they
 * cascade rather than all landing together.
 */
export default function Reveal({
  children,
  as: Tag = "div",
  variant = "",       // "" | "reveal-left" | "reveal-right" | "reveal-scale"
  i = 0,
  className = "",
  ...rest
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(REDUCED);

  useEffect(() => {
    if (REDUCED || shown) return;

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      // Fire a little before the element reaches the bottom edge, so the
      // motion is already finishing by the time it is properly in view.
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <Tag
      ref={ref}
      style={{ "--i": i }}
      className={["reveal", variant, shown ? "is-in" : "", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </Tag>
  );
}
