import mongoose from "mongoose";

export const LEAD_TYPES = {
  coverage: "Coverage Request",
  interview: "Group Interview",
};

export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Appointment Set",
  "Application Started",
  "Sold",
  "Not Interested",
  "Closed",
];

const leadSchema = new mongoose.Schema(
  {
    leadId: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: Object.keys(LEAD_TYPES), default: "coverage", index: true },

    firstName: { type: String, default: "", trim: true, maxlength: 120 },
    lastName: { type: String, default: "", trim: true, maxlength: 120 },
    email: { type: String, default: "", trim: true, lowercase: true, maxlength: 190, index: true },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    state: { type: String, default: "", trim: true, maxlength: 80 },

    status: { type: String, enum: LEAD_STATUSES, default: "New", index: true },

    /* Everything the customer typed, as label -> value. A Map keeps the
       order they were submitted in, which is how they are shown back. */
    fields: { type: Map, of: String, default: {} },

    /* Never shown to the customer. */
    agentNotes: { type: String, default: "", maxlength: 20000 },

    sourceIp: { type: String, default: "" },
    userAgent: { type: String, default: "", maxlength: 255 },

    emailSent: { type: Boolean, default: false },
    emailError: { type: String, default: "" },
  },
  { timestamps: true }
);

leadSchema.virtual("name").get(function () {
  const n = `${this.firstName || ""} ${this.lastName || ""}`.trim();
  return n || "(no name given)";
});

leadSchema.set("toJSON", { virtuals: true });

export const typeLabel = (type) => LEAD_TYPES[type] || type;

export default mongoose.model("Lead", leadSchema);
