/**
 * ai/scorer.js — Score and rank video clips
 *
 * Scoring dimensions:
 *  - Face clarity     (30%) — avgConfidence from face engine
 *  - Emotion impact   (25%) — happy/surprise/excited > neutral > sad/angry
 *  - Motion quality   (20%) — duration-normalized clip usage, prefer 3–8s sweet spot
 *  - Context score    (15%) — segment position in video (beginning/end < middle)
 *  - Diversity bonus  (10%) — penalize clips too close in timestamp
 */
const logger = require("../utils/logger");

const EMOTION_SCORE = {
  happy:     1.0,
  surprised: 0.9,
  excited:   0.9,
  neutral:   0.6,
  fearful:   0.4,
  disgusted: 0.3,
  sad:       0.3,
  angry:     0.2,
};

/**
 * score — compute composite scores for each clip.
 * @param {Array} clips         — from clipEngine.generate()
 * @param {Array} trackedFrames — from faceEngine.trackIdentity()
 * @returns clips sorted by score descending
 */
function score(clips, trackedFrames) {
  const totalDuration = trackedFrames.length > 0
    ? trackedFrames[trackedFrames.length - 1].timestamp
    : 1;

  const scored = clips.map((clip) => {
    const faceClarity  = _scoreFaceClarity(clip);
    const emotionScore = _scoreEmotion(clip);
    const motionScore  = _scoreMotion(clip);
    const contextScore = _scoreContext(clip, totalDuration);

    const composite = (
      faceClarity  * 0.30 +
      emotionScore * 0.25 +
      motionScore  * 0.20 +
      contextScore * 0.15
    );

    return {
      ...clip,
      scores: { faceClarity, emotion: emotionScore, motion: motionScore, context: contextScore },
      score:  parseFloat(composite.toFixed(4)),
    };
  });

  // Apply diversity bonus — penalize clips within 5s of each other
  _applyDiversityPenalty(scored, 5.0, 0.10);

  scored.sort((a, b) => b.score - a.score);
  logger.info("[Scorer] Scored clips", { count: scored.length, topScore: scored[0]?.score });
  return scored;
}

/**
 * selectTop — return top N clips, ensuring diversity (no two clips start within 3s).
 */
function selectTop(scoredClips, n = 3) {
  const selected = [];

  for (const clip of scoredClips) {
    if (selected.length >= n) break;
    const tooClose = selected.some((s) => Math.abs(s.start - clip.start) < 3.0);
    if (!tooClose) selected.push(clip);
  }

  logger.info("[Scorer] Selected clips", { count: selected.length });
  return selected;
}

// ── Private scorers ──────────────────────────────────────────────────────────

function _scoreFaceClarity(clip) {
  return Math.min(1, clip.segment?.avgConfidence || 0.5);
}

function _scoreEmotion(clip) {
  const emotion = clip.segment?.dominantEmotion || "neutral";
  return EMOTION_SCORE[emotion] ?? 0.5;
}

function _scoreMotion(clip) {
  const dur = clip.duration;
  if (dur < 2)  return 0.2;
  if (dur <= 5) return 1.0;  // sweet spot
  if (dur <= 8) return 0.9;
  if (dur <= 15) return 0.7;
  return 0.5;  // long clips are less punchy
}

function _scoreContext(clip, totalDuration) {
  if (totalDuration <= 0) return 0.5;
  const pos = clip.start / totalDuration;
  // Middle of video tends to have best moments
  // Bell curve peaked at 0.35–0.65
  const center = 0.5;
  const dist   = Math.abs(pos - center);
  return Math.max(0.3, 1 - dist * 1.4);
}

function _applyDiversityPenalty(clips, windowSec, penaltyFactor) {
  for (let i = 0; i < clips.length; i++) {
    for (let j = i + 1; j < clips.length; j++) {
      const timeDiff = Math.abs(clips[i].start - clips[j].start);
      if (timeDiff < windowSec) {
        // Penalize the lower-scored one
        if (clips[i].score >= clips[j].score) {
          clips[j].score *= (1 - penaltyFactor);
        } else {
          clips[i].score *= (1 - penaltyFactor);
        }
      }
    }
  }
}

module.exports = { score, selectTop };
