import express from "express";
import rateLimit from "express-rate-limit";
import AdminUser from "../models/AdminUser.js";
import { signToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many sign-in attempts. Please wait 15 minutes." },
});

const LOCK_AFTER = 6;
const LOCK_MINUTES = 15;

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const username = String(req.body?.username || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    /* One message for every failure. Saying "no such user" would let
       someone map which usernames exist. */
    const refuse = () =>
      res.status(401).json({ ok: false, error: "That username and password do not match." });

    if (!username || !password) return refuse();

    const user = await AdminUser.findOne({ username });
    if (!user) return refuse();

    if (user.isLocked()) {
      return res.status(423).json({
        ok: false,
        error: "This account is locked for a few minutes after too many failed attempts.",
      });
    }

    if (!(await user.verifyPassword(password))) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= LOCK_AFTER) {
        user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
        user.failedAttempts = 0;
      }
      await user.save();
      return refuse();
    }

    user.failedAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date();
    await user.save();

    res.json({ ok: true, token: signToken(user), admin: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

/** Who am I? Lets the client restore a session on reload. */
router.get("/me", requireAdmin, (req, res) => {
  res.json({ ok: true, admin: req.admin.toJSON() });
});

router.post("/password", requireAdmin, async (req, res, next) => {
  try {
    const current = String(req.body?.current || "");
    const next_ = String(req.body?.next || "");

    if (next_.length < 10) {
      return res.status(422).json({ ok: false, error: "Use at least 10 characters." });
    }
    if (!(await req.admin.verifyPassword(current))) {
      return res.status(401).json({ ok: false, error: "Your current password is not right." });
    }

    await req.admin.setPassword(next_);
    await req.admin.save();
    res.json({ ok: true, message: "Password changed." });
  } catch (err) {
    next(err);
  }
});

export default router;
