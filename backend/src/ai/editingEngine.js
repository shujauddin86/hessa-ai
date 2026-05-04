/**
 * ai/editingEngine.js — Apple-Level Cinematic Editing Engine
 *
 * Upgrades:
 *  1. LUT Color Grading per clip (via lutEngine.js)
 *     — .cube 3D LUT via FFmpeg lut3d filter
 *     — emotion-matched grade (vivid/cinematic/muted/dark)
 *     — fallback to curves+eq software grade
 *
 *  2. Beat-Synced Cuts
 *     — xfade offsets are snapped to beat timestamps from musicEngine
 *     — ensures transitions land exactly on the musical beat
 *     — storyEngine already snaps clip durations to beat boundaries
 *
 *  3. Assembly
 *     — per-clip grade applied before concat
 *     — xfade transitions between graded clips
 *     — final music mix merge
 */
const ffmpeg  = require("fluent-ffmpeg");
const path    = require("path");
const fs      = require("fs");
const cfg     = require("../config");
const lutEngine = require("./lutEngine");
const logger  = require("../utils/logger");

ffmpeg.setFfmpegPath(cfg.ffmpeg.path);

/**
 * edit — assemble graded clips with beat-synced transitions and music.
 *
 * @param {Object} storyData — {clips, transitions, totalDuration, beatTimestamps, bpm}
 * @param {Object|string} musicResult — {audioPath, beatTimestamps, bpm} OR string path (legacy)
 * @param {string} outputDir
 * @param {string} mode
 * @returns path to assembled video
 */
async function edit(storyData, musicResult, outputDir, mode = "balanced") {
  const { clips, transitions, beatTimestamps = [], bpm = 120 } = storyData;
  const outputPath = path.join(outputDir, "assembled.mp4");

  // Support both new {audioPath} format and legacy string path
  const musicPath = typeof musicResult === "string" ? musicResult : musicResult?.audioPath;
  // Merge beat data from music engine if not already in storyData
  const beats = beatTimestamps.length
    ? beatTimestamps
    : (musicResult?.beatTimestamps || []);

  logger.info("[EditingEngine] Assembling", { clipCount: clips.length, mode, beatCount: beats.length });

  // ── Step 1: Grade each clip individually ──────────────────────────────────
  const gradedClips = await _gradeClips(clips, outputDir, mode);

  // ── Step 2: Assemble with beat-synced xfade transitions ──────────────────
  const assembledPath = path.join(outputDir, "assembled_no_music.mp4");

  if (gradedClips.length === 1) {
    fs.copyFileSync(gradedClips[0].gradedPath, assembledPath);
  } else {
    await _assembleWithBeatSyncedCuts(gradedClips, transitions, beats, assembledPath, mode);
  }

  // ── Step 3: Mix music ─────────────────────────────────────────────────────
  await _mergeWithMusic(assembledPath, musicPath, outputPath, mode);

  // Cleanup graded clips
  gradedClips.forEach((c) => { try { fs.unlinkSync(c.gradedPath); } catch (_) {} });
  try { fs.unlinkSync(assembledPath); } catch (_) {}

  return outputPath;
}

// ── Step 1: Per-clip LUT color grading ───────────────────────────────────────

async function _gradeClips(clips, outputDir, mode) {
  const gradedDir = path.join(outputDir, "graded");
  fs.mkdirSync(gradedDir, { recursive: true });

  const results = [];

  for (let i = 0; i < clips.length; i++) {
    const clip    = clips[i];
    const emotion = clip.segment?.dominantEmotion || "neutral";
    const lutFilter = lutEngine.getFilter(emotion, mode);
    const gradedPath = path.join(gradedDir, `graded_${i}.mp4`);

    try {
      await _applyGrade(clip.path, gradedPath, lutFilter, mode);
      results.push({ ...clip, gradedPath, emotion });
      logger.debug("[EditingEngine] Graded clip", { i, emotion, filter: lutFilter.slice(0, 40) });
    } catch (err) {
      logger.warn("[EditingEngine] Grade failed, using original", { i, err: err.message });
      results.push({ ...clip, gradedPath: clip.path, emotion }); // use ungraded
    }
  }

  return results;
}

function _applyGrade(inputPath, outputPath, lutFilter, mode) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-vf",  lutFilter,
        "-c:v", "libx264",
        "-preset", mode === "speed" ? "ultrafast" : "fast",
        "-crf",  mode === "speed" ? "28" : "22",
        "-c:a", "copy",
        "-y",
      ])
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

// ── Step 2: Beat-synced xfade assembly ────────────────────────────────────────

async function _assembleWithBeatSyncedCuts(clips, transitions, beats, outputPath, mode) {
  try {
    await _xfadeAssemble(clips, transitions, beats, outputPath, mode);
  } catch (err) {
    logger.warn("[EditingEngine] xfade failed, falling back to simple concat", { err: err.message });
    await _simpleConcatFallback(clips, outputPath);
  }
}

function _xfadeAssemble(clips, transitions, beats, outputPath, mode) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();

    // Add graded clip inputs
    clips.forEach((c) => cmd.input(c.gradedPath));

    // Build xfade filter_complex with beat-snapped offsets
    const filters = [];
    let   prevOut  = "[0:v]";
    let   cumulativeDur = 0;

    for (let i = 0; i < clips.length - 1; i++) {
      const trans     = transitions[i] || { type: "fade", durationMs: 400 };
      const transDur  = (trans.durationMs || 400) / 1000;
      const clipDur   = clips[i].duration;

      // Natural offset = sum of preceding clip durations - transition overlap
      const naturalOffset = cumulativeDur + clipDur - transDur;

      // Snap to nearest beat for rhythmic precision
      const beatOffset = beats.length
        ? _snapToBeat(naturalOffset, beats, 60 / 120) // use quarter-beat snap
        : naturalOffset;

      const xfadeType = _mapXfade(trans.type);
      const outLabel  = i === clips.length - 2 ? "[vout]" : `[v${i + 1}]`;

      filters.push(
        `${prevOut}[${i + 1}:v]xfade=transition=${xfadeType}:duration=${transDur}:offset=${Math.max(0, beatOffset.toFixed(4))}${outLabel}`
      );

      cumulativeDur = beatOffset; // next clip's start reference
      prevOut = outLabel;
    }

    // Audio concat
    const audioConcat = clips.map((_, i) => `[${i}:a]`).join("");
    filters.push(`${audioConcat}concat=n=${clips.length}:v=0:a=1[aout]`);

    cmd
      .complexFilter(filters.join(";"))
      .outputOptions([
        "-map", "[vout]",
        "-map", "[aout]",
        "-c:v", "libx264",
        "-preset", mode === "speed" ? "ultrafast" : "fast",
        "-crf", mode === "speed" ? "28" : "22",
        "-c:a", "aac",
        "-b:a", "128k",
        "-y",
      ])
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

function _simpleConcatFallback(clips, outputPath) {
  return new Promise((resolve, reject) => {
    const listPath = outputPath + "_concat.txt";
    fs.writeFileSync(listPath, clips.map((c) => `file '${c.gradedPath}'`).join("\n"));

    ffmpeg()
      .input(listPath)
      .inputOptions(["-f", "concat", "-safe", "0"])
      .outputOptions(["-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-c:a", "aac", "-y"])
      .output(outputPath)
      .on("end", () => { try { fs.unlinkSync(listPath); } catch (_) {} resolve(); })
      .on("error", reject)
      .run();
  });
}

// ── Step 3: Music merge ───────────────────────────────────────────────────────

function _mergeWithMusic(videoPath, musicPath, outputPath, mode) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(videoPath);

    if (musicPath && fs.existsSync(musicPath)) {
      cmd.input(musicPath);
      cmd.outputOptions([
        "-map",  "0:v",
        "-map",  "1:a",
        "-c:v",  "copy",
        "-c:a",  "aac",
        "-b:a",  mode === "speed" ? "96k" : "160k",
        "-shortest",
        "-y",
      ]);
    } else {
      cmd.outputOptions(["-c:v", "copy", "-c:a", "aac", "-y"]);
    }

    cmd
      .output(outputPath)
      .on("end", resolve)
      .on("error", (e) => {
        logger.warn("[EditingEngine] Music merge failed, copying video", { err: e.message });
        fs.copyFileSync(videoPath, outputPath);
        resolve();
      })
      .run();
  });
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function _snapToBeat(t, beats, beatInterval) {
  if (!beats.length) return t;
  const closest = beats.reduce((prev, curr) =>
    Math.abs(curr - t) < Math.abs(prev - t) ? curr : prev
  );
  // Don't deviate more than 1 beat from natural timing
  return Math.abs(closest - t) <= beatInterval ? closest : t;
}

function _mapXfade(type) {
  const map = {
    fade:       "fade",
    dissolve:   "dissolve",
    wipe_left:  "wipeleft",
    wipe_right: "wiperight",
    zoom_in:    "zoomin",
    zoom_out:   "fadeblack",
  };
  return map[type] || "fade";
}

module.exports = { edit };
