import React, { memo } from "react";
import { useApp } from "../context/AppContext";

function BottomNav() {
  const { screen, navigate } = useApp();

  return (
    <nav className="bottom-nav">

      {/* HESSA AI */}
      <div
        className={`nav-item ${screen === "hessaAI" ? "is-active" : ""}`}
        onClick={() => navigate("hessaAI")}
      >
        <div className="ic">🧠</div>
        <div className="label">Hessa AI</div>
      </div>

      {/* ADVANCED */}
      <div
        className={`nav-item ${screen === "advancedPlans" ? "is-active" : ""}`}
        onClick={() => navigate("advancedPlans")}
      >
        <div className="ic">✨</div>
        <div className="label">Advanced</div>
      </div>

      {/* PRIVACY */}
      <div
        className={`nav-item ${screen === "privacyPlans" ? "is-active" : ""}`}
        onClick={() => navigate("privacyPlans")}
      >
        <div className="ic">🛡️</div>
        <div className="label">Privacy</div>
      </div>

      {/* JOIN US */}
      <div
        className={`nav-item ${screen === "joinUs" ? "is-active" : ""}`}
        onClick={() => navigate("joinUs")}
      >
        <div className="ic">🤝</div>
        <div className="label">Join Us</div>
      </div>

    </nav>
  );
}

export default memo(BottomNav);