import mongoose from "mongoose";

/* One milestone in a lead's journey.

   Kept apart from any audit log: these are the moments the customer is
   shown, with the time each actually happened and, for a phone call, how
   long it lasted. `note` is internal and never leaves the admin API. */
const leadStageSchema = new mongoose.Schema(
  {
    leadId: { type: String, required: true, index: true },
    stage: { type: String, required: true, index: true },

    occurredAt: { type: Date, required: true },
    scheduledFor: { type: Date, default: null },
    durationSec: { type: Number, default: null, min: 0, max: 86400 },

    note: { type: String, default: "", maxlength: 255 },
    actor: { type: String, default: "system", maxlength: 64 },
  },
  { timestamps: true }
);

leadStageSchema.index({ leadId: 1, occurredAt: 1 });

export default mongoose.model("LeadStage", leadStageSchema);
