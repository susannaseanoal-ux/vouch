import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Logo from "../../components/Logo.jsx";
import { useTheme } from "../../components/Fx.jsx";
import { formatDate, PinIcon } from "../../components/newsBits.jsx";
import { api, getToken, setToken } from "../../lib/api.js";
import "../../styles/admin.css";

/* An empty post, and the shape the form works in. `publishedAt` is kept
   as the value an <input type="datetime-local"> wants. */
const localMoment = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
         `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EMPTY = () => ({
  id: null, title: "", summary: "", body: "", imageUrl: "",
  pinned: false, published: true, publishedAt: localMoment(),
});

export default function NewsAdmin() {
  const nav = useNavigate();

  /* Applies the saved (or system) theme. Landing here directly - from a
     bookmark, or the Leads button - would otherwise ignore the choice
     made everywhere else. */
  useTheme();

  const [admin, setAdmin] = useState(null);
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(EMPTY());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirming, setConfirming] = useState(null);   // id awaiting a second click

  const canEdit = admin?.role !== "viewer";
  const editing = form.id !== null;

  const say = useCallback((text, kind = "good") => {
    setToast({ text, kind });
    setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    if (!getToken()) { nav("/admin/login", { replace: true }); return; }
    api("/auth/me", { auth: true })
      .then((d) => setAdmin(d.admin))
      .catch(() => nav("/admin/login", { replace: true }));
  }, [nav]);

  const load = useCallback(async () => {
    try {
      const d = await api("/admin/news", { auth: true });
      setPosts(d.news);
    } catch (err) { say(err.message, "bad"); }
    finally { setLoading(false); }
  }, [say]);

  useEffect(() => { if (admin) load(); }, [admin, load]);

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  function startNew() {
    setForm(EMPTY());
    setConfirming(null);
    document.getElementById("news-title")?.focus();
  }

  function startEdit(p) {
    setForm({
      id: p.id,
      title: p.title,
      summary: p.summary || "",
      body: p.body || "",
      imageUrl: p.imageUrl || "",
      pinned: !!p.pinned,
      published: !!p.published,
      publishedAt: localMoment(new Date(p.publishedAt)),
    });
    setConfirming(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) return say("A post needs a headline.", "bad");

    setBusy(true);
    try {
      const body = {
        title: form.title,
        summary: form.summary,
        body: form.body,
        imageUrl: form.imageUrl,
        pinned: form.pinned,
        published: form.published,
        publishedAt: new Date(form.publishedAt).toISOString(),
      };

      const d = editing
        ? await api(`/admin/news/${form.id}`, { method: "PATCH", body, auth: true })
        : await api("/admin/news", { method: "POST", body, auth: true });

      say(d.message);
      setForm(EMPTY());
      await load();
    } catch (err) {
      say(err.message, "bad");
    } finally {
      setBusy(false);
    }
  }

  async function togglePin(p) {
    try {
      const d = await api(`/admin/news/${p.id}/pin`, {
        method: "PATCH", body: { pinned: !p.pinned }, auth: true,
      });
      say(d.message);
      await load();
    } catch (err) { say(err.message, "bad"); }
  }

  /* Delete asks twice, in place: the second click on the same row is the
     confirmation. Anything else clicked cancels it. */
  async function remove(p) {
    if (confirming !== p.id) { setConfirming(p.id); return; }
    setConfirming(null);
    try {
      const d = await api(`/admin/news/${p.id}`, { method: "DELETE", auth: true });
      say(d.message);
      if (form.id === p.id) setForm(EMPTY());
      await load();
    } catch (err) { say(err.message, "bad"); }
  }

  if (!admin) return null;

  return (
    <>
      <header className="admin-top">
        <div className="wrap admin-top-in">
          <Logo to="/" invert size={34} />
          <div className="admin-who">
            <Link className="btn btn-sm" to="/admin"
                  style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "transparent" }}>
              Leads
            </Link>
            <span className="admin-av">
              {(admin.displayName || admin.username).charAt(0).toUpperCase()}
            </span>
            <span>
              {admin.displayName || admin.username}
              {!canEdit && <em style={{ opacity: .7 }}> · view only</em>}
            </span>
            <button className="btn btn-sm"
                    onClick={() => { setToken(null); nav("/admin/login", { replace: true }); }}
                    style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "transparent" }}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="admin-page">
        <div className="wrap">
          <div style={{ marginBottom: "1.4rem" }}>
            <h1 style={{ fontSize: "1.6rem" }}>News</h1>
            <p className="muted" style={{ fontSize: ".9rem" }}>
              Everything on <Link to="/news">the public news page</Link>. Pinned posts sit at
              the top of it, whatever their date.
            </p>
          </div>

          <div className="news-admin">
            {/* ---------------- the editor ---------------- */}
            <section className="panel news-editor">
              <div className="toolbar" style={{ justifyContent: "space-between" }}>
                <strong style={{ fontSize: ".95rem" }}>
                  {editing ? "Edit post" : "Write a post"}
                </strong>
                {editing && (
                  <button className="btn btn-ghost btn-sm" type="button" onClick={startNew}>
                    Cancel edit
                  </button>
                )}
              </div>

              <form onSubmit={save} style={{ padding: "1rem", display: "grid", gap: ".9rem" }}>
                <div className="field">
                  <label htmlFor="news-title">Headline</label>
                  <input id="news-title" type="text" value={form.title} onChange={set("title")}
                         maxLength={200} disabled={!canEdit} />
                </div>

                <div className="field">
                  <label htmlFor="news-sum">
                    Summary <span className="hint">(shown on the news list)</span>
                  </label>
                  <textarea id="news-sum" rows={2} value={form.summary} onChange={set("summary")}
                            maxLength={500} disabled={!canEdit} />
                </div>

                <div className="field">
                  <label htmlFor="news-body">
                    Article <span className="hint">(leave a blank line between paragraphs)</span>
                  </label>
                  <textarea id="news-body" rows={10} value={form.body} onChange={set("body")}
                            maxLength={40000} disabled={!canEdit} />
                </div>

                <div className="field">
                  <label htmlFor="news-img">
                    Image link <span className="hint">(optional, https://…)</span>
                  </label>
                  <input id="news-img" type="url" value={form.imageUrl} onChange={set("imageUrl")}
                         placeholder="https://example.com/photo.jpg" disabled={!canEdit} />
                </div>

                <div className="field">
                  <label htmlFor="news-when">Date shown</label>
                  <input id="news-when" type="datetime-local" value={form.publishedAt}
                         onChange={set("publishedAt")} disabled={!canEdit} />
                </div>

                <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
                  <label className="news-check">
                    <input type="checkbox" checked={form.pinned} onChange={set("pinned")}
                           disabled={!canEdit} />
                    <span>Pin to the top</span>
                  </label>
                  <label className="news-check">
                    <input type="checkbox" checked={form.published} onChange={set("published")}
                           disabled={!canEdit} />
                    <span>Visible on the website</span>
                  </label>
                </div>

                {!canEdit && (
                  <div className="msg msg-bad">
                    Your account has view-only access, so posting is switched off.
                  </div>
                )}

                <button className="btn btn-primary" type="submit" disabled={busy || !canEdit}>
                  {busy ? "Saving…" : editing ? "Save changes" : "Publish post"}
                </button>
              </form>
            </section>

            {/* ---------------- the list ---------------- */}
            <section className="panel">
              <div className="toolbar" style={{ justifyContent: "space-between" }}>
                <strong style={{ fontSize: ".95rem" }}>
                  {posts.length} post{posts.length === 1 ? "" : "s"}
                </strong>
                {!editing && canEdit && (
                  <button className="btn btn-ghost btn-sm" type="button" onClick={startNew}>
                    Clear form
                  </button>
                )}
              </div>

              {loading && <p className="muted" style={{ padding: "2rem", textAlign: "center" }}>Loading…</p>}

              {!loading && !posts.length && (
                <p className="muted" style={{ padding: "2.5rem", textAlign: "center" }}>
                  Nothing posted yet. Write the first one on the left.
                </p>
              )}

              <ul className="news-rows">
                {posts.map((p, i) => (
                  <li key={p.id} className={"news-row row-in" + (form.id === p.id ? " is-open" : "")}
                      style={{ "--i": i }}>
                    <div className="news-row-main">
                      <p className="news-row-top">
                        {p.pinned && <span className="news-pin"><PinIcon /> Pinned</span>}
                        {!p.published && <span className="pill pill-closed">Hidden</span>}
                        <span className="cell-sub">{formatDate(p.publishedAt)} · {p.author || "—"}</span>
                      </p>
                      <span className="cell-name">{p.title}</span>
                      <span className="cell-sub">/news/{p.slug}</span>
                    </div>

                    <div className="news-row-acts">
                      <button className="btn btn-ghost btn-sm" onClick={() => togglePin(p)}
                              disabled={!canEdit} title={p.pinned ? "Unpin" : "Pin to the top"}>
                        {p.pinned ? "Unpin" : "Pin"}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>
                        Edit
                      </button>
                      <button className={"btn btn-sm " + (confirming === p.id ? "btn-danger" : "btn-ghost")}
                              onClick={() => remove(p)} disabled={!canEdit}>
                        {confirming === p.id ? "Really delete?" : "Delete"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>

      {toast && <div className={"toast is-" + toast.kind}>{toast.text}</div>}
    </>
  );
}
