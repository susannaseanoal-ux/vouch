import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";

import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import ScrollProgress from "./components/ScrollProgress.jsx";
import Preloader from "./components/Preloader.jsx";
import Smooth from "./components/Smooth.jsx";
import { Cursor } from "./components/Fx.jsx";

import Home from "./pages/Home.jsx";
import Track from "./pages/Track.jsx";
import News from "./pages/News.jsx";
import NewsArticle from "./pages/NewsArticle.jsx";
import AdminLogin from "./pages/admin/Login.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";
import NewsAdmin from "./pages/admin/NewsAdmin.jsx";
import Staff from "./pages/admin/Staff.jsx";

export default function App() {
  const { pathname, hash } = useLocation();
  const isAdmin = pathname.startsWith("/admin");

  /* A new page starts at the top - unless the link named a section, in
     which case that section is the whole point of the click and must not
     be scrolled away from. Told to Lenis where it is running, so the
     smooth scroller's own position stays in step - jumping the window
     underneath it leaves the two disagreeing. */
  useEffect(() => {
    const toTop = () => {
      if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
      else window.scrollTo(0, 0);
    };

    if (!hash) { toTop(); return; }

    /* The section lives on the page that is only now rendering, so look
       for it once the browser has laid that page out. Two frames: one
       for the paint, one for Lenis to re-measure the new height. */
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        const el = document.getElementById(hash.slice(1));
        if (!el) { toTop(); return; }          // no such section on this page
        if (window.__lenis) window.__lenis.scrollTo(el, { offset: -90 });
        else el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [pathname, hash]);

  /* The tab title should say where you are. */
  useEffect(() => {
    const titles = {
      "/": "Vouch - Coverage you can count on",
      "/track": "Check your request - Vouch",
      "/news": "News - Vouch",
      "/admin": "Leads - Vouch",
      "/admin/news": "News - Vouch admin",
      "/admin/staff": "Staff - Vouch admin",
      "/admin/login": "Agent sign-in - Vouch",
    };
    /* An article sets its own title once it knows what it is called. */
    if (pathname.startsWith("/news/")) return;
    document.title = titles[pathname] || "Vouch";
  }, [pathname]);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>

      {/* Everything position:fixed lives OUT here, above the animated
          wrapper. Anything fixed placed inside an element with a
          transform animation is positioned against that element rather
          than the viewport, and scrolls away with the page. */}
      <Preloader />
      <Cursor />
      <div className="grain" aria-hidden="true" />
      <ScrollProgress />

      <Smooth>
        <div className="app-in">
          {!isAdmin && <Header />}

          <main id="main" key={pathname} className="page-in">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/track" element={<Track />} />
              <Route path="/news" element={<News />} />
              <Route path="/news/:slug" element={<NewsArticle />} />
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/news" element={<NewsAdmin />} />
              <Route path="/admin/staff" element={<Staff />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>

          {!isAdmin && <Footer />}
        </div>
      </Smooth>
    </>
  );
}

function NotFound() {
  return (
    <section className="section">
      <div className="wrap" style={{ textAlign: "center", maxWidth: "34rem" }}>
        <p className="eyebrow" style={{ justifyContent: "center" }}>404</p>
        <h1 style={{ margin: ".8rem 0 .7rem" }}>We can't find that page</h1>
        <p className="lede">The link may be out of date. Try starting from the home page.</p>
        <div className="btn-row" style={{ justifyContent: "center", marginTop: "1.8rem" }}>
          <a className="btn btn-primary" href="/">Back to home</a>
        </div>
      </div>
    </section>
  );
}
