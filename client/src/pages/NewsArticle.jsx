import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Reveal from "../components/Reveal.jsx";
import { api } from "../lib/api.js";
import { formatDate, NewsImage, ArticleBody, PinIcon } from "../components/newsBits.jsx";
import { BRAND, telHref } from "../brand.js";

export default function NewsArticle() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    setData(null);

    api(`/news/${encodeURIComponent(slug)}`)
      .then((d) => { if (live) setData(d); })
      .catch((err) => { if (live) setError(err.message); })
      .finally(() => { if (live) setLoading(false); });

    return () => { live = false; };
  }, [slug]);

  /* The tab should name the article, and go back to the site name when
     the reader moves on. */
  useEffect(() => {
    if (data?.article) document.title = `${data.article.title} — ${BRAND.name}`;
    return () => { document.title = BRAND.name; };
  }, [data]);

  if (loading) {
    return (
      <section className="section">
        <div className="wrap" style={{ maxWidth: "46rem" }}>
          <span className="sk-bar" style={{ width: "30%" }} />
          <span className="sk-bar" style={{ width: "85%", height: "2.2rem", margin: ".8rem 0" }} />
          <span className="sk-bar" style={{ width: "100%" }} />
          <span className="sk-bar" style={{ width: "95%" }} />
          <span className="sk-bar" style={{ width: "60%" }} />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="section">
        <div className="wrap" style={{ maxWidth: "34rem", textAlign: "center" }}>
          <p className="eyebrow" style={{ justifyContent: "center" }}>Not found</p>
          <h1 style={{ margin: ".8rem 0 .7rem" }}>{error}</h1>
          <p className="lede">The article may have been taken down, or the link may be out of date.</p>
          <div className="btn-row" style={{ justifyContent: "center", marginTop: "1.8rem" }}>
            <Link className="btn btn-primary" to="/news">All news</Link>
          </div>
        </div>
      </section>
    );
  }

  const { article, more } = data;

  return (
    <>
      <article className="section">
        <div className="wrap" style={{ maxWidth: "46rem" }}>
          <Reveal>
            <Link to="/news" className="news-back">← All news</Link>

            <p className="news-meta" style={{ marginTop: "1.1rem" }}>
              {article.pinned && <span className="news-pin"><PinIcon /> Pinned</span>}
              <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
            </p>

            <h1 className="news-title">{article.title}</h1>
            {article.summary && <p className="lede news-lede">{article.summary}</p>}
          </Reveal>

          <Reveal variant="reveal-scale">
            <NewsImage src={article.imageUrl} alt="" className="is-hero" />
          </Reveal>

          <Reveal>
            <ArticleBody text={article.body} />
          </Reveal>

          <Reveal>
            <div className="news-cta">
              <h2>Thinking about cover?</h2>
              <p>A quote costs nothing and commits you to nothing.</p>
              <div className="btn-row">
                <Link className="btn btn-primary" to="/#quote">
                  Get a free quote <span className="arrow">→</span>
                </Link>
                <a className="btn btn-outline" href={telHref(BRAND.phone)}>{BRAND.phone}</a>
              </div>
            </div>
          </Reveal>
        </div>
      </article>

      {more?.length > 0 && (
        <section className="section section-alt">
          <div className="wrap">
            <Reveal className="section-head is-center">
              <p className="eyebrow">More news</p>
              <h2>Also worth reading</h2>
            </Reveal>

            <div className="news-grid">
              {more.map((n, i) => (
                <Reveal key={n.slug} i={i}>
                  <article className={"news-card" + (n.pinned ? " is-pinned" : "")}>
                    <Link to={`/news/${n.slug}`} className="news-hit" aria-label={n.title} />
                    <NewsImage src={n.imageUrl} alt="" />
                    <div className="news-body">
                      <p className="news-meta">
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
          </div>
        </section>
      )}
    </>
  );
}
