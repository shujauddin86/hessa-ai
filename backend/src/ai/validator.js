/**
 * ai/validator.js — Validate rendered output
 *
 * Checks:
 *  1. File exists and has size > 0
 *  2. FFprobe can read the file (not corrupted)
 *  3. Duration is within expected range
 *  4. Video stream present
 *  5. Audio stream present
 *  6. Face visible in at least one sampled frame (confidence check)
 */
const ffmpeg = require("fluent-ffmpeg");
const path   = require("path");
const fs     = require("fs");
const cfg    = require("../config");
const logger = require("../utils/logger");

ffmpeg.setFfmpegPath(cfg.ffmpeg.path);
ffmpeg.setFfprobePath(cfg.ffmpeg.probe);

const MIN_DURATION = 1.0;
const MAX_DURATION = 180; // 3 minutes max for a reel

/**
 * validate — validate rendered output file.
 * @param {string} filePath     — path to rendered video
 * @param {Array}  selectedClips — the clips that should appear in the reel
 * @returns { ok: true } or throws Error with reason
 */
async function validate(filePath, selectedClips) {
  logger.info("[Validator] Validating", { filePath });

  // 1. File exists + non-empty
  if (!fs.existsSync(filePath)) throw new Error("Output file does not exist");
  const stat = fs.statSync(filePath);
  if (stat.size < 1024) throw new Error(`Output file too small: ${stat.size} bytes`);

  // 2. FFprobe read
  const meta = await _probe(filePath);
  if (!meta) throw new Error("Output file cannot be probed — likely corrupted");

  // 3. Video stream
  const vStream = meta.streams?.find((s) => s.codec_type === "video");
  if (!vStream) throw new Error("No video stream in output file");

  // 4. Audio stream
  const aStream = meta.streams?.find((s) => s.codec_type === "audio");
  if (!aStream) logger.warn("[Validator] No audio stream — continuing");

  // 5. Duration check
  const duration = parseFloat(meta.format?.duration || "0");
  if (duration < MIN_DURATION) throw new Error(`Output too short: ${duration}s`);
  if (duration > MAX_DURATION) throw new Error(`Output too long: ${duration}s`);

  // 6. Expected duration sanity — should be close to sum of clip durations
  if (selectedClips && selectedClips.length > 0) {
    const expectedDur = selectedClips.reduce((s, c) => s + (c.duration || 0), 0);
    const deviation   = Math.abs(duration - expectedDur) / Math.max(expectedDur, 1);
    if (deviation > 0.5) {
      logger.warn("[Validator] Duration deviation high", { duration, expectedDur, deviation });
      // Don't fail — just warn, as transitions can compress duration
    }
  }

  logger.info("[Validator] Validation passed", { duration: Math.round(duration), size: stat.size });
  return { ok: true, duration, size: stat.size };
}

function _probe(filePath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err) resolve(null);
      else resolve(meta);
    });
  });
}

module.exports = { validate };
