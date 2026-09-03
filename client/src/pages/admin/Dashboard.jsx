import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Logo from "../../components/Logo.jsx";
import LeadDrawer from "./LeadDrawer.jsx";
import CommandPalette from "./CommandPalette.jsx";
import Pipeline from "./Pipeline.jsx";
import Reveal from "../../components/Reveal.jsx";
import Counter from "../../components/Counter.jsx";
import { Tilt, useTheme } from "../../components/Fx.jsx";
import { api, getToken, setToken } from "../../lib/api.js";
import "../../styles/admin.css";

export default function Dashboard() {
  const nav = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [list, setList] = useState({ leads: [], total: 0, page: 1, pages: 1 });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);

  const [openLead, setOpenLead] = useState(null);
  const [toast, setToast] = useState(null);
  const [byStatus, setByStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(-1);        // keyboard row highlight
  const [, toggleTheme] = useTheme();

  const say = useCallback((text, kind = "good") => {
    setToast({ text, kind });
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* No token means no dashboard — bounce to sign-in before anything loads. */
  useEffect(() => {
    if (!getToken()) { nav("/admin/login", { replace: true }); return; }

    api("/auth/me", { auth: true })
      .then((d) => setAdmin(d.admin))
      .catch(() => nav("/admin/login", { replace: true }));
  }, [nav]);

  const loadStats = useCallback(async () => {
    try {
      const d = await api("/admin/stats", { auth: true });
      setStats(d.stats);
      setStatuses(d.statuses);
      setByStatus(d.byStatus || null);
    } catch (err) { say(err.message, "bad"); }
  }, [say]);

  const loadLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams({ q, status, type, page: String(page), per: "25" });
      const d = await api(`/admin/leads?${params}`, { auth: true });
      setList(d);
      setCursor(-1);
    } catch (err) { say(err.message, "bad"); }
    finally { setLoading(false); }
  }, [q, status, type, page, say]);

  useEffect(() => { if (admin) loadStats(); }, [admin, loadStats]);

  /* Typing in the search box should not fire a request per keystroke. */
  useEffect(() => {
    if (!admin) return;
    const t = setTimeout(loadLeads, 250);
    return () => clearTimeout(t);
  }, [admin, loadLeads]);

  const refresh = useCallback(() => { loadStats(); loadLeads(); }, [loadStats, loadLeads]);

  const signOut = useCallback(() => {
    setToken(null);
    nav("/admin/login", { replace: true });
  }, [nav]);

  const applyFilter = useCallback((patch) => {
    if (patch.status !== undefined) setStatus(patch.status);
    if (patch.type !== undefined) setType(patch.type);
    setPage(1);
  }, []);

  /* Keyboard navigation over the table: j/k or the arrows to move,
     Enter to open, Escape to clear. An agent working a long list should
     never have to reach for the mouse. */
  useEffect(() => {
    if (!admin || openLead) return;

    const onKey = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const rows = list.leads;
      if (!rows.length) return;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(rows.length - 1, c + 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
      } else if (e.key === "Enter" && cursor >= 0) {
        e.preventDefault();
        setOpenLead(rows[cursor].leadId);
      } else if (e.key === "Escape") {
        setCursor(-1);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [admin, openLead, list.leads, cursor]);

  if (!admin) return null;

  const cards = stats ? [
    ["Total leads", stats.total, ""],
    ["New / unworked", stats.new, "is-new"],
    ["Today", stats.today, ""],
    ["Last 7 days", stats.week, ""],
    ["Coverage", stats.coverage, ""],
    ["Interviews", stats.interview, ""],
  ] : [];

  return (
    <>
      <header className="admin-top">
        <div className="wrap admin-top-in">
          <Logo to="/" invert size={34} />
          <div className="admin-who">
            <Link className="btn btn-sm admin-nav-btn" to="/admin/staff">Staff</Link>
            <Link className="btn btn-sm" to="/admin/news"
                  style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "transparent" }}>
              News
            </Link>
            <span className="admin-av">{(admin.displayName || admin.username).charAt(0).toUpperCase()}</span>
            <span>
              {admin.displayName || admin.username}
              {admin.role === "viewer" && <em style={{ opacity: .7 }}> · view only</em>}
            </span>
            <button className="btn btn-sm" onClick={signOut}
                    style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "transparent" }}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="admin-page">
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
                        gap: "1rem", flexWrap: "wrap", marginBottom: "1.4rem" }}>
            <div>
              <h1 style={{ fontSize: "1.6rem" }}>Leads</h1>
              <p className="muted" style={{ fontSize: ".9rem" }}>Everything submitted through the website.</p>
            </div>
            <div style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
              {/* Discoverability: a shortcut nobody knows about does not
                  exist, so the dashboard says it out loud. */}
              <button className="cmdk-cue" onClick={() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
              }}>
                <span>Search</span><kbd>Ctrl</kbd><kbd>K</kbd>
              </button>
              <button className="btn btn-ghost btn-sm" onClick={refresh}>Refresh</button>
            </div>
          </div>

          <dl className="stats">
            {cards.map(([label, value, cls], i) => (
              <Reveal key={label} i={i}>
                <Tilt max={5}>
                  <div className={"stat " + cls}>
                    <dt>{label}</dt>
                    <dd><Counter to={Number(value) || 0} duration={900} /></dd>
                  </div>
                </Tilt>
              </Reveal>
            ))}
          </dl>

          <Pipeline byStatus={byStatus} active={status}
                    onPick={(s) => applyFilter({ status: s })} />

          <section className="panel">
            <div className="toolbar">
              <div className="search">
                <input type="search" placeholder="Search name, email, phone or reference…"
                       value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
              </div>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                      aria-label="Filter by status" style={{ width: "auto" }}>
                <option value="all">All statuses</option>
                {statuses.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}
                      aria-label="Filter by type" style={{ width: "auto" }}>
                <option value="all">All types</option>
                <option value="coverage">Coverage Request</option>
                <option value="interview">Group Interview</option>
              </select>
            </div>

            <div className="table-scroll">
              <table className="leads">
                <thead>
                  <tr>
                    <th>Received</th><th>Lead</th><th>Contact</th><th>Type</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Shimmer rows rather than a spinner: the table keeps
                      its shape, so nothing jumps when the data lands. */}
                  {loading && [...Array(6)].map((_, i) => (
                    <tr key={"sk" + i} className="sk-row" style={{ "--i": i }}>
                      {[7, 14, 16, 8, 7].map((w, j) => (
                        <td key={j}><span className="sk-bar" style={{ width: w + "ch" }} /></td>
                      ))}
                    </tr>
                  ))}

                  {!loading && list.leads.map((l, i) => (
                    <tr key={l.leadId}
                        style={{ "--i": i }}
                        className={"row-in" + (l.leadId === openLead ? " is-open" : "") +
                                   (i === cursor ? " is-cursor" : "")}
                        onClick={() => setOpenLead(l.leadId)}>
                      <td style={{ whiteSpace: "nowrap" }}>{l.createdH}</td>
                      <td>
                        <span className="cell-name">{l.name}</span>
                        <span className="cell-sub">{l.leadId}</span>
                      </td>
                      <td>
                        {l.email}
                        <span className="cell-sub">{l.phone}{l.state ? ` · ${l.state}` : ""}</span>
                      </td>
                      <td><span className="pill">{l.typeLabel}</span></td>
                      <td>
                        <span className={"pill " + (
                          l.status === "Sold" ? "pill-sold"
                          : l.status === "New" ? "pill-new"
                          : ["Closed", "Not Interested"].includes(l.status) ? "pill-closed" : ""
                        )}>{l.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!list.leads.length && (
              <p className="muted" style={{ padding: "2.5rem", textAlign: "center" }}>
                No leads match. Try clearing the filters.
              </p>
            )}

            <div className="pager">
              <span className="muted">
                {list.total} lead{list.total === 1 ? "" : "s"}
              </span>
              <span style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                <button className="btn btn-ghost btn-sm" disabled={list.page <= 1}
                        onClick={() => setPage((p) => p - 1)}>← Previous</button>
                <span className="muted">Page {list.page} of {list.pages}</span>
                <button className="btn btn-ghost btn-sm" disabled={list.page >= list.pages}
                        onClick={() => setPage((p) => p + 1)}>Next →</button>
              </span>
            </div>
          </section>
        </div>
      </div>

      {openLead && (
        <LeadDrawer
          leadId={openLead}
          canEdit={admin.role !== "viewer"}
          onClose={() => setOpenLead(null)}
          onChanged={refresh}
          say={say}
        />
      )}

      <CommandPalette
        leads={list.leads}
        statuses={statuses}
        onOpenLead={setOpenLead}
        onFilter={applyFilter}
        onTheme={toggleTheme}
        onSignOut={signOut}
      />

      {toast && <div className={"toast is-" + toast.kind}>{toast.text}</div>}
    </>
  );
}
