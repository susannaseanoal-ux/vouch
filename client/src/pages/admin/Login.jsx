import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/Logo.jsx";
import { api, setToken } from "../../lib/api.js";

export default function AdminLogin() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api("/auth/login", { method: "POST", body: { username, password } });
      setToken(data.token);
      nav("/admin", { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.4rem" }}>
          <Logo to={null} size={46} />
        </div>

        <h1 style={{ fontSize: "1.3rem", textAlign: "center", marginBottom: ".3rem" }}>
          Agent sign-in
        </h1>
        <p className="muted" style={{ textAlign: "center", fontSize: ".88rem", marginBottom: "1.5rem" }}>
          For staff only.
        </p>

        <div className="field" style={{ marginBottom: ".9rem" }}>
          <label htmlFor="u">Username</label>
          <input id="u" type="text" autoComplete="username" autoFocus
                 value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="p">Password</label>
          <div style={{ position: "relative" }}>
            <input id="p" type={show ? "text" : "password"} autoComplete="current-password"
                   value={password} onChange={(e) => setPassword(e.target.value)}
                   style={{ paddingRight: "4rem" }} />
            <button type="button" onClick={() => setShow((v) => !v)}
                    style={{
                      position: "absolute", right: ".55rem", top: "50%", transform: "translateY(-50%)",
                      background: "none", border: 0, cursor: "pointer", fontSize: ".8rem",
                      fontWeight: 700, color: "var(--brand-lift)",
                    }}>
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && <div className="msg msg-bad" style={{ marginTop: "1rem" }}>{error}</div>}

        <button className="btn btn-primary btn-lg" type="submit" disabled={busy}
                style={{ width: "100%", marginTop: "1.3rem" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
