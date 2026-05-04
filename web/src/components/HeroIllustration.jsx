import React, { memo } from "react";

/**
 * Cinematic concert silhouette used on the login screen — pure SVG so it
 * renders crisp at any DPI and ships zero image bytes. Captures the
 * "raw to reel" mood: a person centered in stage-light haze, an audience
 * crowd silhouetted in the foreground.
 */
function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 420 150"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="stageLight" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <linearGradient id="stageHaze" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.9)" />
        </linearGradient>
        <linearGradient id="lightBeam1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      <rect width="420" height="150" fill="#000" />
      <rect width="420" height="150" fill="url(#stageHaze)" />

      {/* Stage light beams */}
      <polygon points="160,0 260,0 320,150 100,150" fill="url(#lightBeam1)" opacity="0.85" />
      <polygon points="80,0 140,0 200,150 20,150" fill="url(#lightBeam1)" opacity="0.45" />
      <polygon points="280,0 340,0 400,150 220,150" fill="url(#lightBeam1)" opacity="0.45" />

      {/* Stage halo */}
      <ellipse cx="210" cy="60" rx="180" ry="90" fill="url(#stageLight)" />

      {/* Performer silhouette (center) */}
      <g fill="#000">
        <ellipse cx="210" cy="62" rx="14" ry="16" />
        <path d="M196 60c0-12 8-22 14-22s14 10 14 22-6 12-14 12-14 0-14-12z" fill="#000" opacity="0.85" />
        <path d="M180 150 Q188 92 210 92 Q232 92 240 150 Z" />
      </g>

      {/* Audience silhouettes */}
      <g fill="#000">
        <path d="M0 150 L0 130 Q12 118 22 130 Q34 116 46 132 Q58 118 70 132 Q82 120 94 132 Q106 118 118 132 Q130 122 142 132 L142 150 Z" />
        <path d="M150 150 L150 132 Q162 122 174 132 Q186 120 198 132 Q210 124 222 132 Q234 120 246 132 Q258 122 270 132 L270 150 Z" />
        <path d="M278 150 L278 132 Q290 122 302 132 Q314 120 326 132 Q338 122 350 132 Q362 120 374 132 Q386 122 398 132 Q410 124 420 132 L420 150 Z" />
      </g>
    </svg>
  );
}

export default memo(HeroIllustration);
