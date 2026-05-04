/**
 * ai/lutEngine.js — Apple-level LUT Color Grading Engine
 *
 * Strategy:
 *  1. Select a LUT (.cube file) based on clip emotion / mood
 *  2. Apply via FFmpeg `lut3d` filter (industry-standard, same as DaVinci Resolve)
 *  3. Fallback: FFmpeg `curves` + `eq` filter stack if LUT file not present
 *
 * LUT files go in: backend/assets/luts/
 * Format: .cube (standard 3D LUT, 33x33x33 recommended)
 *
 * Free LUT sources:
 *   - https://luts.iwltbap.com
 *   - https://fixthephoto.com/free-luts
 *   - https://www.rocketstock.com/free-after-effects-templates/35-free-luts-for-color-grading-videos/
 */

const path = require("path");
const fs   = require("fs");
const cfg  = require("../config");
const logger = require("../utils/logger");

// ── Emotion → LUT mapping ────────────────────────────────────────────────────
const EMOTION_LUT_MAP = {
  happy:     "vivid",      // High saturation, warm golden tones
  excited:   "vivid",
  surprised: "cinematic",  // Teal and orange — dramatic pop
  neutral:   "cinematic",
  sad:       "muted",      // Desaturated, cool blue tones
  fearful:   "dark",       // High contrast, crushed shadows
  disgusted: "dark",
  angry:     "dark",
};

// ── LUT file names (mapped from config) ─────────────────────────────────────
function _getLutFile(mood) {
  const fileMap = {
    vivid:     cfg.lut.vivid,
    cinematic: cfg.lut.cinematic,
    muted:     cfg.lut.muted,
    dark:      cfg.lut.dark,
    warm:      cfg.lut.warm,
  };
  const filename = fileMap[mood] || fileMap.cinematic;
  return path.join(cfg.lut.dir, filename);
}

/**
 * getFilter — return FFmpeg video filter string for LUT grading.
 * Uses lut3d if .cube file exists, else falls back to curves + eq.
 *
 * @param {string} emotion   — dominant emotion of the clip
 * @param {string} mode      — "balanced"|"speed"
 * @returns {string} FFmpeg -vf filter string
 */
function getFilter(emotion = "neutral", mode = "balanced") {
  const mood    = EMOTION_LUT_MAP[emotion] || "cinematic";
  const lutFile = _getLutFile(mood);

  // Try LUT file first
  if (fs.existsSync(lutFile)) {
    logger.debug("[LUT] Applying LUT file", { mood, lutFile: path.basename(lutFile) });
    // Safely escape the path for FFmpeg (spaces etc.)
    const safePath = lutFile.replace(/\\/g, "/").replace(/:/g, "\\:");
    // Combine lut3d with subtle sharpening
    if (mode === "speed") {
      return `lut3d='${safePath}'`;
    }
    return `lut3d='${safePath}',unsharp=luma_msize_x=3:luma_msize_y=3:luma_amount=0.5`;
  }

  // Fallback: software curves approximation
  logger.debug("[LUT] LUT file not found, using curves fallback", { mood, lutFile });
  return _getCurvesFallback(mood, mode);
}

/**
 * _getCurvesFallback — approximate LUT grading using FFmpeg curves + eq.
 * Results in cinematic colour grades without requiring external .cube files.
 */
function _getCurvesFallback(mood, mode) {
  const filters = {
    vivid: [
      "eq=brightness=0.03:contrast=1.08:saturation=1.3:gamma=0.95",
      "curves=r='0/0 0.5/0.56 1/1':g='0/0 0.5/0.51 1/1':b='0/0 0.5/0.47 1/0.95'",
    ],
    cinematic: [
      "eq=brightness=0.01:contrast=1.05:saturation=0.95:gamma=1.0",
      // Teal shadows + orange highlights (Hollywood LUT style)
      "curves=r='0/0.05 0.5/0.55 1/1':g='0/0.0 0.5/0.50 1/0.95':b='0/0.08 0.5/0.52 1/0.88'",
    ],
    muted: [
      "eq=brightness=0.0:contrast=1.02:saturation=0.65:gamma=1.05",
      "curves=r='0/0.03 1/0.97':g='0/0.03 1/0.95':b='0/0.06 1/0.98'",
    ],
    dark: [
      "eq=brightness=-0.04:contrast=1.15:saturation=0.85:gamma=0.9",
      "curves=r='0/0.0 0.3/0.22 1/0.95':g='0/0.0 0.3/0.20 1/0.90':b='0/0.02 0.3/0.25 1/1'",
    ],
    warm: [
      "eq=brightness=0.02:contrast=1.06:saturation=1.1:gamma=0.97",
      "curves=r='0/0.05 0.5/0.58 1/1':g='0/0 0.5/0.51 1/0.96':b='0/0 0.5/0.45 1/0.88'",
    ],
  };

  const steps = filters[mood] || filters.cinematic;

  if (mode === "speed") {
    // In speed mode, apply only the eq filter (faster)
    return steps[0];
  }

  // Full grade: eq + curves + subtle sharpening
  return [...steps, "unsharp=luma_msize_x=3:luma_msize_y=3:luma_amount=0.4"].join(",");
}

module.exports = { getFilter };
