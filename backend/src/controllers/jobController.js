/**
 * controllers/jobController.js — Job status, preview, clip selection, download
 */
const path         = require("path");
const fs           = require("fs");
const { v4: uuid } = require("uuid");
const db           = require("../models/database");
const { hmac }     = require("../utils/encryption");
const cleanup      = require("../services/cleanup");
const analytics    = require("../services/analytics");
const { addJobToQueue } = require("../queue");
const logger       = require("../utils/logger");
const cfg          = require("../config");

exports.getJob = (req, res) => {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
    .get(req.params.jobId, req.user.id);
  if (!job) return res.status(404).json({ error: "Job not found" });

  const clips = job.clips_data ? JSON.parse(job.clips_data) : null;
  const story = job.story_data ? JSON.parse(job.story_data) : null;
  res.json({ job: _sanitizeJob(job), clips, story });
};

exports.listJobs = (req, res) => {
  const jobs = db.prepare(
    "SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20"
  ).all(req.user.id);
  res.json({ jobs: jobs.map(_sanitizeJob) });
};

/**
 * selectClips — user chooses which clips to keep before final reel generation.
 */
exports.selectClips = async (req, res) => {
  try {
    const { jobId }     = req.params;
    const { clipIds }   = req.body;   // array of clip IDs to include

    const job = db.prepare("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
      .get(jobId, req.user.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.status !== "preview_ready") {
      return res.status(400).json({ error: "Job not in preview state" });
    }

    const clips = job.clips_data ? JSON.parse(job.clips_data) : [];
    if (!Array.isArray(clipIds) || clipIds.length === 0) {
      return res.status(400).json({ error: "Select at least 1 clip" });
    }

    const selected = clips.filter((c) => clipIds.includes(c.id));
    if (!selected.length) return res.status(400).json({ error: "No valid clips selected" });

    // Mark selected, re-queue for final render
    const updatedClips = clips.map((c) => ({
      ...c,
      selected: clipIds.includes(c.id),
    }));

    db.prepare(
      "UPDATE jobs SET clips_data = ?, status = 'queued', stage = 'final_render', progress = 70, updated_at = ? WHERE id = ?"
    ).run(JSON.stringify(updatedClips), Date.now(), jobId);

    await addJobToQueue(jobId, req.user.id, job.plan, "final_render");
    analytics.track("CLIPS_SELECTED", { jobId, count: selected.length }, req.user.id);

    res.json({ jobId, status: "processing", message: "Final render started" });
  } catch (e) {
    logger.error("[Job] selectClips error", { err: e.message });
    res.status(500).json({ error: "Clip selection failed" });
  }
};

/**
 * regenerate — user requests full regen (counts as a new job use).
 */
exports.regenerate = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = db.prepare("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
      .get(jobId, req.user.id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Check daily limit for ADVANCED plan
    const sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(req.user.id);
    if (!sub || sub.status !== "active") {
      return res.status(403).json({ error: "No active subscription" });
    }
    if (sub.plan === "ADVANCED") {
      const today = new Date().toISOString().slice(0, 10);
      if (sub.reset_date === today && (sub.jobs_today || 0) >= 3) {
        return res.status(403).json({ error: "Daily limit of 3 reels reached. Resets at midnight." });
      }
    }

    db.prepare(
      "UPDATE jobs SET status = 'queued', stage = 'regenerate', progress = 0, updated_at = ? WHERE id = ?"
    ).run(Date.now(), jobId);
    await addJobToQueue(jobId, req.user.id, job.plan, "regenerate");
    analytics.track("JOB_REGENERATED", { jobId }, req.user.id);

    res.json({ jobId, status: "queued", message: "Regeneration started" });
  } catch (e) {
    res.status(500).json({ error: "Regenerate failed" });
  }
};

/**
 * getDownloadLink — issues a signed, expiring, one-time download link.
 */
exports.getDownloadLink = (req, res) => {
  try {
    const { jobId } = req.params;
    const job = db.prepare("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
      .get(jobId, req.user.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.status !== "done") return res.status(400).json({ error: "Reel not ready" });
    if (!job.output_path || !fs.existsSync(job.output_path)) {
      return res.status(404).json({ error: "Output file missing or already deleted" });
    }

    const expiresAt = Date.now() + cfg.cdn.linkTTL * 1000;
    const token     = uuid();
    const sig       = hmac(`${jobId}:${token}:${expiresAt}`);
    const downloadToken = `${token}:${sig}`;

    db.prepare("UPDATE jobs SET download_token = ?, download_exp = ? WHERE id = ?")
      .run(downloadToken, expiresAt, jobId);

    const url = `${cfg.cdn.baseUrl}/api/download/${jobId}?token=${encodeURIComponent(downloadToken)}`;
    analytics.track("DOWNLOAD_LINK_ISSUED", { jobId }, req.user.id);

    res.json({ url, expiresAt, ttlSeconds: cfg.cdn.linkTTL });
  } catch (e) {
    logger.error("[Job] getDownloadLink error", { err: e.message });
    res.status(500).json({ error: "Download link generation failed" });
  }
};

/**
 * serveDownload — serves the reel file, invalidates token (one-time).
 */
exports.serveDownload = (req, res) => {
  try {
    const { jobId } = req.params;
    const { token } = req.query;

    const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId);
    if (!job) return res.status(404).send("Not found");

    // Validate token
    if (!token || job.download_token !== token) return res.status(403).send("Invalid token");
    if (Date.now() > (job.download_exp || 0)) return res.status(403).send("Link expired");

    const filePath = job.output_path;
    if (!filePath || !fs.existsSync(filePath)) return res.status(404).send("File gone");

    // Invalidate token (one-time download)
    db.prepare("UPDATE jobs SET download_token = NULL WHERE id = ?").run(jobId);
    // Schedule auto-delete
    cleanup.scheduleJobDelete(jobId);

    analytics.track("REEL_DOWNLOADED", { jobId }, job.user_id);

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="hessa_reel_${jobId}.mp4"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    logger.error("[Job] serveDownload error", { err: e.message });
    res.status(500).send("Download failed");
  }
};

// ── SSE Progress Stream ────────────────────────────────────────────────────────

exports.streamProgress = (req, res) => {
  const { jobId } = req.params;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const interval = setInterval(() => {
    const job = db.prepare("SELECT status,stage,progress,error FROM jobs WHERE id = ? AND user_id = ?")
      .get(jobId, req.user.id);
    if (!job) { send({ error: "Job not found" }); clearInterval(interval); res.end(); return; }

    send({ status: job.status, stage: job.stage, progress: job.progress, error: job.error });

    if (["done", "failed", "deleted"].includes(job.status)) {
      clearInterval(interval);
      setTimeout(() => res.end(), 500);
    }
  }, 1000);

  req.on("close", () => clearInterval(interval));
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function _sanitizeJob(j) {
  const { face_ref_path, download_token, ...safe } = j;
  return safe;
}
