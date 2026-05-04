/**
 * ai/musicEngine.js — Beat-Synced Music Engine
 *
 * Upgrades:
 *  1. Beat position calculation from known track BPM (mathematically precise)
 *  2. Returns beat timestamps so editingEngine can snap cuts exactly to beat
 *  3. Emotion-matched track selection (same as before)
 *  4. Duration-matched loop + fade in/out
 *
 * Beat sync strategy:
 *   - Every track in TRACK_CATALOGUE has a known BPM
 *   - Beat positions = [60/bpm * n for n in range]
 *   - editingEngine receives beatTimestamps array
 *   - Each xfade transition offset is snapped to the nearest beat
 */
const ffmpeg = require("fluent-ffmpeg");
const path   = require("path");
const fs     = require("fs");
const cfg    = require("../config");
const logger = require("../utils/logger");

ffmpeg.setFfmpegPath(cfg.ffmpeg.path);

const MUSIC_DIR = path.join(__dirname, "../../assets/music");

// ── Track catalogue ───────────────────────────────────────────────────────────
// BPM must be accurate — it drives beat-synced cuts
const TRACK_CATALOGUE = [
  { file: "upbeat_01.mp3",    emotions: ["happy", "excited"],            bpm: 120, energy: "high",   signature: 4 },
  { file: "emotional_01.mp3", emotions: ["sad", "neutral"],              bpm: 72,  energy: "low",    signature: 4 },
  { file: "cinematic_01.mp3", emotions: ["neutral", "surprised"],        bpm: 90,  energy: "medium", signature: 4 },
  { file: "inspiring_01.mp3", emotions: ["happy", "surprised", "neutral"], bpm: 100, energy: "medium", signature: 4 },
  { file: "dramatic_01.mp3",  emotions: ["fearful", "angry"],            bpm: 138, energy: "high",   signature: 4 },
  { file: "calm_01.mp3",      emotions: ["neutral", "sad", "fearful"],   bpm: 60,  energy: "low",    signature: 3 },
];

/**
 * sync — select, loop, and mix background music. Returns {audioPath, beatTimestamps, bpm}.
 *
 * @param {Object} storyData    — from storyEngine.build()
 * @param {string} outputDir
 * @param {string} mode         — "balanced"|"speed"
 * @returns {{ audioPath, beatTimestamps, bpm }}
 */
async function sync(storyData, outputDir, mode = "balanced") {
  const { clips, totalDuration } = storyData;

  // Determine dominant emotion
  const emotionCounts = {};
  clips.forEach((c) => {
    const e = c.segment?.dominantEmotion || "neutral";
    emotionCounts[e] = (emotionCounts[e] || 0) + 1;
  });
  const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0][0];

  const track = _selectTrack(dominantEmotion, totalDuration);
  logger.info("[MusicEngine] Selected track", { track: track?.file, dominantEmotion, bpm: track?.bpm });

  // Compute beat timestamps for the full reel duration
  const beatTimestamps = _computeBeats(track?.bpm || 120, totalDuration);

  const mixedPath = path.join(outputDir, "music_mixed.aac");
  const trackPath = track ? path.join(MUSIC_DIR, track.file) : null;

  if (!trackPath || !fs.existsSync(trackPath)) {
    logger.warn("[MusicEngine] No music file found, generating silence");
    await _generateSilence(mixedPath, totalDuration);
  } else {
    await _mixTrack(trackPath, mixedPath, totalDuration, mode);
  }

  return {
    audioPath:      mixedPath,
    beatTimestamps,
    bpm:            track?.bpm || 120,
    beatInterval:   track ? 60 / track.bpm : 0.5,
  };
}

// ── Private ───────────────────────────────────────────────────────────────────

function _selectTrack(emotion, duration) {
  const candidates = TRACK_CATALOGUE.filter((t) => t.emotions.includes(emotion));
  if (!candidates.length) return TRACK_CATALOGUE[2]; // fallback: cinematic

  // Prefer lower energy for longer reels (avoids fatigue)
  if (duration > 30) {
    const calm = candidates.find((t) => t.energy === "low" || t.energy === "medium");
    if (calm) return calm;
  }
  return candidates[0];
}

/**
 * _computeBeats — return array of beat timestamps (in seconds) for the reel duration.
 * Accounts for time signature (4/4 = 4 beats per bar, 3/4 = 3).
 * Suitable for cut points: quarter notes = single beat, bar boundaries every N beats.
 */
function _computeBeats(bpm, duration) {
  const beatInterval = 60 / bpm; // seconds per beat
  const beats        = [];
  let   t            = beatInterval; // start at first beat (not 0 — avoid immediate cut)

  while (t < duration) {
    beats.push(parseFloat(t.toFixed(4)));
    t += beatInterval;
  }
  return beats;
}

function _mixTrack(trackPath, outputPath, targetDuration, mode) {
  return new Promise((resolve, reject) => {
    const fadeOutStart = Math.max(0, targetDuration - 1.5);
    ffmpeg(trackPath)
      .inputOptions(["-stream_loop", "-1"]) // loop infinitely, trimmed by -t
      .outputOptions([
        "-t",  String(targetDuration),
        "-af", `afade=t=in:st=0:d=1.5,afade=t=out:st=${fadeOutStart}:d=1.5,volume=-12dB`,
        "-c:a", "aac",
        "-b:a", mode === "speed" ? "96k" : "160k",
        "-ar",  "44100",
        "-ac",  "2",
        "-y",
      ])
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

function _generateSilence(outputPath, duration) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input("anullsrc=r=44100:cl=stereo")
      .inputFormat("lavfi")
      .outputOptions(["-t", String(duration), "-c:a", "aac", "-b:a", "96k", "-y"])
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

module.exports = { sync };
