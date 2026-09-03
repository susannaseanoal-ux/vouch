import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const ADMIN_ROLES = {
  admin: "Administrator",
  viewer: "Viewer (read only)",
};

const adminUserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 64 },
    passwordHash: { type: String, required: true },
    displayName: { type: String, default: "", maxlength: 120 },
    role: { type: String, enum: Object.keys(ADMIN_ROLES), default: "admin" },

    /* The owner: the account this business belongs to.
       Other administrators can run the dashboard, but they cannot
       remove the owner, demote them, or reset their password - so no
       colleague, and nobody who gets hold of a colleague's login, can
       lock the owner out of their own system. Exactly one account
       carries this. */
    isOwner: { type: Boolean, default: false },

    lastLogin: { type: Date, default: null },

    /* Slows down anyone working through a password list. */
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

adminUserSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

adminUserSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

adminUserSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > new Date();
};

adminUserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

export default mongoose.model("AdminUser", adminUserSchema);
