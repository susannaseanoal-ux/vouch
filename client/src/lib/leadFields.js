/* ===================================================================
   What each field on a lead actually is.

   The public form knows a date of birth is a date and a state is one of
   fifty - and then the dashboard used to render every one of them as a
   plain text box, so an agent correcting a date typed it by hand and
   could put anything in. This is the one place that describes them, and
   both the drawer and the "add a lead" form read from it.

   Anything not listed falls back to a text box, so a new question added
   to the public form still shows up and stays editable.
   =================================================================== */

export const STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina",
  "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

export const COVERAGE_INTEREST = [
  "Final expense / burial",
  "Term life",
  "Whole life",
  "Mortgage protection",
  "Not sure yet",
];

/** How to render a given submitted field. */
export const FIELD_KINDS = {
  "Full Name": { type: "text" },
  "Phone": { type: "tel" },
  "Email": { type: "email" },
  "Date of Birth": { type: "date" },
  "State": { type: "select", options: STATES },
  "Tobacco Use": { type: "select", options: ["No", "Yes"] },
  "Coverage Interest": { type: "select", options: COVERAGE_INTEREST },
  "Additional Notes": { type: "textarea" },
};

/** The blank set of questions a phone-in lead starts from. */
export const BLANK_FIELDS = {
  "Full Name": "",
  "Phone": "",
  "Email": "",
  "Date of Birth": "",
  "State": "",
  "Tobacco Use": "",
  "Coverage Interest": "",
  "Additional Notes": "",
};

/**
 * A date of birth can arrive as "1962-03-12" from the form or as a
 * fuller string once it has been round-tripped. A date input only
 * accepts YYYY-MM-DD, and rejecting the value silently would look like
 * the field had emptied itself.
 */
export function asDateValue(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const kindFor = (label) => FIELD_KINDS[label] || { type: "text" };
