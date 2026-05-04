/**
 * ai/frameExtractor.js — Adaptive frame extraction
 * Extracts keyframes at an intelligent rate based on video length + mode.
 * Returns array of { path, timestamp, index }.
 */
const ffmpeg = require("fluent-ffmpeg");
const path   = require("path");
const fs     = require("fs");
const cfg    = require("../config");
const { getDuration } = require("./normalizer");
const logger = require("../utils/logger");

ffmpeg.setFfmpegPath(cfg.ffmpeg.path);

const FPS_BALANCED = 2;   // 2 frames/sec
const FPS_SPEED    = 1;   // 1 frame/sec for long videos

async function extract(videoPath, outputDir, mode = "balanced") {
  const framesDir = path.join(outputDir, "frames");
  fs.mkdirSync(framesDir, { recursive: true });

  const duration = await getDuration(videoPath);
  const fps      = mode === "speed" || duration > 1200 ? FPS_SPEED : FPS_BALANCED;

  logger.info("[FrameExtractor] Extracting", { duration: Math.round(duration), fps, mode });

  await _extractFrames(videoPath, framesDir, fps);

  const files = fs.readdirSync(framesDir)
    .filter((f) => f.endsWith(".jpg"))
    .sort();

  const result = files.map((f, i) => {
    const idx  = parseInt(f.replace("frame_", "").replace(".jpg", ""), 10) || i;
    return {
      path:      path.join(framesDir, f),
      timestamp: idx / fps,
      index:     idx,
      fps,
    };
  });

  logger.info("[FrameExtractor] Done", { frameCount: result.length });
  return result;
}

function _extractFrames(videoPath, outputDir, fps) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        "-vf", `fps=${fps},scale=480:-1`,  // downscale for faster face detection
        "-q:v", "3",
        "-f", "image2",
      ])
      .output(path.join(outputDir, "frame_%05d.jpg"))
      .on("end",   resolve)
      .on("error", reject)
      .run();
  });
}

module.exports = { extract };
