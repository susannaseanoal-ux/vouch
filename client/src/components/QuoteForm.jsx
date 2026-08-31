import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";

const STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
  "Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
  "Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
  "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico",
  "New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania",
  "Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

const EMPTY = {
  "Full Name": "", Phone: "", Email: "", "Date of Birth": "",
  State: "", "Tobacco Use": "", "Coverage Interest": "", "Additional Notes": "",
};

export default function QuoteForm() {
  const [fields, setFields] = useState(EMPTY);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");     // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [leadId, setLeadId] = useState(null);

  const set = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!fields["Full Name"].trim()) return setError("Please tell us your name.");
    if (!fields.Phone.trim() && !fields.Email.trim()) {
      return setError("Please give us either a phone number or an email address.");
    }
    if (!consent) return setError("Please agree to be contacted so an agent can reach you.");

    setBusy(true);
    try {
      const data = await api("/leads", {
        method: "POST",
        body: { type: "coverage", fields, website },
      });
      setLeadId(data.leadId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (leadId) {
    return (
      <div className="success">
        <div className="success-tick" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor"
               strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <h3>Thank you — we've got it</h3>
        <p className="muted">A licensed agent will reach out shortly.</p>

        <div className="success-id">
          <p>Your reference</p>
          <strong>{leadId}</strong>
        </div>

        <p className="muted" style={{ fontSize: ".84rem", margin: "1rem auto 0", maxWidth: "24rem" }}>
          Keep this number — you can check your request with it any time, and we'll ask
          for it when we call.
        </p>

        <div className="btn-row" style={{ justifyContent: "center", marginTop: "1.5rem" }}>
          <Link className="btn btn-primary" to={`/track?id=${encodeURIComponent(leadId)}`}>
            Check my request
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="qf-head">
        <h3>Get your free quote</h3>
        <p className="muted" style={{ fontSize: ".9rem" }}>
          Takes about a minute. No obligation, and we never sell your details.
        </p>
      </div>

      <div className="qf-grid">
        <div className="field span-2">
          <label htmlFor="q-name">Full name</label>
          <input id="q-name" type="text" autoComplete="name"
                 value={fields["Full Name"]} onChange={set("Full Name")} />
        </div>

        <div className="field">
          <label htmlFor="q-phone">Phone</label>
          <input id="q-phone" type="tel" autoComplete="tel"
                 value={fields.Phone} onChange={set("Phone")} />
        </div>

        <div className="field">
          <label htmlFor="q-email">Email</label>
          <input id="q-email" type="email" autoComplete="email"
                 value={fields.Email} onChange={set("Email")} />
        </div>

        <div className="field">
          <label htmlFor="q-dob">Date of birth</label>
          <input id="q-dob" type="date" value={fields["Date of Birth"]} onChange={set("Date of Birth")} />
        </div>

        <div className="field">
          <label htmlFor="q-state">State</label>
          <select id="q-state" value={fields.State} onChange={set("State")}>
            <option value="">Select…</option>
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="q-tobacco">Tobacco use</label>
          <select id="q-tobacco" value={fields["Tobacco Use"]} onChange={set("Tobacco Use")}>
            <option value="">Select…</option>
            <option>No</option>
            <option>Yes</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="q-interest">What's it for?</label>
          <select id="q-interest" value={fields["Coverage Interest"]} onChange={set("Coverage Interest")}>
            <option value="">Select…</option>
            <option>Final expense / burial</option>
            <option>Term life</option>
            <option>Whole life</option>
            <option>Mortgage protection</option>
            <option>Not sure yet</option>
          </select>
        </div>

        <div className="field span-2">
          <label htmlFor="q-notes">
            Anything else? <span className="hint">(optional)</span>
          </label>
          <textarea id="q-notes" rows={3}
                    placeholder="Health conditions, a coverage amount in mind, best time to call…"
                    value={fields["Additional Notes"]} onChange={set("Additional Notes")} />
        </div>
      </div>

      {/* Hidden from people, tempting to bots. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
        <label>Do not fill this in
          <input type="text" tabIndex={-1} autoComplete="off"
                 value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      <label className="qf-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          I agree to be contacted by phone, text or email about life insurance, including by
          automated dialling where permitted. Consent is not a condition of purchase, and I can
          opt out at any time.
        </span>
      </label>

      {error && <div className="msg msg-bad" style={{ marginTop: "1rem" }}>{error}</div>}

      <button className="btn btn-primary btn-lg" type="submit" disabled={busy}
              style={{ width: "100%", marginTop: "1.2rem" }}>
        {busy ? "Sending…" : "Get my free quote"}
      </button>
    </form>
  );
}
