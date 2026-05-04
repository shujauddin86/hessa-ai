import React, { memo } from "react";

/**
 * Cinematic poster — pure-SVG silhouette of a subject framed by stage haze.
 * Used as the video preview on Found and Reel screens. Stylized so it stays
 * on-brand even before any real video frame is loaded.
 *
 * @param {{ blur?: boolean, ratio?: "wide"|"vertical" }} props
 */
function CinematicPoster({ blur = false, ratio = "wide" }) {
  const vbW = ratio === "vertical" ? 360 : 640;
  const vbH = ratio === "vertical" ? 540 : 360;

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        filter: blur ? "blur(6px) saturate(0.9)" : undefined,
      }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="cpLight" cx="50%" cy="32%" r="56%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <linearGradient id="cpVignette" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.95)" />
        </linearGradient>
        <linearGradient id="cpBeam" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      <rect width={vbW} height={vbH} fill="#000" />
      <rect width={vbW} height={vbH} fill="url(#cpVignette)" />

      <polygon
        points={`${vbW * 0.35},0 ${vbW * 0.65},0 ${vbW * 0.85},${vbH} ${vbW * 0.15},${vbH}`}
        fill="url(#cpBeam)"
      />
      <ellipse cx={vbW / 2} cy={vbH * 0.34} rx={vbW * 0.45} ry={vbH * 0.5} fill="url(#cpLight)" />

      {/* Subject silhouette */}
      <g fill="#000">
        <ellipse cx={vbW / 2} cy={vbH * 0.36} rx={vbW * 0.05} ry={vbH * 0.08} />
        <path
          d={`M ${vbW * 0.42} ${vbH * 0.34} q 0 -${vbH * 0.08} ${vbW * 0.08} -${vbH * 0.08} q ${vbW * 0.08} 0 ${vbW * 0.08} ${vbH * 0.08} q 0 ${vbH * 0.05} -${vbW * 0.08} ${vbH * 0.05} q -${vbW * 0.08} 0 -${vbW * 0.08} -${vbH * 0.05} z`}
        />
        <path
          d={`M ${vbW * 0.36} ${vbH} Q ${vbW * 0.4} ${vbH * 0.5} ${vbW / 2} ${vbH * 0.5} Q ${vbW * 0.6} ${vbH * 0.5} ${vbW * 0.64} ${vbH} Z`}
        />
      </g>

      {/* Foreground audience */}
      <g fill="#000">
        <path
          d={`M 0 ${vbH} L 0 ${vbH * 0.85} Q ${vbW * 0.05} ${vbH * 0.78} ${vbW * 0.1} ${vbH * 0.86} Q ${vbW * 0.15} ${vbH * 0.78} ${vbW * 0.2} ${vbH * 0.86} Q ${vbW * 0.25} ${vbH * 0.78} ${vbW * 0.3} ${vbH * 0.86} Q ${vbW * 0.35} ${vbH * 0.78} ${vbW * 0.4} ${vbH * 0.86} Q ${vbW * 0.45} ${vbH * 0.78} ${vbW * 0.5} ${vbH * 0.86} Q ${vbW * 0.55} ${vbH * 0.78} ${vbW * 0.6} ${vbH * 0.86} Q ${vbW * 0.65} ${vbH * 0.78} ${vbW * 0.7} ${vbH * 0.86} Q ${vbW * 0.75} ${vbH * 0.78} ${vbW * 0.8} ${vbH * 0.86} Q ${vbW * 0.85} ${vbH * 0.78} ${vbW * 0.9} ${vbH * 0.86} Q ${vbW * 0.95} ${vbH * 0.78} ${vbW} ${vbH * 0.86} L ${vbW} ${vbH} Z`}
        />
      </g>
    </svg>
  );
}

export default memo(CinematicPoster);
