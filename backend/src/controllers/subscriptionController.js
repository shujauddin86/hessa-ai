/**
 * controllers/subscriptionController.js
 * Plans: PAY_PER_USE (₹99/reel), ADVANCED (₹299/month, 3/day), PRIVACY (₹199/month, analysis-only).
 * No FREE plan. No downgrade. Single active session.
 */
const { v4: uuid } = require("uuid");
const db           = require("../models/database");
const analytics    = require("../services/analytics");
const logger       = require("../utils/logger");

// Upgrade-only hierarchy
const PLAN_ORDER  = ["PAY_PER_USE", "ADVANCED", "PRIVACY"];
const PLAN_PRICES = { PAY_PER_USE: 99, ADVANCED: 299, PRIVACY: 199 };

exports.getSubscription = (req, res) => {
  const sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(req.user.id);
  if (!sub) return res.status(404).json({ error: "Subscription not found" });
  res.json({ subscription: sub, canGenerate: _canGenerate(sub), canReel: _canReel(sub) });
};

/**
 * initPayment — creates a mock payment intent (replace with Razorpay in production).
 */
exports.initPayment = (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLAN_ORDER.includes(plan)) {
      return res.status(400).json({ error: `Invalid plan. Valid: ${PLAN_ORDER.join(", ")}` });
    }

    const sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(req.user.id);

    // Enforce upgrade-only policy
    const currRank = PLAN_ORDER.indexOf(sub?.plan || "PAY_PER_USE");
    const newRank  = PLAN_ORDER.indexOf(plan);
    if (newRank < currRank) {
      return res.status(400).json({ error: "Subscription downgrade is not allowed" });
    }

    const paymentIntentId = `pi_mock_${uuid().replace(/-/g, "").slice(0, 16)}`;
    const amount          = PLAN_PRICES[plan] || 99;

    analytics.track("PAYMENT_INITIATED", { plan, amount }, req.user.id);
    res.json({ paymentIntentId, amount, currency: "INR", plan, mock: true });
  } catch (e) {
    logger.error("[Sub] initPayment error", { err: e.message });
    res.status(500).json({ error: "Payment init failed" });
  }
};

/**
 * confirmPayment — validates mock payment + upgrades subscription.
 */
exports.confirmPayment = (req, res) => {
  try {
    const { plan, paymentId, amount } = req.body;

    // Production: verify Razorpay signature here
    if (!paymentId) return res.status(400).json({ error: "Payment verification failed" });
    if (!PLAN_ORDER.includes(plan)) return res.status(400).json({ error: "Invalid plan" });

    const now = Date.now();

    let expiresAt = null;
    if (plan === "ADVANCED" || plan === "PRIVACY") {
      expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    db.prepare(
      `UPDATE subscriptions SET plan = ?, status = 'active', expires_at = ?,
       auto_renew = 1, updated_at = ? WHERE user_id = ?`
    ).run(plan, expiresAt, now, req.user.id);

    analytics.track("PAYMENT_CONFIRMED", { plan, paymentId, amount }, req.user.id);
    const updated = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(req.user.id);
    res.json({ subscription: updated, message: "Subscription activated" });
  } catch (e) {
    logger.error("[Sub] confirmPayment error", { err: e.message });
    res.status(500).json({ error: "Payment confirmation failed" });
  }
};

/**
 * resetDailyUsage — called by daily cron (cleanup service).
 */
exports.resetDailyUsage = () => {
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(
    "UPDATE subscriptions SET jobs_today = 0, reset_date = ? WHERE reset_date != ? OR reset_date IS NULL"
  ).run(today, today);
};

// ── Helpers (exported for pipeline use) ─────────────────────────────────────

function _canGenerate(sub) {
  if (!sub || sub.status !== "active") return false;

  if (sub.plan === "PAY_PER_USE") return true; // gated by per-job payment, never blocked by count

  if (sub.plan === "ADVANCED") {
    const today = new Date().toISOString().slice(0, 10);
    if (sub.reset_date !== today) return true;   // new day — limit not yet reached
    return (sub.jobs_today || 0) < 3;
  }

  if (sub.plan === "PRIVACY") return true; // can always run analysis
  return false;
}

function _canReel(sub) {
  if (!sub || sub.status !== "active") return false;
  if (sub.plan === "PRIVACY") return false; // analysis-only, no reel output
  return true;
}

module.exports.canGenerate = _canGenerate;
module.exports.canReel     = _canReel;
