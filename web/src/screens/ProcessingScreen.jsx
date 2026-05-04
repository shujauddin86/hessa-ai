import React, { memo, useCallback, useEffect, useMemo } from "react";
import BackHeader from "../components/BackHeader";
import ProgressRing from "../components/ProgressRing";
import Checklist from "../components/Checklist";
import Icon from "../components/Icon";
import Button from "../components/Button";
import { useApp } from "../context/AppContext";
import useProgress from "../hooks/useProgress";

function ProcessingScreen() {
  const { navigate, setJob } = useApp();

  // Simulated processing — replace with real polling against /api/job/:id.
  const progress = useProgress({ from: 0, to: 83, durationMs: 1800 });

  useEffect(() => {
    setJob({ progress, status: progress >= 100 ? "done" : "running" });
  }, [progress, setJob]);

  const items = useMemo(
    () => [
      {
        id: "frames",
        label: "Extracting frames",
        status: progress > 30 ? "done" : "loading",
      },
      {
        id: "faces",
        label: "Detecting faces",
        status: progress > 55 ? "done" : progress > 30 ? "loading" : "pending",
      },
      {
        id: "match",
        label: "Matching you",
        status: progress > 75 ? "done" : progress > 55 ? "loading" : "pending",
      },
      {
        id: "preview",
        label: "Generating preview",
        status: progress >= 100 ? "done" : progress > 75 ? "loading" : "pending",
      },
    ],
    [progress]
  );

  const onContinue = useCallback(() => navigate("found"), [navigate]);

  return (
    <section className="screen processing" aria-label="Analyzing video">
      <BackHeader title="Analyzing Video" back="upload" />
      <p className="lead">Our AI is scanning every frame...</p>

      <div className="ring-wrap">
        <ProgressRing value={progress} />
      </div>

      <Checklist items={items} />

      <div className="footer-note">
        <Icon name="lock" size={12} />
        This usually takes 1-2 minutes.
      </div>

      <div style={{ marginTop: 14 }}>
        <Button variant="ghost" onClick={onContinue}>
          Continue
        </Button>
      </div>
    </section>
  );
}

export default memo(ProcessingScreen);
