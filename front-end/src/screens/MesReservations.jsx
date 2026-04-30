import React, { useEffect, useState } from "react";
import { api, iri } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { Button } from "../components/Button.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { Icon } from "../components/Icon.jsx";
import { Modal } from "../components/Modal.jsx";
import { fmt } from "../lib/fmt.js";

const idFromIri = (s) => typeof s === "string" ? Number(s.split("/").pop()) : s?.id;

export const MesReservations = ({ go }) => {
  const auth = useAuth();
  const toast = useToast();
  const [reservations, setReservations] = useState([]);
  const [seances, setSeances] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");
  const [confirmCancel, setConfirmCancel] = useState(null);

  const reload = async () => {
    setLoading(true);
    try {
      const [rs, ss, cs] = await Promise.all([
        api.get("/api/reservations"),
        api.get("/api/seances"),
        api.get("/api/coaches"),
      ]);
      setReservations(Array.isArray(rs) ? rs : []);
      setSeances(Array.isArray(ss) ? ss : []);
      setCoaches(Array.isArray(cs) ? cs : []);
    } catch (e) {
      toast.push(e.message || "Impossible de charger tes réservations.", { kind: "danger" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  /* /api/reservations renvoie TOUTES les réservations à tout user authentifié
     (cf. ApiResource GetCollection security IS_AUTHENTICATED_FULLY).
     On filtre côté front sur l'id du user connecté. */
  const myId = auth.user?.id ?? null;
  const enriched = reservations
    .filter(r => myId != null && idFromIri(r.user) === myId)
    .map(r => {
      const sid = idFromIri(r.seance);
      const seance = seances.find(s => s.id === sid);
      const coach = seance && coaches.find(c => c.id === seance.coachId);
      return { ...r, seance, coach };
    })
    .filter(r => r.seance);

  const now = new Date();
  const upcoming = enriched.filter(r => new Date(r.seance.startTime) > now);
  const past = enriched.filter(r => new Date(r.seance.startTime) <= now);
  const list = tab === "upcoming" ? upcoming : past;

  const cancel = async (id) => {
    try {
      await api.delete(`/api/reservations/${id}`);
      setReservations(prev => prev.filter(x => x.id !== id));
      toast.push("Réservation annulée. Aucun frais retenu.", { kind: "default" });
    } catch (err) {
      toast.push(err.message || "Annulation impossible.", { kind: "danger" });
    } finally {
      setConfirmCancel(null);
    }
  };

  return (
    <main className="container" style={{ padding: "48px 32px 96px" }}>
      <div style={{ marginBottom: 8 }}><span className="h-eyebrow">Mon espace</span></div>
      <h1 className="h-display" style={{ fontSize: 64, margin: 0, marginBottom: 40 }}>Mes <em>réservations</em>.</h1>

      <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--surface-2)", borderRadius: "var(--r-pill)", border: "1px solid var(--border)", width: "fit-content", marginBottom: 32 }}>
        {[
          { k: "upcoming", l: `À venir · ${upcoming.length}` },
          { k: "past", l: `Historique · ${past.length}` },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className="btn btn-quiet btn-sm"
            style={{ background: tab === t.k ? "var(--surface)" : "transparent", borderRadius: "var(--r-pill)", color: tab === t.k ? "var(--ink)" : "var(--slate)" }}>
            {t.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty">Chargement…</div>
      ) : list.length === 0 ? (
        <div className="empty">
          <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--ink)", marginBottom: 8 }}>
            {tab === "upcoming" ? "Aucune séance à venir." : "Aucun historique."}
          </div>
          <div style={{ fontSize: 14, marginBottom: 20 }}>
            {tab === "upcoming" ? "Réserve ta prochaine séance pour démarrer." : "Tes séances passées s'afficheront ici."}
          </div>
          {tab === "upcoming" && <Button variant="accent" onClick={() => go("/seances")} iconRight="arrow">Trouver une séance</Button>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {list.map(r => {
            const isPast = new Date(r.seance.startTime) < new Date();
            return (
              <div key={r.id} className="card" style={{ padding: 24, display: "grid", gridTemplateColumns: "100px 1fr auto", gap: 24, alignItems: "center" }}>
                <div style={{ textAlign: "center", padding: "12px 8px", background: "var(--surface-2)", borderRadius: "var(--r-2)" }}>
                  <div className="t-mono" style={{ fontSize: 11, color: "var(--ash)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                    {new Date(r.seance.startTime).toLocaleDateString("fr-FR", { month: "short" })}
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--ink)", lineHeight: 1 }}>
                    {new Date(r.seance.startTime).getDate()}
                  </div>
                  <div className="t-mono" style={{ fontSize: 11, color: "var(--slate)", marginTop: 4 }}>
                    {fmt.time(r.seance.startTime)}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--ink)", lineHeight: 1.1, marginBottom: 8 }}>
                    {r.seance.name}
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--slate)", flexWrap: "wrap" }}>
                    {r.coach && (
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Avatar first={r.coach.firstName} last={r.coach.lastName} size={20} />
                        {r.coach.firstName} {r.coach.lastName}
                      </span>
                    )}
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="clock" size={14} />
                      {fmt.timeRange(r.seance.startTime, r.seance.endTime)}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {isPast
                    ? <span className="badge">Terminée</span>
                    : (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => go(`/seances/${r.seance.id}`)}>Détails</Button>
                        <Button variant="quiet" size="sm" icon="trash" style={{ color: "var(--danger)" }} onClick={() => setConfirmCancel(r)}>Annuler</Button>
                      </>
                    )
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!confirmCancel} onClose={() => setConfirmCancel(null)} title="Annuler cette réservation ?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmCancel(null)}>Garder ma place</Button>
            <Button variant="accent" onClick={() => cancel(confirmCancel.id)}>Confirmer l'annulation</Button>
          </>
        }>
        {confirmCancel && (
          <p style={{ margin: 0, fontSize: 15, color: "var(--slate)", lineHeight: 1.6 }}>
            Tu vas annuler <strong style={{ color: "var(--ink)" }}>« {confirmCancel.seance.name} »</strong> du{" "}
            <span style={{ textTransform: "capitalize" }}>{fmt.date(confirmCancel.seance.startTime)}</span> à {fmt.time(confirmCancel.seance.startTime)}.
          </p>
        )}
      </Modal>
    </main>
  );
};
