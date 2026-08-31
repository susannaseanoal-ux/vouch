/* ===================================================================
   Who actually sent this request.

   Getting a real visitor address right is mostly about not believing
   the wrong thing:

   - Express gives req.ip, which is the socket address unless the app is
     told how many proxies sit in front of it. Behind one it must trust
     one hop, behind a CDN plus a host proxy it must trust two - so the
     count is configuration, not something to hard-code. See TRUST_PROXY.

   - A CDN puts the visitor's address in its own header (Cloudflare uses
     cf-connecting-ip). Those headers are worth reading, but ONLY the one
     named in the environment: any client can send any header, so
     trusting them by default would let a visitor pick their own IP and
     make the whole field worthless.

   - An IPv4 address often arrives wearing an IPv6 jacket,
     "::ffff:203.0.113.5". That is the same address and should be stored
     the way a person would recognise it.
   =================================================================== */

/** Trims the IPv6 wrapper off an IPv4 address, and any port. */
export function normalizeIp(value) {
  let v = String(value || "").trim();
  if (!v) return "";

  // "::ffff:203.0.113.5" is IPv4 in IPv6 clothing.
  if (v.toLowerCase().startsWith("::ffff:") && v.includes(".")) v = v.slice(7);

  // "203.0.113.5:51234" - a port is not part of the address.
  const parts = v.split(":");
  if (parts.length === 2 && parts[0].includes(".")) v = parts[0];

  return v.slice(0, 45);          // the longest an IPv6 address can be
}

/**
 * The visitor's address, as well as this deployment can know it.
 *
 * Set CLIENT_IP_HEADER only when a proxy you control is guaranteed to
 * overwrite that header on the way in. Leave it blank otherwise.
 */
export function clientIp(req) {
  const header = String(process.env.CLIENT_IP_HEADER || "").toLowerCase().trim();

  if (header) {
    const raw = req.headers[header];
    const first = String(Array.isArray(raw) ? raw[0] : raw || "").split(",")[0];
    const fromHeader = normalizeIp(first);
    if (fromHeader) return fromHeader;
  }

  /* Express has already resolved X-Forwarded-For against the trust
     setting, so this is the right answer once that setting is right. */
  return normalizeIp(req.ip);
}
