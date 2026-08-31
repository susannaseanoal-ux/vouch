import LeadStage from "../models/LeadStage.js";

/* ===================================================================
   THE CUSTOMER JOURNEY

   STAGES is the full catalogue of milestones an agent can log.
       call: true   it is a phone call, so a duration can be logged
       book: true   it books a future moment, so a date can be logged

   PLANS decides which of them the customer is actually shown, chosen by
   the lead's type. Each plan is 7 or 8 rows: a lookup page that prints
   every possible milestone reads like a form, not like progress.
   Anything logged that is not on the plan still appears in the admin's
   milestone list - it just does not clutter the customer's view.
   =================================================================== */
export const STAGES = {
  new: { label: "Request received" },
  contacted: { label: "We contacted you", call: true },
  callback_scheduled: { label: "Callback scheduled", book: true },
  agent_called: { label: "Agent called you back", call: true },
  customer_callback: { label: "You asked us to call back" },
  quotes_explained: { label: "Quotes explained", call: true },
  application_started: { label: "Application started" },
  application_completed: { label: "Application completed" },
  sold: { label: "Policy issued" },
  interview_scheduled: { label: "Interview scheduled", book: true },
  interview_done: { label: "Interview completed", call: true },
  onboarded: { label: "Welcome aboard" },
  closed: { label: "Request closed" },
};

export const PLANS = {
  // 8 rows - a coverage lead carries quotes and an application.
  coverage: [
    "new", "contacted", "callback_scheduled", "agent_called",
    "quotes_explained", "application_started", "application_completed", "sold",
  ],
  // 7 rows - a recruiting lead has no quote or application step.
  interview: [
    "new", "contacted", "callback_scheduled", "agent_called",
    "interview_scheduled", "interview_done", "onboarded",
  ],
};

/* The one milestone that can repeat anywhere in a lead's life rather
   than sitting in a single fixed slot. A callback can be booked early,
   again after quotes, again mid-application - so each one earns its own
   place in the journey, in the order it happened. */
export const INSERTABLE_STAGE = "callback_scheduled";

/* How far along the status alone proves a lead is, for records with no
   milestones logged. Maps a status onto the last plan row it guarantees
   was reached. */
const STATUS_REACHED = {
  New: "new",
  Contacted: "contacted",
  "Appointment Set": "callback_scheduled",
  "Application Started": "application_started",
  Sold: "sold",
};

/* Approving a milestone should move the lead's status with it, so the
   dashboard and the customer's journey never disagree. Closed and Not
   Interested are deliberately absent: ending a lead stays manual. */
const STAGE_SETS_STATUS = {
  contacted: "Contacted",
  callback_scheduled: "Appointment Set",
  interview_scheduled: "Appointment Set",
  agent_called: "Contacted",
  quotes_explained: "Contacted",
  application_started: "Application Started",
  application_completed: "Application Started",
  interview_done: "Application Started",
  sold: "Sold",
  onboarded: "Sold",
};

/* The forward-only run of statuses. A milestone can carry a lead further
   along it, never back: logging a late "we called again" must not drag a
   Sold lead back to Contacted. */
const STATUS_ORDER = ["New", "Contacted", "Appointment Set", "Application Started", "Sold"];

export const planFor = (type) => PLANS[type] || PLANS.coverage;
export const stageLabel = (key) => STAGES[key]?.label || key;

/** The status a lead should hold once `stage` is approved, or null. */
export function statusAfterStage(stage, currentStatus) {
  const target = STAGE_SETS_STATUS[stage];
  if (!target) return null;

  const now = STATUS_ORDER.indexOf(currentStatus);
  const next = STATUS_ORDER.indexOf(target);

  // A lead parked on Closed / Not Interested is off the ladder: leave it.
  if (now === -1 || next === -1) return null;
  return next > now ? target : null;
}

/** "6m 12s" / "1h 04m" - how long a call ran. */
export function humanDuration(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  if (s < 60) return `${s}s`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}m${r ? ` ${r}s` : ""}`;
  }
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Aug 25, 2026 10:02 AM" - the one format the whole app shows. */
export function formatMoment(date) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;

  let h = d.getHours();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ` +
         `${h}:${String(d.getMinutes()).padStart(2, "0")} ${ap}`;
}

/**
 * Builds the rows the customer sees on the lookup page.
 *
 * Every time printed here is a real recorded time. Where a stage is known
 * to have been reached but its moment was never logged, the row is marked
 * done with no time rather than given a plausible-looking one.
 */
export async function buildJourney(lead) {
  const plan = planFor(lead.type);

  let logged = [];
  try {
    logged = await LeadStage.find({ leadId: lead.leadId })
      .sort({ occurredAt: 1, _id: 1 })
      .lean();
  } catch (err) {
    console.error("[vouch] journey read failed:", err.message);
  }

  const byStage = {};
  for (const row of logged) (byStage[row.stage] ||= []).push(row);

  /* Fallback for leads with nothing logged: the submission itself and
     whatever the status proves, and nothing beyond that. The lead
     exists, so row 0 - the request arriving - is always true. */
  let reachedIdx = 0;
  const reachedKey = STATUS_REACHED[lead.status];
  if (reachedKey && plan.includes(reachedKey)) reachedIdx = plan.indexOf(reachedKey);

  const rows = plan.map((key, i) => {
    const hits = byStage[key] || [];

    /* A callback can be booked at any point, so only the first one fills
       the plan's own slot. The rest are threaded in below. */
    const slot = key === INSERTABLE_STAGE ? hits.slice(0, 1) : hits;
    const done = slot.length > 0 || i <= reachedIdx;

    let at = null, duration = null, scheduled = null, ts = null;

    if (slot.length) {
      const latest = slot[slot.length - 1];
      ts = new Date(latest.occurredAt).getTime();
      at = formatMoment(latest.occurredAt);
      if (latest.durationSec != null) duration = humanDuration(latest.durationSec);
      if (latest.scheduledFor) scheduled = formatMoment(latest.scheduledFor);
    } else if (key === "new") {
      ts = new Date(lead.createdAt).getTime();   // the submission time is always real
      at = formatMoment(lead.createdAt);
    }

    return { key, label: stageLabel(key), done, at, duration, scheduled, count: slot.length, ts };
  });

  /* Thread every extra callback into the journey at the point in time it
     actually happened, so the progress bar reads in true order rather
     than collapsing them into one slot. */
  for (const extra of (byStage[INSERTABLE_STAGE] || []).slice(1)) {
    const ts = new Date(extra.occurredAt).getTime();
    const row = {
      key: INSERTABLE_STAGE,
      label: stageLabel(INSERTABLE_STAGE),
      done: true,
      at: formatMoment(extra.occurredAt),
      duration: null,
      scheduled: extra.scheduledFor ? formatMoment(extra.scheduledFor) : null,
      count: 1,
      ts,
      extra: true,                 // not a plan row: removed, not approved
      stageId: String(extra._id),
    };

    let insertAt = 1;
    rows.forEach((r, i) => { if (r.ts != null && r.ts <= ts) insertAt = i + 1; });
    rows.splice(insertAt, 0, row);
  }

  /* The first row that has not happened yet is what the customer is
     waiting on. A closed lead is waiting on nothing. */
  let lastDone = -1;
  rows.forEach((r, i) => { if (r.done) lastDone = i; });

  const stopped = lead.status === "Closed" || lead.status === "Not Interested";
  if (!stopped && lastDone + 1 < rows.length) rows[lastDone + 1].next = true;

  return rows;
}

/** The catalogue as the admin's "log a milestone" form needs it. */
export function stageCatalogue(type) {
  const plan = planFor(type);
  return Object.entries(STAGES).map(([key, meta]) => ({
    key,
    label: meta.label,
    call: !!meta.call,
    book: !!meta.book,
    shown: plan.includes(key),
  }));
}
