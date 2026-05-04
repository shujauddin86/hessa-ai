/**
 * ai/storyEngine.js — Cinematic Story Engine
 *
 * Upgrades:
 *  1. Narrative arc: hook → build → peak → resolution
 *  2. Beat-snapped cut points: each clip's in/out trimmed to nearest beat boundary
 *  3. Transition selection based on arc position and energy
 *  4. Returns beatTimestamps passthrough for editingEngine
 */
const logger = require("../utils/logger");

const ARC_MAP    = { 0: "hook", 1: "build", 2: "peak", 3: "resolution" };
const TRANSITIONS = {
  "hook→build":       { type: "fade",     durationMs: 500 },
  "build→peak":       { type: "zoom_in",  durationMs: 400 },
  "peak→resolution":  { type: "dissolve", durationMs: 600 },
  default:            { type: "fade",     durationMs: 400 },
};

/**
 * build — arrange clips into cinematic story arc with beat-snapped timing.
 *
 * @param {Array}    clips          — scored+selected clips from scorer.selectTop()
 * @param {string}   mode           — "balanced"|"speed"
 * @param {Array}    [beatTimestamps] — from musicEngine.sync() (optional, passed in from pipeline)
 * @param {number}   [bpm]          — beats per minute (optional)
 * @returns storyData
 */
async function build(clips, mode = "balanced", beatTimestamps = [], bpm = 120) {
  if (!clips?.length) throw new Error("No clips to build story from");

  logger.info("[StoryEngine] Building story", { clipCount: clips.length, bpm, beatCount: beatTimestamps.length });

  // Sort chronologically then assign arc roles
  const ordered = _assignArcRoles([...clips].sort((a, b) => a.start - b.start));

  // Snap clip durations to beat boundaries for rhythmic flow
  const beatSnapped = _snapClipsToBeat(ordered, beatTimestamps, bpm, mode);

  // Determine transitions based on arc
  const transitions = _assignTransitions(beatSnapped, mode);

  const totalDuration = beatSnapped.reduce((s, c) => s + c.duration, 0);

  const storyData = {
    clips:         beatSnapped,
    arc:           beatSnapped.map((c) => c.arcRole),
    totalDuration: parseFloat(totalDuration.toFixed(3)),
    transitions,
    beatTimestamps,
    bpm,
    mode,
  };

  logger.info("[StoryEngine] Story built", {
    totalDuration: Math.round(totalDuration),
    arc: storyData.arc,
    transitions: transitions.map((t) => t.type),
  });

  return storyData;
}

// ── Private ───────────────────────────────────────────────────────────────────

function _assignArcRoles(clips) {
  return clips.map((clip, i) => ({
    ...clip,
    arcRole:    ARC_MAP[i] || "build",
    orderIndex: i,
  }));
}

/**
 * _snapClipsToBeat — trim each clip's duration so it ends on a beat boundary.
 * This ensures that when editingEngine places the xfade, it lands exactly on a beat.
 *
 * Algorithm:
 *   For each clip, find the beat timestamp closest to clip.end (in story timeline).
 *   Adjust clip.duration = roundedEnd - clip.start (clamped to ±1 beat).
 */
function _snapClipsToBeat(clips, beatTimestamps, bpm, mode) {
  if (!beatTimestamps.length || mode === "speed") return clips; // no beat data or speed mode — skip snap

  const beatInterval = 60 / bpm;
  let   timelinePos  = 0;

  return clips.map((clip) => {
    const naturalEnd  = timelinePos + clip.duration;
    // Find nearest beat at or after natural end (allow ±0.5 beat tolerance)
    const snappedEnd  = _nearestBeat(naturalEnd, beatTimestamps, beatInterval);
    const snappedDur  = Math.max(1.5, snappedEnd - timelinePos); // minimum 1.5s

    timelinePos = snappedEnd;

    return { ...clip, duration: parseFloat(snappedDur.toFixed(3)) };
  });
}

function _nearestBeat(t, beats, beatInterval) {
  if (!beats.length) return t;

  // Find closest beat to t
  const closest = beats.reduce((prev, curr) =>
    Math.abs(curr - t) < Math.abs(prev - t) ? curr : prev
  );

  // Clamp: don't deviate more than 1 beat from natural timing
  if (Math.abs(closest - t) > beatInterval) return t;
  return closest;
}

function _assignTransitions(clips, mode) {
  return clips.slice(0, -1).map((clip, i) => {
    const next   = clips[i + 1];
    const key    = `${clip.arcRole}→${next?.arcRole}`;
    const preset = TRANSITIONS[key] || TRANSITIONS.default;

    return {
      fromClip:   i,
      toClip:     i + 1,
      type:       preset.type,
      durationMs: mode === "speed" ? 250 : preset.durationMs,
    };
  });
}

module.exports = { build };
