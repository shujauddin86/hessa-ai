import React, { memo } from "react";
import Icon from "./Icon";
import Logo from "./Logo";

/**
 * Cinematic, full-width button. Two variants: primary (solid white) and
 * ghost (glass with subtle border).
 *
 * @param {{
 *   variant?: "primary"|"ghost",
 *   icon?: string,
 *   leadingLogo?: boolean,
 *   children: React.ReactNode,
 *   onClick?: (e: React.MouseEvent) => void,
 *   type?: "button"|"submit",
 *   ariaLabel?: string,
 *   className?: string,
 * }} props
 */
function Button({
  variant = "ghost",
  icon,
  leadingLogo = false,
  children,
  onClick,
  type = "button",
  ariaLabel,
  className = "",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`btn btn--${variant} ${className}`.trim()}
    >
      {leadingLogo && (
        <span className="ic" aria-hidden="true">
          <Logo size="sm" monochrome />
        </span>
      )}
      {icon && !leadingLogo && (
        <span className="ic" aria-hidden="true">
          <Icon name={icon} size={18} />
        </span>
      )}
      <span>{children}</span>
    </button>
  );
}

export default memo(Button);
