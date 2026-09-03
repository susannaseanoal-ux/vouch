import express from "express";
import mongoose from "mongoose";
import Lead, { LEAD_STATUSES, LEAD_TYPES, typeLabel } from "../models/Lead.js";
import LeadStage from "../models/LeadStage.js";
import { requireAdmin, requireFullAdmin } from "../middleware/auth.js";
import {
  STAGES, buildJourney, stageCatalogue, stageLabel,
  statusAfterStage, humanDuration, formatMoment,
} from "../lib/journey.js";
import { newLeadId, normalizeLeadId } from "../lib/leadId.js";

const router = express.Router();
router.use(requireAdmin);

/* A milestone id off the URL is whatever the caller typed. Handed to
   Mongo as-is, anything that is not an ObjectId throws a cast error and
   the caller gets a 500 for what is really a 404. */
const isObjectId = (v) => mongoose.isValidObjectId(v);

/* A query string value is not necessarily a string: ?status[$ne]=New
   arrives as an object, and an object dropped into a query is an
   operator, not a value. Everything filtered on is checked against the
   list of what it may actually be. */
const oneOf = (value, allowed) =>
  typeof value === "string" && allowed.includes(value) ? value : null;

const present = (lead) => ({
  id: String(lead._id),
  leadId: lead.leadId,
  type: lead.type,
  typeLabel: typeLabel(lead.type),
  firstName: lead.firstName,
  lastName: lead.lastName,
  name: lead.name,
  email: lead.email,
  phone: lead.phone,
  state: lead.state,
  status: lead.status,
  agentNotes: lead.agentNotes,
  fields: Object.fromEntries(lead.fields || []),
  emailSent: lead.emailSent,
  emailError: lead.emailError,
  sourceIp: lead.sourceIp,
  createdAt: lead.createdAt,
  updatedAt: lead.updatedAt,
  createdH: formatMoment(lead.createdAt),
  updatedH: formatMoment(lead.updatedAt),
});

/* ------------------------------------------------------------------
   Stats
   ------------------------------------------------------------------ */
router.get("/stats", async (_req, res, next) => {
  try {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 86400000);

    const [total, isNew, today, week, coverage, interview, mailFailed] = await Promise.all([
      Lead.countDocuments({}),
      Lead.countDocuments({ status: "New" }),
      Lead.countDocuments({ createdAt: { $gte: startOfDay } }),
      Lead.countDocuments({ createdAt: { $gte: weekAgo } }),
      Lead.countDocuments({ type: "coverage" }),
      Lead.countDocuments({ type: "interview" }),
      Lead.countDocuments({ emailSent: false }),
    ]);

    /* How many leads sit at each status, in one round trip rather than
       a query per status. Drives the pipeline on the dashboard. */
    const grouped = await Lead.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
    const byStatus = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0]));
    for (const row of grouped) {
      if (row._id in byStatus) byStatus[row._id] = row.n;
    }

    res.json({
      ok: true,
      stats: { total, new: isNew, today, week, coverage, interview, mailFailed },
      byStatus,
      statuses: LEAD_STATUSES,
      types: LEAD_TYPES,
    });
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------
   Create a lead by hand

   Enquiries arrive by phone and at events, not only through the form.
   Without this an agent has to fill in the public website pretending to
   be the customer, which lands a wrong IP on the record and trips the
   rate limiter after a few.
   ------------------------------------------------------------------ */
router.post("/leads", requireFullAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const type = Object.keys(LEAD_TYPES).includes(b.type) ? b.type : "coverage";

    const fields = {};
    if (b.fields && typeof b.fields === "object") {
      for (const [label, value] of Object.entries(b.fields)) {
        const k = String(label).trim().slice(0, 120);
        const v = String(value ?? "").trim().slice(0, 5000);
        if (k && v) fields[k] = v;
      }
    }

    const full = String(fields["Full Name"] || b.name || "").trim();
    if (!full) {
      return res.status(422).json({ ok: false, error: "A lead needs at least a name." });
    }
    const [firstName, ...rest] = full.split(/\s+/);

    const lead = await Lead.create({
      leadId: await newLeadId(),
      type,
      firstName,
      lastName: rest.join(" "),
      email: String(fields.Email || "").trim(),
      phone: String(fields.Phone || "").trim(),
      state: String(fields.State || "").trim(),
      status: LEAD_STATUSES.includes(b.status) ? b.status : "New",
      agentNotes: String(b.agentNotes || "").trim().slice(0, 5000),
      fields,
      /* Taken by a person, not observed from a connection - so the
         address field says that rather than recording the office IP as
         though the customer had visited. */
      sourceIp: "",
      userAgent: `added by ${req.admin.username}`,
      emailSent: true,
    });

    res.status(201).json({
      ok: true,
      message: `Lead ${lead.leadId} created.`,
      lead: present(lead),
    });
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------
   List
   ------------------------------------------------------------------ */
router.get("/leads", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const per = Math.min(100, Math.max(5, Number(req.query.per) || 25));

    const where = {};
    const status = oneOf(req.query.status, LEAD_STATUSES);
    const type = oneOf(req.query.type, Object.keys(LEAD_TYPES));
    if (status) where.status = status;
    if (type) where.type = type;

    /* Capped before it becomes a pattern: a very long search string
       compiles to a very expensive regex over every lead. */
    const q = String(req.query.q || "").trim().slice(0, 120);
    if (q) {
      // Escaped, so a customer searching for "a+b" cannot inject a regex.
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      where.$or = [
        { leadId: rx }, { firstName: rx }, { lastName: rx }, { email: rx }, { phone: rx },
      ];
    }

    const sortKey = ["createdAt", "updatedAt", "status", "type", "lastName"]
      .includes(req.query.sort) ? req.query.sort : "createdAt";
    const dir = req.query.dir === "asc" ? 1 : -1;

    const [rows, total] = await Promise.all([
      Lead.find(where).sort({ [sortKey]: dir }).skip((page - 1) * per).limit(per),
      Lead.countDocuments(where),
    ]);

    res.json({
      ok: true, page, per, total,
      pages: Math.max(1, Math.ceil(total / per)),
      leads: rows.map(present),
    });
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------
   One lead, with its journey and milestone log
   ------------------------------------------------------------------ */
router.get("/leads/:leadId", async (req, res, next) => {
  try {
    const lead = await Lead.findOne({ leadId: normalizeLeadId(req.params.leadId) });
    if (!lead) return res.status(404).json({ ok: false, error: "That lead no longer exists." });

    const stages = await LeadStage.find({ leadId: lead.leadId })
      .sort({ occurredAt: -1, _id: -1 }).limit(100).lean();

    res.json({
      ok: true,
      lead: present(lead),
      statuses: LEAD_STATUSES,
      journey: await buildJourney(lead),
      stageList: stageCatalogue(lead.type),
      stages: stages.map((s) => ({
        id: String(s._id),
        stage: s.stage,
        label: stageLabel(s.stage),
        occurredAt: s.occurredAt,
        occurredH: formatMoment(s.occurredAt),
        scheduledFor: s.scheduledFor,
        scheduledH: s.scheduledFor ? formatMoment(s.scheduledFor) : "",
        durationSec: s.durationSec ?? null,
        durationH: s.durationSec == null ? "" : humanDuration(s.durationSec),
        note: s.note || "",
        actor: s.actor,
      })),
    });
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------
   Update / delete a lead
   ------------------------------------------------------------------ */
router.patch("/leads/:leadId", requireFullAdmin, async (req, res, next) => {
  try {
    const lead = await Lead.findOne({ leadId: normalizeLeadId(req.params.leadId) });
    if (!lead) return res.status(404).json({ ok: false, error: "That lead no longer exists." });

    const b = req.body || {};
    if (b.status && LEAD_STATUSES.includes(b.status)) lead.status = b.status;
    if (b.type && Object.keys(LEAD_TYPES).includes(b.type)) lead.type = b.type;

    for (const k of ["firstName", "lastName", "email", "phone", "state", "agentNotes"]) {
      if (b[k] !== undefined) lead[k] = String(b[k]);
    }

    /* The address recorded when the form was sent. Editable because a
       lead taken over the phone has no meaningful one, and a proxy can
       record the wrong one - but note that saving here overwrites what
       was actually observed, so it stops being evidence of anything.
       45 characters is the longest an IPv6 address can be. */
    if (b.sourceIp !== undefined) {
      lead.sourceIp = String(b.sourceIp).trim().slice(0, 45);
    }

    /* The submission date is editable — an agent who takes a lead by
       phone needs to record when it really came in. */
    if (b.createdAt) {
      const d = new Date(b.createdAt);
      if (!Number.isNaN(d.getTime()) && d <= new Date()) lead.createdAt = d;
    }

    if (b.fields && typeof b.fields === "object") {
      const clean = {};
      for (const [label, value] of Object.entries(b.fields)) {
        const k = String(label).trim().slice(0, 120);
        if (k) clean[k] = String(value ?? "").slice(0, 5000);
      }
      lead.fields = clean;
    }

    await lead.save();
    res.json({ ok: true, lead: present(lead), journey: await buildJourney(lead) });
  } catch (err) { next(err); }
});

router.delete("/leads/:leadId", requireFullAdmin, async (req, res, next) => {
  try {
    const leadId = normalizeLeadId(req.params.leadId);
    const lead = await Lead.findOne({ leadId });
    if (!lead) return res.status(404).json({ ok: false, error: "That lead no longer exists." });

    await Promise.all([
      Lead.deleteOne({ leadId }),
      LeadStage.deleteMany({ leadId }),     // milestones go with the lead
    ]);

    res.json({ ok: true, message: `Lead ${leadId} deleted.` });
  } catch (err) { next(err); }
});

/* ==================================================================
   MILESTONES — what puts real times on the customer's lookup page
   ================================================================== */

/** Reads occurredAt / occurredTs from a body, with "blank means now". */
function readMoment(body) {
  if (body.occurredTs !== undefined && body.occurredTs !== null && body.occurredTs !== "") {
    const n = Number(body.occurredTs);
    if (!Number.isFinite(n)) return { error: "That date and time could not be read." };
    return { date: new Date(n * 1000) };
  }
  const raw = String(body.occurredAt || "").trim();
  if (!raw) return { date: new Date() };

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { error: "That date and time could not be read." };
  return { date: d };
}

router.post("/leads/:leadId/stages", requireFullAdmin, async (req, res, next) => {
  try {
    const lead = await Lead.findOne({ leadId: normalizeLeadId(req.params.leadId) });
    if (!lead) return res.status(404).json({ ok: false, error: "That lead no longer exists." });

    const b = req.body || {};
    const stage = String(b.stage || "").trim();
    if (!STAGES[stage]) return res.status(422).json({ ok: false, error: "That is not a milestone we track." });

    const moment = readMoment(b);
    if (moment.error) return res.status(422).json({ ok: false, error: moment.error });
    if (moment.date.getTime() > Date.now() + 300000) {
      return res.status(422).json({ ok: false, error: "A milestone cannot be logged in the future." });
    }

    /* Only the stages that can carry a booking or a call length get one. */
    let scheduledFor = null;
    if (STAGES[stage].book && String(b.scheduledFor || "").trim()) {
      const d = new Date(b.scheduledFor);
      if (Number.isNaN(d.getTime())) {
        return res.status(422).json({ ok: false, error: "That callback date could not be read." });
      }
      scheduledFor = d;
    }

    let durationSec = null;
    if (STAGES[stage].call) {
      const total = (Number(b.durationMin) || 0) * 60 + (Number(b.durationSec) || 0);
      if (total > 86400) return res.status(422).json({ ok: false, error: "That call length does not look right." });
      if (total > 0) durationSec = total;
    }

    await LeadStage.create({
      leadId: lead.leadId,
      stage,
      occurredAt: moment.date,
      scheduledFor,
      durationSec,
      note: String(b.note || "").slice(0, 255),
      actor: req.admin.username,
    });

    /* Approving a milestone carries the lead's status forward with it,
       so the dashboard and the customer's journey stay in step. */
    const moved = statusAfterStage(stage, lead.status);
    if (moved) { lead.status = moved; await lead.save(); }

    res.status(201).json({
      ok: true,
      message: `${stageLabel(stage)} logged.` + (moved ? ` Status moved to ${moved}.` : ""),
      status: lead.status,
      journey: await buildJourney(lead),
    });
  } catch (err) { next(err); }
});

/** Correct a milestone already logged — its time, booking, length, note. */
router.patch("/leads/:leadId/stages/:id", requireFullAdmin, async (req, res, next) => {
  try {
    const leadId = normalizeLeadId(req.params.leadId);
    const lead = await Lead.findOne({ leadId });
    if (!lead) return res.status(404).json({ ok: false, error: "That lead no longer exists." });

    if (!isObjectId(req.params.id)) {
      return res.status(404).json({ ok: false, error: "That milestone no longer exists." });
    }

    const row = await LeadStage.findOne({ _id: req.params.id, leadId });
    if (!row) return res.status(404).json({ ok: false, error: "That milestone no longer exists." });

    const b = req.body || {};
    if (!String(b.occurredAt || "").trim() && b.occurredTs === undefined) {
      return res.status(422).json({ ok: false, error: "A milestone needs the time it happened." });
    }

    const moment = readMoment(b);
    if (moment.error) return res.status(422).json({ ok: false, error: moment.error });
    if (moment.date.getTime() > Date.now() + 300000) {
      return res.status(422).json({ ok: false, error: "A milestone cannot be moved into the future." });
    }
    row.occurredAt = moment.date;

    const meta = STAGES[row.stage] || {};
    row.scheduledFor = null;
    if (meta.book && String(b.scheduledFor || "").trim()) {
      const d = new Date(b.scheduledFor);
      if (Number.isNaN(d.getTime())) {
        return res.status(422).json({ ok: false, error: "That callback date could not be read." });
      }
      row.scheduledFor = d;
    }

    row.durationSec = null;
    if (meta.call) {
      const total = (Number(b.durationMin) || 0) * 60 + (Number(b.durationSec) || 0);
      if (total > 86400) return res.status(422).json({ ok: false, error: "That call length does not look right." });
      if (total > 0) row.durationSec = total;
    }

    row.note = String(b.note || "").slice(0, 255);
    await row.save();

    res.json({ ok: true, message: "Milestone updated.", journey: await buildJourney(lead) });
  } catch (err) { next(err); }
});

router.delete("/leads/:leadId/stages/:id", requireFullAdmin, async (req, res, next) => {
  try {
    const leadId = normalizeLeadId(req.params.leadId);
    const lead = await Lead.findOne({ leadId });
    if (!lead) return res.status(404).json({ ok: false, error: "That lead no longer exists." });

    if (!isObjectId(req.params.id)) {
      return res.status(404).json({ ok: false, error: "That milestone no longer exists." });
    }

    const gone = await LeadStage.deleteOne({ _id: req.params.id, leadId });
    if (!gone.deletedCount) return res.status(404).json({ ok: false, error: "That milestone no longer exists." });

    res.json({ ok: true, message: "Milestone removed.", journey: await buildJourney(lead) });
  } catch (err) { next(err); }
});

export default router;
