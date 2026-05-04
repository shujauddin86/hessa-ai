import api from "./api";

/**
 * Thin job-manager facade. Provides:
 *   - createJob(payload)      — POST /api/job
 *   - pollJob(id, onUpdate)   — exponential-backoff polling, returns stop() fn
 *   - unlock(id)              — POST /api/job/:id/unlock
 *
 * Wraps the API layer so screens never speak HTTP directly.
 */

const DEFAULT_INTERVAL_MS = 1500;
const MAX_INTERVAL_MS = 6000;

export async function createJob(payload) {
  const res = await api.createJob(payload);
  return res;
}

/**
 * Poll a job until it reaches a terminal state or stop() is called.
 * @param {string} id
 * @param {(state: any) => void} onUpdate
 * @param {{intervalMs?: number}} [opts]
 * @returns {() => void} stop function
 */
export function pollJob(id, onUpdate, { intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  let cancelled = false;
  let timer;
  let backoff = intervalMs;

  const tick = async () => {
    if (cancelled) return;
    const res = await api.getJob(id);
    if (cancelled) return;

    if (res.ok) {
      backoff = intervalMs; // reset on success
      onUpdate(res.data);
      const status = res.data && res.data.status;
      if (status === "done" || status === "failed") return;
    } else {
      backoff = Math.min(MAX_INTERVAL_MS, backoff * 1.6); // back off on failure
    }

    timer = setTimeout(tick, backoff);
  };

  tick();
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}

export async function unlock(id) {
  return api.unlock(id);
}

export default { createJob, pollJob, unlock };
