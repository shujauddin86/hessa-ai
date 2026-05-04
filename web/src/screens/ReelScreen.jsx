import React, { memo } from "react";
import BackHeader from "../components/BackHeader";
import Icon from "../components/Icon";
import CinematicPoster from "../components/CinematicPoster";

const ACTIONS = Object.freeze([
  { id: "share", label: "Share", icon: "share" },
  { id: "download", label: "Download", icon: "download" },
  { id: "favorite", label: "Favorite", icon: "heart" },
  { id: "delete", label: "Delete", icon: "trash" },
]);

function ReelScreen() {
  return (
    <section className="screen reel" aria-label="Cinematic reel">
      <BackHeader
        title="Cinematic Reel"
        back="found"
        right={
          <button type="button" className="icon-btn" aria-label="Share">
            <Icon name="share" size={20} />
          </button>
        }
      />

      <div className="player">
        <CinematicPoster ratio="vertical" />
        <div className="controls">
          <span className="time">0:06</span>
          <div className="scrub" aria-hidden="true">
            <div className="filled" />
            <div className="knob" />
          </div>
          <span className="time">0:30</span>
          <button type="button" className="icon-btn" aria-label="Fullscreen">
            <Icon name="expand" size={18} />
          </button>
        </div>
      </div>

      <div className="meta">
        <div className="h">Your Moment</div>
        <div className="p">May 20, 2025 · 9:30 PM</div>
      </div>

      <div className="actions">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            className="reel-action"
            aria-label={a.label}
          >
            <Icon name={a.icon} size={20} />
            <span className="label">{a.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default memo(ReelScreen);
