/**
 * controllers/authController.js — Login, register, logout
 * Single active session: logging in on a new device invalidates previous session.
 */
const { v4: uuid }   = require("uuid");
const bcrypt         = require("bcryptjs");
const db             = require("../models/database");
const jwtUtil        = require("../utils/jwt");
const { tokenHash }  = require("../middleware/auth");
const { recordFailedLogin, clearFailedLogins } = require("../middleware/fraudDetection");
const analytics      = require("../services/analytics");
const logger         = require("../utils/logger");

const DEVICE_TTL_MS  = 30 * 24 * 60 * 60 * 1000; // 30 days

exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    if (password.length < 8)   return res.status(400).json({ error: "Password min 8 chars" });

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 12);
    const id   = uuid();
    const now  = Date.now();

    db.prepare(
      "INSERT INTO users (id,email,password_hash,name,created_at,updated_at) VALUES (?,?,?,?,?,?)"
    ).run(id, email.toLowerCase(), hash, name || null, now, now);

    // Create default PAY_PER_USE subscription — active immediately
    db.prepare(
      "INSERT INTO subscriptions (id,user_id,plan,status,created_at,updated_at) VALUES (?,?,?,?,?,?)"
    ).run(uuid(), id, "PAY_PER_USE", "active", now, now);

    analytics.track("USER_REGISTERED", { email: email.toLowerCase() }, id);

    const token     = _createSession(id, req.headers["x-device-id"] || uuid());
    res.status(201).json({ token, message: "Account created" });
  } catch (e) {
    logger.error("[Auth] Register error", { err: e.message });
    res.status(500).json({ error: "Registration failed" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    // Lock check
    if (user.locked_until && Date.now() < user.locked_until) {
      const secs = Math.ceil((user.locked_until - Date.now()) / 1000);
      return res.status(403).json({ error: `Account locked for ${secs}s` });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      recordFailedLogin(user.id, req.ip);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    clearFailedLogins(user.id);
    const dId = deviceId || req.headers["x-device-id"] || uuid();

    // Single active session — revoke all previous sessions for this user
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);

    // Update active device
    db.prepare("UPDATE users SET active_device = ?, updated_at = ? WHERE id = ?")
      .run(dId, Date.now(), user.id);

    const token = _createSession(user.id, dId);
    analytics.track("USER_LOGIN", { deviceId: dId }, user.id);

    const sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(user.id);
    res.json({ token, user: _safeUser(user), subscription: sub });
  } catch (e) {
    logger.error("[Auth] Login error", { err: e.message });
    res.status(500).json({ error: "Login failed" });
  }
};

exports.logout = (req, res) => {
  try {
    db.prepare("DELETE FROM sessions WHERE user_id = ? AND id = ?")
      .run(req.user.id, req.sessionId);
    analytics.track("USER_LOGOUT", {}, req.user.id);
    res.json({ message: "Logged out" });
  } catch (e) {
    res.status(500).json({ error: "Logout failed" });
  }
};

exports.me = (req, res) => {
  const sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(req.user.id);
  res.json({ user: _safeUser(req.user), subscription: sub });
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function _createSession(userId, deviceId) {
  const now       = Date.now();
  const token     = jwtUtil.sign({ userId, deviceId });
  const hash      = tokenHash(token);
  const expiresAt = now + DEVICE_TTL_MS;
  db.prepare(
    "INSERT INTO sessions (id,user_id,device_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?,?)"
  ).run(uuid(), userId, deviceId, hash, expiresAt, now);
  return token;
}

function _safeUser(u) {
  return { id: u.id, email: u.email, name: u.name, activeDevice: u.active_device };
}
