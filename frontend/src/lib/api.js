// RaktaSetu API client — single place for all backend calls.
// Base URL defaults to the local Express server; override with VITE_API_URL.
import { useEffect, useState } from "react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function getToken() {
  return localStorage.getItem("rt_token");
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error("Can't reach the server — is the backend running?");
  }

  if (res.status === 401 && token) {
    localStorage.removeItem("rt_token");
    localStorage.removeItem("rt_user");
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Session expired — please sign in again.");
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
  return data;
}

export const api = {
  // ── meta (public) ──────────────────────────────────────────────
  getBloodGroups: () => request("/api/meta/blood-groups"),

  // ── auth ───────────────────────────────────────────────────────
  login: (payload) => request("/api/auth/login", { method: "POST", body: payload }),
  register: (payload) => request("/api/auth/register", { method: "POST", body: payload }),
  getMe: () => request("/api/auth/me"),

  // ── donor ──────────────────────────────────────────────────────
  getDonorMe: () => request("/api/donors/me"),
  getDonorHistory: () => request("/api/donors/me/history"),
  getNearbyRequests: () => request("/api/donors/me/nearby-requests"),
  getMatchAlerts: () => request("/api/donors/me/match-alerts"),
  updateDonorMe: (payload) => request("/api/donors/me", { method: "PATCH", body: payload }),

  // ── requests ───────────────────────────────────────────────────
  getRequests: () => request("/api/requests"),
  getMyRequests: () => request("/api/requests/mine"),
  getRequest: (id) => request(`/api/requests/${id}`),
  getRequestMatches: (id) => request(`/api/requests/${id}/matches`),
  createRequest: (payload) => request("/api/requests", { method: "POST", body: payload }),
  setRequestStatus: (id, status) =>
    request(`/api/requests/${id}/status`, { method: "PATCH", body: { status } }),

  // ── inventory ──────────────────────────────────────────────────
  getInventory: () => request("/api/inventory"),
  getBatches: () => request("/api/inventory/batches"),
  restock: (payload) => request("/api/inventory/batches", { method: "POST", body: payload }),

  // ── donations ──────────────────────────────────────────────────
  recordDonation: (payload) => request("/api/donations", { method: "POST", body: payload }),

  // ── camps ──────────────────────────────────────────────────────
  getCamps: () => request("/api/camps"),
  createCamp: (payload) => request("/api/camps", { method: "POST", body: payload }),
  updateCamp: (id, payload) => request(`/api/camps/${id}`, { method: "PATCH", body: payload }),

  // ── cross-match ────────────────────────────────────────────────
  getCrossmatch: () => request("/api/crossmatch"),
  createCrossmatch: (payload) => request("/api/crossmatch", { method: "POST", body: payload }),

  // ── alerts ─────────────────────────────────────────────────────
  getAlerts: () => request("/api/alerts"),
  getAllAlerts: () => request("/api/alerts?all=1"),
  createAlert: (payload) => request("/api/alerts", { method: "POST", body: payload }),
  resolveAlert: (id) => request(`/api/alerts/${id}/resolve`, { method: "PATCH" }),

  // ── admin ──────────────────────────────────────────────────────
  getAdminStats: () => request("/api/admin/stats"),
  getForecast: () => request("/api/admin/forecast"),
  getReports: () => request("/api/admin/reports"),
};

// ── tiny data hook: const { data, error, reload } = useApi(api.getInventory); ──
export function useApi(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setError(null);
    fn()
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message || "Couldn't load data.");
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, error, reload: () => setTick((t) => t + 1) };
}
