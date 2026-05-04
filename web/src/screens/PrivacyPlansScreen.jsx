import React from "react";
import { useApp } from "../context/AppContext";

function PrivacyPlansScreen() {
  const { navigate } = useApp();
  const [unlocked, setUnlocked] = React.useState(false);

  return (
    <section className="screen">

      {/* HEADER */}
      <div className="back-header">
        <button className="icon-btn" onClick={() => navigate("login")}>
          ←
        </button>
        <div className="title">Privacy Check</div>
        <div />
      </div>

      {!unlocked ? (
        <>
          <div style={{ textAlign: "center", marginTop: "10px" }}>
            <div style={{ fontSize: "20px", fontWeight: "600" }}>
              Understand Your Visibility
            </div>
            <div style={{ fontSize: "13px", color: "#aaa", marginTop: "6px" }}>
              Analyse where you appear publicly
            </div>
          </div>

          <div className="card">
            <p>✔ Detect appearances</p>
            <p>✔ Privacy insights</p>
            <p>✔ Generate requests</p>
          </div>

          <div
            className="btn btn--primary"
            onClick={() => setUnlocked(true)}
          >
            Unlock Privacy Report
          </div>
        </>
      ) : (
        <>
          <div style={{ textAlign: "center", marginTop: "10px" }}>
            <div style={{ fontSize: "20px", fontWeight: "600" }}>
              Privacy Insights
            </div>
          </div>

          <div className="card">
            <p>⚠ YouTube: Unauthorized appearance</p>
            <p>⚠ Instagram: Public exposure</p>
            <p>⚠ TikTok: Face detected</p>
          </div>

          <div className="upload-zone">
            Upload video
          </div>

          <div className="link-input">
            <input placeholder="Paste video link" />
          </div>

          <div
            className="btn btn--ghost"
            onClick={() => alert("Privacy email generated")}
          >
            Generate Email
          </div>
        </>
      )}

    </section>
  );
}

export default PrivacyPlansScreen;