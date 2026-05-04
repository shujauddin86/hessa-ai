/**
 * queue/index.js — BullMQ job queue with priority routing
 * Pro users (ADVANCED/PRIVACY) get priority=10; PAY_PER_USE gets priority=5.
 */
const { Queue } = require("bullmq");
const { getRedis } = require("../config/redis");
const logger     = require("../utils/logger");

let _queue = null;

function getQueue() {
  if (_queue) return _queue;
  _queue = new Queue("hessa-ai", {
    connection: getRedis(),
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail:     { count: 50 },
      attempts:          3,
      backoff: { type: "exponential", delay: 2000 },
    },
  });
  logger.info("[Queue] BullMQ queue initialised");
  return _queue;
}

/**
 * addJobToQueue — enqueues an AI pipeline job.
 * @param {string} jobId    - DB job ID
 * @param {string} userId   - user ID
 * @param {string} plan     - subscription plan
 * @param {string} stage    - optional: 'final_render' | 'regenerate' (default: full pipeline)
 */
async function addJobToQueue(jobId, userId, plan, stage = "full_pipeline") {
  const q        = getQueue();
  const priority = ["ADVANCED", "PRIVACY"].includes(plan) ? 10 : 5;

  const bullJob = await q.add(
    "process",
    { jobId, userId, plan, stage },
    { priority, jobId: `hessa_${jobId}` }
  );

  logger.info("[Queue] Job enqueued", { jobId, priority, stage });
  return bullJob;
}

module.exports = { getQueue, addJobToQueue };
