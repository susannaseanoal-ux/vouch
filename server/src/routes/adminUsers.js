import express from "express";
import mongoose from "mongoose";
import AdminUser, { ADMIN_ROLES } from "../models/AdminUser.js";
import { requireAdmin, requireFullAdmin } from "../middleware/auth.js";

/* ==================================================================
   Staff accounts.

   Two roles:
     admin   - runs the dashboard: leads, news, and staff
     viewer  - reads everything, changes nothing

   And one account above both: the OWNER. The business belongs to
   them, so no other administrator can remove them, demote them, or
   reset their password, and only the owner can hand out administrator
   access. Without that, any admin could delete the owner - or quietly
   promote a second admin who then does it - and the owner would be
   locked out of their own system with no way back in.

   Every rule here is enforced on the server. The dashboard hides the
   buttons as a courtesy; this is what actually stops it.
   ================================================================== */
const router = express.Router();
router.use(requireAdmin, requireFullAdmin);

const isObjectId = (v) => mongoose.isValidObjectId(v);

const present = (u) => ({
  id: String(u._id),
  username: u.username,
  displayName: u.displayName,
  role: u.role,
  roleLabel: u.isOwner ? "Owner" : (ADMIN_ROLES[u.role] || u.role),
  isOwner: !!u.isOwner,
  lastLogin: u.lastLogin,
  createdAt: u.createdAt,
  locked: !!(u.lockedUntil && u.lockedUntil > new Date()),
});

const adminCount = () => AdminUser.countDocuments({ role: "admin" });

/**
 * Makes sure exactly one account is the owner.
 *
 * Existing installations were created before owners existed, so the
 * first administrator ever made - the one from `npm run seed` - becomes
 * it. Runs on read, costs one indexed query, and does nothing once an
 * owner is set.
 */
async function ensureOwner() {
  if (await AdminUser.exists({ isOwner: true })) return;
  const first = await AdminUser.findOne({ role: "admin" }).sort({ createdAt: 1 });
  if (first) {
    first.isOwner = true;
    await first.save();
    console.log(`[vouch] "${first.username}" marked as the owner account`);
  }
}

router.get("/", async (req, res, next) => {
  try {
    await ensureOwner();

    /* Re-read our own flag: on the very first request after an upgrade
       ensureOwner may have just granted it, and req.admin was loaded
       before that happened - so trusting the stale copy would tell the
       owner they are not the owner. */
    const rows = await AdminUser.find({}).sort({ createdAt: 1 });
    const me = rows.find((u) => String(u._id) === String(req.admin._id));

    res.json({
      ok: true,
      roles: ADMIN_ROLES,
      youAreOwner: !!(me && me.isOwner),
      users: rows.map(present),
    });
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------
   Create
   ------------------------------------------------------------------ */
router.post("/", async (req, res, next) => {
  try {
    const b = req.body || {};
    const username = String(b.username || "").trim().toLowerCase();
    const password = String(b.password || "");
    const role = Object.keys(ADMIN_ROLES).includes(b.role) ? b.role : "viewer";

    /* Only the owner hands out administrator access. An admin who could
       mint more admins could build a majority and remove everyone else. */
    if (role === "admin" && !req.admin.isOwner) {
      return res.status(403).json({
        ok: false,
        error: "Only the owner can create administrator accounts. You can create viewers.",
      });
    }

    if (!/^[a-z0-9._-]{3,64}$/.test(username)) {
      return res.status(422).json({
        ok: false,
        error: "A username is 3 to 64 characters: letters, numbers, dot, dash or underscore.",
      });
    }
    if (password.length < 10) {
      return res.status(422).json({ ok: false, error: "Use a password of at least 10 characters." });
    }
    if (await AdminUser.exists({ username })) {
      return res.status(409).json({ ok: false, error: "That username is already taken." });
    }

    const user = new AdminUser({
      username,
      displayName: String(b.displayName || "").trim().slice(0, 120),
      role,
    });
    await user.setPassword(password);
    await user.save();

    res.status(201).json({
      ok: true,
      message: `${ADMIN_ROLES[role]} account "${username}" created.`,
      user: present(user),
    });
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------
   Change role, name, or password
   ------------------------------------------------------------------ */
router.patch("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(404).json({ ok: false, error: "That account no longer exists." });
    }
    const user = await AdminUser.findById(req.params.id);
    if (!user) return res.status(404).json({ ok: false, error: "That account no longer exists." });

    const isSelf = String(user._id) === String(req.admin._id);

    /* The owner is untouchable by anyone else. */
    if (user.isOwner && !isSelf) {
      return res.status(403).json({
        ok: false,
        error: "The owner's account cannot be changed by another administrator.",
      });
    }

    const b = req.body || {};

    if (b.role && b.role !== user.role) {
      if (isSelf) {
        return res.status(422).json({ ok: false, error: "You cannot change your own role." });
      }
      if (!Object.keys(ADMIN_ROLES).includes(b.role)) {
        return res.status(422).json({ ok: false, error: "That is not a role we have." });
      }
      if (b.role === "admin" && !req.admin.isOwner) {
        return res.status(403).json({
          ok: false,
          error: "Only the owner can promote someone to administrator.",
        });
      }
      if (user.role === "admin" && b.role !== "admin" && (await adminCount()) <= 1) {
        return res.status(422).json({
          ok: false,
          error: "This is the last administrator - promote someone else first.",
        });
      }
      user.role = b.role;
    }

    if (b.displayName !== undefined) {
      user.displayName = String(b.displayName).trim().slice(0, 120);
    }

    /* Resetting someone else's forgotten password. Your own goes through
       /auth/password, which asks for the current one first. */
    if (b.password) {
      if (isSelf) {
        return res.status(422).json({ ok: false, error: "Change your own password from the sign-in area." });
      }
      if (String(b.password).length < 10) {
        return res.status(422).json({ ok: false, error: "Use a password of at least 10 characters." });
      }
      await user.setPassword(String(b.password));
      user.failedAttempts = 0;
      user.lockedUntil = null;
    }

    await user.save();
    res.json({ ok: true, message: "Account updated.", user: present(user) });
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------
   Delete
   ------------------------------------------------------------------ */
router.delete("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(404).json({ ok: false, error: "That account no longer exists." });
    }
    if (String(req.params.id) === String(req.admin._id)) {
      return res.status(422).json({ ok: false, error: "You cannot delete your own account." });
    }

    const user = await AdminUser.findById(req.params.id);
    if (!user) return res.status(404).json({ ok: false, error: "That account no longer exists." });

    /* The owner cannot be removed by anyone. Combined with the rule
       above - nobody deletes themselves - the owner account cannot be
       deleted at all, which is the point. */
    if (user.isOwner) {
      return res.status(403).json({ ok: false, error: "The owner's account cannot be removed." });
    }

    /* An ordinary admin may remove viewers; removing a fellow
       administrator is the owner's call. */
    if (user.role === "admin" && !req.admin.isOwner) {
      return res.status(403).json({
        ok: false,
        error: "Only the owner can remove an administrator.",
      });
    }

    if (user.role === "admin" && (await adminCount()) <= 1) {
      return res.status(422).json({ ok: false, error: "This is the last administrator and cannot be removed." });
    }

    await AdminUser.deleteOne({ _id: user._id });
    res.json({ ok: true, message: `Account "${user.username}" removed.` });
  } catch (err) { next(err); }
});

export default router;
