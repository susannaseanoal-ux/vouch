import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Reveal from "../components/Reveal.jsx";
import { api } from "../lib/api.js";
import { formatDate, NewsImage, PinIcon } from "../components/newsBits.jsx";

export default function News() {
  const [list, setList] = useState({ news: [], total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;                       // a fast second click must not win
    setLoading(true);
    setError("");

    api(`/news?page=${page}&per=9`)
      .then((d) => { if (live) setList(d); })
      .catch((err) => { if (live) setError(err.message); })
      .finally(() => { if (live) setLoading(false); });

    return () => { live = false; };
  }, [page]);

  return (
    <>
      <section className="lookup-hero">
        <div className="wrap">
          <p className="eyebrow" style={{ color: "var(--brand-lift)" }}>News</p>
          <h1>What's new at Vouch</h1>
          <p>
            Rate changes, carrier news and the things worth knowing before you buy cover.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          {loading && (
            <div className="news-grid">
              {[...Array(3)].map((_, i) => (
                <article className="news-card is-skeleton" key={i} style={{ "--i": i }}>
                  <span className="sk-bar" style={{ width: "40%" }} />
                  <span className="sk-bar" style={{ width: "90%", height: "1.4rem" }} />
                  <span className="sk-bar" style={{ width: "100%" }} />
                  <span className="sk-bar" style={{ width: "70%" }} />
                </article>
              ))}
            </div>
          )}

          {!loading && error && <div className="msg msg-bad">{error}</div>}

          {!loading && !error && !list.news.length && (
            <p className="muted" style={{ textAlign: "center", padding: "3rem 0" }}>
              There is no news just yet. Check back soon.
            </p>
          )}

          {!loading && !error && list.news.length > 0 && (
            <div className="news-grid">
              {list.news.map((n, i) => (
                <Reveal key={n.slug} i={i}>
                  <article className={"news-card" + (n.pinned ? " is-pinned" : "")}>
                    <Link to={`/news/${n.slug}`} className="news-hit" aria-label={n.title} />

                    <NewsImage src={n.imageUrl} alt="" />

                    <div className="news-body">
                      <p className="news-meta">
                        {n.pinned && <span className="news-pin"><PinIcon /> Pinned</span>}
                        <time dateTime={n.publishedAt}>{formatDate(n.publishedAt)}</time>
                      </p>
                      <h2>{n.title}</h2>
                      {n.summary && <p className="news-sum">{n.summary}</p>}
                      <span className="news-more">Read more <span className="arrow">→</span></span>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          )}

          {list.pages > 1 && (
            <div className="news-pager">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}>← Newer</button>
              <span className="muted">Page {list.page} of {list.pages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= list.pages}
                      onClick={() => setPage((p) => p + 1)}>Older →</button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
