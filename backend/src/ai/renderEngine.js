/**
 * ai/renderEngine.js — Final render with GPU acceleration + retry + fallback
 *
 * Tries: h264_nvenc (NVIDIA GPU) → h264_videotoolbox (macOS) → libx264 (CPU fallback)
 * Preview render: lower bitrate, faster preset.
 * Final render: higher quality, +faststart for streaming.
 */
const ffmpeg = require("fluent-ffmpeg");
const path   = require("path");
const fs     = require("fs");
const cfg    = require("../config");
const logger = require("../utils/logger");

ffmpeg.setFfmpegPath(cfg.ffmpeg.path);

const ENCODERS = ["h264_nvenc", "h264_videotoolbox", "libx264"];

const PREVIEW_OPTS = {
  bitrate: "1500k",
  maxrate: "2000k",
  preset:  "fast",
  crf:     "24",
  scale:   "scale=854:-2",
};

const FINAL_OPTS = {
  bitrate: "3000k",
  maxrate: "4000k",
  preset:  "medium",
  crf:     "20",
  scale:   "scale=1280:-2",
};

/**
 * render — produce output video.
 * @param {string}  inputPath  — assembled video from editingEngine
 * @param {string}  outputDir  — where to write output
 * @param {string}  jobId
 * @param {string}  mode
 * @param {boolean} isPreview  — preview (lower quality) vs final (full quality)
 * @returns path to rendered video
 */
async function render(inputPath, outputDir, jobId, mode = "balanced", isPreview = false) {
  fs.mkdirSync(outputDir, { recursive: true });

  const suffix   = isPreview ? "preview" : "final";
  const outPath  = path.join(outputDir, `${jobId}_${suffix}.mp4`);
  const opts     = isPreview ? PREVIEW_OPTS : FINAL_OPTS;

  // Try encoders in order until one succeeds
  for (const encoder of ENCODERS) {
    try {
      logger.info("[RenderEngine] Trying encoder", { encoder, isPreview });
      await _renderWith(inputPath, outPath, encoder, opts, mode);
      logger.info("[RenderEngine] Render success", { encoder, outPath });
      return outPath;
    } catch (err) {
      logger.warn("[RenderEngine] Encoder failed, trying next", { encoder, err: err.message });
    }
  }

  throw new Error("All encoders failed — render unsuccessful");
}

/**
 * renderFallback — minimal quality fallback for validation recovery.
 */
async function renderFallback(inputPath, outputDir, jobId) {
  const outPath = path.join(outputDir, `${jobId}_fallback.mp4`);
  await _renderWith(inputPath, outPath, "libx264", {
    bitrate: "800k", maxrate: "1000k", preset: "ultrafast", crf: "30", scale: "scale=640:-2",
  }, "speed");
  return outPath;
}

// ── Private ──────────────────────────────────────────────────────────────────

function _renderWith(inputPath, outputPath, encoder, opts, mode) {
  return new Promise((resolve, reject) => {
    const outputOptions = [
      "-c:v", encoder,
      "-b:v", opts.bitrate,
      "-maxrate", opts.maxrate,
      "-bufsize", "6000k",
      "-vf", opts.scale,
      "-c:a", "aac",
      "-b:a", "128k",
      "-ar", "44100",
      "-ac", "2",
      "-movflags", "+faststart",
      "-y",
    ];

    // GPU-specific options
    if (encoder === "h264_nvenc") {
      outputOptions.push("-preset", "p4", "-tune", "hq", "-rc", "vbr");
    } else if (encoder === "h264_videotoolbox") {
      outputOptions.push("-realtime", "false");
    } else {
      outputOptions.push("-preset", opts.preset, "-crf", opts.crf);
    }

    ffmpeg(inputPath)
      .outputOptions(outputOptions)
      .output(outputPath)
      .on("progress", (p) => logger.debug("[RenderEngine] Progress", { percent: Math.round(p.percent || 0) }))
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

module.exports = { render, renderFallback };
