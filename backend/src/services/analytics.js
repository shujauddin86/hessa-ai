/**
 * services/analytics.js — Event tracking with batched flush
 */
const { v4: uuid } = require("uuid");
const db   = require("../models/database");
const cfg  = require("../config");
const logger = require("../utils/logger");

const _queue = [];

function track(event, props = {}, userId = null) {
  _queue.push({
    id:      uuid(),
    user_id: userId,
    event,
    props:   JSON.stringify(props),
    ts:      Date.now(),
  });
  if (_queue.length >= cfg.analytics.batchSize) flush();
}

function flush() {
  if (!_queue.length) return;
  const batch = _queue.splice(0, _queue.length);
  const insert = db.prepare(
    "INSERT INTO analytics (id, user_id, event, props, ts) VALUES (?,?,?,?,?)"
  );
  const insertMany = db.transaction((rows) => {
    for (const r of rows) insert.run(r.id, r.user_id, r.event, r.props, r.ts);
  });
  try {
    insertMany(batch);
    // Mark flushed
    db.prepare("UPDATE analytics SET flushed = 1 WHERE flushed = 0").run();
  } catch (e) {
    logger.warn("[Analytics] Flush failed", { err: e.message });
  }
}

// Auto-flush on interval
setInterval(flush, cfg.analytics.flushMs);

module.exports = { track, flush };
