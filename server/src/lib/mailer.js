import nodemailer from "nodemailer";

/* Mail is optional. With SMTP_HOST blank the app runs perfectly well -
   leads are saved, they just do not trigger a notification. That keeps
   local development from needing a mailbox. */
let transport = null;

function getTransport() {
  if (transport) return transport;
  if (!process.env.SMTP_HOST) return null;

  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transport;
}

export async function notifyTeam(lead) {
  const tx = getTransport();
  if (!tx) return { ok: false, error: "SMTP is not configured" };

  const rows = [...(lead.fields || [])]
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  try {
    await tx.sendMail({
      from: `"${process.env.COMPANY_NAME || "Vouch"}" <${process.env.SMTP_USER}>`,
      to: process.env.NOTIFY_TO || process.env.SMTP_USER,
      subject: `New ${lead.type} lead - ${lead.leadId}`,
      text:
        `A new request came in through the website.\n\n` +
        `Lead ID: ${lead.leadId}\nName: ${lead.name}\n\n${rows}\n`,
    });
    return { ok: true };
  } catch (err) {
    console.error("[vouch] notification failed:", err.message);
    return { ok: false, error: err.message };
  }
}
