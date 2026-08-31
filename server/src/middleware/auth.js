import jwt from "jsonwebtoken";
import AdminUser from "../models/AdminUser.js";

export function signToken(user) {
  return jwt.sign(
    { sub: String(user._id), username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "7d" }
  );
}

/** Requires a valid token. Attaches req.admin. */
export async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ ok: false, error: "Please sign in." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await AdminUser.findById(payload.sub);
    if (!user) return res.status(401).json({ ok: false, error: "That account no longer exists." });

    req.admin = user;
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "Your session has expired. Please sign in again." });
  }
}

/**
 * Refuses viewers. Every writing route sits behind this, on the server,
 * regardless of what the browser lets someone click.
 */
export function requireFullAdmin(req, res, next) {
  if (!req.admin || req.admin.role === "viewer") {
    return res.status(403).json({ ok: false, error: "Your account has view-only access." });
  }
  next();
}
