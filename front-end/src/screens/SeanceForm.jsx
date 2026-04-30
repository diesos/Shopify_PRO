import React, { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { Button } from "../components/Button.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { Field, Input } from "../components/Field.jsx";
import { Icon } from "../components/Icon.jsx";
import { fmt } from "../lib/fmt.js";

const idFromIri = (s) => typeof s === "string" ? Number(s.split("/").pop()) : s?.id;

export const SeanceForm = ({ go, seanceId = null }) => {
  const auth = useAuth();
  const toast = useToast();
  const isEdit = seanceId != null;

  const [coaches, setCoaches] = useState([]);
  const [coachId, setCoachId] = useState("");
  const [name, setName] = useState("");
  const [maxUser, setMaxUser] = useState(10);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:00");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hydrating, setHydrating] = useState(isEdit);
  const [participants, setParticipants] = useState([]); // [{reservation, user}]
  const [participantsLoading, setParticipantsLoading] = useState(isEdit);

  /* Le coach connecté (ou null si admin / non-coach). On le détermine par
     l'email (cohérent avec CoachDashboard). Un admin garde le choix du coach. */
  const isAdmin = !!auth.user?.roles?.includes("ROLE_ADMIN");
  const myCoach = coaches.find(c => c.email && c.email === auth.user?.email) || null;
  const lockCoach = !isAdmin && !!myCoach;

  useEffect(() => {
    api.get("/api/coaches")
      .then(cs => {
        const list = Array.isArray(cs) ? cs : [];
        setCoaches(list);
        if (isEdit) return; // on laisse l'hydratation pré-sélectionner le coach existant
        // pré-sélection : le coach dont l'email = auth.user.email
        const me = list.find(c => c.email === auth.user?.email);
        if (me) setCoachId(String(me.id));
        else if (list[0]) setCoachId(String(list[0].id));
      })
      .catch(() => setCoaches([]));
  }, [auth.user?.email, isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    let alive = true;
    api.get(`/api/seances/${seanceId}`)
      .then(s => {
        if (!alive || !s) return;
        const start = new Date(s.startTime);
        const end   = new Date(s.endTime);
        const pad = (n) => String(n).padStart(2, "0");
        setName(s.name || "");
        setCoachId(String(s.coachId ?? ""));
        setMaxUser(s.maxUser ?? 10);
        setDate(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
        setStartTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
        setEndTime(`${pad(end.getHours())}:${pad(end.getMinutes())}`);
      })
      .catch(err => toast.push(err.message || "Séance introuvable.", { kind: "danger" }))
      .finally(() => { if (alive) setHydrating(false); });
    return () => { alive = false; };
  }, [isEdit, seanceId]);

  /* Liste des inscrits (mode édition uniquement). On filtre les réservations sur
     cette séance puis on hydrate chaque user via /api/users/{id} (autorisé pour
     un user authentifié, cf. firewall). */
  useEffect(() => {
    if (!isEdit) return;
    let alive = true;
    setParticipantsLoading(true);
    api.get("/api/reservations")
      .then(async (rs) => {
        const list = Array.isArray(rs) ? rs : [];
        const mine = list.filter(r => idFromIri(r.seance) === Number(seanceId));
        const enriched = await Promise.all(mine.map(async (r) => {
          const uid = idFromIri(r.user);
          if (!uid) return { reservation: r, user: null };
          try {
            const u = await api.get(`/api/users/${uid}`);
            return { reservation: r, user: u };
          } catch {
            return { reservation: r, user: null };
          }
        }));
        if (alive) setParticipants(enriched);
      })
      .catch(() => { if (alive) setParticipants([]); })
      .finally(() => { if (alive) setParticipantsLoading(false); });
    return () => { alive = false; };
  }, [isEdit, seanceId]);

  /* En création coach (lockCoach), on force coachId vers le coach connecté
     dès que la liste des coachs arrive. */
  useEffect(() => {
    if (!isEdit && lockCoach && myCoach) {
      setCoachId(String(myCoach.id));
    }
  }, [isEdit, lockCoach, myCoach?.id]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!coachId) errs.coachId = "Choisis un coach.";
    if (!name || name.length < 3) errs.name = "Donne un nom à la séance (3 caractères min).";
    if (!maxUser || maxUser < 1) errs.maxUser = "Au moins 1 participant.";
    if (maxUser > 30) errs.maxUser = "Maximum 30 participants par séance.";
    if (startTime >= endTime) errs.endTime = "L'heure de fin doit être après le début.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const startISO = new Date(`${date}T${startTime}:00`).toISOString();
      const endISO   = new Date(`${date}T${endTime}:00`).toISOString();
      const body = {
        name,
        coachId: Number(coachId),
        maxUser: Number(maxUser),
        startTime: startISO,
        endTime: endISO,
      };
      if (isEdit) {
        await api.patch(`/api/seances/${seanceId}`, body);
        toast.push("Séance mise à jour.", { kind: "success" });
      } else {
        await api.post("/api/seances", body);
        toast.push("Séance créée. Elle est désormais réservable.", { kind: "success" });
      }
      go("/coach");
    } catch (err) {
      const v = err.body?.violations?.[0];
      if (v?.propertyPath) setErrors({ [v.propertyPath]: v.message });
      else toast.push(err.message || (isEdit ? "Erreur lors de la mise à jour." : "Erreur lors de la création."), { kind: "danger" });
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!isEdit) return;
    if (!window.confirm("Supprimer cette séance ? Cette action est irréversible.")) return;
    setDeleting(true);
    try {
      await api.delete(`/api/seances/${seanceId}`);
      toast.push("Séance supprimée.", { kind: "success" });
      go("/coach");
    } catch (err) {
      toast.push(err.message || "Suppression impossible.", { kind: "danger" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="container" style={{ padding: "40px 32px 96px", maxWidth: 760 }}>
      <button onClick={() => go("/coach")} className="btn btn-quiet btn-sm" style={{ marginLeft: -12, marginBottom: 16 }}>
        <Icon name="chevL" size={16} /> Mon espace coach
      </button>
      <div className="h-eyebrow" style={{ marginBottom: 12 }}>{isEdit ? "Modifier la séance" : "Nouvelle séance"}</div>
      <h1 className="h-display" style={{ fontSize: 56, margin: 0, marginBottom: 8 }}>
        {isEdit ? <>Gérer ce <em>créneau</em>.</> : <>Créer un <em>créneau</em>.</>}
      </h1>
      <p className="t-body" style={{ fontSize: 15, marginBottom: 40 }}>
        {isEdit
          ? "Modifie les détails ci-dessous. Les changements sont visibles immédiatement pour les inscrits."
          : "Une fois publiée, la séance apparaît immédiatement au catalogue public et tes clients peuvent la réserver."}
      </p>

      {hydrating && (
        <div className="empty" style={{ marginBottom: 24 }}>Chargement de la séance…</div>
      )}

      {isEdit && !hydrating && (
        <section className="card" style={{ padding: 28, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div className="h-eyebrow" style={{ marginBottom: 6 }}>Inscrits</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--ink)", margin: 0 }}>
                {participants.length}<span style={{ color: "var(--ash)", fontSize: 18 }}> / {maxUser}</span>
              </h2>
            </div>
            {participants.length > 0 && (
              <span className={`badge ${participants.length >= maxUser ? "danger" : participants.length / maxUser >= 0.8 ? "warn" : "success"} dot`}>
                {participants.length >= maxUser ? "Complet" : `${maxUser - participants.length} place${maxUser - participants.length > 1 ? "s" : ""} restante${maxUser - participants.length > 1 ? "s" : ""}`}
              </span>
            )}
          </div>
          {participantsLoading ? (
            <div className="empty" style={{ border: "none", padding: 16 }}>Chargement des participants…</div>
          ) : participants.length === 0 ? (
            <div className="empty" style={{ border: "1px dashed var(--border)", padding: 24, fontSize: 14 }}>
              Personne n'est encore inscrit à cette séance.
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {participants.map(({ reservation, user }) => (
                <li key={reservation.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center", padding: "12px 14px", background: "var(--surface-2)", borderRadius: "var(--r-2)" }}>
                  <Avatar first={user?.firstName} last={user?.lastName} size={36} />
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--ink)", lineHeight: 1.2 }}>
                      {user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Utilisateur" : "Utilisateur"}
                    </div>
                    {user?.email && (
                      <div className="t-mono" style={{ fontSize: 11, color: "var(--slate)", marginTop: 2 }}>{user.email}</div>
                    )}
                  </div>
                  <div className="t-mono" style={{ fontSize: 11, color: "var(--ash)", textAlign: "right" }}>
                    inscrit·e le<br />{fmt.dateShort(reservation.reservationTime)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <form onSubmit={submit} className="card" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
        {lockCoach ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-2)" }}>
            <Avatar first={myCoach.firstName} last={myCoach.lastName} size={36} accent />
            <div>
              <div className="t-mono" style={{ fontSize: 11, color: "var(--ash)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Coach</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink)" }}>{myCoach.firstName} {myCoach.lastName}</div>
            </div>
          </div>
        ) : (
          <Field label="Coach" error={errors.coachId}>
            <select className="field-input" value={coachId} onChange={e => setCoachId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {coaches.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
            </select>
          </Field>
        )}

        <Field label="Nom de la séance" hint="Ex. « Vinyasa flow matinal »" error={errors.name}>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du cours" error={errors.name} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Nombre maximum de participants" error={errors.maxUser}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button type="button" onClick={() => setMaxUser(Math.max(1, maxUser - 1))} className="btn btn-ghost btn-sm" style={{ padding: 10 }}>
                <Icon name="minus" size={14} />
              </button>
              <Input type="number" value={maxUser} onChange={e => setMaxUser(Number(e.target.value))} error={errors.maxUser} style={{ textAlign: "center" }} />
              <button type="button" onClick={() => setMaxUser(Math.min(30, maxUser + 1))} className="btn btn-ghost btn-sm" style={{ padding: 10 }}>
                <Icon name="plus" size={14} />
              </button>
            </div>
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Heure de début">
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </Field>
          <Field label="Heure de fin" error={errors.endTime}>
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} error={errors.endTime} />
          </Field>
        </div>

        <div style={{ display: "flex", gap: 12, padding: 16, background: "var(--accent-soft)", borderRadius: "var(--r-2)", fontSize: 13, color: "var(--accent-ink)" }}>
          <Icon name="info" size={16} />
          <div>
            <div style={{ fontWeight: 500, marginBottom: 2 }}>Aperçu</div>
            {name || "Nouvelle séance"} · {date} · {startTime} – {endTime} · max <strong>{maxUser}</strong> participants
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          {isEdit ? (
            <Button type="button" variant="ghost" onClick={remove} loading={deleting} icon="trash" style={{ color: "var(--danger)" }}>
              Supprimer
            </Button>
          ) : <span />}
          <div style={{ display: "flex", gap: 10 }}>
            <Button type="button" variant="ghost" onClick={() => go("/coach")}>Annuler</Button>
            <Button type="submit" variant="accent" loading={loading} disabled={hydrating}>
              {isEdit ? "Enregistrer" : "Publier la séance"}
            </Button>
          </div>
        </div>
      </form>
    </main>
  );
};
