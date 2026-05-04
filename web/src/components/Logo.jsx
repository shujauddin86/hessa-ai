import React, { memo } from "react";

/**
 * Cinematic H monogram — A removed, H preserved exactly.
 * No other changes.
 */
function Logo({
  size = "md",
  glow = false,
  monochrome = false,
  className = "",
  ariaLabel = "Hessa",
}) {
  const reactId = React.useId();
  const gid = `hessa-grad-${reactId.replace(/[:]/g, "")}`;
  const cls = `hessa-logo hessa-logo--${size} ${className}`.trim();
  const fill = monochrome ? "currentColor" : `url(#${gid})`;

  return (
    <svg
      className={cls}
      viewBox="0 0 200 140"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
      style={
        glow
          ? { filter: "drop-shadow(0 0 24px rgba(255,255,255,0.32))" }
          : undefined
      }
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#ededed" />
          <stop offset="100%" stopColor="#bcbcbc" />
        </linearGradient>
      </defs>

      <g fill={fill} fillRule="evenodd">
        {/* H ONLY — unchanged */}
        <path d="M 4 0 L 32 0 L 32 56 L 60 56 L 60 0 L 88 0 L 88 140 L 60 140 L 60 84 L 32 84 L 32 140 L 4 140 Z" />
      </g>
    </svg>
  );
}

export default memo(Logo);