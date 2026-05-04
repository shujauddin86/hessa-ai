/**
 * ai/pipeline.js — Master AI Pipeline Orchestrator
 *
 * Stages:
 *  1.  normalize          — MP4 H264 + FPS + resolution
 *  2.  extract_frames     — keyframes at adaptive rate
 *  3.  detect_faces       — AWS Rekognition primary, local fallback, >90% confidence
 *  4.  track_face         — lock identity across video
 *  5.  group_timestamps   — segment contiguous appearances
 *  6.  generate_clips     — buffer + two-pass stabilization + enhance
 *  7.  score_moments      — face clarity + emotion + motion + context
 *  8.  select_clips       — top 3 max
 *  9.  build_story        — cinematic sequence + beat-snapped timings
 * 10.  sync_music         — emotion-matched track + beat timestamps
 * 11.  edit               — LUT color grade + beat-synced transitions + music
 * 12.  render             — FFmpeg + GPU, retry + fallback
 * 13.  validate           — face visible, smooth output
 * 14.  preview_ready      — emit to client
 * 15.  final_render       — after user clip selection
 *
 * Plans: PAY_PER_USE | ADVANCED (3/day) | PRIVACY (analysis-only, no reel)
 */
const db         = require("../models/database");
const logger     = require("../utils/logger");
const normalizer = require("./normalizer");
const frames     = require("./frameExtractor");
const faceEngine = require("./faceEngine");
const clips      = require("./clipEngine");
const scorer     = require("./scorer");
const story      = require("./storyEngine");
const music      = require("./musicEngine");
const editor     = require("./editingEngine");
const renderer   = require("./renderEngine");
const validator  = require("./validator");
const analytics  = require("../services/analytics");
const storage    = require("../services/storage");

async function run(jobId, userId, plan, startStage, onProgress) {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId);
  if (!job) throw new Error("Job not found");

  const isFinalRender = startStage === "final_render";
  const skipToFinal   = isFinalRender;

  _updateJob(jobId, { status: "processing", stage: startStage, progress: 5 });

  try {
    // ── SKIP to final render (user confirmed clip selection) ─────────────────
    if (skipToFinal) {
      const clipsData = job.clips_data ? JSON.parse(job.clips_data) : [];
      const selected  = clipsData.filter((c) => c.selected);
      if (!selected.length) throw new Error("No clips selected for final render");

      onProgress(72, "final_render");
      // Music sync first so we have beatTimestamps for story
      const musicResult = await music.sync(
        { clips: selected, totalDuration: selected.reduce((s, c) => s + c.duration, 0) },
        storage.jobDir(jobId, "temp"),
        job.mode
      );

      onProgress(76, "building_story");
      const storyData = await story.build(
        selected, job.mode, musicResult.beatTimestamps, musicResult.bpm
      );

      onProgress(82, "editing");
      const editedPath = await editor.edit(storyData, musicResult, storage.jobDir(jobId, "temp"), job.mode);

      onProgress(88, "rendering");
      const outputPath = await renderer.render(editedPath, storage.jobDir(jobId, "output"), jobId, job.mode);

      onProgress(95, "validating");
      await validator.validate(outputPath, selected);

      onProgress(100, "done");
      _updateJob(jobId, { status: "done", stage: "done", progress: 100, output_path: outputPath });
      _incrementDailyUsage(userId);
      analytics.track("REEL_GENERATED", { jobId, plan }, userId);
      return;
    }

    // ── FULL PIPELINE ─────────────────────────────────────────────────────────

    // 1. Normalize
    onProgress(8, "normalizing");
    const normalPath = await normalizer.normalize(job.input_path, storage.jobDir(jobId, "temp"), job.mode);

    // 2. Extract frames
    onProgress(15, "extracting_frames");
    const framePaths = await frames.extract(normalPath, storage.jobDir(jobId, "temp"), job.mode);

    // 3. Face detection + verification (AWS Rekognition primary, local fallback)
    onProgress(25, "detecting_faces");
    const faceResult = await faceEngine.detectAndVerify(framePaths, job.face_ref_path, job.mode);

    if (faceResult.status === "no_face") {
      _updateJob(jobId, {
        status: "face_required", stage: "face_required", progress: 20,
        error: "Face not detected with >90% confidence. Please upload a clearer frontal photo.",
      });
      analytics.track("FACE_NOT_FOUND", { jobId }, userId);
      return;
    }

    if (faceResult.status === "multiple_matches") {
      _updateJob(jobId, {
        status: "face_required", stage: "face_required", progress: 22,
        clips_data: JSON.stringify(faceResult.candidates),
        error: "Multiple face matches found. Please confirm which person to track.",
      });
      return;
    }

    // 4. Track identity across all frames
    onProgress(32, "tracking_face");
    const trackedFrames = await faceEngine.trackIdentity(framePaths, faceResult.faceId, job.mode);

    // 5. Group timestamps into segments
    onProgress(40, "grouping_timestamps");
    const segments = faceEngine.groupTimestamps(trackedFrames);

    // 6. Generate clips with two-pass stabilization
    onProgress(48, "generating_clips");
    const rawClips = await clips.generate(normalPath, segments, storage.jobDir(jobId, "temp"), job.mode);

    // 7. Score moments
    onProgress(56, "scoring_moments");
    const scoredClips = await scorer.score(rawClips, trackedFrames);

    // 8. Select top clips (max 3)
    onProgress(62, "selecting_clips");
    const selectedClips = scorer.selectTop(scoredClips, 3);

    // Check plan: PRIVACY = no reel, analysis only
    const sub = db.prepare("SELECT plan FROM subscriptions WHERE user_id = ?").get(userId);
    if (sub?.plan === "PRIVACY") {
      _updateJob(jobId, {
        status:    "done",
        stage:     "analysis_only",
        progress:  100,
        clips_data: JSON.stringify(selectedClips),
      });
      analytics.track("PRIVACY_ANALYSIS_DONE", { jobId }, userId);
      return;
    }

    // 9. Music sync first — produces beatTimestamps for story engine
    onProgress(66, "music_sync");
    const approxDuration = selectedClips.reduce((s, c) => s + c.duration, 0);
    const musicResult = await music.sync(
      { clips: selectedClips, totalDuration: approxDuration },
      storage.jobDir(jobId, "temp"),
      job.mode
    );

    // 10. Build story arc with beat-snapped timings
    onProgress(70, "building_story");
    const storyData = await story.build(
      selectedClips, job.mode, musicResult.beatTimestamps, musicResult.bpm
    );

    // 11. Editing — LUT color grade per clip + beat-synced xfade + music merge
    onProgress(76, "editing");
    const editedPath = await editor.edit(storyData, musicResult, storage.jobDir(jobId, "temp"), job.mode);

    // 12. Preview render (lower quality, fast)
    onProgress(82, "rendering");
    const previewPath = await renderer.render(
      editedPath, storage.jobDir(jobId, "temp"), jobId, job.mode, true
    );

    // 13. Validate
    onProgress(90, "validating");
    const validResult = await validator.validate(previewPath, selectedClips);
    if (!validResult.ok) {
      logger.warn("[Pipeline] Validation failed, fallback render", { jobId });
      const fallback = await renderer.renderFallback(editedPath, storage.jobDir(jobId, "temp"), jobId);
      await validator.validate(fallback, selectedClips);
    }

    // 14. Preview ready — user selects clips, then final render triggered
    _updateJob(jobId, {
      status:      "preview_ready",
      stage:       "preview_ready",
      progress:    95,
      clips_data:  JSON.stringify(selectedClips.map((c, i) => ({ ...c, id: `clip_${i}`, selected: true }))),
      story_data:  JSON.stringify(storyData),
      output_path: previewPath,
    });

    analytics.track("PREVIEW_READY", { jobId, clipCount: selectedClips.length }, userId);
    logger.info("[Pipeline] Preview ready", { jobId });

  } catch (err) {
    logger.error("[Pipeline] Fatal error", { jobId, err: err.message, stack: err.stack });
    _updateJob(jobId, { status: "failed", stage: "failed", error: err.message });
    analytics.track("PIPELINE_FAILED", { jobId, error: err.message }, userId);
    throw err;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _updateJob(jobId, fields) {
  const set  = Object.entries({ ...fields, updated_at: Date.now() }).map(([k]) => `${k} = ?`).join(", ");
  const vals = [...Object.values(fields), Date.now(), jobId];
  db.prepare(`UPDATE jobs SET ${set} WHERE id = ?`).run(...vals);
}

function _incrementDailyUsage(userId) {
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(
    `UPDATE subscriptions SET jobs_today = jobs_today + 1, reset_date = ? WHERE user_id = ?`
  ).run(today, userId);
}

module.exports = { run };
