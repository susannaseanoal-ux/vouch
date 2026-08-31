import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import AdminUser from "../models/AdminUser.js";

/* Creates the first admin account. Safe to run more than once: if the
   account already exists it says so and changes nothing. */
const username = (process.env.SEED_ADMIN_USER || "admin").toLowerCase();
const password = process.env.SEED_ADMIN_PASS || "";

if (password.length < 10) {
  console.error("\n[vouch] SEED_ADMIN_PASS must be at least 10 characters. Set it in server/.env\n");
  process.exit(1);
}

await connectDb();

const existing = await AdminUser.findOne({ username });
if (existing) {
  console.log(`[vouch] admin "${username}" already exists - nothing to do.`);
} else {
  const user = new AdminUser({
    username,
    displayName: process.env.SEED_ADMIN_NAME || "Administrator",
    role: "admin",
  });
  await user.setPassword(password);
  await user.save();

  console.log(`\n[vouch] created admin "${username}".`);
  console.log("      Sign in at http://localhost:5173/admin");
  console.log("      Change this password after your first sign-in.\n");
}

await mongoose.disconnect();
