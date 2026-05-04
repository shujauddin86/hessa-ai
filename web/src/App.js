import React, { useMemo, useState } from "react";
import PhoneShell from "./components/PhoneShell";
import BottomNav from "./components/BottomNav";
import SplashScreen from "./screens/SplashScreen";
import LoginScreen from "./screens/LoginScreen";
import AdvancedPlansScreen from "./screens/AdvancedPlansScreen";
import PrivacyPlansScreen from "./screens/PrivacyPlansScreen";
import UploadScreen from "./screens/UploadScreen";
import ProcessingScreen from "./screens/ProcessingScreen";
import FoundScreen from "./screens/FoundScreen";
import ReelScreen from "./screens/ReelScreen";
import JoinUsScreen from "./screens/JoinUsScreen";
import HessaAIScreen from "./screens/HessaAIScreen";
import { useApp } from "./context/AppContext";

/**
 * Screen registry — the only place that maps a route key to a component.
 * Adding a new screen is a single-line change.
 * @type {Record<string, React.ComponentType>}
 */
const SCREENS = Object.freeze({
  splash: SplashScreen,
  login: LoginScreen,
  upload: UploadScreen,
  processing: ProcessingScreen,
  found: FoundScreen,
  reel: ReelScreen,

  advancedPlans: AdvancedPlansScreen,
  privacyPlans: PrivacyPlansScreen,

  // ✅ ADD THIS LINE
  hessaAI: HessaAIScreen,
});

/**
 * Top-level shell — selects the active screen and decides chrome (status bar / nav)
 * visibility per route. Behavior of original 6-screen flow is preserved exactly.
 */
export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [input, setInput] = useState("");
const password = "hessa123*";
  const { screen } = useApp();

  const Screen = useMemo(() => SCREENS[screen] || SplashScreen, [screen]);
  const showChrome = screen !== "splash";
if (!authenticated) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "#000",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999999
      }}
    >
      <input
        type="password"
        autoFocus
        style={{
          padding: "20px",
          fontSize: "18px",
          borderRadius: "10px",
          border: "1px solid #333",
          background: "#111",
          color: "#fff",
          outline: "none",
          zIndex: 999999
        }}
        onChange={(e) => {
          if (e.target.value === password) {
            setAuthenticated(true);
          }
        }}
      />
    </div>
  );
}    >
      <input
        type="password"
        autoFocus
        style={{
          padding: "20px",
          fontSize: "18px",
          borderRadius: "10px",
          border: "1px solid #333",
          background: "#111",
          color: "#fff",
          outline: "none",
          zIndex: 999999,
        }}
        onChange={(e) => {
          if (e.target.value === password) {
            setAuthenticated(true);
          }
        }}
      />
    </div>
  );
}
  return (
    <PhoneShell showStatusBar={showChrome}>
      <Screen />
      {showChrome && <BottomNav />}
    </PhoneShell>
  );
}
