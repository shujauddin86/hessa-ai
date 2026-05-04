/**
 * middleware/auth.js — JWT authentication + single-session enforcement
 */
const jwtUtil = require("../utils/jwt");
const db      = require("../models/database");
const crypto  = require("crypto");

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * requireAuth — validates Bearer token, enforces single active session.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token   = header.slice(7);
    const payload = jwtUtil.verify(token);
    if (!payload) return res.status(401).json({ error: "Invalid or expired token" });

    // Single-device enforcement: check session table
    const hash    = tokenHash(token);
    const session = db.prepare(
      "SELECT * FROM sessions WHERE user_id = ? AND token_hash = ? AND expires_at > ?"
    ).get(payload.userId, hash, Date.now());

    if (!session) {
      return res.status(401).json({ error: "Session expired or revoked. Please log in again." });
    }

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    // Account lock check
    if (user.locked_until && Date.now() < user.locked_until) {
      const secs = Math.ceil((user.locked_until - Date.now()) / 1000);
      return res.status(403).json({ error: `Account locked. Try again in ${secs}s.` });
    }

    req.user      = user;
    req.sessionId = session.id;
    req.token     = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Authentication failed" });
  }
}

/**
 * requireSubscription(plans) — gate access by plan.
 * plans: array of allowed plan strings
 */
function requireSubscription(plans) {
  return (req, res, next) => {
    const sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(req.user.id);
    if (!sub || !plans.includes(sub.plan)) {
      return res.status(403).json({ error: "Subscription required", requiredPlans: plans });
    }
    if (sub.status === "expired" || sub.status === "cancelled") {
      return res.status(403).json({ error: "Subscription expired" });
    }
    req.subscription = sub;
    next();
  };
}

module.exports = { requireAuth, requireSubscription, tokenHash };
