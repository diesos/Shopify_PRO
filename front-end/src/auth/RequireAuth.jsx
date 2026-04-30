/* Guard de route : redirige si pas auth ou rôle insuffisant. */

import React, { useEffect } from "react";
import { useAuth } from "./AuthContext.jsx";

export const RequireAuth = ({ children, roles, go, redirectTo = "/login" }) => {
  const { user, bootstrapping, hasAnyRole } = useAuth();

  useEffect(() => {
    if (bootstrapping) return;
    if (!user) { go(redirectTo); return; }
    if (roles && !hasAnyRole(roles)) { go("/"); return; }
  }, [user, bootstrapping, roles, redirectTo]);

  if (bootstrapping) {
    return (
      <div className="container" style={{ padding: "120px 32px", textAlign: "center" }}>
        <div className="h-eyebrow" style={{ marginBottom: 12 }}>· Chargement</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--ink)" }}>
          Vérification de votre <em style={{ color: "var(--accent)" }}>session</em>…
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (roles && !hasAnyRole(roles)) return null;

  return children;
};
