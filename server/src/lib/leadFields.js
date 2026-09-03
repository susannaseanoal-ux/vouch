/* ===================================================================
   Cleaning the questions and answers attached to a lead.

   The submitted fields are the one part of a lead whose SHAPE comes
   from the caller rather than from us - the form decides what it asks,
   and the dashboard lets an agent add a question of their own. That
   flexibility is the point, and it is also why it needs a hard limit:
   a public form that accepts as many fields as it is sent will happily
   store five thousand of them from one anonymous request, and every
   lead after that is slower to load, heavier to store, and closer to
   MongoDB's 16MB ceiling.

   The real form asks eight questions. The cap is generous enough that
   nobody legitimate will ever meet it.
   =================================================================== */

export const MAX_FIELDS = 40;
export const MAX_LABEL = 120;
export const MAX_VALUE = 5000;

/**
 * Trims labels and values to size and keeps at most MAX_FIELDS of them.
 *
 * `keepEmpty` is the difference between a submission and an edit: a
 * customer leaving a question blank should not create an empty row, but
 * an agent clearing an answer in the dashboard means "this is now
 * blank" and the field has to stay so they can see it is empty.
 */
export function cleanLeadFields(input, { keepEmpty = false } = {}) {
  const out = {};
  if (!input || typeof input !== "object") return out;

  let kept = 0;
  for (const [label, value] of Object.entries(input)) {
    if (kept >= MAX_FIELDS) break;

    const k = String(label).trim().slice(0, MAX_LABEL);
    if (!k) continue;

    /* These keys have meaning to JavaScript objects rather than to a
       lead, and there is no reason a question should be called one. */
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;

    const v = String(value ?? "").trim().slice(0, MAX_VALUE);
    if (!v && !keepEmpty) continue;

    out[k] = v;
    kept += 1;
  }

  return out;
}
