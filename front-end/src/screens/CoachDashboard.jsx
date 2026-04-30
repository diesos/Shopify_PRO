import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Button } from "../components/Button.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { KpiCard } from "../components/KpiCard.jsx";
import { fmt } from "../lib/fmt.js";

const idFromIri = (s) => typeof s === "string" ? Number(s.split("/").pop()) : s?.id;

export const CoachDashboard = ({ go }) => {
  const auth = useAuth();
  const [coaches, setCoaches] = useState([]);
  const [seances, setSeances] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/coaches"),
      api.get("/api/seances"),
      api.get("/api/reservations").catch(() => []),
    ])
      .then(([cs, ss, rs]) => {
        setCoaches(Array.isArray(cs) ? cs : []);
        setSeances(Array.isArray(ss) ? ss : []);
        setReservations(Array.isArray(rs) ? rs : []);
      })
      .finally(() => setLoading(false));
  }, []);

  /* Le backend n'a pas de mapping User↔Coach. On rapproche par email si on
     trouve un coach avec le même email que l'user authentifié, sinon on
     présente une vue agrégée multi-coach (cas admin). */
  const myCoach = useMemo(
    () => coaches.find(c => c.email && c.email === auth.user?.email) || null,
    [coaches, auth.user?.email]
  );

  const mySeances = useMemo(() => {
    const list = myCoach ? seances.filter(s => s.coachId === myCoach.id) : seances;
    return list.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }, [seances, myCoach]);

  const upcoming = mySeances.filter(s => new Date(s.startTime) > new Date());

  const bookedFor = (seanceId) => reservations.filter(r => idFromIri(r.seance) === seanceId).length;

  const totalBooked = mySeances.reduce((acc, s) => acc + bookedFor(s.id), 0);
  const totalCap = mySeances.reduce((acc, s) => acc + s.maxUser, 0);
  const fillRate = totalCap > 0 ? Math.round((totalBooked / totalCap) * 100) : 0;

  if (loading) {
    return <div className="container" style={{ padding: "120px 32px", textAlign: "center" }}><div className="h-eyebrow">Chargement…</div></div>;
  }

  return (
    <main className="container" style={{ padding: "40px 32px 96px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
        <div>
          <div className="h-eyebrow" style={{ marginBottom: 12 }}>
            Espace coach{myCoach ? "" : " · vue globale"}
          </div>
          <h1 className="h-display" style={{ fontSize: 56, margin: 0 }}>
            Bonjour, <em>{auth.user?.firstName || "coach"}</em>.
          </h1>
        </div>
        <Button variant="accent" onClick={() => go("/coach/seance/new")} icon="plus">Créer une séance</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 48 }}>
        <KpiCard label="Prochaines séances" value={upcoming.length} hint={`sur ${mySeances.length} au total`} />
        <KpiCard label="Inscrits à venir" value={upcoming.reduce((acc, s) => acc + bookedFor(s.id), 0)} accent />
        <KpiCard label="Taux de remplissage" value={`${fillRate}%`} hint={`${totalBooked}/${totalCap} places`} />
        <KpiCard label="Séances totales" value={mySeances.length} small hint={myCoach ? "tes séances" : "toutes les séances"} />
      </div>

      <h2 className="h-display" style={{ fontSize: 32, margin: 0, marginBottom: 16 }}>
        {myCoach ? "Mon planning" : "Planning global"}
      </h2>

      <div className="card" style={{ overflow: "hidden" }}>
        {upcoming.length === 0 ? (
          <div className="empty" style={{ border: "none", borderRadius: 0 }}>Aucune séance à venir.</div>
        ) : upcoming.map((s, i) => {
          const booked = bookedFor(s.id);
          const remaining = s.maxUser - booked;
          const coach = coaches.find(c => c.id === s.coachId);
          return (
            <div key={s.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr auto auto auto", gap: 20, alignItems: "center", padding: "20px 24px", borderBottom: i < upcoming.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ textAlign: "center" }}>
                <div className="t-mono" style={{ fontSize: 11, color: "var(--ash)", textTransform: "uppercase" }}>
                  {new Date(s.startTime).toLocaleDateString("fr-FR", { weekday: "short" })}
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--ink)", lineHeight: 1 }}>
                  {new Date(s.startTime).getDate()}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--ink)", lineHeight: 1.2, marginBottom: 4 }}>{s.name}</div>
                <div className="t-mono" style={{ fontSize: 12, color: "var(--slate)" }}>
                  {fmt.timeRange(s.startTime, s.endTime)} · {fmt.duration(s.startTime, s.endTime)}
                </div>
              </div>
              {!myCoach && coach && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar first={coach.firstName} last={coach.lastName} size={24} />
                  <span style={{ fontSize: 13, color: "var(--slate)" }}>{coach.firstName} {coach.lastName}</span>
                </div>
              )}
              <span className={`badge ${remaining === 0 ? "danger" : remaining <= 2 ? "warn" : "success"} dot`}>
                {booked}/{s.maxUser}
              </span>
              <Button variant="quiet" size="sm" icon="edit" onClick={() => go(`/coach/seance/${s.id}/edit`)}>Gérer</Button>
            </div>
          );
        })}
      </div>
    </main>
  );
};
