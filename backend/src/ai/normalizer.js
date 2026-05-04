/**
 * ai/normalizer.js — Video normalization to MP4 H264
 * Handles: resolution scaling, FPS normalization, codec conversion,
 * audio normalization, corrupt file detection.
 */
const ffmpeg = require("fluent-ffmpeg");
const path   = require("path");
const fs     = require("fs");
const cfg    = require("../config");
const logger = require("../utils/logger");

ffmpeg.setFfmpegPath(cfg.ffmpeg.path);
ffmpeg.setFfprobePath(cfg.ffmpeg.probe);

const BALANCED_CONFIG = {
  videoBitrate: "2000k",
  audioBitrate: "128k",
  fps:           24,
  maxWidth:      1280,
  maxHeight:     720,
  preset:        "medium",
};

const SPEED_CONFIG = {
  videoBitrate: "1000k",
  audioBitrate: "96k",
  fps:           24,
  maxWidth:      854,
  maxHeight:     480,
  preset:        "ultrafast",
};

async function normalize(inputPath, outputDir, mode = "balanced") {
  const c      = mode === "speed" ? SPEED_CONFIG : BALANCED_CONFIG;
  const output = path.join(outputDir, "normalized.mp4");

  // Probe file to detect corruption / get metadata
  const meta = await probe(inputPath);
  if (!meta) throw new Error("Cannot read video file — file may be corrupted");

  const vStream = meta.streams?.find((s) => s.codec_type === "video");
  if (!vStream) throw new Error("No video stream found in file");

  const duration = parseFloat(meta.format?.duration || "0");
  if (duration < 1)   throw new Error("Video too short (< 1 second)");
  if (duration > 1900) throw new Error("Video exceeds 30 minute limit");

  logger.info("[Normalizer] Start", { inputPath, duration: Math.round(duration), mode });

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(inputPath)
      .outputOptions([
        "-c:v", "libx264",
        "-preset", c.preset,
        "-b:v", c.videoBitrate,
        "-maxrate", c.videoBitrate,
        "-bufsize", "4000k",
        "-vf", `scale='min(${c.maxWidth},iw)':'min(${c.maxHeight},ih)':force_original_aspect_ratio=decrease,fps=${c.fps}`,
        "-c:a", "aac",
        "-b:a", c.audioBitrate,
        "-ac", "2",
        "-ar", "44100",
        "-movflags", "+faststart",
        "-y",
      ])
      .output(output)
      .on("progress", (p) => logger.debug("[Normalizer] Progress", { percent: Math.round(p.percent || 0) }))
      .on("end",   () => { logger.info("[Normalizer] Done", { output }); resolve(output); })
      .on("error", (e) => {
        // Fallback: try with error correction flag
        if (!e.message.includes("retry")) {
          logger.warn("[Normalizer] Retry with error recovery", { err: e.message });
          return _fallbackNormalize(inputPath, output, c).then(resolve).catch(reject);
        }
        reject(new Error(`Normalization failed: ${e.message}`));
      });
    cmd.run();
  });
}

function _fallbackNormalize(inputPath, output, c) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .inputOptions(["-err_detect", "ignore_err"])
      .outputOptions([
        "-c:v", "libx264", "-preset", "ultrafast",
        "-b:v", "800k", "-vf", `fps=${c.fps}`,
        "-c:a", "aac", "-b:a", "96k",
        "-y",
      ])
      .output(output)
      .on("end",   () => resolve(output))
      .on("error", (e) => reject(new Error(`Fallback normalize failed: ${e.message}`)))
      .run();
  });
}

function probe(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err) resolve(null);
      else resolve(meta);
    });
  });
}

async function getDuration(filePath) {
  const meta = await probe(filePath);
  return parseFloat(meta?.format?.duration || "0");
}

module.exports = { normalize, probe, getDuration };
