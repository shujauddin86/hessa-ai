/**
 * queue/worker.js — BullMQ worker process (run separately: node src/queue/worker.js)
 */
require("dotenv").config();
require("express-async-errors");

const { Worker }    = require("bullmq");
const { getRedis }  = require("../config/redis");
const pipeline      = require("../ai/pipeline");
const db            = require("../models/database");
const logger        = require("../utils/logger");

const worker = new Worker(
  "hessa-ai",
  async (job) => {
    const { jobId, userId, plan, stage } = job.data;
    logger.info("[Worker] Processing job", { jobId, stage });

    try {
      await pipeline.run(jobId, userId, plan, stage, (progress, stageName) => {
        // Update DB + BullMQ progress
        db.prepare("UPDATE jobs SET progress = ?, stage = ?, updated_at = ? WHERE id = ?")
          .run(progress, stageName, Date.now(), jobId);
        job.updateProgress(progress);
      });
    } catch (err) {
      logger.error("[Worker] Pipeline error", { jobId, err: err.message });
      db.prepare("UPDATE jobs SET status = 'failed', error = ?, updated_at = ? WHERE id = ?")
        .run(err.message, Date.now(), jobId);
      throw err; // BullMQ will retry
    }
  },
  {
    connection: getRedis(),
    concurrency: 2,   // Process 2 jobs in parallel per worker
  }
);

worker.on("completed", (job) => logger.info("[Worker] Job completed", { jobId: job.data.jobId }));
worker.on("failed",    (job, err) => logger.error("[Worker] Job failed", { jobId: job?.data?.jobId, err: err.message }));
worker.on("error",     (err) => logger.error("[Worker] Error", { err: err.message }));

logger.info("[Worker] BullMQ worker started — concurrency: 2");

module.exports = worker;
