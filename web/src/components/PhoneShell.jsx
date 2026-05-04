import React, { memo } from "react";
import StatusBar from "./StatusBar";

/**
 * The mobile-first frame every screen renders inside.
 * - 420px max width (matches reference mockup)
 * - vignette + radial lighting layered behind content
 * - status bar shown for everything except the splash
 *
 * @param {{ children: React.ReactNode, showStatusBar?: boolean }} props
 */
function PhoneShell({ children, showStatusBar = true }) {
  return (
    <main className="phone-shell">
      {showStatusBar && <StatusBar />}
      {children}
    </main>
  );
}

export default memo(PhoneShell);
