import { createContext, useContext, useEffect, useRef } from "react";
import Lenis from "lenis";
import { REDUCED } from "./Fx.jsx";

/* ===================================================================
   Inertial scrolling.

   This is the single biggest reason a site feels expensive rather than
   merely designed: the page carries momentum instead of jumping in
   fixed notches. Everything scroll-driven on the site reads from the
   one instance published here, so nothing runs its own scroll listener
   and they can never disagree by a frame.

   Lenis rather than hand-rolled, deliberately - intercepting the wheel
   yourself is easy to start and very hard to finish. Keyboard paging,
   find-in-page, scrollbar dragging, focus scrolling and touch all have
   to keep working, and that is the part people get wrong.
   =================================================================== */

/* Scroll position, read by anything that animates with the page.

   Deliberately NOT React state. A scroll event fires every frame, and
   putting that through setState re-renders every consumer 60 times a
   second - the marquee alone rebuilt twenty elements per frame, for a
   number its own animation loop could simply have read. So the numbers
   live in one object whose identity never changes: consumers read the
   current values inside their own rAF loops, and React is never involved
   in scrolling at all. */
const ScrollCtx = createContext({ scroll: 0, velocity: 0, progress: 0 });
export const useSmooth = () => useContext(ScrollCtx);

export default function Smooth({ children }) {
  const store = useRef({ scroll: 0, velocity: 0, progress: 0 });
  const lenis = useRef(null);

  useEffect(() => {
    /* Anyone who has asked for less motion gets the browser's own
       scrolling, untouched. Momentum is exactly the kind of thing that
       makes people motion-sick. */
    if (REDUCED) return;

    const l = new Lenis({
      duration: 1.15,
      // A long, soft tail. The curve matters more than the duration.
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Touch devices already have real momentum from the OS; adding
      // ours on top fights the platform and feels wrong.
      syncTouch: false,
    });

    lenis.current = l;
    window.__lenis = l;                       // so anchors can target it

    l.on("scroll", ({ scroll, velocity, progress }) => {
      const s = store.current;
      s.scroll = scroll;
      s.velocity = velocity;
      s.progress = progress;
    });

    let raf = 0;
    const loop = (time) => {
      l.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      l.destroy();
      lenis.current = null;
      delete window.__lenis;
    };
  }, []);

  /* In-page anchors have to be handed to Lenis, or the browser jumps
     the scroll position out from under it and the two fight. */
  useEffect(() => {
    if (REDUCED) return;

    const onClick = (e) => {
      const a = e.target.closest?.('a[href^="#"], a[href^="/#"]');
      if (!a) return;

      const id = a.getAttribute("href").split("#")[1];
      const target = id && document.getElementById(id);
      if (!target) return;

      e.preventDefault();
      lenis.current?.scrollTo(target, { offset: -90, duration: 1.4 });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return <ScrollCtx.Provider value={store.current}>{children}</ScrollCtx.Provider>;
}
