/**
 * utils/api.js — Axios instance with auth headers + error handling
 */
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const api = axios.create({
  baseURL:         `${API_URL}/api`,
  withCredentials: true,
  timeout:         30000,
});

// Attach auth token
api.interceptors.request.use((config) => {
  const token = Cookies.get("hessa_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const deviceId = _getDeviceId();
  if (deviceId) config.headers["X-Device-ID"] = deviceId;
  return config;
});

// Handle 401 globally — clear token + redirect
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove("hessa_token");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err.response?.data || err);
  }
);

function _getDeviceId() {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem("hessa_device");
  if (!id) {
    id = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem("hessa_device", id);
  }
  return id;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data)  => api.post("/auth/register", data),
  login:    (data)  => api.post("/auth/login",    data),
  logout:   ()      => api.post("/auth/logout"),
  me:       ()      => api.get("/auth/me"),
};

// ── Subscription ─────────────────────────────────────────────────────────────
export const subAPI = {
  get:     ()     => api.get("/subscriptions"),
  pay:     (data) => api.post("/subscriptions/pay",     data),
  confirm: (data) => api.post("/subscriptions/confirm", data),
};

// ── Upload (chunked) ─────────────────────────────────────────────────────────
export const uploadAPI = {
  chunk: (formData, onProgress) =>
    api.post("/upload/chunk", formData, {
      headers:          { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress,
    }),
  faceRef: (formData) =>
    api.post("/upload/face", formData, { headers: { "Content-Type": "multipart/form-data" } }),
};

// ── Jobs ─────────────────────────────────────────────────────────────────────
export const jobsAPI = {
  list:         ()           => api.get("/jobs"),
  get:          (id)         => api.get(`/jobs/${id}`),
  selectClips:  (id, clips)  => api.post(`/jobs/${id}/select-clips`,   { clips }),
  regenerate:   (id)         => api.post(`/jobs/${id}/regenerate`),
  downloadLink: (id)         => api.get(`/jobs/${id}/download-link`),
};

// ── Privacy ──────────────────────────────────────────────────────────────────
export const privacyAPI = {
  analyze:         (data) => api.post("/privacy/analyze",  data),
  generateRequest: (data) => api.post("/privacy/request",  data),
};

export default api;
