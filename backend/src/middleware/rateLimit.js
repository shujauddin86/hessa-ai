const rateLimit = require("express-rate-limit");
const cfg       = require("../config");

const globalLimiter = rateLimit({
  windowMs: cfg.security.rateLimitWindowMs,
  max:      cfg.security.rateLimitMax,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: "Too many requests. Please try again later." },
  keyGenerator: (req) => req.headers["x-forwarded-for"] || req.ip,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 min
  max: 10,
  message: { error: "Too many auth attempts." },
  keyGenerator: (req) => req.headers["x-forwarded-for"] || req.ip,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 20,
  message: { error: "Upload rate limit exceeded." },
  keyGenerator: (req) => (req.user ? req.user.id : req.ip),
});

module.exports = { globalLimiter, authLimiter, uploadLimiter };
