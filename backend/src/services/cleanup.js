/**
 * services/cleanup.js — Auto-delete job data after completion
 * Scheduled via node-cron every minute. Deletes ~10 min after job done.
 */
const cron   = require("node-cron");
const db     = require("../models/database");
const storage = require("./storage");
const logger  = require("../utils/logger");
const cfg     = require("../config");

function scheduleCleanup() {
  cron.schedule("* * * * *", async () => {
    try {
      const now    = Date.now();
      const stale  = db.prepare(
        "SELECT id FROM jobs WHERE delete_at IS NOT NULL AND delete_at <= ? AND status NOT IN ('deleted')"
      ).all(now);

      for (const job of stale) {
        storage.deleteJobData(job.id);
        db.prepare("UPDATE jobs SET status = 'deleted', output_path = NULL, input_path = NULL, face_ref_path = NULL, updated_at = ? WHERE id = ?")
          .run(Date.now(), job.id);
        logger.info("[Cleanup] Job data deleted", { jobId: job.id });
      }
    } catch (e) {
      logger.error("[Cleanup] Error", { err: e.message });
    }
  });

  logger.info("[Cleanup] Scheduled auto-delete cron started");
}

/**
 * scheduleJobDelete — marks a job for deletion after autoDelete.minutes
 */
function scheduleJobDelete(jobId) {
  const deleteAt = Date.now() + cfg.autoDelete.minutes * 60 * 1000;
  db.prepare("UPDATE jobs SET delete_at = ? WHERE id = ?").run(deleteAt, jobId);
}

module.exports = { scheduleCleanup, scheduleJobDelete };
