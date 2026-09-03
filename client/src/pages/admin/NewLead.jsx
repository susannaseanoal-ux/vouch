import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { STATES, COVERAGE_INTEREST, BLANK_FIELDS } from "../../lib/leadFields.js";

/* ===================================================================
   Adding a lead by hand.

   Enquiries arrive by phone and at events, not only through the
   website. Taking one used to mean filling in the public form while
   pretending to be the customer, which stamped the office address on
   the record and hit the rate limiter after a few.

   It asks the same questions as the public form, so a phone lead and a
   web lead look identical everywhere afterwards - same fields on the
   customer's own progress page, same PDF.
   =================================================================== */
export default function NewLead({ onClose, onCreated, say }) {
  const [fields, setFields] = useState({ ...BLANK_FIELDS });
  const [type, setType] = useState("coverage");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  /* Same as the lead panel: hold the page still underneath, and take
     the wheel back off Lenis while this is open. */
  useEffect(() => {
    const y = window.scrollY;
    document.body.style.overflow = "hidden";
    window.__lenis?.stop();
    return () => {
      document.body.style.overflow = "";
      window.__lenis?.start();
      window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y);
    };
  }, []);

  const set = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!fields["Full Name"].trim()) { say("A lead needs at least a name.", "bad"); return; }

    setBusy(true);
    try {
      const d = await api("/admin/leads", {
        method: "POST",
        auth: true,
        body: { type, fields, agentNotes: notes },
      });
      say(d.message);
      onCreated(d.lead?.leadId);
    } catch (err) {
      say(err.message, "bad");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="drawer-scrim" data-lenis-prevent onClick={() => !busy && onClose()} />
      <aside className="drawer" aria-label="Add a lead" data-lenis-prevent>
        <div className="dr-head">
          <div>
            <p className="eyebrow">New lead</p>
            <h2>Take an enquiry</h2>
            <p className="dr-id">by phone, or in person</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
        </div>

        <form className="dr-body" onSubmit={submit}>
          <section className="dr-section">
            <h3>Who they are</h3>

            <div className="dr-grid">
              <label className="field span-2">
                <span>Full name</span>
                <input type="text" value={fields["Full Name"]} onChange={set("Full Name")}
                       autoFocus placeholder="Jane Smith" />
              </label>

              <label className="field">
                <span>Phone</span>
                <input type="tel" value={fields.Phone} onChange={set("Phone")}
                       placeholder="(214) 555-0100" />
              </label>

              <label className="field">
                <span>Email</span>
                <input type="email" value={fields.Email} onChange={set("Email")}
                       placeholder="jane@example.com" />
              </label>

              <label className="field">
                <span>Date of birth</span>
                <input type="date" value={fields["Date of Birth"]} onChange={set("Date of Birth")} />
              </label>

              <label className="field">
                <span>State</span>
                <select value={fields.State} onChange={set("State")}>
                  <option value="">Not given</option>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="dr-section">
            <h3>What they want</h3>

            <div className="dr-grid">
              <label className="field">
                <span>Request type</span>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="coverage">Coverage request</option>
                  <option value="interview">Group interview</option>
                </select>
              </label>

              <label className="field">
                <span>Coverage interest</span>
                <select value={fields["Coverage Interest"]} onChange={set("Coverage Interest")}>
                  <option value="">Not given</option>
                  {COVERAGE_INTEREST.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>

              <label className="field">
                <span>Tobacco use</span>
                <select value={fields["Tobacco Use"]} onChange={set("Tobacco Use")}>
                  <option value="">Not given</option>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </label>

              <label className="field span-2">
                <span>Anything else <span className="hint">(the customer sees this on their own page)</span></span>
                <textarea rows={3} value={fields["Additional Notes"]} onChange={set("Additional Notes")} />
              </label>

              <label className="field span-2">
                <span>Agent notes <span className="hint">(internal — the customer never sees this)</span></span>
                <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                          placeholder="Called about their mother's policy. Best after 6pm." />
              </label>
            </div>

            <p className="jrn-hint">
              They get a reference number just like a web enquiry, and can follow it on the
              tracking page. Only the name is required — the rest can be filled in later.
            </p>

            <div style={{ display: "flex", gap: ".6rem", marginTop: "1rem" }}>
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? "Adding…" : "Add lead"}
              </button>
              <button className="btn btn-ghost" type="button" onClick={onClose} disabled={busy}>
                Cancel
              </button>
            </div>
          </section>
        </form>
      </aside>
    </>
  );
}
