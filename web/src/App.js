import React, { useMemo } from "react";
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
  const { screen } = useApp();

  const Screen = useMemo(() => SCREENS[screen] || SplashScreen, [screen]);
  const showChrome = screen !== "splash";

  return (
    <PhoneShell showStatusBar={showChrome}>
      <Screen />
      {showChrome && <BottomNav />}
    </PhoneShell>
  );
}
