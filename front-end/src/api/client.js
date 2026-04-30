/* Client API axios + interceptors.
 * Seul module qui parle à axios. Tout le reste passe par api.* / iri.*.
 */

import axios from "axios";

export const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "sportify_jwt";

/* -------- Token storage (localStorage) -------- */
export const tokenStore = {
  get:   ()  => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set:   (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch {} },
  clear: ()  => { try { localStorage.removeItem(TOKEN_KEY); } catch {} },
};

/* -------- JWT decode (base64url) -------- */
export const decodeJWT = (token) => {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    const json = decodeURIComponent(
      atob(padded).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const isJWTExpired = (payload) => {
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000;
};

/* -------- ApiError typé -------- */
export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const errorMessage = (body, status) =>
     body?.["hydra:description"]
  ?? body?.detail
  ?? body?.message
  ?? body?.error
  ?? body?.violations?.[0]?.message
  ?? `HTTP ${status ?? "??"}`;

/* -------- 401 listeners (l'AuthProvider s'y abonne) -------- */
const unauthorizedListeners = new Set();
export const onUnauthorized = (fn) => { unauthorizedListeners.add(fn); return () => unauthorizedListeners.delete(fn); };

/* -------- Instance axios + interceptors -------- */
export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Accept": "application/ld+json, application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if ((config.method || "").toLowerCase() === "patch") {
    config.headers["Content-Type"] = "application/merge-patch+json";
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const d = response.data;
    if (d && typeof d === "object" && !Array.isArray(d)) {
      if (Array.isArray(d.member))                response.data = d.member;
      else if (Array.isArray(d["hydra:member"]))  response.data = d["hydra:member"];
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const body   = error.response?.data;
    if (status === 401) {
      tokenStore.clear();
      unauthorizedListeners.forEach(fn => { try { fn(); } catch {} });
    }
    return Promise.reject(new ApiError(errorMessage(body, status), status, body));
  }
);

/* -------- Sucre : retourne le corps directement -------- */
export const api = {
  get:    (path)        => apiClient.get(path).then(r => r.data),
  post:   (path, body)  => apiClient.post(path, body).then(r => r.data),
  patch:  (path, body)  => apiClient.patch(path, body).then(r => r.data),
  put:    (path, body)  => apiClient.put(path, body).then(r => r.data),
  delete: (path)        => apiClient.delete(path).then(r => r.data),
};

/* -------- Helpers IRI (API Platform attend "/api/users/7") -------- */
export const iri = {
  user:    (id) => `/api/users/${id}`,
  seance:  (id) => `/api/seances/${id}`,
  coach:   (id) => `/api/coaches/${id}`,
  parseId: (s) => {
    const m = typeof s === "string" && s.match(/\/(\d+)$/);
    return m ? Number(m[1]) : null;
  },
};
