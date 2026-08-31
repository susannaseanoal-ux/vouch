import { useEffect, useRef } from "react";
import { useSmooth } from "./Smooth.jsx";
import { REDUCED } from "./Fx.jsx";

/* ===================================================================
   Depth.

   Elements move at slightly different rates as the page scrolls, which
   is what stops a long page reading as one flat sheet sliding past.

   Written straight to the node's transform rather than through state:
   this updates every frame while scrolling, and re-rendering React at
   60fps to move a background layer would be indefensible.
   =================================================================== */
export function Parallax({ speed = 0.14, as: Tag = "div", className = "", children, ...rest }) {
  const ref = useRef(null);
  const smooth = useSmooth();

  useEffect(() => {
    const el = ref.current;
    if (!el || REDUCED) return;

    /* Driven by its own frame loop reading the shared scroll position,
       rather than by a re-render per scroll event. */
    let raf = 0;
    let last = null;

    const loop = () => {
      const scroll = smooth.scroll;
      if (scroll !== last) {
        last = scroll;
        const r = el.getBoundingClientRect();
        const mid = r.top + scroll + r.height / 2;
        const from = mid - (scroll + window.innerHeight / 2);
        el.style.transform = `translate3d(0, ${(-from * speed).toFixed(2)}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [smooth, speed]);

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  );
}

/* ===================================================================
   A marquee that answers to the scroll.

   Base speed is constant, but scrolling adds to it and skews the strip
   very slightly in the direction of travel - the same trick a camera
   pan has. Scroll up and it runs backwards. It is a small thing that
   people feel without being able to name.
   =================================================================== */
export function VelocityMarquee({ items, baseSpeed = 0.4 }) {
  const track = useRef(null);
  const offset = useRef(0);
  const smooth = useSmooth();

  useEffect(() => {
    const el = track.current;
    if (!el || REDUCED) return;

    let raf = 0;
    let last = performance.now();

    /* A marquee nobody can see does not need to run. Scrolled out of
       view it stops entirely, which is most of the page. */
    let visible = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        last = performance.now();     // do not jump on the frame it resumes
      },
      { rootMargin: "120px" }
    );
    io.observe(el);

    const loop = (now) => {
      const dt = Math.min(48, now - last);
      last = now;

      if (!visible) { raf = requestAnimationFrame(loop); return; }

      const boost = smooth.velocity * 0.55;
      offset.current -= (baseSpeed + boost) * (dt / 16.67);

      // The track holds the list twice, so resetting at the halfway
      // point makes the loop seamless.
      const half = el.scrollWidth / 2;
      if (half > 0) {
        if (offset.current <= -half) offset.current += half;
        if (offset.current > 0) offset.current -= half;
      }

      const skew = Math.max(-6, Math.min(6, smooth.velocity * 0.35));
      el.style.transform = `translate3d(${offset.current.toFixed(2)}px,0,0) skewX(${skew.toFixed(2)}deg)`;

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [baseSpeed, smooth]);

  return (
    <div className="marquee">
      <div className="marquee-track" ref={track}>
        {[...items, ...items].map((item, i) => (
          <span className="marquee-item" key={i}>
            {item}
            <i className="marquee-dot" aria-hidden="true" />
          </span>
        ))}
      </div>
    </div>
  );
}
