import React, { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { Icon } from "../components/Icon.jsx";
import { Placeholder } from "../components/Placeholder.jsx";
import { fmt } from "../lib/fmt.js";

export const CoachDetail = ({ go, coachId }) => {
  const [coach, setCoach] = useState(null);
  const [seances, setSeances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/coaches/${coachId}`),
      api.get("/api/seances"),
    ])
      .then(([c, list]) => {
        setCoach(c);
        const upcoming = (Array.isArray(list) ? list : [])
          .filter(s => s.coachId === Number(coachId))
          .filter(s => new Date(s.startTime) > new Date())
          .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        setSeances(upcoming);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [coachId]);

  if (loading) return <div className="container" style={{ padding: "120px 32px", textAlign: "center" }}><div className="h-eyebrow">Chargement…</div></div>;
  if (error || !coach) return (
    <div className="container" style={{ padding: 80 }}>
      <h1 className="h-display" style={{ fontSize: 56 }}>Coach introuvable.</h1>
      <Button variant="ghost" onClick={() => go("/coaches")}>Retour aux coachs</Button>
    </div>
  );

  return (
    <main>
      <Placeholder tone="warm" label={`portrait · ${coach.firstName.toLowerCase()} ${coach.lastName.toLowerCase()}`} height={480} radius="0" />
      <div className="container" style={{ padding: "48px 32px 96px" }}>
        <button onClick={() => go("/coaches")} className="btn btn-quiet btn-sm" style={{ marginBottom: 24, marginLeft: -12 }}>
          <Icon name="chevL" size={16} /> Tous les coachs
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.9fr", gap: 64 }}>
          <div>
            <div className="h-eyebrow" style={{ marginBottom: 12 }}>Coach</div>
            <h1 className="h-display" style={{ fontSize: 80, margin: 0, marginBottom: 32 }}>
              {coach.firstName}<br /><em>{coach.lastName}</em>.
            </h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, paddingTop: 32, borderTop: "1px solid var(--border)" }}>
              <div>
                <div className="h-eyebrow" style={{ marginBottom: 6 }}>Tarif horaire</div>
                <div className="t-mono" style={{ fontSize: 20, color: "var(--ink)" }}>{fmt.euro(coach.pricePerHour)}</div>
              </div>
              <div>
                <div className="h-eyebrow" style={{ marginBottom: 6 }}>Email</div>
                <div className="t-mono" style={{ fontSize: 13, color: "var(--ink)" }}>{coach.email}</div>
              </div>
              <div>
                <div className="h-eyebrow" style={{ marginBottom: 6 }}>Téléphone</div>
                <div className="t-mono" style={{ fontSize: 13, color: "var(--ink)" }}>{coach.phone || "—"}</div>
              </div>
            </div>
          </div>

          <aside>
            <h2 className="h-display" style={{ fontSize: 28, margin: 0, marginBottom: 16 }}>Prochaines <em>séances</em></h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {seances.length === 0
                ? <div className="empty">Aucune séance programmée.</div>
                : seances.slice(0, 5).map(s => (
                  <div key={s.id} onClick={() => go(`/seances/${s.id}`)} className="card card-hover" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink)" }}>{s.name}</div>
                      <div className="t-mono" style={{ fontSize: 11, color: "var(--slate)", marginTop: 4 }}>
                        {fmt.dateShort(s.startTime)} · {fmt.time(s.startTime)}
                      </div>
                    </div>
                    <Icon name="arrow" size={16} style={{ color: "var(--slate)" }} />
                  </div>
                ))
              }
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};
