/**
 * AdvancedPlansScreen — Clean Stable Version
 * UI unchanged
 * All errors removed
 */

import React, { memo } from "react";
import { useApp } from "../context/AppContext";
import Button from "../components/Button";

function AdvancedPlansScreen() {
  const { navigate } = useApp();

  const handleContinue = (plan) => {
    // After payment flow → go to Hessa AI (your requirement)
    navigate("hessaAI");
  };

  return (
    <section className="screen" aria-label="Advanced Plans">

      {/* HEADER */}
      <div className="back-header">
        <div></div>
        <div className="title">Advanced Pro</div>
        <div></div>
      </div>

      {/* TITLE */}
      <div style={{ textAlign: "center", marginTop: "10px" }}>
        <div style={{ fontSize: "22px", fontWeight: "600" }}>
          Unlock Advanced Editing
        </div>
        <div style={{ fontSize: "13px", color: "#aaa", marginTop: "6px" }}>
          More control. Better results. Faster reels.
        </div>
      </div>

      {/* MONTHLY PLAN */}
      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.15)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div style={{ fontSize: "18px", fontWeight: "600" }}>
          Pro Monthly
        </div>

        <div style={{ fontSize: "28px", marginTop: "10px" }}>
          ₹599<span style={{ fontSize: "14px" }}>/month</span>
        </div>

        <ul style={{ marginTop: "16px", lineHeight: "1.8", fontSize: "14px" }}>
          <li>✔ Unlimited video scans</li>
          <li>✔ Smart filters & better accuracy</li>
          <li>✔ High-quality cinematic reels</li>
          <li>✔ Faster processing</li>
        </ul>

        <Button
          variant="primary"
          style={{ marginTop: "20px" }}
          onClick={() => handleContinue("monthly")}
        >
          Continue
        </Button>
      </div>

      {/* YEARLY PLAN */}
      <div
        style={{
          marginTop: "20px",
          padding: "20px",
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.15)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ fontSize: "18px", fontWeight: "600" }}>
          Pro Yearly
        </div>

        <div style={{ fontSize: "28px", marginTop: "10px" }}>
          ₹4999<span style={{ fontSize: "14px" }}>/year</span>
        </div>

        <div style={{ fontSize: "12px", color: "#aaa", marginTop: "4px" }}>
          Save 30%
        </div>

        <ul style={{ marginTop: "16px", lineHeight: "1.8", fontSize: "14px" }}>
          <li>✔ Everything in Monthly</li>
          <li>✔ Best value plan</li>
          <li>✔ Priority processing</li>
        </ul>

        <Button
          variant="ghost"
          style={{ marginTop: "20px" }}
          onClick={() => handleContinue("yearly")}
        >
          Continue
        </Button>
      </div>

      {/* NOTE */}
      <div
        style={{
          marginTop: "24px",
          fontSize: "11px",
          textAlign: "center",
          color: "#888",
        }}
      >
        Payments are secure. No data stored after processing.
      </div>

    </section>
  );
}

export default memo(AdvancedPlansScreen);