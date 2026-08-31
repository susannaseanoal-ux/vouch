import { useEffect, useRef, useState } from "react";

export const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ===================================================================
   Cursor

   A ring that trails the pointer, echoing the logo. It lags the real
   cursor by a fraction because a ring that tracks perfectly reads as a
   rendering bug, whereas one that eases behind reads as deliberate.

   Position is written to the DOM node inside a rAF loop rather than
   through React state - a pointer moves hundreds of times a second and
   re-rendering at that rate to move a circle would be indefensible.
   =================================================================== */
export function Cursor() {
  const dot = useRef(null);
  const ring = useRef(null);

  useEffect(() => {
    // Pointerless devices have nothing to follow.
    if (REDUCED || !window.matchMedia("(pointer: fine)").matches) return;

    document.body.classList.add("has-cursor");

    const target = { x: innerWidth / 2, y: innerHeight / 2 };
    const eased = { ...target };
    let raf = 0;

    const onMove = (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (dot.current) {
        dot.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
    };

    /* Grows over anything clickable, so the cursor itself tells you what
       is interactive before you press it. */
    const onOver = (e) => {
      const hit = e.target.closest?.("a, button, input, select, textarea, [role='button']");
      ring.current?.classList.toggle("is-hot", !!hit);
    };

    const loop = () => {
      eased.x += (target.x - eased.x) * 0.16;
      eased.y += (target.y - eased.y) * 0.16;
      if (ring.current) {
        ring.current.style.transform = `translate3d(${eased.x}px, ${eased.y}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    loop();

    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerover", onOver, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerover", onOver);
      document.body.classList.remove("has-cursor");
    };
  }, []);

  if (REDUCED) return null;
  return (
    <>
      <div className="cur-dot" ref={dot} aria-hidden="true" />
      <div className="cur-ring" ref={ring} aria-hidden="true" />
    </>
  );
}

/* ===================================================================
   SplitText - a headline that assembles itself

   Each word is wrapped so it can rise independently, and each is given
   its own delay. Words rather than letters: letter-by-letter looks
   impressive on a three-word logo and unreadable on a sentence.

   The full text stays in the DOM as one accessible string, so a screen
   reader hears a sentence, not a pile of fragments.
   =================================================================== */
export function SplitText({ text, as: Tag = "span", delay = 0, className = "" }) {
  if (REDUCED) return <Tag className={className}>{text}</Tag>;

  const words = String(text).split(" ");

  return (
    <Tag className={"split " + className} aria-label={text}>
      {words.map((w, i) => (
        <span className="split-w" key={i} aria-hidden="true">
          <span className="split-i" style={{ animationDelay: `${delay + i * 55}ms` }}>
            {w}
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </Tag>
  );
}

/* ===================================================================
   Tilt - a card that leans towards the pointer

   Small angles on purpose. Past about 8 degrees it stops looking like a
   physical object catching the light and starts looking like a gimmick.
   Combined with the spotlight, the highlight tracks the same point the
   card is leaning towards, which is what sells it as one effect.
   =================================================================== */
export function Tilt({ as: Tag = "div", className = "", max = 7, children, ...rest }) {
  const ref = useRef(null);
  const raf = useRef(0);

  function onMove(e) {
    const el = ref.current;
    if (!el || REDUCED || e.pointerType === "touch") return;

    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;

      el.style.setProperty("--rx", `${(0.5 - py) * max * 2}deg`);
      el.style.setProperty("--ry", `${(px - 0.5) * max * 2}deg`);
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <Tag
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={["tilt", className].filter(Boolean).join(" ")}
      {...rest}
    >
      <span className="tilt-in">{children}</span>
    </Tag>
  );
}

/* ===================================================================
   Magnetic - a button that leans towards the pointer as it approaches
   =================================================================== */
export function Magnetic({ children, strength = 0.32, className = "", ...rest }) {
  const ref = useRef(null);

  function onMove(e) {
    const el = ref.current;
    if (!el || REDUCED || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
  }

  function onLeave() {
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={["magnetic", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </span>
  );
}

/* ===================================================================
   useScrollProgress - 0..1 for how far an element has crossed the
   viewport. The basis for anything scroll-driven.
   =================================================================== */
export function useScrollProgress(ref) {
  const [p, setP] = useState(0);

  useEffect(() => {
    if (REDUCED) return;
    let raf = 0;

    const measure = () => {
      const el = ref.current;
      raf = 0;
      if (!el) return;

      const r = el.getBoundingClientRect();
      const total = r.height + innerHeight;
      const seen = innerHeight - r.top;
      setP(Math.max(0, Math.min(1, seen / total)));
    };

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };

    measure();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref]);

  return p;
}

/* Theme switch. Remembered per browser, and it starts from the system
   preference the first time rather than assuming. */
export function useTheme() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    let saved = null;
    try { saved = localStorage.getItem("vouch_theme"); } catch { /* private mode */ }

    const system = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    const initial = saved || system;

    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  const toggle = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("vouch_theme", next); } catch { /* private mode */ }
      return next;
    });
  };

  return [theme, toggle];
}
