/**
 * Mobile API client — mirrors web/src/utils/api.js
 */
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://localhost:4000"; // Change to prod URL

const api = axios.create({
  baseURL:         `${API_URL}/api`,
  timeout:         30000,
});

api.interceptors.request.use(async (config) => {
  const token    = await AsyncStorage.getItem("hessa_token");
  const deviceId = await AsyncStorage.getItem("hessa_device");
  if (token)    config.headers.Authorization = `Bearer ${token}`;
  if (deviceId) config.headers["X-Device-ID"] = deviceId;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.removeItem("hessa_token");
    }
    return Promise.reject(err.response?.data || err);
  }
);

export const authAPI = {
  register: (d) => api.post("/auth/register", d),
  login:    (d) => api.post("/auth/login",    d),
  logout:   ()  => api.post("/auth/logout"),
  me:       ()  => api.get("/auth/me"),
};

export const subAPI = {
  get:     ()  => api.get("/subscriptions"),
  pay:     (d) => api.post("/subscriptions/pay",     d),
  confirm: (d) => api.post("/subscriptions/confirm", d),
};

export const jobsAPI = {
  list:         ()          => api.get("/jobs"),
  get:          (id)        => api.get(`/jobs/${id}`),
  selectClips:  (id, clips) => api.post(`/jobs/${id}/select-clips`, { clips }),
  regenerate:   (id)        => api.post(`/jobs/${id}/regenerate`),
  downloadLink: (id)        => api.get(`/jobs/${id}/download-link`),
};

export default api;
