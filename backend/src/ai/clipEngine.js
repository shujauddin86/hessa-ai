/**
 * ai/clipEngine.js — Clip Extraction + Two-Pass Motion Stabilization
 *
 * Upgrades:
 *  Pass 1: vidstabdetect — analyse motion, write transform vectors to .trf file
 *  Pass 2: vidstabtransform — apply stabilization using those vectors
 *
 * This is the same two-pass approach used by professional NLEs (DaVinci Resolve,
 * Adobe Premiere) for smooth, stable footage.
 *
 * Speed mode: single-pass deshake (faster, slightly lower quality)
 * Balanced mode: full two-pass vidstab + border crop
 */
const ffmpeg = require("fluent-ffmpeg");
const path   = require("path");
const fs     = require("fs");
const cfg    = require("../config");
const logger = require("../utils/logger");

ffmpeg.setFfmpegPath(cfg.ffmpeg.path);

const BUFFER_BEFORE = 0.5;   // seconds buffer before segment start
const BUFFER_AFTER  = 0.5;   // seconds buffer after segment end
const MIN_CLIP_DUR  = 2.0;   // discard clips shorter than 2s
const MAX_CLIP_DUR  = 30;    // cap clips at 30s

/**
 * generate — extract and stabilize clips from face segments.
 * @returns Array of {path, start, end, duration, index, segment}
 */
async function generate(videoPath, segments, outputDir, mode = "balanced") {
  const clipsDir = path.join(outputDir, "clips");
  fs.mkdirSync(clipsDir, { recursive: true });

  logger.info("[ClipEngine] Generating clips", { segmentCount: segments.length, mode });

  const clips = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    const start    = Math.max(0, seg.start - BUFFER_BEFORE);
    const duration = Math.min((seg.end + BUFFER_AFTER) - start, MAX_CLIP_DUR);

    if (duration < MIN_CLIP_DUR) {
      logger.debug("[ClipEngine] Skipping short segment", { i, duration });
      continue;
    }

    const outPath = path.join(clipsDir, `clip_${String(i).padStart(3, "0")}.mp4`);

    try {
      if (mode === "balanced") {
        await _extractClipTwoPassStab(videoPath, outPath, start, duration, i, clipsDir);
      } else {
        await _extractClipFast(videoPath, outPath, start, duration);
      }

      clips.push({ path: outPath, start, end: start + duration, duration, index: i, segment: seg });
      logger.debug("[ClipEngine] Clip generated", { i, start: start.toFixed(2), duration: duration.toFixed(2) });
    } catch (err) {
      logger.warn("[ClipEngine] Clip failed, trying fast extract", { i, err: err.message });
      // Fallback: fast single-pass on error
      try {
        await _extractClipFast(videoPath, outPath, start, duration);
        clips.push({ path: outPath, start, end: start + duration, duration, index: i, segment: seg });
      } catch (err2) {
        logger.warn("[ClipEngine] Clip completely skipped", { i, err: err2.message });
      }
    }
  }

  logger.info("[ClipEngine] Done", { clipCount: clips.length });
  return clips;
}

// ── Two-Pass Stabilization ────────────────────────────────────────────────────

async function _extractClipTwoPassStab(videoPath, outPath, startSec, durationSec, index, clipsDir) {
  const trfPath    = path.join(clipsDir, `stab_${index}.trf`);
  const rawPath    = path.join(clipsDir, `raw_${index}.mp4`);

  try {
    // Step 0: Extract raw clip (no encoding overhead for analysis)
    await _extractRaw(videoPath, rawPath, startSec, durationSec);

    // Step 1: Detect motion (vidstabdetect → .trf file)
    await _stabDetect(rawPath, trfPath);

    // Step 2: Apply stabilization transform (vidstabtransform)
    await _stabTransform(rawPath, outPath, trfPath);

  } finally {
    // Cleanup temp files
    [trfPath, rawPath].forEach((f) => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {} });
  }
}

function _extractRaw(videoPath, outPath, startSec, durationSec) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .setStartTime(startSec)
      .setDuration(durationSec)
      .outputOptions([
        "-c:v", "libx264",
        "-preset", "ultrafast",    // speed — this is just an intermediate
        "-crf", "18",              // high quality for accurate motion analysis
        "-c:a", "aac",
        "-avoid_negative_ts", "make_zero",
        "-y",
      ])
      .output(outPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

function _stabDetect(inputPath, trfPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-vf", `vidstabdetect=stepsize=6:shakiness=7:accuracy=9:mincontrast=0.25:result='${_escapePath(trfPath)}'`,
        "-f", "null",
        "-an",
      ])
      .output(process.platform === "win32" ? "NUL" : "/dev/null")
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

function _stabTransform(inputPath, outPath, trfPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-vf", [
          `vidstabtransform=input='${_escapePath(trfPath)}':zoom=1:smoothing=30:crop=black:optzoom=2`,
          "unsharp=luma_msize_x=5:luma_msize_y=5:luma_amount=0.8", // restore sharpness after warp
        ].join(","),
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "128k",
        "-y",
      ])
      .output(outPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

// ── Fast single-pass (speed mode / fallback) ──────────────────────────────────

function _extractClipFast(videoPath, outPath, startSec, durationSec) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .setStartTime(startSec)
      .setDuration(durationSec)
      .outputOptions([
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "28",
        "-vf", "deshake=x=-1:y=-1:w=-1:h=-1:rx=16:ry=16",  // simple 1-pass deshake
        "-c:a", "aac",
        "-b:a", "128k",
        "-avoid_negative_ts", "make_zero",
        "-y",
      ])
      .output(outPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

// ── Util ──────────────────────────────────────────────────────────────────────

function _escapePath(p) {
  // FFmpeg filter path escaping: backslash, colon, single quote
  return p.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

module.exports = { generate };
