import React from "react";
import { Button } from "../components/Button.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { Icon } from "../components/Icon.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

const LINKS = [
  { p: "/seances", label: "Séances" },
  { p: "/coaches", label: "Coachs" },
];

export const PublicNav = ({ go, route }) => {
  const { user, logout, hasRole } = useAuth();
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "color-mix(in oklch, var(--bg) 88%, transparent)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
        <a onClick={() => go("/")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--ink)", display: "grid", placeItems: "center", color: "var(--ivory)", fontFamily: "var(--font-display)", fontSize: 18, fontStyle: "italic" }}>s</div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink)", letterSpacing: "-0.02em" }}>Sportify <em style={{ color: "var(--accent)" }}>Pro</em></span>
        </a>
        <nav style={{ display: "flex", gap: 4 }}>
          {LINKS.map(l => (
            <a key={l.p} onClick={() => go(l.p)} className="btn btn-quiet" style={{
              color: route === l.p ? "var(--ink)" : "var(--slate)",
              fontWeight: route === l.p ? 500 : 400,
              cursor: "pointer",
            }}>{l.label}</a>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!user ? (
            <>
              <Button variant="quiet" size="sm" onClick={() => go("/login")}>Se connecter</Button>
              <Button variant="primary" size="sm" onClick={() => go("/register")}>Créer un compte</Button>
            </>
          ) : (
            <>
              {hasRole("ROLE_ADMIN") && (
                <Button variant="quiet" size="sm" icon="shield" onClick={() => go("/admin")}>Admin</Button>
              )}
              {hasRole("ROLE_COACH") && (
                <Button variant="quiet" size="sm" icon="users" onClick={() => go("/coach")}>Coach</Button>
              )}
              <a onClick={() => go("/me/reservations")} className="btn btn-ghost btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", paddingLeft: 6 }}>
                <Avatar first={user.firstName} last={user.lastName} size={24} accent />
                <span>{user.firstName}</span>
              </a>
              <Button variant="quiet" size="sm" icon="logout" onClick={() => { logout(); go("/"); }}>Déconnexion</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
