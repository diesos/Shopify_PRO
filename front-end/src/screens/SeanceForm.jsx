import React, { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { Button } from "../components/Button.jsx";
import { Field, Input } from "../components/Field.jsx";
import { Icon } from "../components/Icon.jsx";

export const SeanceForm = ({ go }) => {
  const auth = useAuth();
  const toast = useToast();

  const [coaches, setCoaches] = useState([]);
  const [coachId, setCoachId] = useState("");
  const [name, setName] = useState("");
  const [maxUser, setMaxUser] = useState(10);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:00");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/api/coaches")
      .then(cs => {
        const list = Array.isArray(cs) ? cs : [];
        setCoaches(list);
        // pré-sélection : le coach dont l'email = auth.user.email
        const me = list.find(c => c.email === auth.user?.email);
        if (me) setCoachId(String(me.id));
        else if (list[0]) setCoachId(String(list[0].id));
      })
      .catch(() => setCoaches([]));
  }, [auth.user?.email]);

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
      await api.post("/api/seances", {
        name,
        coachId: Number(coachId),
        maxUser: Number(maxUser),
        startTime: startISO,
        endTime: endISO,
      });
      toast.push("Séance créée. Elle est désormais réservable.", { kind: "success" });
      go("/coach");
    } catch (err) {
      const v = err.body?.violations?.[0];
      if (v?.propertyPath) setErrors({ [v.propertyPath]: v.message });
      else toast.push(err.message || "Erreur lors de la création.", { kind: "danger" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ padding: "40px 32px 96px", maxWidth: 760 }}>
      <button onClick={() => go("/coach")} className="btn btn-quiet btn-sm" style={{ marginLeft: -12, marginBottom: 16 }}>
        <Icon name="chevL" size={16} /> Mon espace coach
      </button>
      <div className="h-eyebrow" style={{ marginBottom: 12 }}>Nouvelle séance</div>
      <h1 className="h-display" style={{ fontSize: 56, margin: 0, marginBottom: 8 }}>Créer un <em>créneau</em>.</h1>
      <p className="t-body" style={{ fontSize: 15, marginBottom: 40 }}>Une fois publiée, la séance apparaît immédiatement au catalogue public et tes clients peuvent la réserver.</p>

      <form onSubmit={submit} className="card" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
        <Field label="Coach" error={errors.coachId}>
          <select className="field-input" value={coachId} onChange={e => setCoachId(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {coaches.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
          </select>
        </Field>

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

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          <Button type="button" variant="ghost" onClick={() => go("/coach")}>Annuler</Button>
          <Button type="submit" variant="accent" loading={loading}>Publier la séance</Button>
        </div>
      </form>
    </main>
  );
};
