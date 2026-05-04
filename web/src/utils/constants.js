/**
 * App-wide constants. Keep this file string-only (no imports) so it can be
 * tree-shaken into any bundle, server-side included.
 */

export const APP_NAME = "Hessa Search";
export const APP_TAGLINE = "RAW TO REEL · DISCOVER YOUR MOMENTS";
export const PRICE_INR = 99;

export const SCREEN_KEYS = Object.freeze([
  "splash",
  "login",
  "upload",
  "processing",
  "found",
  "reel",
]);

export const SUPPORTED_VIDEO_TYPES = Object.freeze(["MP4", "MOV", "AVI"]);

export const PIPELINE_STAGES = Object.freeze([
  { id: "frames", label: "Extracting frames" },
  { id: "faces", label: "Detecting faces" },
  { id: "match", label: "Matching you" },
  { id: "preview", label: "Generating preview" },
]);
