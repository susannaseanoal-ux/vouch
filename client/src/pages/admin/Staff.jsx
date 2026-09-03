import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Logo from "../../components/Logo.jsx";
import { useTheme } from "../../components/Fx.jsx";
import { api, getToken, setToken } from "../../lib/api.js";
import "../../styles/admin.css";

/* ===================================================================
   Staff accounts: who can sign in, and what they may do.

   Every rule shown here is also enforced on the server - the UI only
   avoids offering an action that would be refused. A viewer who edits
   the page in their browser still gets a 403.
   =================================================================== */

const EMPTY = () => ({ username: "", displayName: "", password: "", role: "viewer" });

export default function Staff() {
  const nav = useNavigate();
  useTheme();

  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState({});
  const [youAreOwner, setYouAreOwner] = useState(false);
  const [form, setForm] = useState(EMPTY());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [resetting, setResetting] = useState(null);

  const say = useCallback((text, kind = "good") => {
    setToast({ text, kind });
    setTimeout(() => setToast(null), 3600);
  }, []);

  useEffect(() => {
    if (!getToken()) { nav("/admin/login", { replace: true }); return; }
    api("/auth/me", { auth: true })
      .then((d) => setMe(d.admin))
      .catch(() => nav("/admin/login", { replace: true }));
  }, [nav]);

  const load = useCallback(async () => {
    try {
      const d = await api("/admin/users", { auth: true });
      setUsers(d.users);
      setRoles(d.roles);
      setYouAreOwner(!!d.youAreOwner);
    } catch (err) {
      say(err.message, "bad");
    } finally {
      setLoading(false);
    }
  }, [say]);

  useEffect(() => { if (me && me.role !== "viewer") load(); else if (me) setLoading(false); }, [me, load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api("/admin/users", { method: "POST", body: form, auth: true });
      say(d.message);
      setForm(EMPTY());
      await load();
    } catch (err) {
      say(err.message, "bad");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(u, role) {
    try {
      const d = await api(`/admin/users/${u.id}`, { method: "PATCH", body: { role }, auth: true });
      say(d.message);
      await load();
    } catch (err) { say(err.message, "bad"); }
  }

  async function resetPassword(u) {
    const pw = resetting && resetting.id === u.id ? resetting.value : "";
    if (!pw || pw.length < 10) { say("Use a password of at least 10 characters.", "bad"); return; }
    try {
      await api(`/admin/users/${u.id}`, { method: "PATCH", body: { password: pw }, auth: true });
      say("New password set. Pass it on and ask them to change it.");
      setResetting(null);
      await load();
    } catch (err) { say(err.message, "bad"); }
  }

  /* Removal asks twice in place: the second click on the same row is
     the confirmation. */
  async function remove(u) {
    if (confirming !== u.id) { setConfirming(u.id); return; }
    setConfirming(null);
    try {
      const d = await api(`/admin/users/${u.id}`, { method: "DELETE", auth: true });
      say(d.message);
      await load();
    } catch (err) { say(err.message, "bad"); }
  }

  if (!me) return null;

  const viewerOnly = me.role === "viewer";

  return (
    <>
      <header className="admin-top">
        <div className="wrap admin-top-in">
          <Logo to="/" invert size={34} />
          <div className="admin-who">
            <Link className="btn btn-sm admin-nav-btn" to="/admin">Leads</Link>
            <Link className="btn btn-sm admin-nav-btn" to="/admin/news">News</Link>
            <span className="admin-av">{(me.displayName || me.username).charAt(0).toUpperCase()}</span>
            <span>{me.displayName || me.username}</span>
            <button className="btn btn-sm admin-nav-btn"
                    onClick={() => { setToken(null); nav("/admin/login", { replace: true }); }}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="admin-page">
        <div className="wrap">
          <div style={{ marginBottom: "1.4rem" }}>
            <h1 style={{ fontSize: "1.6rem" }}>Staff accounts</h1>
            <p className="muted" style={{ fontSize: ".9rem" }}>
              Who can sign in to this dashboard, and what they are allowed to do.
            </p>
          </div>

          {viewerOnly ? (
            <div className="msg msg-bad">
              Your account has view-only access, so staff accounts are not yours to manage.
            </div>
          ) : (
            <div className="news-admin">
              <section className="panel news-editor">
                <div className="toolbar">
                  <strong style={{ fontSize: ".95rem" }}>Add someone</strong>
                </div>

                <form onSubmit={create} style={{ padding: "1rem", display: "grid", gap: ".9rem" }}>
                  <div className="field">
                    <label htmlFor="u-name">Username</label>
                    <input id="u-name" type="text" value={form.username} onChange={set("username")}
                           autoComplete="off" spellCheck="false" maxLength={64} placeholder="jane.smith" />
                  </div>

                  <div className="field">
                    <label htmlFor="u-display">
                      Full name <span className="hint">(shown in the header)</span>
                    </label>
                    <input id="u-display" type="text" value={form.displayName} onChange={set("displayName")}
                           maxLength={120} placeholder="Jane Smith" />
                  </div>

                  <div className="field">
                    <label htmlFor="u-pass">
                      Password <span className="hint">(at least 10 characters)</span>
                    </label>
                    <input id="u-pass" type="text" value={form.password} onChange={set("password")}
                           autoComplete="new-password" placeholder="something long" />
                  </div>

                  <div className="field">
                    <label htmlFor="u-role">Access</label>
                    <select id="u-role" value={form.role} onChange={set("role")}>
                      <option value="viewer">Viewer — reads everything, changes nothing</option>
                      {/* Handing out administrator access is the owner's
                          call; the server refuses it from anyone else. */}
                      {youAreOwner && (
                        <option value="admin">Administrator — full access, including staff</option>
                      )}
                    </select>
                  </div>

                  <p className="jrn-hint">
                    The password is shown as you type so you can pass it on. Ask them to change it
                    once they are in.
                  </p>

                  <button className="btn btn-primary" type="submit" disabled={busy}>
                    {busy ? "Creating…" : "Create account"}
                  </button>
                </form>
              </section>

              <section className="panel">
                <div className="toolbar">
                  <strong style={{ fontSize: ".95rem" }}>
                    {users.length} account{users.length === 1 ? "" : "s"}
                  </strong>
                </div>

                {loading && (
                  <p className="muted" style={{ padding: "2rem", textAlign: "center" }}>Loading…</p>
                )}

                <ul className="news-rows">
                  {users.map((u, i) => (
                    <li key={u.id} className="news-row row-in" style={{ "--i": i }}>
                      <div className="news-row-main">
                        <p className="news-row-top">
                          <span className={"pill " + (u.isOwner ? "pill-sold" : u.role === "admin" ? "pill-new" : "")}>
                            {u.isOwner ? "Owner" : roles[u.role] || u.role}
                          </span>
                          {u.id === me.id && <span className="cell-sub">this is you</span>}
                          {u.locked && <span className="pill pill-closed">locked</span>}
                        </p>
                        <span className="cell-name">{u.displayName || u.username}</span>
                        <span className="cell-sub">
                          {u.isOwner && "protected · "}
                          {u.username}
                          {u.lastLogin
                            ? ` · last signed in ${new Date(u.lastLogin).toLocaleDateString()}`
                            : " · never signed in"}
                        </span>

                        {resetting && resetting.id === u.id && (
                          <div className="ip-edit" style={{ marginTop: ".6rem" }}>
                            <label className="field" style={{ flex: "1 1 12rem" }}>
                              <span className="hint">New password</span>
                              <input type="text" value={resetting.value} autoFocus
                                     onChange={(e) => setResetting({ id: u.id, value: e.target.value })} />
                            </label>
                            <button className="btn btn-primary btn-sm" type="button"
                                    onClick={() => resetPassword(u)}>Set</button>
                            <button className="btn btn-ghost btn-sm" type="button"
                                    onClick={() => setResetting(null)}>Cancel</button>
                          </div>
                        )}
                      </div>

                      {/* Nothing is offered against your own account: you
                          cannot demote, lock out or delete yourself. */}
                      {/* Nothing is offered against your own account, and
                          nothing at all against the owner's. */}
                      {u.id !== me.id && !u.isOwner && (u.role !== "admin" || youAreOwner) && (
                        <div className="news-row-acts">
                          <button className="btn btn-ghost btn-sm"
                                  onClick={() => changeRole(u, u.role === "admin" ? "viewer" : "admin")}>
                            {u.role === "admin" ? "Make viewer" : "Make admin"}
                          </button>
                          <button className="btn btn-ghost btn-sm"
                                  onClick={() => setResetting({ id: u.id, value: "" })}>
                            Reset password
                          </button>
                          <button className={"btn btn-sm " + (confirming === u.id ? "btn-danger" : "btn-ghost")}
                                  onClick={() => remove(u)}>
                            {confirming === u.id ? "Really remove?" : "Remove"}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>

      {toast && <div className={"toast is-" + toast.kind}>{toast.text}</div>}
    </>
  );
}
