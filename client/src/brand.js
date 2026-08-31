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

  phone: "+1-888-824-9145",
  email: "info@vouchinsurance.com",

  // The prefix on every Lead ID. Must match LEAD_PREFIX in server/.env
  leadPrefix: "VCH",
};

export const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, "")}`;
