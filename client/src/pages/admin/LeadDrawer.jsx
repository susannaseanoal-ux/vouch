import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api.js";

/** A datetime-local input wants "YYYY-MM-DDTHH:MM", in local time. */
function dtLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function LeadDrawer({ leadId, canEdit, onClose, onChanged, say }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");
  const [ip, setIp] = useState("");
  const [ipDirty, setIpDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api(`/admin/leads/${encodeURIComponent(leadId)}`, { auth: true }));
    } catch (err) {
      say(err.message, "bad");
      onClose();
    }
  }, [leadId, say, onClose]);

  useEffect(() => { load(); }, [load]);

  /* The field follows whatever the server last confirmed, so a save (or
     opening a different lead) leaves nothing stale in the box. */
  useEffect(() => {
    if (data?.lead) { setIp(data.lead.sourceIp || ""); setIpDirty(false); }
  }, [data]);

  // Escape closes the drawer, as it does everywhere else.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function act(label, fn) {
    setBusy(label);
    try {
      const res = await fn();
      if (res?.message) say(res.message, "good");
      await load();
      onChanged();
    } catch (err) {
      say(err.message, "bad");
    } finally {
      setBusy("");
    }
  }

  const post = (body) =>
    api(`/admin/leads/${encodeURIComponent(leadId)}/stages`, { method: "POST", body, auth: true });

  /* One-click approval: stamps the milestone at the moment it is pressed
     and carries the lead's status forward with it. */
  const approve = (stage) => act("approve:" + stage, () => post({ stage }));

  /* A callback can go anywhere in the journey. It lands now, then its
     timestamp is edited below to move it to the right point. */
  const addCallback = () =>
    act("callback", async () => {
      const r = await post({ stage: "callback_scheduled" });
      return { ...r, message: "Callback added — set its time below to place it." };
    });

  const removeStage = (id) =>
    act("del:" + id, () =>
      api(`/admin/leads/${encodeURIComponent(leadId)}/stages/${id}`, { method: "DELETE", auth: true }));

  const saveIp = () =>
    act("ip", async () => {
      const r = await api(`/admin/leads/${encodeURIComponent(leadId)}`, {
        method: "PATCH", auth: true, body: { sourceIp: ip },
      });
      return { ...r, message: ip.trim() ? "IP address saved." : "IP address cleared." };
    });

  if (!data) return null;

  const { lead, journey, stages, stageList } = data;
  const caps = Object.fromEntries(stageList.map((s) => [s.key, s]));

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" aria-label="Lead details">
        <div className="dr-head">
          <div>
            <p className="eyebrow">{lead.typeLabel}</p>
            <h2>{lead.name}</h2>
            <p className="dr-id">{lead.leadId}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>

        <div className="dr-body">
          {/* ---- the journey ---- */}
          <section className="dr-section">
            <h3>Customer journey <span className="soft">this is what the lookup page shows</span></h3>

            <ol className="jrn">
              {journey.map((s, i) => (
                <li key={`${s.key}-${i}`}
                    className={"jrn-step" + (s.done ? " is-done" : "") +
                               (s.next ? " is-next" : "") + (s.extra ? " is-extra" : "")}>
                  <span className="jrn-dot" />
                  <span className="jrn-body">
                    <span className="jrn-label">{s.label}</span>
                    <span className="jrn-meta">
                      {[
                        s.at,
                        s.duration && `call ${s.duration}`,
                        s.scheduled && `booked ${s.scheduled}`,
                        s.count > 1 && `${s.count}×`,
                        s.done && !s.at && !s.scheduled && "time not recorded",
                      ].filter(Boolean).join(" · ")}
                    </span>
                  </span>

                  {canEdit && s.extra && (
                    <button className="jrn-btn is-quiet" disabled={busy === "del:" + s.stageId}
                            onClick={() => removeStage(s.stageId)}>Remove</button>
                  )}
                  {canEdit && !s.extra && !s.done && (
                    <button className={"jrn-btn" + (s.next ? " is-primary" : "")}
                            disabled={busy === "approve:" + s.key}
                            onClick={() => approve(s.key)}>
                      {s.next ? "Approve" : "Approve early"}
                    </button>
                  )}
                  {canEdit && !s.extra && s.done && (
                    <button className="jrn-btn is-quiet" disabled={busy === "approve:" + s.key}
                            onClick={() => approve(s.key)} title="Log this step again">+ again</button>
                  )}
                </li>
              ))}
            </ol>

            {canEdit && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={addCallback} disabled={busy === "callback"}>
                  {busy === "callback" ? "Adding…" : "+ Add callback"}
                </button>
                <p className="jrn-hint">
                  A callback can go anywhere in the journey — add it, then set its time on the
                  milestone below and it moves to that point.
                </p>
              </>
            )}
          </section>

          {/* ---- milestone log ---- */}
          <section className="dr-section">
            <h3>Milestones logged</h3>
            {stages.length === 0 && <p className="muted">Nothing logged yet.</p>}
            {stages.map((s) => (
              <StageRow key={s.id} stage={s} cap={caps[s.stage] || {}} canEdit={canEdit}
                        leadId={leadId} onSaved={() => { load(); onChanged(); }}
                        onRemove={() => removeStage(s.id)} say={say} />
            ))}
          </section>

          {/* ---- details ---- */}
          <section className="dr-section">
            <h3>What the customer submitted</h3>
            <dl className="rows" style={{ border: "1px solid var(--line)", borderRadius: "var(--r-sm)" }}>
              <div><dt>Submitted</dt><dd>{lead.createdH}</dd></div>
              <div><dt>Status</dt><dd>{lead.status}</dd></div>
              {Object.entries(lead.fields || {}).map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v || "—"}</dd></div>
              ))}
            </dl>
          </section>

          {/* ---- where it came from ---- */}
          <section className="dr-section">
            <h3>Origin <span className="soft">recorded when the form was sent</span></h3>

            {canEdit ? (
              <div className="ip-edit">
                <label className="field" htmlFor="lead-ip">
                  <span>IP address</span>
                  <input
                    id="lead-ip"
                    type="text"
                    value={ip}
                    onChange={(e) => { setIp(e.target.value); setIpDirty(true); }}
                    placeholder="not recorded"
                    spellCheck="false"
                    maxLength={45}
                  />
                </label>
                <button className="btn btn-ghost btn-sm" type="button"
                        disabled={!ipDirty || busy === "ip"} onClick={saveIp}>
                  {busy === "ip" ? "Saving…" : "Save"}
                </button>
              </div>
            ) : (
              <dl className="rows" style={{ border: "1px solid var(--line)", borderRadius: "var(--r-sm)" }}>
                <div><dt>IP address</dt><dd>{lead.sourceIp || "—"}</dd></div>
              </dl>
            )}

            <p className="jrn-hint">
              Captured automatically from the visitor's connection. Editing it replaces what was
              actually observed, so change it only to correct a lead taken by phone or one
              recorded through a proxy. The customer never sees this.
            </p>
          </section>
        </div>
      </aside>
    </>
  );
}

/* One editable milestone. A time typed in a hurry is the thing most
   likely to need correcting, and it is the customer who sees it. */
function StageRow({ stage, cap, canEdit, leadId, onSaved, onRemove, say }) {
  const [occurred, setOccurred] = useState(dtLocal(stage.occurredAt));
  const [booked, setBooked] = useState(dtLocal(stage.scheduledFor));
  const [min, setMin] = useState(stage.durationSec == null ? "" : Math.floor(stage.durationSec / 60));
  const [sec, setSec] = useState(stage.durationSec == null ? "" : stage.durationSec % 60);
  const [note, setNote] = useState(stage.note || "");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  const touch = (setter) => (e) => { setter(e.target.value); setDirty(true); };

  async function save() {
    setBusy(true);
    try {
      await api(`/admin/leads/${encodeURIComponent(leadId)}/stages/${stage.id}`, {
        method: "PATCH",
        auth: true,
        body: {
          occurredAt: occurred,
          scheduledFor: cap.book ? booked : "",
          durationMin: cap.call ? Number(min) || 0 : 0,
          durationSec: cap.call ? Number(sec) || 0 : 0,
          note,
        },
      });
      say("Milestone updated.", "good");
      setDirty(false);
      onSaved();
    } catch (err) {
      say(err.message, "bad");
    } finally {
      setBusy(false);
    }
  }

  if (!canEdit) {
    return (
      <div className="stage-row">
        <div className="stage-main">
          <div className="stage-top">
            <b>{stage.label}</b>
            <span className="stage-when">
              {[stage.occurredH, stage.durationH && `lasted ${stage.durationH}`,
                stage.scheduledH && `booked for ${stage.scheduledH}`]
                .filter(Boolean).join(" · ")} · {stage.actor}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stage-row">
      <div className="stage-main">
        <div className="stage-top">
          <b>{stage.label}</b>
          <span className="stage-when">logged by {stage.actor}</span>
        </div>

        <div className="stage-edit">
          <label>
            <span>Happened</span>
            <input type="datetime-local" value={occurred} onChange={touch(setOccurred)} />
          </label>

          {cap.call && (
            <label>
              <span>Call length</span>
              <span className="dur-in">
                <input type="number" min="0" max="1440" placeholder="0"
                       value={min} onChange={touch(setMin)} aria-label="Minutes" /><span>m</span>
                <input type="number" min="0" max="59" placeholder="0"
                       value={sec} onChange={touch(setSec)} aria-label="Seconds" /><span>s</span>
              </span>
            </label>
          )}

          {cap.book && (
            <label>
              <span>Booked for</span>
              <input type="datetime-local" value={booked} onChange={touch(setBooked)} />
            </label>
          )}

          <label className="note-in">
            <span>Internal note</span>
            <input type="text" maxLength={255} value={note} onChange={touch(setNote)} />
          </label>
        </div>
      </div>

      <div className="stage-acts">
        <button className="btn btn-ghost btn-sm" disabled={!dirty || busy} onClick={save}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button className="row-del" onClick={onRemove} title="Remove this milestone"
                aria-label="Remove this milestone">✕</button>
      </div>
    </div>
  );
}
