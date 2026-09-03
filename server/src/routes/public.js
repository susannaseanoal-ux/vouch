import express from "express";
import rateLimit from "express-rate-limit";
import Lead, { LEAD_TYPES, typeLabel } from "../models/Lead.js";
import { buildJourney, formatMoment } from "../lib/journey.js";
import { newLeadId, normalizeLeadId } from "../lib/leadId.js";
import { clientIp } from "../lib/clientIp.js";
import { cleanLeadFields } from "../lib/leadFields.js";
import { notifyTeam } from "../lib/mailer.js";

const router = express.Router();

/* Lead IDs are random, but a limiter still stops anyone trying to guess
   their way through the alphabet. */
const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many lookups from this connection. Please wait about 15 minutes." },
});

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many submissions from this connection. Please try again later." },
});

/* ------------------------------------------------------------------
   Submit a lead
   ------------------------------------------------------------------ */
router.post("/leads", submitLimiter, async (req, res, next) => {
  try {
    const { type = "coverage", fields = {}, website = "" } = req.body || {};

    // Honeypot: a real person never fills a hidden field.
    if (String(website).trim() !== "") {
      return res.json({ ok: true, leadId: "VCH-000000" });
    }

    if (!Object.keys(LEAD_TYPES).includes(type)) {
      return res.status(422).json({ ok: false, error: "Unknown request type." });
    }

    const clean = cleanLeadFields(fields);

    const pick = (...names) => {
      for (const n of names) {
        const hit = Object.keys(clean).find((k) => k.toLowerCase() === n.toLowerCase());
        if (hit && clean[hit]) return clean[hit];
      }
      return "";
    };

    const fullName = pick("Full Name", "Name");
    const [firstName = "", ...rest] = fullName.split(/\s+/);
    const email = pick("Email");
    const phone = pick("Phone", "Phone Number");

    if (!email && !phone) {
      return res.status(422).json({
        ok: false,
        error: "Please give us either an email address or a phone number so we can reach you.",
      });
    }

    const lead = await Lead.create({
      leadId: await newLeadId(),
      type,
      firstName,
      lastName: rest.join(" "),
      email,
      phone,
      state: pick("State"),
      fields: clean,
      sourceIp: clientIp(req),
      userAgent: String(req.headers["user-agent"] || "").slice(0, 255),
    });

    /* Email must never cost the customer their submission - the lead is
       already saved, so a failure here is recorded and nothing more. */
    notifyTeam(lead).then(
      (result) => Lead.updateOne(
        { _id: lead._id },
        { emailSent: result.ok, emailError: result.ok ? "" : result.error }
      ).catch(() => {}),
      () => {}
    );

    res.status(201).json({ ok: true, leadId: lead.leadId });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------
   Public lead lookup - one lead, to whoever holds its Lead ID.
   Internal notes and agent names are never included.
   ------------------------------------------------------------------ */
router.get("/track/:id", lookupLimiter, async (req, res, next) => {
  try {
    const leadId = normalizeLeadId(req.params.id);

    if (!/^[A-Z0-9]+-[A-Z0-9]{4,20}$/.test(leadId)) {
      return res.status(422).json({
        ok: false,
        error: "That does not look like a valid Lead ID. It looks like VCH-7K3QP9.",
      });
    }

    const lead = await Lead.findOne({ leadId });
    if (!lead) {
      return res.status(404).json({
        ok: false,
        error: "We could not find a request with that Lead ID. Please check your confirmation email.",
      });
    }

    res.json({
      ok: true,
      lead: {
        leadId: lead.leadId,
        type: lead.type,
        typeLabel: typeLabel(lead.type),
        name: lead.name,
        status: lead.status,
        submitted: formatMoment(lead.createdAt),
        /* Sent so the customer's downloadable copy can show the address
           the request came from. Deliberately NOT rendered anywhere on
           the lookup page itself - the PDF is the only place it appears. */
        sourceIp: lead.sourceIp || "",
        fields: Object.fromEntries(lead.fields || []),
        journey: await buildJourney(lead),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
