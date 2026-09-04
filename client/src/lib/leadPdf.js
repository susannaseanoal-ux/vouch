import { BRAND, trackUrlFor } from "../brand.js";

/* ===================================================================
   The customer's copy of their request, as a PDF.

   Built from the data already on the page - no second request, and
   nothing here is anything the reader could not already see on screen.

   jsPDF is loaded only when someone actually asks for a download. It is
   a few hundred kilobytes, and making every visitor to the site carry
   that for a button most of them never press would be a poor trade.
   =================================================================== */

const PAGE = { w: 210, h: 297 };          // A4 portrait, millimetres
const M = 18;                             // margin
const CONTENT_W = PAGE.w - M * 2;

const INK = [15, 27, 42];
const MUTED = [110, 128, 150];
const ROYAL = [27, 63, 196];
const RULE = [223, 232, 241];

/* The logo, as a data URL. Fetched once and remembered - it is the
   same image on every download. Returns null if it cannot be had. */
let logoPromise = null;
function loadLogo() {
  if (!logoPromise) {
    logoPromise = (async () => {
      try {
        const res = await fetch("/logo.jpeg");
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;                      // a missing logo must not cost the download
      }
    })();
  }
  return logoPromise;
}

/**
 * Lays out the document and hands it back unsaved.
 *
 * Kept separate from the download so the layout can be exercised outside
 * a browser - a PDF is the kind of thing that looks fine until someone's
 * details are long enough to run off the page.
 */
export function buildLeadPdf(jsPDF, lead, logo = null, origin = "") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = 0;

  /* ---- helpers ---------------------------------------------------- */

  const setFont = (size, style = "normal", colour = INK) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...colour);
  };

  /* Starts a new page when the next block would not fit, so nothing is
     ever cut in half across the fold. */
  const need = (mm) => {
    if (y + mm > PAGE.h - 22) {
      doc.addPage();
      y = M;
    }
  };

  const rule = () => {
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.3);
    doc.line(M, y, PAGE.w - M, y);
    y += 6;
  };

  const heading = (text) => {
    need(14);
    setFont(8, "bold", ROYAL);
    doc.text(text.toUpperCase(), M, y);
    y += 2.5;
    rule();
  };

  /* A label/value row. The value wraps and the row grows to fit it. */
  const row = (label, value) => {
    const labelW = 46;
    const lines = doc.splitTextToSize(String(value ?? "—") || "—", CONTENT_W - labelW);
    need(lines.length * 5 + 3);

    setFont(9.5, "normal", MUTED);
    doc.text(label, M, y);

    setFont(9.5, "normal", INK);
    doc.text(lines, M + labelW, y);

    y += Math.max(6, lines.length * 5) + 1.5;
  };

  /* ---- masthead ---------------------------------------------------- */

  doc.setFillColor(...ROYAL);
  doc.rect(0, 0, PAGE.w, 34, "F");

  if (logo) {
    try { doc.addImage(logo, "JPEG", M, 9, 16, 16); } catch { /* not fatal */ }
  }

  const textX = logo ? M + 21 : M;
  setFont(17, "bold", [255, 255, 255]);
  doc.text(BRAND.name, textX, 17);
  setFont(8, "normal", [190, 210, 240]);
  doc.text(BRAND.tagline, textX, 23);

  setFont(9, "bold", [255, 255, 255]);
  doc.text("Request summary", PAGE.w - M, 17, { align: "right" });
  setFont(7.5, "normal", [190, 210, 240]);
  doc.text(`Downloaded ${new Date().toLocaleDateString()}`, PAGE.w - M, 22.5, { align: "right" });

  y = 48;

  /* ---- the reference, which is the thing they came for ------------- */

  doc.setFillColor(245, 249, 253);
  doc.setDrawColor(...RULE);
  doc.roundedRect(M, y - 8, CONTENT_W, 18, 2, 2, "FD");

  setFont(7.5, "bold", MUTED);
  doc.text("YOUR REFERENCE", M + 5, y - 2.5);
  setFont(15, "bold", ROYAL);
  doc.text(lead.leadId, M + 5, y + 6);

  setFont(7.5, "bold", MUTED);
  doc.text("STATUS", PAGE.w - M - 5, y - 2.5, { align: "right" });
  setFont(12, "bold", INK);
  doc.text(lead.status || "—", PAGE.w - M - 5, y + 6, { align: "right" });

  y += 22;

  /* ---- where to find this again ------------------------------------
     The reference above is only useful with somewhere to type it, and a
     printed page cannot be searched. The whole address is spelled out
     rather than hidden behind "click here", because this is a document
     that gets printed, forwarded and read on paper. */

  const track = trackUrlFor(lead.leadId, origin);

  setFont(7.5, "bold", MUTED);
  doc.text("FOLLOW YOUR REQUEST", M, y);
  y += 5.5;

  setFont(10, "normal", ROYAL);
  doc.textWithLink(track, M, y, { url: track });

  // Underline it, so it reads as a link on paper as well as on screen.
  const linkW = doc.getTextWidth(track);
  doc.setDrawColor(...ROYAL);
  doc.setLineWidth(0.25);
  doc.line(M, y + 1.2, M + linkW, y + 1.2);
  y += 5.5;

  setFont(8, "normal", MUTED);
  doc.text("Open this at any time to see the latest progress on your request.", M, y);
  y += 10;

  /* ---- what they sent us ------------------------------------------- */

  heading("Your request");
  row("Name", lead.name);
  row("Request type", lead.typeLabel);
  row("Submitted", lead.submitted);

  /* The only place this is ever shown to the customer. It is on the
     downloaded copy and nowhere on the website. */
  if (lead.sourceIp) row("Submitted from", lead.sourceIp);

  const fields = lead.fields || {};
  const entries = Object.entries(fields).filter(([, v]) => String(v || "").trim());
  if (entries.length) {
    y += 2;
    heading("Details you gave us");
    for (const [label, value] of entries) row(label, value);
  }

  /* ---- the journey -------------------------------------------------- */

  const journey = lead.journey || [];
  if (journey.length) {
    y += 2;
    heading("Progress");

    for (const step of journey) {
      need(9);

      const done = !!step.done;

      // A filled dot for what has happened, hollow for what has not.
      doc.setDrawColor(done ? ROYAL[0] : 190, done ? ROYAL[1] : 200, done ? ROYAL[2] : 212);
      doc.setFillColor(...(done ? ROYAL : [255, 255, 255]));
      doc.circle(M + 1.6, y - 1.4, 1.5, done ? "FD" : "D");

      setFont(9.5, done ? "bold" : "normal", done ? INK : MUTED);
      doc.text(step.label, M + 7, y);

      /* Only real recorded times are printed. A step known to have been
         reached but never timed says so, rather than being given a
         plausible-looking date. */
      const meta = [];
      if (step.at) meta.push(step.at);
      if (step.duration) meta.push(`call lasted ${step.duration}`);
      if (step.scheduled) meta.push(`booked for ${step.scheduled}`);
      if (done && !step.at) meta.push("time not recorded");
      if (step.next) meta.push("next step");

      if (meta.length) {
        setFont(8, "normal", MUTED);
        doc.text(meta.join("  ·  "), PAGE.w - M, y, { align: "right" });
      }

      y += 7;
    }
  }

  /* ---- footer on every page ---------------------------------------- */

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const fy = PAGE.h - 14;

    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.3);
    doc.line(M, fy - 5, PAGE.w - M, fy - 5);

    setFont(7.5, "normal", MUTED);
    doc.text(`${BRAND.legal}  ·  ${BRAND.phone}  ·  ${BRAND.email}`, M, fy);
    doc.text(`Page ${p} of ${pages}`, PAGE.w - M, fy, { align: "right" });

    doc.text(
      "This summary is for information only and is not an offer of insurance or proof of cover.",
      M, fy + 4
    );
  }

  return doc;
}

/* ===================================================================
   Handing the finished file to the browser.

   A browser only lets a page start a download while it is still dealing
   with the click that asked for one, and that permission expires after
   a few seconds. Fetching the library at click time spent it: on a slow
   connection the 400KB import outlasted the click, the download was
   refused, and - because a refusal is silent - nothing was thrown for
   us to catch or show. The button simply did nothing.

   So the library and the logo are fetched ahead of time, and the click
   only lays out a document that is already in memory.
   =================================================================== */

let libPromise = null;
const lib = () => (libPromise ||= import("jspdf").then((m) => m.jsPDF));

/** Fetches the library and the logo early, so the first click is instant. */
export function preloadPdf() {
  lib().catch(() => {});
  loadLogo().catch(() => {});
}

/* Some browsers - iOS Safari above all - accept the anchor but ignore
   its download attribute for a blob. Opening the file is the honest
   second best: it lands in the PDF viewer, where saving is one tap. */
function handOver(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  if ("download" in a) {
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else if (!window.open(url, "_blank", "noopener")) {
    URL.revokeObjectURL(url);
    throw new Error("Your browser blocked the download. Please allow pop-ups for this site.");
  }

  /* Revoking at once can cancel a download that has not begun reading.
     A minute is far longer than any of them need. */
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Builds the document and hands it to the browser as a download. */
export async function downloadLeadPdf(lead) {
  const [jsPDF, logo] = await Promise.all([lib(), loadLogo()]);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const doc = buildLeadPdf(jsPDF, lead, logo, origin);
  handOver(doc.output("blob"), `${lead.leadId}-request.pdf`);
}
