/**
 * Centralized API client. Provides:
 *   - timeout (AbortController-based)
 *   - exponential-backoff retry on 5xx / network failures
 *   - normalized error shape: { ok:false, status, message, cause? }
 *   - JSON in/out by default
 *
 * Designed to be the only place anywhere in the app that knows about fetch().
 */

const BASE_URL =
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_URL) ||
  "http://localhost:5050";

const DEFAULTS = Object.freeze({
  timeoutMs: 12_000,
  retries: 2,
  retryDelayMs: 400,
});

/**
 * @typedef {Object} ApiOk
 * @property {true} ok
 * @property {number} status
 * @property {any} data
 *
 * @typedef {Object} ApiErr
 * @property {false} ok
 * @property {number} status
 * @property {string} message
 * @property {unknown} [cause]
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {string} path
 * @param {RequestInit & {timeoutMs?:number, retries?:number, retryDelayMs?:number}} [init]
 * @returns {Promise<ApiOk|ApiErr>}
 */
export async function request(path, init = {}) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const {
    timeoutMs = DEFAULTS.timeoutMs,
    retries = DEFAULTS.retries,
    retryDelayMs = DEFAULTS.retryDelayMs,
    headers,
    body,
    ...rest
  } = init;

  const reqHeaders = {
    Accept: "application/json",
    ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    ...headers,
  };

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...rest,
        headers: reqHeaders,
        body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const isJson = (res.headers.get("content-type") || "").includes("application/json");
      const data = isJson ? await res.json().catch(() => null) : await res.text();

      if (!res.ok) {
        if (res.status >= 500 && attempt < retries) {
          attempt += 1;
          await sleep(retryDelayMs * 2 ** (attempt - 1));
          continue;
        }
        return {
          ok: false,
          status: res.status,
          message:
            (data && typeof data === "object" && data.message) ||
            res.statusText ||
            "Request failed",
        };
      }
      return { ok: true, status: res.status, data };
    } catch (err) {
      clearTimeout(timeout);
      const aborted = err && err.name === "AbortError";
      if (!aborted && attempt < retries) {
        attempt += 1;
        await sleep(retryDelayMs * 2 ** (attempt - 1));
        continue;
      }
      return {
        ok: false,
        status: aborted ? 408 : 0,
        message: aborted ? "Request timed out" : "Network error",
        cause: err,
      };
    }
  }
}

export const api = {
  health: () => request("/api/health"),

  // Reserved endpoints — wire to backend when V11 server is ready.
  createJob: (payload) => request("/api/job", { method: "POST", body: payload }),
  getJob: (id) => request(`/api/job/${encodeURIComponent(id)}`),
  unlock: (id) => request(`/api/job/${encodeURIComponent(id)}/unlock`, { method: "POST" }),
};

export default api;
