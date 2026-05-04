import React, { memo } from "react";

/**
 * Tiny inline icon set — kept dependency-free, monoline, 24x24 grid.
 * Uses currentColor so icons inherit color from their parent.
 *
 * @param {{ name: string, size?: number, className?: string, strokeWidth?: number }} props
 */
function Icon({ name, size = 22, className = "", strokeWidth = 1.6 }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": "true",
  };

  switch (name) {
    case "mail":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="M3.5 7l8.5 6 8.5-6" />
        </svg>
      );
    case "phone":
      return (
        <svg {...props}>
          <path d="M5 4h3l2 5-2 1.5a11 11 0 005.5 5.5L15 14l5 2v3a2 2 0 01-2.2 2A16 16 0 013 6.2 2 2 0 015 4z" />
        </svg>
      );
    case "back":
      return (
        <svg {...props}>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      );
    case "share":
      return (
        <svg {...props}>
          <path d="M12 3v13" />
          <path d="M7 8l5-5 5 5" />
          <path d="M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5" />
        </svg>
      );
    case "download":
      return (
        <svg {...props}>
          <path d="M12 4v12" />
          <path d="M7 11l5 5 5-5" />
          <path d="M5 20h14" />
        </svg>
      );
    case "heart":
      return (
        <svg {...props}>
          <path d="M12 20s-7-4.5-9.3-9A5 5 0 0112 6a5 5 0 019.3 5C19 15.5 12 20 12 20z" />
        </svg>
      );
    case "trash":
      return (
        <svg {...props}>
          <path d="M4 7h16" />
          <path d="M9 7V4h6v3" />
          <path d="M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" />
        </svg>
      );
    case "lock":
      return (
        <svg {...props}>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 018 0v3" />
        </svg>
      );
    case "shield-check":
      return (
        <svg {...props}>
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "cloud-up":
      return (
        <svg {...props}>
          <path d="M7 18a4 4 0 010-8 6 6 0 0111.5 1.5A4 4 0 0117 18H7z" />
          <path d="M12 11v6" />
          <path d="M9 14l3-3 3 3" />
        </svg>
      );
    case "link":
      return (
        <svg {...props}>
          <path d="M10 14a4 4 0 005.6 0l3-3a4 4 0 00-5.6-5.6l-1 1" />
          <path d="M14 10a4 4 0 00-5.6 0l-3 3a4 4 0 005.6 5.6l1-1" />
        </svg>
      );
    case "copy":
      return (
        <svg {...props}>
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
        </svg>
      );
    case "play":
      return (
        <svg {...props} fill="currentColor" stroke="none">
          <path d="M8 5.5v13l11-6.5-11-6.5z" />
        </svg>
      );
    case "check":
      return (
        <svg {...props}>
          <path d="M5 12.5l4 4 10-10" />
        </svg>
      );
    case "expand":
      return (
        <svg {...props}>
          <path d="M4 9V4h5" />
          <path d="M20 9V4h-5" />
          <path d="M4 15v5h5" />
          <path d="M20 15v5h-5" />
        </svg>
      );
    case "home":
      return (
        <svg {...props}>
          <path d="M4 11l8-7 8 7" />
          <path d="M6 10v9a1 1 0 001 1h3v-6h4v6h3a1 1 0 001-1v-9" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...props}>
          <path d="M12 4l1.5 4 4 1.5-4 1.5L12 15l-1.5-4-4-1.5 4-1.5L12 4z" />
          <path d="M19 14l.7 1.8L21.5 16.5 19.7 17.2 19 19l-.7-1.8L16.5 16.5l1.8-.7L19 14z" />
        </svg>
      );
    case "shield":
      return (
        <svg {...props}>
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
        </svg>
      );
    case "info":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v0.5" />
          <path d="M12 11v6" />
        </svg>
      );
    default:
      return null;
  }
}

export default memo(Icon);
