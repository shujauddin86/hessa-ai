/**
 * Tiny client-side sanitizers. Server-side validation is still authoritative;
 * these are pre-checks to keep junk out of UI state and the network layer.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

// Strip angle brackets (basic XSS pre-filter) and ASCII control chars.
// Built via RegExp constructor so the unicode escapes survive bundling.
// eslint-disable-next-line no-control-regex
const STRIP_RE = new RegExp("[\\u0000-\\u001F\\u007F<>]", "g");

const MAX_TEXT_LEN = 1024;

/**
 * Strip control / angle-bracket characters; trim; cap length.
 * Safe for use on any free-text input.
 * @param {unknown} input
 * @returns {string}
 */
export function sanitizeText(input) {
  if (input == null) return "";
  return String(input).replace(STRIP_RE, "").trim().slice(0, MAX_TEXT_LEN);
}

/**
 * Allow only http/https URLs. Returns the raw input for partial typing —
 * callers should validate with `isValidUrl` before submitting.
 * @param {unknown} input
 * @returns {string}
 */
export function sanitizeUrl(input) {
  return sanitizeText(input);
}

/**
 * @param {string} input
 * @returns {boolean}
 */
export function isValidUrl(input) {
  try {
    const u = new URL(String(input));
    return ALLOWED_PROTOCOLS.has(u.protocol);
  } catch {
    return false;
  }
}
