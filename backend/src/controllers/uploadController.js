/**
 * controllers/uploadController.js — Chunked upload + job creation
 */
const { v4: uuid } = require("uuid");
const path         = require("path");
const db           = require("../models/database");
const storage      = require("../services/storage");
const analytics    = require("../services/analytics");
const { canGenerate } = require("./subscriptionController");
const { addJobToQueue } = require("../queue");
const logger       = require("../utils/logger");

/**
 * uploadChunk — handles chunked multipart upload.
 * Client sends: chunkIndex, totalChunks, jobId (for subsequent chunks).
 * Returns jobId on first chunk, confirmation on subsequent.
 */
exports.uploadChunk = async (req, res) => {
  try {
    const { chunkIndex, totalChunks, jobId: existingJobId } = req.body;
    const idx   = parseInt(chunkIndex, 10);
    const total = parseInt(totalChunks, 10);

    if (isNaN(idx) || isNaN(total) || total < 1) {
      return res.status(400).json({ error: "Invalid chunk metadata" });
    }

    // Entitlement check
    const sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(req.user.id);
    if (!canGenerate(sub)) {
      return res.status(403).json({ error: "Subscription limit reached or payment required" });
    }

    // Active job check (1 job per user at a time)
    const activeJob = db.prepare(
      "SELECT id FROM jobs WHERE user_id = ? AND status IN ('queued','processing','face_required','preview_ready')"
    ).get(req.user.id);
    if (activeJob) {
      return res.status(409).json({ error: "You already have an active job", jobId: activeJob.id });
    }

    const jobId = existingJobId || uuid();

    // Save chunk
    const { dir } = storage.saveChunk(jobId, idx, total, req.file.buffer);

    // If all chunks received → merge
    if (idx === total - 1) {
      const merged = await storage.mergeChunks(jobId, total, "input.mp4");

      // Create job record
      const now  = Date.now();
      const mode = _pickMode(req.user.id, total);
      db.prepare(
        `INSERT INTO jobs (id,user_id,status,stage,progress,input_path,mode,plan,paid,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      ).run(jobId, req.user.id, "queued", "upload_complete", 5, merged, mode,
            sub.plan, sub.plan === "PAY_PER_USE" ? 1 : 1, now, now);

      analytics.track("VIDEO_UPLOADED", { jobId, chunks: total, mode }, req.user.id);
      return res.json({ jobId, status: "upload_complete", message: "Upload complete. Awaiting face verification." });
    }

    res.json({ jobId, chunkReceived: idx, totalChunks: total });
  } catch (e) {
    logger.error("[Upload] Chunk error", { err: e.message });
    res.status(500).json({ error: "Chunk upload failed" });
  }
};

/**
 * uploadFaceReference — stores face reference image for verification.
 */
exports.uploadFaceReference = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = db.prepare("SELECT * FROM jobs WHERE id = ? AND user_id = ?").get(jobId, req.user.id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const dir      = storage.jobDir(jobId, "upload");
    const facePath = path.join(dir, `face_ref_${Date.now()}.jpg`);
    require("fs").writeFileSync(facePath, req.file.buffer);

    db.prepare("UPDATE jobs SET face_ref_path = ?, status = 'queued', stage = 'face_verified', updated_at = ? WHERE id = ?")
      .run(facePath, Date.now(), jobId);

    // Enqueue AI pipeline
    await addJobToQueue(jobId, req.user.id, job.plan || "PAY_PER_USE");
    analytics.track("FACE_REFERENCE_UPLOADED", { jobId }, req.user.id);

    res.json({ jobId, status: "queued", message: "Face reference received. Processing started." });
  } catch (e) {
    logger.error("[Upload] Face ref error", { err: e.message });
    res.status(500).json({ error: "Face upload failed" });
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function _pickMode(userId, totalChunks) {
  // Video >20 min (rough estimate: 1 chunk = ~10MB, ~30s at 3Mbps → 20 chunks ≈ 10 min)
  // High load check — simplified; production: query Redis queue length
  if (totalChunks > 40) return "speed";
  return "balanced";
}
