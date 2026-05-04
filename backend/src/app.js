/**
 * app.js — Express application setup
 */
require("dotenv").config();

const express        = require("express");
const helmet         = require("helmet");
const cors           = require("cors");
const compression    = require("compression");
const cookieParser   = require("cookie-parser");
const path           = require("path");
const fs             = require("fs");
const cfg            = require("./config");
const logger         = require("./utils/logger");
const { globalLimiter } = require("./middleware/rateLimit");
const analytics      = require("./services/analytics");
const cleanup        = require("./services/cleanup");

// ── Ensure required directories exist ───────────────────────────────────────
[cfg.paths.uploads, cfg.paths.jobs, cfg.paths.temp].forEach((p) => {
  fs.mkdirSync(p, { recursive: true });
});

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false, // needed for video streaming
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:", "blob:"],
      mediaSrc:   ["'self'", "blob:"],
    },
  },
}));

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      cfg.cors.origins,
  credentials: true,
  methods:     ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Device-ID", "X-Upload-Session"],
}));

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(globalLimiter);

// ── Request logging ──────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.debug("HTTP", { method: req.method, url: req.url, ip: req.ip });
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",          require("./routes/auth"));
app.use("/api/upload",        require("./routes/upload"));
app.use("/api/jobs",          require("./routes/jobs"));
app.use("/api/subscriptions", require("./routes/subscriptions"));
app.use("/api/privacy",       require("./routes/privacy"));

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ── Error handler ─────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logger.error("Unhandled error", { err: err.message, stack: err.stack });
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
});

// ── Background services ──────────────────────────────────────────────────────
analytics.startFlushInterval();
cleanup.startCleanupCron();

module.exports = app;
