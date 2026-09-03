import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Journey from "../components/Journey.jsx";
import { api } from "../lib/api.js";
import { BRAND, telHref } from "../brand.js";

export default function Track() {
  const [params, setParams] = useSearchParams();
  const [id, setId] = useState(params.get("id") || "");
  const [lead, setLead] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdf, setPdf] = useState("");        // "" | "working" | error text

  /* Fetch the PDF library as soon as there is something to download.
     It is the click that cannot afford to wait: a browser only allows a
     download while it is still handling the click that asked for one,
     so the library has to already be here when that click arrives. */
  useEffect(() => {
    if (!lead) return;
    const t = setTimeout(() => {
      import("../lib/leadPdf.js").then((m) => m.preloadPdf()).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [lead]);

  /* The PDF is built here in the browser from what is already on screen.
     The library it needs is fetched on the first click rather than by
     every visitor to the site. */
  const warmPdf = () => {
    import("../lib/leadPdf.js").then((m) => m.preloadPdf()).catch(() => {});
  };

  async function savePdf() {
    if (!lead) return;
    setPdf("working");
    try {
      const { downloadLeadPdf } = await import("../lib/leadPdf.js");
      await downloadLeadPdf(lead);
      setPdf("");
    } catch (err) {
      console.error("[vouch] pdf failed:", err);
      setPdf("Sorry - that download did not work. Please try again, or ask us for a copy.");
    }
  }

  async function lookup(raw) {
    const value = String(raw || "").trim();
    if (!value) { setError("Please enter your reference number."); return; }

    setBusy(true);
    setError("");
    setLead(null);

    try {
      const data = await api(`/track/${encodeURIComponent(value)}`);
      setLead(data.lead);
      setParams({ id: data.lead.leadId }, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  /* Deep link: /track?id=VCH-7K3QP9 looks it up straight away. */
  useEffect(() => {
    const prefill = params.get("id");
    if (prefill) lookup(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closed = lead && (lead.status === "Closed" || lead.status === "Not Interested");

  return (
    <>
      <section className="lookup-hero">
        <div className="wrap">
          <p className="eyebrow" style={{ color: "var(--brand-lift)" }}>Request lookup</p>
          <h1>Check your request</h1>
          <p>
            Enter the reference number from your confirmation to see what you sent us
            and exactly where it stands.
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: "clamp(3rem,8vw,5rem)" }}>
        <div className="wrap">
          <div className="lookup-card">
            <form className="lookup-form" onSubmit={(e) => { e.preventDefault(); lookup(id); }}>
              <div className="field">
                <label htmlFor="lead-id">Your reference number</label>
                <input
                  id="lead-id" type="text" value={id}
                  onChange={(e) => setId(e.target.value.toUpperCase())}
                  placeholder={`${BRAND.leadPrefix}-7K3QP9`}
                  autoComplete="off" spellCheck="false" maxLength={24}
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? "Looking…" : "Find my request"}
              </button>
            </form>

            <p className="muted" style={{ fontSize: ".84rem", marginTop: ".8rem" }}>
              It looks like <strong>{BRAND.leadPrefix}-7K3QP9</strong> and is on the confirmation
              we showed you. Capitals and the dash are optional.
            </p>

            {error && <div className="msg msg-bad" style={{ marginTop: "1.2rem" }}>{error}</div>}

            {lead && (
              <div className="result">
                <div className="result-head">
                  <div>
                    <p className="eyebrow" style={{ color: "var(--brand-lift)" }}>{lead.typeLabel}</p>
                    <h2>{lead.name}</h2>
                    <p className="rid">{lead.leadId}</p>
                  </div>
                  <div className="result-acts">
                    <span className={
                      "pill " + (lead.status === "Sold" ? "pill-sold" : closed ? "pill-closed" : "pill-new")
                    }>
                      {lead.status}
                    </span>

                    <button className="btn btn-outline btn-sm" type="button"
                            onClick={savePdf} disabled={pdf === "working"}
                            onPointerEnter={warmPdf} onFocus={warmPdf}>
                      <DownloadIcon />
                      {pdf === "working" ? "Preparing…" : "Download PDF"}
                    </button>
                  </div>
                </div>

                {pdf && pdf !== "working" && (
                  <div className="msg msg-bad" style={{ margin: "1rem 1.4rem" }}>{pdf}</div>
                )}

                <div className={"result-body" + (lead.journey?.length ? "" : " no-journey")}>
                  <dl className="rows">
                    <div><dt>Submitted</dt><dd>{lead.submitted}</dd></div>
                    {Object.entries(lead.fields || {}).map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v === "" ? "—" : v.split("\n").map((line, i) => (
                          <span key={i}>{line}<br /></span>
                        ))}</dd>
                      </div>
                    ))}
                  </dl>

                  <Journey journey={lead.journey} status={lead.status} />
                </div>
              </div>
            )}

            <p className="muted" style={{ fontSize: ".86rem", marginTop: "1.5rem", textAlign: "center" }}>
              Can't find your reference? Call <a href={telHref(BRAND.phone)}>{BRAND.phone}</a> or
              email <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a> and we'll look it up.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
       strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3.6v10.6" />
    <path d="m7.8 10.4 4.2 4.2 4.2-4.2" />
    <path d="M4.6 17.4v1.6a1.6 1.6 0 0 0 1.6 1.6h11.6a1.6 1.6 0 0 0 1.6-1.6v-1.6" />
  </svg>
);
