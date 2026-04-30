import React from "react";
import { Button } from "../components/Button.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { Icon } from "../components/Icon.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

export const StaffNav = ({ go, route }) => {
  const { user, logout, hasRole } = useAuth();
  const isAdmin = hasRole("ROLE_ADMIN");
  const isCoach = hasRole("ROLE_COACH");
  const role = isAdmin ? "admin" : isCoach ? "coach" : "user";

  const links = isCoach && !isAdmin
    ? [
        { p: "/coach", label: "Tableau de bord", icon: "grid" },
        { p: "/coach/seance/new", label: "Nouvelle séance", icon: "plus" },
      ]
    : [
        { p: "/admin", label: "Vue d'ensemble", icon: "grid" },
      ];

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <a onClick={() => go("/")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: "var(--ink)", display: "grid", placeItems: "center", color: "var(--ivory)", fontFamily: "var(--font-display)", fontSize: 16, fontStyle: "italic" }}>s</div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 19, color: "var(--ink)" }}>
            Sportify <em style={{ color: "var(--accent)" }}>Pro</em>
          </span>
          <span className="badge accent" style={{ marginLeft: 6 }}>{role.toUpperCase()}</span>
        </a>
        <nav style={{ display: "flex", gap: 4 }}>
          {links.map(l => (
            <a key={l.p} onClick={() => go(l.p)} className="btn btn-quiet btn-sm" style={{
              color: route === l.p ? "var(--ink)" : "var(--slate)",
              fontWeight: route === l.p ? 500 : 400, gap: 8, cursor: "pointer",
            }}>
              <Icon name={l.icon} size={14} />{l.label}
            </a>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Avatar first={user?.firstName} last={user?.lastName} size={32} accent />
          <Button variant="quiet" size="sm" icon="logout" onClick={() => { logout(); go("/"); }}>
            Déconnexion
          </Button>
        </div>
      </div>
    </header>
  );
};
