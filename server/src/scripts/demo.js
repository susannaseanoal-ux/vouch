/* ===================================================================
   DEMO MODE — the dashboard with no database to set up.

   Starts a MongoDB that lives inside this Node process, fills it with an
   admin account and a spread of sample leads, then boots the normal API
   against it. Nothing touches your real MONGODB_URI, and everything is
   thrown away when you stop the process.

   For looking at the app only. Real leads need a real database.
   =================================================================== */
import "dotenv/config";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const USER = "admin";
const PASS = "demo123456";

/* Set before anything reads it — index.js loads dotenv, and dotenv
   leaves a variable that is already set alone, so this wins over the
   empty MONGODB_URI in .env. */
console.log("[demo] starting a throwaway MongoDB (first run downloads it)…");
const mongod = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongod.getUri("vouch-demo");

/* Imported only now: the models must not be loaded before the URI is in
   place, or mongoose buffers against the wrong connection. */
const { default: AdminUser } = await import("../models/AdminUser.js");
const { default: Lead } = await import("../models/Lead.js");
const { default: LeadStage } = await import("../models/LeadStage.js");
const { default: News, slugify } = await import("../models/News.js");

await mongoose.connect(process.env.MONGODB_URI);

/* ---- the sign-in ---------------------------------------------------- */
const admin = new AdminUser({ username: USER, displayName: "Demo Agent", role: "admin" });
await admin.setPassword(PASS);
await admin.save();

/* ---- sample leads --------------------------------------------------- */
const PREFIX = (process.env.LEAD_PREFIX || "VCH").toUpperCase();
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000);

/* Spread across statuses, types and dates so every stat card, filter and
   pipeline column has something in it. */
const PEOPLE = [
  ["Denise",  "Rivera",   "denise.rivera@example.com",  "(973) 555-0142", "New Jersey",     "coverage",  "New",                 1,   "Final expense / burial"],
  ["Marcus",  "Thompson", "m.thompson@example.com",     "(404) 555-0119", "Georgia",        "coverage",  "Contacted",           5,   "Term life"],
  ["Yolanda", "Mercer",   "yolanda.m@example.com",      "(713) 555-0188", "Texas",          "coverage",  "Sold",                52,  "Whole life"],
  ["Ray",     "Okonkwo",  "ray.okonkwo@example.com",    "(312) 555-0164", "Illinois",       "coverage",  "Appointment Set",     20,  "Mortgage protection"],
  ["Priya",   "Nair",     "priya.nair@example.com",     "(602) 555-0173", "Arizona",        "coverage",  "Application Started", 30,  "Term life"],
  ["Tom",     "Baldwin",  "tbaldwin@example.com",       "(216) 555-0155", "Ohio",           "coverage",  "New",                 2,   "Not sure yet"],
  ["Sandra",  "Kim",      "sandra.kim@example.com",     "(206) 555-0131", "Washington",     "coverage",  "Not Interested",      96,  "Term life"],
  ["Leon",    "Fitz",     "leon.fitz@example.com",      "(305) 555-0197", "Florida",        "coverage",  "Contacted",           8,   "Final expense / burial"],
  ["Aisha",   "Bello",    "aisha.bello@example.com",    "(718) 555-0126", "New York",       "coverage",  "Sold",                140, "Whole life"],
  ["Grant",   "Meyer",    "grant.meyer@example.com",    "(720) 555-0110", "Colorado",       "coverage",  "Closed",              200, "Mortgage protection"],
  ["Nadia",   "Haddad",   "nadia.haddad@example.com",   "(617) 555-0148", "Massachusetts",  "interview", "New",                 3,   ""],
  ["Curtis",  "Vaughn",   "c.vaughn@example.com",       "(704) 555-0182", "North Carolina", "interview", "Appointment Set",     26,  ""],
  ["Bea",     "Solano",   "bea.solano@example.com",     "(505) 555-0139", "New Mexico",     "interview", "Application Started", 70,  ""],
  ["Ivan",    "Petrov",   "ivan.petrov@example.com",    "(702) 555-0167", "Nevada",         "interview", "Sold",                120, ""],
];

/* Fixed IDs rather than random ones, so a reference you look up on the
   public tracker still works the next time you start demo mode. */
const code = (i) => `${PREFIX}-DEMO${String(i + 1).padStart(2, "0")}`;

const leads = PEOPLE.map(([first, last, email, phone, state, type, status, age, interest], i) => {
  const fields = {
    "Full Name": `${first} ${last}`,
    Phone: phone,
    Email: email,
    "Date of Birth": `19${60 + (i % 30)}-0${1 + (i % 9)}-1${i % 9}`,
    State: state,
    "Tobacco Use": i % 4 === 0 ? "Yes" : "No",
  };
  if (interest) fields["Coverage Interest"] = interest;
  if (i % 3 === 0) fields["Additional Notes"] = "Best reached after 5pm.";

  return {
    leadId: code(i),
    type, status, state, email, phone,
    firstName: first, lastName: last,
    fields,
    agentNotes: status === "New" ? "" : "Spoke briefly — sending options over.",
    createdAt: hoursAgo(age),
    updatedAt: hoursAgo(Math.max(0, age - 1)),
  };
});

await Lead.insertMany(leads, { timestamps: false });

/* A few journeys with real milestones, so the lead drawer and the public
   tracker have something to draw rather than an empty plan. */
const stages = [];
const log = (leadId, stage, hoursBack, extra = {}) => stages.push({
  leadId, stage, occurredAt: hoursAgo(hoursBack), actor: "demo", ...extra,
});

log(code(2), "contacted", 50, { durationSec: 372 });
log(code(2), "quotes_explained", 44, { durationSec: 918 });
log(code(2), "application_started", 30);
log(code(2), "application_completed", 12);
log(code(2), "sold", 6);

log(code(3), "contacted", 18, { durationSec: 244 });
log(code(3), "callback_scheduled", 16, { scheduledFor: new Date(Date.now() + 26 * 3600 * 1000) });

log(code(4), "contacted", 28, { durationSec: 511 });
log(code(4), "callback_scheduled", 26, { scheduledFor: hoursAgo(20) });
log(code(4), "agent_called", 20, { durationSec: 640 });
log(code(4), "quotes_explained", 19, { durationSec: 1180 });
log(code(4), "application_started", 9);

log(code(11), "contacted", 24, { durationSec: 298 });
log(code(11), "interview_scheduled", 22, { scheduledFor: new Date(Date.now() + 48 * 3600 * 1000) });

await LeadStage.insertMany(stages);

/* ---- sample news ---------------------------------------------------- */
const daysAgo = (d) => new Date(Date.now() - d * 86400 * 1000);

const POSTS = [
  {
    title: "We are now licensed in all 50 states",
    summary: "Vouch can place cover anywhere in the country, with the same panel of carriers behind every quote.",
    body:
      "As of this month our licensing is complete in all fifty states, which means wherever you live we can put your application in front of the same panel of A-rated carriers.\n\n" +
      "In practice this matters most for families who move. A policy placed through us stays with you across state lines, and if your circumstances change we can re-shop the cover without starting the relationship again.\n\n" +
      "Nothing changes about how you get a quote. The form takes about a minute, and a licensed agent still calls you back.",
    pinned: true,
    days: 2,
  },
  {
    title: "What the 2026 rate changes mean for term life",
    summary: "Several carriers have refiled their term rates. For most people under 50 the news is good.",
    body:
      "A round of rate filings took effect this quarter, and the picture is uneven: some carriers have raised premiums on older applicants while cutting them for healthy applicants in their thirties and forties.\n\n" +
      "This is exactly the situation where shopping several carriers pays for itself. The company that was cheapest for a 35-year-old last year may now be third or fourth, and the only way to know is to run the application across all of them.\n\n" +
      "If you already hold a policy with us, there is nothing you need to do. If your policy came from somewhere else and is more than three years old, it is worth a five-minute conversation.",
    days: 9,
  },
  {
    title: "No-exam cover: who actually qualifies",
    summary: "Accelerated underwriting has widened. Here is who can now skip the medical entirely.",
    body:
      "Accelerated underwriting lets a carrier approve a policy on your answers and their own data, with no nurse visit and no blood draw. The limits have moved considerably in the last two years.\n\n" +
      "Broadly: healthy applicants up to around age 60, for face amounts up to roughly one million dollars, now stand a good chance of approval without an exam. Applicants with well-managed common conditions are increasingly included too.\n\n" +
      "The trade-off is that a no-exam policy is sometimes priced slightly higher than the fully underwritten equivalent. Where that gap is large enough to matter, we will tell you, and the choice stays yours.",
    days: 21,
  },
  {
    title: "A note on how we are paid",
    summary: "Short version: the carrier pays us when a policy is placed. You are never billed for advice.",
    body:
      "People ask this often, so it is worth stating plainly. We are paid a commission by the insurance carrier when a policy is issued. You are never charged for a quote or for advice, and the premium you pay is the same as it would be going to that carrier directly.\n\n" +
      "Because we are independent rather than tied to one company, we have no reason to steer you towards a particular carrier. If the right answer is that you need less cover than you asked for, that is what we will tell you.",
    days: 40,
  },
];

await News.insertMany(POSTS.map((p) => ({
  slug: slugify(p.title),
  title: p.title,
  summary: p.summary,
  body: p.body,
  pinned: !!p.pinned,
  published: true,
  publishedAt: daysAgo(p.days),
  author: USER,
})));

await mongoose.disconnect();

console.log(`[demo] seeded ${leads.length} leads, ${stages.length} milestones, ${POSTS.length} news posts`);
console.log(`[demo] sign in at http://localhost:5173/admin  —  ${USER} / ${PASS}`);
console.log(`[demo] a reference to try on /track: ${code(2)}\n`);

/* Hand over to the real API, now that MONGODB_URI points at the
   throwaway database. */
await import("../index.js");

const stop = async () => { await mongod.stop(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
