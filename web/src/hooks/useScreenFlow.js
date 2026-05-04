import { useCallback } from "react";
import { useApp } from "../context/AppContext";

/**
 * Imperative helpers for moving through the canonical 6-screen flow.
 * Centralizes navigation so screens never type screen keys as strings.
 */
export default function useScreenFlow() {
  const { navigate, screen } = useApp();

  const toLogin = useCallback(() => navigate("login"), [navigate]);
  const toUpload = useCallback(() => navigate("upload"), [navigate]);
  const toProcessing = useCallback(() => navigate("processing"), [navigate]);
  const toFound = useCallback(() => navigate("found"), [navigate]);
  const toReel = useCallback(() => navigate("reel"), [navigate]);

  return { screen, toLogin, toUpload, toProcessing, toFound, toReel };
}
