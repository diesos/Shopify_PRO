import React, { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { Placeholder } from "../components/Placeholder.jsx";
import { CoachCard } from "../components/CoachCard.jsx";
import { SeanceCard } from "../components/SeanceCard.jsx";

const countBookedBySeance = (reservations) => {
  const map = new Map();
  for (const r of (reservations || [])) {
    const sid = typeof r.seance === "string" ? Number(r.seance.split("/").pop()) : r.seance?.id;
    if (!sid) continue;
    map.set(sid, (map.get(sid) || 0) + 1);
  }
  return map;
};

export const Landing = ({ go }) => {
  const [coaches, setCoaches] = useState([]);
  const [seances, setSeances] = useState([]);
  const [bookedMap, setBookedMap] = useState(new Map());

  useEffect(() => {
    api.get("/api/coaches").then(setCoaches).catch(() => setCoaches([]));
    api.get("/api/seances").then(setSeances).catch(() => setSeances([]));
    api.get("/api/reservations")
      .then(rs => setBookedMap(countBookedBySeance(rs)))
      .catch(() => {}); // public users → 401, on ignore
  }, []);

  const featured = coaches.slice(0, 3);
  const upcoming = seances
    .filter(s => new Date(s.startTime) > new Date())
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, 3);

  return (
    <main>
      {/* HERO */}
      <section className="container" style={{ padding: "80px 32px 64px", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 64, alignItems: "center" }}>
        <div>
          <div className="h-eyebrow" style={{ marginBottom: 24 }}>· Plateforme de coaching · Paris</div>
          <h1 className="h-display" style={{ fontSize: 88, margin: 0, marginBottom: 28 }}>
            Le sport,<br />avec le bon <em>guide</em>.
          </h1>
          <p className="t-body" style={{ fontSize: 18, maxWidth: 480, marginBottom: 40, lineHeight: 1.55 }}>
            Réservez en quelques secondes une séance avec un coach diplômé. Créneaux disponibles dès aujourd'hui.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <Button variant="accent" size="lg" onClick={() => go("/seances")} iconRight="arrow">Voir les séances</Button>
            <Button variant="ghost" size="lg" onClick={() => go("/coaches")}>Découvrir les coachs</Button>
          </div>
          <div style={{ display: "flex", gap: 32, marginTop: 56, paddingTop: 32, borderTop: "1px solid var(--border)" }}>
            <div>
              <div className="t-mono" style={{ fontSize: 24, color: "var(--ink)", letterSpacing: "-0.02em" }}>{coaches.length}</div>
              <div style={{ fontSize: 12, color: "var(--ash)", marginTop: 4 }}>Coachs référencés</div>
            </div>
            <div>
              <div className="t-mono" style={{ fontSize: 24, color: "var(--ink)", letterSpacing: "-0.02em" }}>{seances.length}</div>
              <div style={{ fontSize: 12, color: "var(--ash)", marginTop: 4 }}>Séances publiées</div>
            </div>
            <div>
              <div className="t-mono" style={{ fontSize: 24, color: "var(--ink)", letterSpacing: "-0.02em" }}>{upcoming.length}</div>
              <div style={{ fontSize: 12, color: "var(--ash)", marginTop: 4 }}>À venir</div>
            </div>
          </div>
        </div>
        <div style={{ position: "relative", height: 560 }}>
          <Placeholder tone="warm" label="hero · lifestyle studio" height="100%" style={{ position: "absolute", top: 0, left: 0, right: 40, bottom: 80, borderRadius: 16 }} />
        </div>
      </section>

      {/* COACHS EN VEDETTE */}
      <section style={{ background: "var(--bone)", padding: "80px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
            <div>
              <div className="h-eyebrow" style={{ marginBottom: 12 }}>Coachs en vedette</div>
              <h2 className="h-display" style={{ fontSize: 56, margin: 0 }}>Choisis ton <em>mentor</em>.</h2>
            </div>
            <Button variant="ghost" onClick={() => go("/coaches")} iconRight="arrow">Voir tous les coachs</Button>
          </div>
          {featured.length === 0
            ? <div className="empty">Aucun coach pour l'instant.</div>
            : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
                {featured.map(c => <CoachCard key={c.id} coach={c} onOpen={() => go(`/coaches/${c.id}`)} />)}
              </div>
            )
          }
        </div>
      </section>

      {/* PROCHAINES SÉANCES */}
      <section className="container" style={{ padding: "80px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
          <div>
            <div className="h-eyebrow" style={{ marginBottom: 12 }}>À venir</div>
            <h2 className="h-display" style={{ fontSize: 56, margin: 0 }}>Réserve ton <em>créneau</em>.</h2>
          </div>
          <Button variant="ghost" onClick={() => go("/seances")} iconRight="arrow">Voir toutes les séances</Button>
        </div>
        {upcoming.length === 0
          ? <div className="empty">Aucune séance à venir.</div>
          : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
              {upcoming.map(s => {
                const coach = coaches.find(c => c.id === s.coachId);
                return <SeanceCard key={s.id} seance={s} coach={coach} booked={bookedMap.get(s.id) || 0} onOpen={() => go(`/seances/${s.id}`)} />;
              })}
            </div>
          )
        }
      </section>
    </main>
  );
};
