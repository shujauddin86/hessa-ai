import { useEffect, useRef, useState } from "react";

/**
 * Smooth, eased progress driver. Animates a value from `from` to `to`
 * over `durationMs` using rAF — independent of React render cadence.
 *
 * Replace this hook's body with a polling driver against the real
 * /api/job/:id endpoint when wiring the production backend.
 *
 * @param {{ from?: number, to?: number, durationMs?: number }} opts
 * @returns {number}
 */
export default function useProgress({ from = 0, to = 100, durationMs = 1500 } = {}) {
  const [value, setValue] = useState(from);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / durationMs);
      const next = from + (to - from) * easeOutCubic(t);
      setValue(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [from, to, durationMs]);

  return value;
}
