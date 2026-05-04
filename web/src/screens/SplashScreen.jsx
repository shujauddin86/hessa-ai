import React, { memo } from "react";
import { useApp } from "../context/AppContext";


/**
 * Splash — manual entry screen with Get Started button.
 */
function SplashScreen() {
  const { navigate } = useApp();
  return (
    <section className="screen splash" aria-label="Hessa">
      <div className="logo-wrap">
      
      </div>
      <div className="wordmark">HESSA SEARCH</div>
      <div className="tagline">RAW TO REEL · DISCOVER YOUR MOMENTS</div>
      <div
  className="btn btn--primary"
  style={{ marginTop: "20px", width: "220px" }}
  onClick={() => navigate("hessaAI")}
>
  Get Started
</div>
    </section>
  );
}

export default memo(SplashScreen);
