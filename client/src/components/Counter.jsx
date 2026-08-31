import { useEffect, useRef, useState } from "react";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * A number that counts up the first time it is scrolled into view.
 *
 * Eased rather than linear, so it decelerates into the final value
 * instead of stopping dead. Anyone who has asked for less motion just
 * gets the number.
 */
export default function Counter({ to, prefix = "", suffix = "", duration = 1400 }) {
  const ref = useRef(null);
  const [value, setValue] = useState(REDUCED ? to : 0);
  const started = useRef(REDUCED);

  useEffect(() => {
    if (started.current) return;

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started.current) return;
      started.current = true;
      io.disconnect();

      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);       // ease-out cubic
        setValue(Math.round(to * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });

    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref} className="counter">
      {prefix}{value.toLocaleString()}{suffix}
    </span>
  );
}
