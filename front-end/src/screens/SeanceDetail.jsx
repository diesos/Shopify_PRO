import React, { useEffect, useState } from "react";
import { api, iri } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { Button } from "../components/Button.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { Icon } from "../components/Icon.jsx";
import { Modal } from "../components/Modal.jsx";
import { Placeholder } from "../components/Placeholder.jsx";
import { fmt } from "../lib/fmt.js";

export const SeanceDetail = ({ go, seanceId, onReserved }) => {
  const auth = useAuth();
  const toast = useToast();
  const [seance, setSeance] = useState(null);
  const [coach, setCoach] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await api.get(`/api/seances/${seanceId}`);
      setSeance(s);
      if (s.coachId) {
        try {
          const c = await api.get(`/api/coaches/${s.coachId}`);
          setCoach(c);
        } catch { /* coach peut avoir été supprimé */ }
      }
      try {
        const rs = await api.get("/api/reservations");
        setReservations(Array.isArray(rs) ? rs : []);
      } catch { /* visiteur sans token → ignore */ }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [seanceId]);

  if (loading) {
    return (
      <div className="container" style={{ padding: "120px 32px", textAlign: "center" }}>
        <div className="h-eyebrow">Chargement…</div>
      </div>
    );
  }

  if (error || !seance) {
    return (
      <div className="container" style={{ padding: 80 }}>
        <h1 className="h-display" style={{ fontSize: 56 }}>Séance introuvable.</h1>
        <Button variant="ghost" onClick={() => go("/seances")}>Retour au catalogue</Button>
      </div>
    );
  }

  const seanceReservations = reservations.filter(r => {
    const sid = typeof r.seance === "string" ? Number(r.seance.split("/").pop()) : r.seance?.id;
    return sid === Number(seanceId);
  });
  const booked = seanceReservations.length;
  const remaining = Math.max(0, seance.maxUser - booked);
  const myReservation = auth.user && seanceReservations.find(r => {
    const uid = typeof r.user === "string" ? Number(r.user.split("/").pop()) : r.user?.id;
    return uid === auth.user.id;
  });

  const reserve = async () => {
    if (!auth.user) { go("/login"); return; }
    setReserving(true);
    try {
      await api.post("/api/reservations", {
        user: iri.user(auth.user.id),
        seance: iri.seance(seance.id),
        reservationTime: new Date().toISOString(),
      });
      toast.push(`« ${seance.name} » réservée.`, { kind: "success" });
      onReserved?.();
      go("/me/reservations");
    } catch (err) {
      toast.push(err.message || "Réservation impossible.", { kind: "danger" });
    } finally {
      setReserving(false);
    }
  };

  const unsubscribe = async () => {
    if (!myReservation) return;
    setCancelling(true);
    try {
      await api.delete(`/api/reservations/${myReservation.id}`);
      toast.push("Désinscription confirmée. Aucun frais retenu.", { kind: "default" });
      setConfirmCancel(false);
      reload();
    } catch (err) {
      toast.push(err.message || "Désinscription impossible.", { kind: "danger" });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <main className="container" style={{ padding: "48px 32px 96px" }}>
      <button onClick={() => go("/seances")} className="btn btn-quiet btn-sm" style={{ marginLeft: -12, marginBottom: 24 }}>
        <Icon name="chevL" size={16} /> Toutes les séances
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 56 }}>
        <div>
          <Placeholder tone="warm" label="séance · studio" height={420} />

          <div style={{ marginTop: 40 }}>
            <div className="h-eyebrow" style={{ marginBottom: 16 }}>· Séance</div>
            <h1 className="h-display" style={{ fontSize: 64, margin: 0, marginBottom: 24 }}>{seance.name}</h1>
            <div style={{ display: "flex", gap: 20, marginBottom: 40, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--slate)", flexWrap: "wrap" }}>
              <span><strong style={{ color: "var(--ink)", fontWeight: 500 }}>{fmt.dateLong(seance.startTime)}</strong></span>
              <span style={{ color: "var(--ash)" }}>·</span>
              <span><strong style={{ color: "var(--ink)", fontWeight: 500 }}>{fmt.timeRange(seance.startTime, seance.endTime)}</strong></span>
              {coach && (
                <>
                  <span style={{ color: "var(--ash)" }}>·</span>
                  <span>avec <strong style={{ color: "var(--ink)", fontWeight: 500 }}>{coach.firstName} {coach.lastName}</strong></span>
                </>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32 }}>
              <div className="card" style={{ padding: 20 }}>
                <div className="h-eyebrow" style={{ marginBottom: 10 }}>Durée</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--ink)", lineHeight: 1.1 }}>
                  {fmt.duration(seance.startTime, seance.endTime)}
                </div>
              </div>
              <div className="card" style={{ padding: 20 }}>
                <div className="h-eyebrow" style={{ marginBottom: 10 }}>Capacité</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--ink)", lineHeight: 1.1 }}>
                  {seance.maxUser} max
                </div>
              </div>
              <div className="card" style={{ padding: 20 }}>
                <div className="h-eyebrow" style={{ marginBottom: 10 }}>Inscrits</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--ink)", lineHeight: 1.1 }}>
                  {booked}/{seance.maxUser}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside>
          <div className="card" style={{ padding: 28, position: "sticky", top: 96 }}>
            <div className="h-eyebrow" style={{ marginBottom: 12 }}>Réserver</div>
            {coach && (
              <div style={{ paddingBottom: 24, marginBottom: 24, borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 56, color: "var(--ink)", lineHeight: 1, letterSpacing: "-0.02em" }}>
                  {fmt.euro(coach.pricePerHour)}
                </div>
                <div className="t-mono" style={{ fontSize: 12, color: "var(--ash)", marginTop: 6 }}>tarif horaire du coach</div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--bone)", fontSize: 14 }}>
                <span style={{ color: "var(--slate)" }}>Date</span>
                <span className="t-mono" style={{ color: "var(--ink)" }}>{fmt.dateShort(seance.startTime)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--bone)", fontSize: 14 }}>
                <span style={{ color: "var(--slate)" }}>Horaire</span>
                <span className="t-mono" style={{ color: "var(--ink)" }}>{fmt.timeRange(seance.startTime, seance.endTime)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: 14 }}>
                <span style={{ color: "var(--slate)" }}>Places restantes</span>
                <span className="t-mono" style={{ color: "var(--ink)" }}>{remaining} / {seance.maxUser}</span>
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {myReservation ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--success-bg)", color: "var(--success)", borderRadius: "var(--r-2)", fontSize: 13 }}>
                    <Icon name="check" size={16} stroke={2} />
                    <div>
                      <div style={{ fontWeight: 500 }}>Vous êtes inscrit·e</div>
                      <div className="t-mono" style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                        depuis {fmt.dateShort(myReservation.reservationTime)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost" size="lg" block
                    icon="trash"
                    style={{ color: "var(--danger)", borderColor: "var(--danger-bg)" }}
                    onClick={() => setConfirmCancel(true)}
                  >
                    Se désinscrire
                  </Button>
                </>
              ) : remaining === 0 ? (
                <Button variant="ghost" size="lg" block disabled>Complet</Button>
              ) : (
                <Button variant="primary" size="lg" block loading={reserving} onClick={reserve} iconRight="arrow">
                  {auth.user ? "Réserver cette séance" : "Se connecter pour réserver"}
                </Button>
              )}
            </div>

            {coach && (
              <div style={{ marginTop: 28, paddingTop: 28, borderTop: "1px solid var(--border)" }}>
                <div className="h-eyebrow" style={{ marginBottom: 14 }}>Animée par</div>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <Avatar first={coach.firstName} last={coach.lastName} size={56} accent />
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink)", lineHeight: 1.1 }}>
                      {coach.firstName} {coach.lastName}
                    </div>
                    {coach.email && (
                      <div className="t-mono" style={{ fontSize: 11, color: "var(--slate)", marginTop: 4 }}>{coach.email}</div>
                    )}
                  </div>
                </div>
                <a onClick={() => go(`/coaches/${coach.id}`)} style={{ display: "inline-block", marginTop: 14, fontSize: 13, color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}>
                  Voir le profil de {coach.firstName} →
                </a>
              </div>
            )}
          </div>
        </aside>
      </div>

      <Modal
        open={confirmCancel}
        onClose={() => !cancelling && setConfirmCancel(false)}
        title="Se désinscrire de cette séance ?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)} disabled={cancelling}>Garder ma place</Button>
            <Button variant="accent" loading={cancelling} onClick={unsubscribe}>Confirmer la désinscription</Button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 15, color: "var(--slate)", lineHeight: 1.6 }}>
          Tu vas annuler ta place sur <strong style={{ color: "var(--ink)" }}>« {seance.name} »</strong> du{" "}
          <span style={{ textTransform: "capitalize" }}>{fmt.date(seance.startTime)}</span> à {fmt.time(seance.startTime)}.
          Aucun frais ne sera retenu.
        </p>
      </Modal>
    </main>
  );
};
