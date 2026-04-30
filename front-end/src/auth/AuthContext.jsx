/* AuthProvider, useAuth.
 *
 * - Bootstrap : lit le JWT du localStorage, hydrate via payload, refresh /api/me
 * - JWT exp watcher : check toutes les 30s, auto-logout si expiré
 * - 401 global : si l'interceptor api/client.js vide le token, on vide le user
 */

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { api, decodeJWT, isJWTExpired, onUnauthorized, tokenStore, ApiError } from "../api/client.js";

const AuthContext = createContext(null);

/* Normalise l'objet user retourné par /api/me */
const userFromApi = (raw) => {
  if (!raw) return null;
  const roles = Array.isArray(raw.userRoles)
    ? raw.userRoles.map(r => typeof r === "string" ? r : r.name).filter(Boolean)
    : (raw.roles || []);
  if (!roles.includes("ROLE_USER")) roles.push("ROLE_USER");
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.firstName,
    lastName: raw.lastName,
    roles,
  };
};

/* Hydrate depuis le payload JWT (avec id/firstName/lastName injectés par notre subscriber) */
const userFromJWT = (payload) => {
  if (!payload) return null;
  return {
    id: payload.id,
    email: payload.username || payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    roles: payload.roles || ["ROLE_USER"],
  };
};

export const roleLabelOf = (user) => {
  if (!user) return "guest";
  if (user.roles.includes("ROLE_ADMIN")) return "admin";
  if (user.roles.includes("ROLE_COACH")) return "coach";
  return "client";
};

const JWT_CHECK_INTERVAL_MS = 30_000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const expWatchRef = useRef(null);

  /* ---- 401 global ---- */
  useEffect(() => onUnauthorized(() => setUser(null)), []);

  /* ---- Bootstrap au mount ---- */
  useEffect(() => {
    const token = tokenStore.get();
    const payload = decodeJWT(token);
    if (!token || !payload || isJWTExpired(payload)) {
      tokenStore.clear();
      setBootstrapping(false);
      return;
    }
    setUser(userFromJWT(payload));
    api.get("/api/me")
      .then(raw => setUser(userFromApi(raw)))
      .catch(err => {
        if (err.status === 401) {
          tokenStore.clear();
          setUser(null);
        }
      })
      .finally(() => setBootstrapping(false));
  }, []);

  /* ---- JWT exp watcher : auto-logout si exp dépassée ou token disparu ---- */
  useEffect(() => {
    if (!user) {
      if (expWatchRef.current) { clearInterval(expWatchRef.current); expWatchRef.current = null; }
      return;
    }
    const tick = () => {
      const token = tokenStore.get();
      if (!token) { setUser(null); return; }
      const payload = decodeJWT(token);
      if (!payload || isJWTExpired(payload)) {
        tokenStore.clear();
        setUser(null);
      }
    };
    expWatchRef.current = setInterval(tick, JWT_CHECK_INTERVAL_MS);
    return () => clearInterval(expWatchRef.current);
  }, [user?.id]);

  const login = async (email, password) => {
    const res = await api.post("/api/login_check", { email, password });
    if (!res?.token) throw new ApiError("Réponse de connexion invalide.", 500, res);
    tokenStore.set(res.token);
    const u = userFromJWT(decodeJWT(res.token));
    setUser(u);
    return u;
  };

  const register = async ({ firstName, lastName, email, password }) => {
    await api.post("/api/users", { firstName, lastName, email, password });
    return login(email, password);
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  const hasRole = (role) => Boolean(user?.roles?.includes(role));
  const hasAnyRole = (roles) => Boolean(user && roles.some(r => user.roles.includes(r)));
  const roleLabel = roleLabelOf(user);

  const value = { user, bootstrapping, roleLabel, login, register, logout, hasRole, hasAnyRole };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé sous <AuthProvider>");
  return ctx;
};
