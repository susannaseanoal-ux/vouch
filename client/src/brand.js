/* Everything name-related, in one place.

   The logo reads VOUCH, so that is the name the site carries. If the
   company is called something else, change it here — nothing else in
   the app hard-codes it. */
export const BRAND = {
  name: "Vouch",
  legal: "Vouch Insurance Group LLC",
  tagline: "Cover you can count on",
  blurb:
    "An independent brokerage. We compare life cover across A-rated carriers " +
    "and give you a straight answer — no scripts, no pressure.",

  // Where the site lives. Used for the link printed in the customer's PDF,
  // which has to work when the file is opened away from the browser.
  site: "https://www.vouchlifegroup.com",

  phone: "+1-888-824-9145",
  email: "info@vouchinsurance.com",

  // The prefix on every Lead ID. Must match LEAD_PREFIX in server/.env
  leadPrefix: "VCH",
};

/* The page where a customer follows their own request.

   `origin` lets a browser use the host it is actually on, so the link
   works in development too - but only for a real public host. A PDF
   built while testing on localhost still points at the live site,
   because that file may well be sent to a customer. */
export const trackUrlFor = (leadId, origin = "") => {
  const local = /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(origin);
  const base = (!origin || local ? BRAND.site : origin).replace(/\/+$/, "");
  return `${base}/track?id=${encodeURIComponent(leadId)}`;
};

export const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, "")}`;
