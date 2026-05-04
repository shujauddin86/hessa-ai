import React, { memo, useMemo } from "react";

/**
 * Cinematic circular progress ring. Pure SVG, no canvas. Animation is
 * performed via CSS transition on stroke-dashoffset for buttery smoothness
 * even on low-end devices.
 *
 * @param {{ value: number, size?: number, stroke?: number }} props
 */
function ProgressRing({ value = 0, size = 200, stroke = 6 }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);
  const offset = useMemo(
    () => circumference * (1 - clamped / 100),
    [circumference, clamped]
  );

  return (
    <div className="ring" role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ffffff"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="pct">{Math.round(clamped)}%</div>
    </div>
  );
}

export default memo(ProgressRing);
