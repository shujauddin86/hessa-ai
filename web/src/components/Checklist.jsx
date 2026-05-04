import React, { memo } from "react";
import Icon from "./Icon";

/**
 * @typedef {Object} ChecklistItem
 * @property {string} id
 * @property {string} label
 * @property {"done"|"loading"|"pending"} status
 */

/**
 * Stacked status rows used during processing — each row mirrors a stage
 * in the privacy-first detection pipeline.
 *
 * @param {{ items: ChecklistItem[] }} props
 */
function Checklist({ items }) {
  return (
    <div className="checklist" role="list">
      {items.map((it) => (
        <div key={it.id} className="check-row" role="listitem">
          <span>{it.label}</span>
          <span className="right" aria-hidden="true">
            {it.status === "done" && <Icon name="check" size={18} />}
            {it.status === "loading" && <span className="spinner" />}
            {it.status === "pending" && (
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: "1.5px solid rgba(255,255,255,0.18)",
                }}
              />
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export default memo(Checklist);
