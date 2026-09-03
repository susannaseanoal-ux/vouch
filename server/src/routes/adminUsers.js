import express from "express";
import mongoose from "mongoose";
import AdminUser, { ADMIN_ROLES } from "../models/AdminUser.js";
import { requireAdmin, requireFullAdmin } from "../middleware/auth.js";

/* ==================================================================
   Staff accounts.

   Two roles, and the difference is enforced here rather than in the
   browser:
     admin   - can do everything, including managing these accounts
     viewer  - can read leads and news, and change nothing

   Rules that keep an account from locking everyone out or being used
   to quietly escalate:
     - only a full admin may reach any of this
     - nobody can delete their own account
     - nobody can change their own role
     - the last remaining admin cannot be deleted or demoted
   ================================================================== */
const router = express.Router();
router.use(requireAdmin, requireFullAdmin);

const isObjectId = (v) => mongoose.isValidObjectId(v);

const present = (u) => ({
  id: String(u._id),
  username: u.username,
  displayName: u.displayName,
  role: u.role,
  roleLabel: ADMIN_ROLES[u.role] || u.role,
  lastLogin: u.lastLogin,
  createdAt: u.createdAt,
  locked: !!(u.lockedUntil && u.lockedUntil > new Date()),
});

/** How many full admins exist, so the last one can be protected. */
const adminCount = () => AdminUser.countDocuments({ role: "admin" });

router.get("/", async (_req, res, next) => {
  try {
    const rows = await AdminUser.find({}).sort({ createdAt: 1 });
    res.json({ ok: true, roles: ADMIN_ROLES, users: rows.map(present) });
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
   Change role or display name
   ------------------------------------------------------------------ */
router.patch("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(404).json({ ok: false, error: "That account no longer exists." });
    }
    const user = await AdminUser.findById(req.params.id);
    if (!user) return res.status(404).json({ ok: false, error: "That account no longer exists." });

    const b = req.body || {};
    const isSelf = String(user._id) === String(req.admin._id);

    if (b.role && b.role !== user.role) {
      if (isSelf) {
        return res.status(422).json({ ok: false, error: "You cannot change your own role." });
      }
      if (!Object.keys(ADMIN_ROLES).includes(b.role)) {
        return res.status(422).json({ ok: false, error: "That is not a role we have." });
      }
      /* Demoting the last admin would leave nobody able to manage
         anything, including undoing the demotion. */
      if (user.role === "admin" && b.role !== "admin" && (await adminCount()) <= 1) {
        return res.status(422).json({ ok: false, error: "This is the last administrator - promote someone else first." });
      }
      user.role = b.role;
    }

    if (b.displayName !== undefined) {
      user.displayName = String(b.displayName).trim().slice(0, 120);
    }

    /* An admin resetting someone else's forgotten password. Changing
       your own goes through /auth/password, which asks for the current
       one first. */
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

    if (user.role === "admin" && (await adminCount()) <= 1) {
      return res.status(422).json({ ok: false, error: "This is the last administrator and cannot be removed." });
    }

    await AdminUser.deleteOne({ _id: user._id });
    res.json({ ok: true, message: `Account "${user.username}" removed.` });
  } catch (err) { next(err); }
});

export default router;
