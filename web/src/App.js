import wallpaper from "./assets/wallpaper.jpg";
import React, { useState, useMemo } from "react";

import { useApp } from "./context/AppContext";

import SplashScreen       from "./screens/SplashScreen";
import LoginScreen        from "./screens/LoginScreen";
import UploadScreen       from "./screens/UploadScreen";
import ProcessingScreen   from "./screens/ProcessingScreen";
import FoundScreen        from "./screens/FoundScreen";
import ReelScreen         from "./screens/ReelScreen";
import AdvancedPlansScreen from "./screens/AdvancedPlansScreen";
import PrivacyPlansScreen  from "./screens/PrivacyPlansScreen";
import HessaAIScreen      from "./screens/HessaAIScreen";

import PhoneShell from "./components/PhoneShell";
import BottomNav  from "./components/BottomNav";

// ─────────────────────────────────────────────────────────────────────────────
// Screen registry
// ─────────────────────────────────────────────────────────────────────────────

const SCREENS = {
  splash:        SplashScreen,
  login:         LoginScreen,
  upload:        UploadScreen,
  processing:    ProcessingScreen,
  found:         FoundScreen,
  reel:          ReelScreen,
  advancedPlans: AdvancedPlansScreen,
  privacyPlans:  PrivacyPlansScreen,
  hessaAI:       HessaAIScreen,
};

const APP_PASSWORD = "hessa123*";

// ─────────────────────────────────────────────────────────────────────────────
// Lock Screen
// Rendered alone — nothing sits on top of it, no overlay, no pointer issues.
// ─────────────────────────────────────────────────────────────────────────────

function LockScreen({ onUnlock }) {
  const [value,  setValue]  = useState("");
  const [shake,  setShake]  = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value === APP_PASSWORD) {
      onUnlock();
    } else {
      setShake(true);
      setValue("");
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div style={lock.root}>
      <form onSubmit={handleSubmit} style={lock.form} noValidate>
        <div style={lock.logoWrap}>
          <span style={lock.logo}>Hessa AI</span>
          <span style={lock.sub}>Enter password to continue</span>
        </div>

        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Password"
          autoFocus
          autoComplete="current-password"
          style={{
            ...lock.input,
            borderColor: shake ? "#ff4d4f" : "rgba(255,255,255,0.18)",
            animation:   shake ? "shake 0.6s ease" : "none",
          }}
        />

        <button type="submit" style={lock.button}>
          Unlock
        </button>
      </form>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX( 8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX( 6px); }
        }
      `}</style>
    </div>
  );
}

const lock = {
  root: {
    width:           "100%",
    height:          "100vh",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "#000",
  },
  form: {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    gap:            "14px",
    width:          "100%",
    maxWidth:       "300px",
    padding:        "0 24px",
    boxSizing:      "border-box",
  },
  logoWrap: {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    gap:            "6px",
    marginBottom:   "12px",
  },
  logo: {
    color:          "#fff",
    fontSize:       "26px",
    fontWeight:     "700",
    letterSpacing:  "-0.5px",
    fontFamily:     "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  sub: {
    color:          "rgba(255,255,255,0.45)",
    fontSize:       "13px",
    fontFamily:     "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  input: {
    width:            "100%",
    padding:          "13px 16px",
    borderRadius:     "12px",
    border:           "1px solid rgba(255,255,255,0.18)",
    backgroundColor:  "rgba(255,255,255,0.07)",
    color:            "#fff",
    fontSize:         "16px",
    outline:          "none",
    boxSizing:        "border-box",
    cursor:           "text",
    fontFamily:       "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    transition:       "border-color 0.2s ease",
  },
  button: {
    width:           "100%",
    padding:         "13px",
    borderRadius:    "12px",
    border:          "none",
    backgroundColor: "#a855f7",
    color:           "#fff",
    fontSize:        "15px",
    fontWeight:      "600",
    cursor:          "pointer",
    fontFamily:      "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    marginTop:       "4px",
    transition:      "opacity 0.15s ease",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// App Content (rendered only after unlock)
// ─────────────────────────────────────────────────────────────────────────────

function AppContent() {
  const { screen } = useApp();

  const Screen  = useMemo(() => SCREENS[screen] ?? SplashScreen, [screen]);
  const showNav = screen !== "splash";

  return (
    <PhoneShell>
      <Screen />
      {showNav && <BottomNav />}
    </PhoneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return <AppContent />;
}
