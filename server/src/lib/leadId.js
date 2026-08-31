import crypto from "node:crypto";
import Lead from "../models/Lead.js";

/* No 0/1/I/O — a Lead ID gets read down the phone, so the characters
   people confuse are simply not in the alphabet. */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function normalizeLeadId(input, prefix = process.env.LEAD_PREFIX || "MAK") {
  const clean = String(input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!clean) return "";

  const p = prefix.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Strip a leading prefix only when what remains is still long enough.
  const body = clean.startsWith(p) && clean.length - p.length >= 4
    ? clean.slice(p.length)
    : clean;

  return `${p}-${body}`;
}

export async function newLeadId() {
  const prefix = (process.env.LEAD_PREFIX || "MAK").toUpperCase();

  for (let attempt = 0; attempt < 12; attempt++) {
    const bytes = crypto.randomBytes(6);
    let code = "";
    for (let i = 0; i < 6; i++) code += ALPHABET[bytes[i] % ALPHABET.length];

    const candidate = `${prefix}-${code}`;
    if (!(await Lead.exists({ leadId: candidate }))) return candidate;
  }

  throw new Error("Could not allocate a unique Lead ID");
}
