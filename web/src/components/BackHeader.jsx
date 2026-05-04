import React, { memo } from "react";
import Icon from "./Icon";
import { useApp } from "../context/AppContext";

/**
 * Centered title with optional left back-button and right-side action slot.
 * Behavior: pressing back returns to the previous logical screen in the
 * original 6-screen flow.
 *
 * @param {{ title: string, back?: import("../context/AppContext").ScreenKey, right?: React.ReactNode }} props
 */
function BackHeader({ title, back, right = null }) {
  const { navigate } = useApp();

  return (
    <header className="back-header">
      {back ? (
        <button
          type="button"
          className="icon-btn"
          aria-label="Back"
          onClick={() => navigate(back)}
        >
          <Icon name="back" size={22} />
        </button>
      ) : (
        <span aria-hidden="true" />
      )}
      <h1 className="title">{title}</h1>
      <div style={{ display: "grid", placeItems: "center" }}>{right}</div>
    </header>
  );
}

export default memo(BackHeader);
