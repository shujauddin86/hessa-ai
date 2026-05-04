/**
 * database.js — SQLite via better-sqlite3
 * Single connection, synchronous driver.
 * Swap to pg (PostgreSQL) for production scale-out.
 */
const Database = require("better-sqlite3");
const path      = require("path");
const fs        = require("fs");
const cfg       = require("../config");
const logger    = require("../utils/logger");

// Ensure data directory exists
fs.mkdirSync(path.dirname(cfg.db.path), { recursive: true });

const db = new Database(cfg.db.path, { verbose: cfg.isDev ? null : undefined });
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT,
    active_device TEXT,
    failed_logins INTEGER DEFAULT 0,
    locked_until  INTEGER,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id  TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan        TEXT NOT NULL DEFAULT 'PAY_PER_USE',
    status      TEXT NOT NULL DEFAULT 'active',
    expires_at  INTEGER,
    auto_renew  INTEGER DEFAULT 1,
    jobs_today  INTEGER DEFAULT 0,
    reset_date  TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id),
    status        TEXT NOT NULL DEFAULT 'queued',
    stage         TEXT,
    progress      INTEGER DEFAULT 0,
    input_path    TEXT,
    output_path   TEXT,
    face_ref_path TEXT,
    error         TEXT,
    plan          TEXT,
    paid          INTEGER DEFAULT 0,
    mode          TEXT DEFAULT 'balanced',
    clips_data    TEXT,
    story_data    TEXT,
    result_meta   TEXT,
    download_token TEXT,
    download_exp  INTEGER,
    delete_at     INTEGER,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS privacy_requests (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id),
    job_id        TEXT REFERENCES jobs(id),
    platform      TEXT NOT NULL,
    violation_data TEXT NOT NULL,
    request_msg   TEXT NOT NULL,
    status        TEXT DEFAULT 'pending',
    approved_at   INTEGER,
    sent_at       INTEGER,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS analytics (
    id         TEXT PRIMARY KEY,
    user_id    TEXT,
    event      TEXT NOT NULL,
    props      TEXT,
    ts         INTEGER NOT NULL,
    flushed    INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS fraud_log (
    id         TEXT PRIMARY KEY,
    ip         TEXT,
    user_id    TEXT,
    action     TEXT,
    details    TEXT,
    ts         INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_user    ON jobs(user_id);
  CREATE INDEX IF NOT EXISTS idx_jobs_status  ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_analytics_ts ON analytics(ts);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`);

logger.info("[DB] SQLite initialised");

module.exports = db;
