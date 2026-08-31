import { useEffect, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import Logo from "./Logo.jsx";
import { useTheme } from "./Fx.jsx";
import { BRAND, telHref } from "../brand.js";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/#cover", label: "What we cover" },
  { to: "/#how", label: "How it works" },
  { to: "/news", label: "News" },
  { to: "/track", label: "Check my request" },
];

/* The ids the section links point at, in the order they appear down the
   page - "cover", "how". Derived from LINKS so the two can never drift. */
const SECTION_IDS = LINKS.filter((l) => l.to.includes("#")).map((l) => l.to.split("#")[1]);

export default function Header() {
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [section, setSection] = useState("");     // the section being read
  const [theme, toggleTheme] = useTheme();
  const { pathname, hash } = useLocation();

  /* Two things, one listener.

     The header gains a shadow once the page has moved, so it separates
     from the content instead of floating flat over it.

     And the nav says which section the reader is actually in. It has to
     be measured rather than read off the URL: on the home page a click
     on "What we cover" is caught by the smooth scroller and never
     changes the address, and scrolling there by hand should light the
     same link anyway.

     Passive, and it only touches state when the answer changes - React
     drops a set that lands on the value already held. */
  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      setStuck(window.scrollY > 8);

      // Sections belong to the home page; anywhere else, none is current.
      if (pathname !== "/") { setSection(""); return; }

      /* The last section whose top has passed under the header is the one
         being read. Sections carry on being current past their own end,
         so the highlight does not drop back to Home over the FAQ. */
      const line = 130;
      let current = "";
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setSection(current);
    };

    /* Scroll fires more often than the screen refreshes, and each pass
       reads element positions - measuring per event rather than per
       frame is what makes a page feel heavy under the finger. */
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };

    measure();

    /* Arriving from another page, the link named its section but the
       scroll to it is still a frame or two away. Trust the link now, and
       let the measuring above correct it as the page moves. */
    if (pathname === "/" && hash) setSection(hash.slice(1));

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname, hash]);

  return (
    <header className={
      "site-header" + (open ? " is-open" : "") + (stuck ? " is-stuck" : "")
    }>
      <div className="wrap header-in">
        <Logo />

        <nav className="nav" onClick={() => setOpen(false)}>
          {LINKS.map((l) => {
            const id = l.to.includes("#") ? l.to.split("#")[1] : null;

            /* A section link is still a route: as a plain <a> it reloads
               the whole app when you are on another page, and the reload
               lands at the top of the home page instead of the section. */
            return id ? (
              <Link
                key={l.label}
                to={l.to}
                className={section === id ? "is-active" : ""}
              >
                {l.label}
              </Link>
            ) : (
              <NavLink
                key={l.label}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  /* Home is current only above the first section. Without
                     that, it and the section link both light up. */
                  isActive && !(l.to === "/" && section) ? "is-active" : ""
                }
              >
                {l.label}
              </NavLink>
            );
          })}

          {/* On a narrow screen the phone and the quote button leave the
              header bar, so the menu carries them instead of losing them.
              Hidden whenever the bar itself has room. */}
          <span className="nav-extra">
            <a className="btn btn-outline btn-sm" href={telHref(BRAND.phone)}>
              <PhoneIcon /> {BRAND.phone}
            </a>
            <Link className="btn btn-primary btn-sm" to="/#quote">Get a quote</Link>
          </span>
        </nav>

        <div className="header-cta">
          <button
            className="theme-btn"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>

          <a className="btn btn-outline btn-sm" href={telHref(BRAND.phone)}>
            <PhoneIcon /> {BRAND.phone}
          </a>
          <Link className="btn btn-primary btn-sm" to="/#quote">Get a quote</Link>

          <button
            className="nav-toggle"
            type="button"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                 strokeWidth="2.2" strokeLinecap="round">
              {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
         strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.6 3.5h3l1.5 3.8-2 1.4a12.5 12.5 0 0 0 6.2 6.2l1.4-2 3.8 1.5v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z" />
    </svg>
  );
}
