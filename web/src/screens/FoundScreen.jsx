import React, { memo, useCallback } from "react";
import BackHeader from "../components/BackHeader";
import Button from "../components/Button";
import Icon from "../components/Icon";
import CinematicPoster from "../components/CinematicPoster";
import { useApp } from "../context/AppContext";

function FoundScreen() {
  const { navigate, setJob } = useApp();

  const onUnlock = useCallback(() => {
    setJob({ paid: true });
    navigate("reel");
  }, [navigate, setJob]);

  return (
    <section className="screen found" aria-label="We found you">
      <BackHeader title="We Found You" back="processing" />
      <p className="lead">We found you in this moment.</p>

      <div className="video-card">
        <CinematicPoster blur ratio="wide" />
        <div className="play">
          <button type="button" className="play-btn" aria-label="Play preview">
            <Icon name="play" size={22} />
          </button>
        </div>
        <div className="timestamp">0:05</div>
      </div>

      <div className="pitch">
        <div className="h">Unlock your cinematic moment</div>
        <div className="p">High quality, Full scene. Just for you.</div>
      </div>

      <Button variant="primary" onClick={onUnlock}>
        Unlock for ₹99
      </Button>

      <div className="secure-note">
        <Icon name="lock" size={12} />
        Secure payment
      </div>
    </section>
  );
}

export default memo(FoundScreen);
