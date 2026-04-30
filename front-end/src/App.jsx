import React, { useEffect, useState } from "react";
import { useAuth } from "./auth/AuthContext.jsx";
import { RequireAuth } from "./auth/RequireAuth.jsx";
import { PublicNav } from "./chrome/PublicNav.jsx";
import { StaffNav } from "./chrome/StaffNav.jsx";
import { Button } from "./components/Button.jsx";

import { Landing } from "./screens/Landing.jsx";
import { Login } from "./screens/Login.jsx";
import { Register } from "./screens/Register.jsx";
import { CatalogueSeances } from "./screens/CatalogueSeances.jsx";
import { SeanceDetail } from "./screens/SeanceDetail.jsx";
import { CoachesList } from "./screens/CoachesList.jsx";
import { CoachDetail } from "./screens/CoachDetail.jsx";
import { MesReservations } from "./screens/MesReservations.jsx";
import { CoachDashboard } from "./screens/CoachDashboard.jsx";
import { SeanceForm } from "./screens/SeanceForm.jsx";
import { AdminDashboard } from "./screens/AdminDashboard.jsx";

const useHashRoute = () => {
  const [route, setRoute] = useState(() => window.location.hash.replace("#", "") || "/");
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.replace("#", "") || "/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const go = (path) => {
    window.location.hash = path;
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  return [route, go];
};

const Footer = () => (
  <footer style={{ borderTop: "1px solid var(--border)", padding: "48px 0", marginTop: 0, background: "var(--surface)" }}>
    <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 24, height: 24, borderRadius: 5, background: "var(--ink)", display: "grid", placeItems: "center", color: "var(--ivory)", fontFamily: "var(--font-display)", fontSize: 14, fontStyle: "italic" }}>s</div>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink)" }}>
          Sportify <em style={{ color: "var(--accent)" }}>Pro</em>
        </span>
      </div>
      <div className="t-mono" style={{ fontSize: 11, color: "var(--ash)", letterSpacing: "0.04em" }}>
        © 2026 Sportify Pro · Omer Ozturk
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--slate)" }}>
        <a>Mentions</a><a>Confidentialité</a><a>CGV</a>
      </div>
    </div>
  </footer>
);

const NotFound = ({ go }) => (
  <div className="container" style={{ padding: 80 }}>
    <h1 className="h-display" style={{ fontSize: 56 }}>404 — page introuvable.</h1>
    <Button variant="ghost" onClick={() => go("/")}>Retour à l'accueil</Button>
  </div>
);

export const App = () => {
  const auth = useAuth();
  const [route, go] = useHashRoute();

  /* Si user connecté, on l'éjecte de /login et /register vers son espace */
  useEffect(() => {
    if (auth.user && (route === "/login" || route === "/register")) {
      go(auth.user.roles.includes("ROLE_ADMIN") ? "/admin"
        : auth.user.roles.includes("ROLE_COACH") ? "/coach"
        : "/me/reservations");
    }
  }, [auth.user, route]);

  const seanceMatch = route.match(/^\/seances\/(\d+)$/);
  const coachMatch  = route.match(/^\/coaches\/(\d+)$/);
  const seanceEditMatch = route.match(/^\/coach\/seance\/(\d+)\/edit$/);

  const guarded = (element, roles) => (
    <RequireAuth go={go} roles={roles}>{element}</RequireAuth>
  );

  let page = null;
  let chrome = "public";

  if (route === "/")                   page = <Landing go={go} />;
  else if (route === "/seances")       page = <CatalogueSeances go={go} />;
  else if (seanceMatch)                page = <SeanceDetail go={go} seanceId={seanceMatch[1]} />;
  else if (route === "/coaches")       page = <CoachesList go={go} />;
  else if (coachMatch)                 page = <CoachDetail go={go} coachId={coachMatch[1]} />;
  else if (route === "/login")         page = <Login go={go} />;
  else if (route === "/register")      page = <Register go={go} />;
  else if (route === "/me/reservations")    page = guarded(<MesReservations go={go} />, ["ROLE_USER"]);
  else if (route === "/coach")              { page = guarded(<CoachDashboard go={go} />, ["ROLE_COACH", "ROLE_ADMIN"]); chrome = "staff"; }
  else if (route === "/coach/seance/new")   { page = guarded(<SeanceForm go={go} />,     ["ROLE_COACH", "ROLE_ADMIN"]); chrome = "staff"; }
  else if (seanceEditMatch)                 { page = guarded(<SeanceForm go={go} seanceId={Number(seanceEditMatch[1])} />, ["ROLE_COACH", "ROLE_ADMIN"]); chrome = "staff"; }
  else if (route === "/admin")              { page = guarded(<AdminDashboard go={go} />, ["ROLE_ADMIN"]);                chrome = "staff"; }
  else                                  page = <NotFound go={go} />;

  return (
    <>
      {chrome === "public"
        ? <PublicNav go={go} route={route} />
        : <StaffNav go={go} route={route} />
      }
      {page}
      <Footer />
    </>
  );
};
