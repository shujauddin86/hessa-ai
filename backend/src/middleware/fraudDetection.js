/**
 * middleware/fraudDetection.js — Fraud detection + auto-lock
 */
const { v4: uuid } = require("uuid");
const db   = require("../models/database");
const cfg  = require("../config");
const logger = require("../utils/logger");

const SUSPICIOUS_ACTIONS = new Set([
  "rapid_upload", "multiple_failed_payments", "account_scraping",
  "token_replay", "unusual_geo",
]);

/**
 * recordFailedLogin — tracks per-IP failed logins and locks account.
 */
function recordFailedLogin(userId, ip) {
  if (!userId) return;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return;

  const newCount = (user.failed_logins || 0) + 1;
  const lockedUntil = newCount >= cfg.security.fraudMaxFailed
    ? Date.now() + cfg.security.fraudLockoutMs
    : null;

  db.prepare(
    "UPDATE users SET failed_logins = ?, locked_until = ?, updated_at = ? WHERE id = ?"
  ).run(newCount, lockedUntil, Date.now(), userId);

  if (lockedUntil) {
    logFraud(ip, userId, "account_locked", `Locked after ${newCount} failed logins`);
    logger.warn("[Fraud] Account locked", { userId, ip });
  }
}

function clearFailedLogins(userId) {
  db.prepare("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?").run(userId);
}

function logFraud(ip, userId, action, details) {
  try {
    db.prepare(
      "INSERT INTO fraud_log (id, ip, user_id, action, details, ts) VALUES (?,?,?,?,?,?)"
    ).run(uuid(), ip || "unknown", userId || null, action, details || "", Date.now());
  } catch { /* non-fatal */ }
}

/**
 * detectSuspiciousActivity — middleware that flags rapid/unusual patterns.
 * Light-weight: tracks request frequency per IP in memory.
 */
const requestCounts = new Map();

function detectSuspiciousActivity(req, res, next) {
  const ip  = req.headers["x-forwarded-for"] || req.ip || "unknown";
  const key = `${ip}:${Math.floor(Date.now() / 10000)}`; // 10s window
  const cnt = (requestCounts.get(key) || 0) + 1;
  requestCounts.set(key, cnt);

  // Prune old entries every 100 calls
  if (requestCounts.size > 10000) {
    const cutoff = Math.floor(Date.now() / 10000) - 6;
    for (const [k] of requestCounts) {
      const t = parseInt(k.split(":").pop(), 10);
      if (t < cutoff) requestCounts.delete(k);
    }
  }

  if (cnt > 50) {
    logFraud(ip, req.user?.id, "rapid_requests", `${cnt} in 10s window`);
    logger.warn("[Fraud] Rapid requests detected", { ip, cnt });
    return res.status(429).json({ error: "Suspicious activity detected. Temporarily blocked." });
  }

  next();
}

module.exports = { recordFailedLogin, clearFailedLogins, logFraud, detectSuspiciousActivity };
