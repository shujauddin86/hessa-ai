import React, { memo } from "react";

/**
 * iOS-style status bar — purely cosmetic, matches reference mockups exactly.
 */
function StatusBar({ time = "9:41" }) {
  return (
    <div className="status-bar" role="presentation">
      <div className="time">{time}</div>
      <div className="icons" aria-hidden="true">
        {/* Signal */}
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
          <rect x="0" y="7" width="3" height="4" rx="1" />
          <rect x="5" y="5" width="3" height="6" rx="1" />
          <rect x="10" y="3" width="3" height="8" rx="1" />
          <rect x="15" y="0" width="3" height="11" rx="1" opacity="0.55" />
        </svg>
        {/* Wi-Fi */}
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M1 4.2a11 11 0 0114 0" />
          <path d="M3.2 6.4a8 8 0 019.6 0" />
          <path d="M5.6 8.6a4.8 4.8 0 014.8 0" />
          <circle cx="8" cy="10.2" r="0.8" fill="currentColor" stroke="none" />
        </svg>
        {/* Battery */}
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="currentColor" opacity="0.55" />
          <rect x="2" y="2" width="19" height="8" rx="1.5" fill="currentColor" />
          <rect x="23.5" y="4" width="2" height="4" rx="1" fill="currentColor" opacity="0.55" />
        </svg>
      </div>
    </div>
  );
}

export default memo(StatusBar);
