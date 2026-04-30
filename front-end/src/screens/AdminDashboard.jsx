import React, { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useToast } from "../components/Toast.jsx";
import { Button } from "../components/Button.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { Modal } from "../components/Modal.jsx";
import { KpiCard } from "../components/KpiCard.jsx";
import { Icon } from "../components/Icon.jsx";
import { Field, Input } from "../components/Field.jsx";
import { fmt } from "../lib/fmt.js";

const EMPTY_COACH_FORM = { firstName: "", lastName: "", email: "", phone: "", password: "", pricePerHour: 50 };

/* Téléphone : optional +, puis 8 à 20 caractères parmi chiffres, espaces, . - ( )
   Couvre 0612345678, 06 12 34 56 78, +33 6 12 34 56 78, (33) 612-345-678. Refuse les lettres. */
const PHONE_REGEX = /^\+?[\d\s.\-()]{8,20}$/;

const idFromIri = (s) => typeof s === "string" ? Number(s.split("/").pop()) : s?.id;
const rolesOf = (u) => Array.isArray(u.userRoles)
  ? u.userRoles.map(r => typeof r === "string" ? r : r.name).filter(Boolean)
  : (u.roles || []);

export const AdminDashboard = ({ go }) => {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [seances, setSeances] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("users");
  const [editingUser, setEditingUser] = useState(null);

  /* Modal coach (create + edit unifiés via editingCoachId) */
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachForm, setCoachForm] = useState(EMPTY_COACH_FORM);
  const [coachErrors, setCoachErrors] = useState({});
  const [savingCoach, setSavingCoach] = useState(false);
  const [editingCoachId, setEditingCoachId] = useState(null);
  const isEditingCoach = editingCoachId != null;

  const openCoachCreate = () => {
    setEditingCoachId(null);
    setCoachForm(EMPTY_COACH_FORM);
    setCoachErrors({});
    setCoachOpen(true);
  };

  const openCoachEdit = (coach) => {
    setEditingCoachId(coach.id);
    setCoachForm({
      firstName: coach.firstName || "",
      lastName:  coach.lastName || "",
      email:     coach.email || "",
      phone:     coach.phone || "",
      password:  "", // toujours vide en édition — non renvoyé si laissé vide
      pricePerHour: coach.pricePerHour ?? 50,
    });
    setCoachErrors({});
    setCoachOpen(true);
  };

  const submitCoach = async (e) => {
    e?.preventDefault();
    const errs = {};
    if (!coachForm.firstName) errs.firstName = "Champ requis.";
    if (!coachForm.lastName)  errs.lastName  = "Champ requis.";
    if (!coachForm.email.includes("@")) errs.email = "Email invalide.";
    if (!PHONE_REGEX.test(coachForm.phone || "")) errs.phone = "Numéro invalide (ex. 06 12 34 56 78).";
    if (!isEditingCoach && (!coachForm.password || coachForm.password.length < 6)) errs.password = "6 caractères minimum.";
    if (isEditingCoach && coachForm.password && coachForm.password.length < 6) errs.password = "6 caractères minimum (laisse vide pour ne pas changer).";
    const price = Number(coachForm.pricePerHour);
    if (!Number.isFinite(price) || price <= 0) errs.pricePerHour = "Tarif positif requis.";
    setCoachErrors(errs);
    if (Object.keys(errs).length) return;

    setSavingCoach(true);
    try {
      // Edit : PATCH sans password si vide. Create : POST avec tout.
      const body = {
        firstName: coachForm.firstName,
        lastName:  coachForm.lastName,
        email:     coachForm.email,
        phone:     coachForm.phone,
        pricePerHour: price,
      };
      if (coachForm.password) body.password = coachForm.password;

      if (isEditingCoach) {
        await api.patch(`/api/coaches/${editingCoachId}`, body);
        toast.push(`Coach ${coachForm.firstName} ${coachForm.lastName} mis à jour.`, { kind: "success" });
      } else {
        await api.post("/api/coaches", body);
        toast.push(`Coach ${coachForm.firstName} ${coachForm.lastName} créé.`, { kind: "success" });
      }
      setCoachOpen(false);
      reload();
    } catch (err) {
      const v = err.body?.violations?.[0];
      if (v?.propertyPath) setCoachErrors({ [v.propertyPath]: v.message });
      else if (err.status === 422 || err.status === 400) setCoachErrors({ email: err.message });
      else toast.push(err.message || "Sauvegarde impossible.", { kind: "danger" });
    } finally {
      setSavingCoach(false);
    }
  };

  /* Modal séance (create + edit) */
  const [seanceOpen, setSeanceOpen] = useState(false);
  const EMPTY_SEANCE_FORM = { name: "", coachId: "", maxUser: 10, date: "", startTime: "", endTime: "" };
  const [seanceForm, setSeanceForm] = useState(EMPTY_SEANCE_FORM);
  const [seanceErrors, setSeanceErrors] = useState({});
  const [savingSeance, setSavingSeance] = useState(false);
  const [editingSeanceId, setEditingSeanceId] = useState(null);
  const isEditingSeance = editingSeanceId != null;

  const openSeanceEdit = (s) => {
    setEditingSeanceId(s.id);
    const start = new Date(s.startTime);
    const end   = new Date(s.endTime);
    const pad = (n) => String(n).padStart(2, "0");
    setSeanceForm({
      name: s.name || "",
      coachId: String(s.coachId ?? ""),
      maxUser: s.maxUser ?? 10,
      date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
      startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      endTime:   `${pad(end.getHours())}:${pad(end.getMinutes())}`,
    });
    setSeanceErrors({});
    setSeanceOpen(true);
  };

  const submitSeance = async (e) => {
    e?.preventDefault();
    const errs = {};
    if (!seanceForm.name || seanceForm.name.length < 3) errs.name = "Nom de séance (3 caractères min).";
    if (!seanceForm.coachId) errs.coachId = "Choisis un coach.";
    const max = Number(seanceForm.maxUser);
    if (!Number.isFinite(max) || max < 1 || max > 30) errs.maxUser = "1 à 30 participants.";
    if (!seanceForm.date) errs.date = "Date requise.";
    if (!seanceForm.startTime || !seanceForm.endTime) errs.endTime = "Horaires requis.";
    if (seanceForm.startTime && seanceForm.endTime && seanceForm.startTime >= seanceForm.endTime) {
      errs.endTime = "L'heure de fin doit être après le début.";
    }
    setSeanceErrors(errs);
    if (Object.keys(errs).length) return;

    setSavingSeance(true);
    try {
      const startISO = new Date(`${seanceForm.date}T${seanceForm.startTime}:00`).toISOString();
      const endISO   = new Date(`${seanceForm.date}T${seanceForm.endTime}:00`).toISOString();
      const body = {
        name: seanceForm.name,
        coachId: Number(seanceForm.coachId),
        maxUser: max,
        startTime: startISO,
        endTime: endISO,
      };
      if (isEditingSeance) {
        await api.patch(`/api/seances/${editingSeanceId}`, body);
        toast.push("Séance mise à jour.", { kind: "success" });
      } else {
        await api.post("/api/seances", body);
        toast.push("Séance créée.", { kind: "success" });
      }
      setSeanceOpen(false);
      reload();
    } catch (err) {
      const v = err.body?.violations?.[0];
      if (v?.propertyPath) setSeanceErrors({ [v.propertyPath]: v.message });
      else toast.push(err.message || "Sauvegarde impossible.", { kind: "danger" });
    } finally {
      setSavingSeance(false);
    }
  };

  const reload = async () => {
    setLoading(true);
    try {
      const [u, c, s, r, ro] = await Promise.all([
        api.get("/api/users").catch(() => []),
        api.get("/api/coaches").catch(() => []),
        api.get("/api/seances").catch(() => []),
        api.get("/api/reservations").catch(() => []),
        api.get("/api/roles").catch(() => []),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setCoaches(Array.isArray(c) ? c : []);
      setSeances(Array.isArray(s) ? s : []);
      setReservations(Array.isArray(r) ? r : []);
      setRoles(Array.isArray(ro) ? ro : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const totalCap = seances.reduce((acc, s) => acc + s.maxUser, 0);
  const totalBooked = reservations.length;
  const fillRate = totalCap > 0 ? Math.round((totalBooked / totalCap) * 100) : 0;

  const updateUserRoles = async (userId, newRoleNames) => {
    const roleIris = newRoleNames
      .map(name => roles.find(r => r.name === name))
      .filter(Boolean)
      .map(r => `/api/roles/${r.id}`);
    try {
      await api.patch(`/api/users/${userId}`, { userRoles: roleIris });
      toast.push("Rôles mis à jour.", { kind: "success" });
      reload();
    } catch (err) {
      toast.push(err.message || "Mise à jour impossible.", { kind: "danger" });
    }
  };

  if (loading) {
    return <div className="container" style={{ padding: "120px 32px", textAlign: "center" }}><div className="h-eyebrow">Chargement…</div></div>;
  }

  return (
    <main className="container" style={{ padding: "40px 32px 96px" }}>
      <div className="h-eyebrow" style={{ marginBottom: 12 }}>Console admin · supervision</div>
      <h1 className="h-display" style={{ fontSize: 56, margin: 0, marginBottom: 32 }}>Vue d'<em>ensemble</em>.</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 48 }}>
        <KpiCard label="Utilisateurs" value={users.length} />
        <KpiCard label="Coachs" value={coaches.length} />
        <KpiCard label="Séances publiées" value={seances.length} />
        <KpiCard label="Taux de remplissage" value={`${fillRate}%`} accent hint={`${totalBooked}/${totalCap} places`} />
      </div>

      <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--surface-2)", borderRadius: "var(--r-pill)", border: "1px solid var(--border)", width: "fit-content", marginBottom: 24 }}>
        {[
          { k: "users", l: "Utilisateurs" },
          { k: "coaches", l: "Coachs" },
          { k: "seances", l: "Séances" },
          { k: "roles", l: "Rôles applicatifs" },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className="btn btn-quiet btn-sm"
            style={{ background: tab === t.k ? "var(--surface)" : "transparent", borderRadius: "var(--r-pill)", color: tab === t.k ? "var(--ink)" : "var(--slate)" }}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 50 }}></th>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôles</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const userRoles = rolesOf(u);
                return (
                  <tr key={u.id}>
                    <td><Avatar first={u.firstName} last={u.lastName} size={32} accent={userRoles.includes("ROLE_ADMIN")} /></td>
                    <td>
                      <div style={{ color: "var(--ink)", fontWeight: 500 }}>{u.firstName} {u.lastName}</div>
                      <div className="t-mono" style={{ fontSize: 11, color: "var(--ash)" }}>#{String(u.id).padStart(4, "0")}</div>
                    </td>
                    <td className="t-mono" style={{ fontSize: 13, color: "var(--slate)" }}>{u.email}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {userRoles.length > 0
                          ? userRoles.map(r => (
                              <span key={r} className={`badge ${r === "ROLE_ADMIN" ? "accent" : r === "ROLE_COACH" ? "warn" : ""}`}>
                                {r.replace("ROLE_", "")}
                              </span>
                            ))
                          : <span className="badge">USER</span>
                        }
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Button variant="quiet" size="sm" icon="edit" onClick={() => setEditingUser(u)}>Gérer</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "coaches" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
            <div className="h-ui" style={{ fontSize: 14 }}>{coaches.length} coach{coaches.length > 1 ? "s" : ""} référencé{coaches.length > 1 ? "s" : ""}</div>
            <Button variant="accent" size="sm" icon="plus" onClick={openCoachCreate}>Nouveau coach</Button>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th></th>
                <th>Coach</th>
                <th>Email</th>
                <th>Tarif/h</th>
                <th>Téléphone</th>
                <th>Séances actives</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coaches.map(c => {
                const active = seances.filter(s => s.coachId === c.id && new Date(s.startTime) > new Date()).length;
                return (
                  <tr key={c.id}>
                    <td><Avatar first={c.firstName} last={c.lastName} size={32} /></td>
                    <td><div style={{ color: "var(--ink)", fontWeight: 500 }}>{c.firstName} {c.lastName}</div></td>
                    <td className="t-mono" style={{ fontSize: 13, color: "var(--slate)" }}>{c.email}</td>
                    <td className="t-mono">{fmt.euro(c.pricePerHour)}</td>
                    <td className="t-mono" style={{ fontSize: 13, color: "var(--slate)" }}>{c.phone || "—"}</td>
                    <td className="t-mono">{active}</td>
                    <td style={{ textAlign: "right" }}>
                      <Button variant="quiet" size="sm" icon="edit" onClick={() => openCoachEdit(c)}>Éditer</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "seances" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
            <div className="h-ui" style={{ fontSize: 14 }}>{seances.length} séance{seances.length > 1 ? "s" : ""}</div>
            <Button variant="accent" size="sm" icon="plus" onClick={() => go("/coach/seance/new")}>Nouvelle séance</Button>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Séance</th><th>Coach</th><th>Date</th><th>Remplissage</th><th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {seances.map(s => {
                const c = coaches.find(x => x.id === s.coachId);
                const booked = reservations.filter(r => idFromIri(r.seance) === s.id).length;
                const pct = s.maxUser > 0 ? Math.round((booked / s.maxUser) * 100) : 0;
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ color: "var(--ink)", fontWeight: 500 }}>{s.name}</div>
                      <div className="t-mono" style={{ fontSize: 11, color: "var(--ash)" }}>SE-{s.id}</div>
                    </td>
                    <td>{c ? `${c.firstName} ${c.lastName}` : <span className="t-mono" style={{ color: "var(--ash)" }}>coach #{s.coachId}</span>}</td>
                    <td className="t-mono" style={{ fontSize: 12 }}>{fmt.dateShort(s.startTime)} · {fmt.time(s.startTime)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 100, height: 4, background: "var(--sand)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "var(--danger)" : "var(--accent)" }} />
                        </div>
                        <span className="t-mono" style={{ fontSize: 12, color: "var(--slate)" }}>{booked}/{s.maxUser}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Button variant="quiet" size="sm" icon="edit" onClick={() => openSeanceEdit(s)}>Éditer</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "roles" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {(roles.length > 0 ? roles : [{ name: "ROLE_ADMIN" }, { name: "ROLE_COACH" }, { name: "ROLE_USER" }]).map(r => {
            const count = users.filter(u => rolesOf(u).includes(r.name)).length;
            return (
              <div key={r.name} className="card" style={{ padding: 24 }}>
                <span className={`badge ${r.name === "ROLE_ADMIN" ? "accent" : r.name === "ROLE_COACH" ? "warn" : ""}`} style={{ marginBottom: 16 }}>{r.name}</span>
                <div className="t-mono" style={{ fontSize: 32, color: "var(--ink)", marginBottom: 16 }}>
                  {count}<span style={{ fontSize: 14, color: "var(--ash)" }}> users</span>
                </div>
                {r.label && <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.6, margin: 0 }}>{r.label}</p>}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!editingUser} onClose={() => setEditingUser(null)}
        title={editingUser ? `Gérer ${editingUser.firstName} ${editingUser.lastName}` : ""}
        footer={<Button variant="ghost" onClick={() => setEditingUser(null)}>Fermer</Button>}>
        {editingUser && (
          <>
            <div style={{ padding: 16, background: "var(--surface-2)", borderRadius: "var(--r-2)", marginBottom: 20, fontSize: 13 }}>
              <div className="t-mono" style={{ color: "var(--ash)", fontSize: 11, marginBottom: 4 }}>{editingUser.email}</div>
              <div style={{ color: "var(--ink)" }}>ID #{String(editingUser.id).padStart(4, "0")}</div>
            </div>
            <div className="h-eyebrow" style={{ marginBottom: 12 }}>Rôles applicatifs</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 }}>
              {(roles.length > 0 ? roles.map(r => r.name) : ["ROLE_ADMIN", "ROLE_COACH", "ROLE_USER"]).map(r => {
                const has = rolesOf(editingUser).includes(r);
                return (
                  <label key={r} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, border: "1px solid var(--border)", borderRadius: "var(--r-2)", cursor: "pointer", background: has ? "var(--accent-soft)" : "var(--surface)" }}>
                    <input
                      type="checkbox" checked={has}
                      onChange={(e) => {
                        const current = rolesOf(editingUser);
                        const next = e.target.checked ? [...new Set([...current, r])] : current.filter(x => x !== r);
                        updateUserRoles(editingUser.id, next);
                      }}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span className="t-mono" style={{ fontSize: 13, color: has ? "var(--accent-ink)" : "var(--ink)" }}>{r}</span>
                  </label>
                );
              })}
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={coachOpen}
        onClose={() => !savingCoach && setCoachOpen(false)}
        title={isEditingCoach ? `Éditer · ${coachForm.firstName} ${coachForm.lastName}` : "Nouveau coach"}
        width={560}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCoachOpen(false)} disabled={savingCoach}>Annuler</Button>
            <Button variant="accent" loading={savingCoach} onClick={submitCoach}>
              {isEditingCoach ? "Enregistrer" : "Créer le coach"}
            </Button>
          </>
        }
      >
        <form onSubmit={submitCoach} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="form-row-2">
            <Field label="Prénom" error={coachErrors.firstName}>
              <Input value={coachForm.firstName} onChange={e => setCoachForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Camille" error={coachErrors.firstName} />
            </Field>
            <Field label="Nom" error={coachErrors.lastName}>
              <Input value={coachForm.lastName} onChange={e => setCoachForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Lavoie" error={coachErrors.lastName} />
            </Field>
          </div>
          <Field label="Email" error={coachErrors.email}>
            <Input type="email" value={coachForm.email} onChange={e => setCoachForm(f => ({ ...f, email: e.target.value }))} placeholder="prenom@coach.com" error={coachErrors.email} />
          </Field>
          <div className="form-row-2">
            <Field label="Téléphone" hint="Ex. 06 12 34 56 78 ou +33 6 12 34 56 78" error={coachErrors.phone}>
              <Input type="tel" inputMode="tel" pattern="^\+?[\d\s.\-()]{8,20}$" value={coachForm.phone} onChange={e => setCoachForm(f => ({ ...f, phone: e.target.value }))} placeholder="06 12 34 56 78" error={coachErrors.phone} />
            </Field>
            <Field label="Tarif horaire (€)" error={coachErrors.pricePerHour}>
              <Input type="number" min={1} value={coachForm.pricePerHour} onChange={e => setCoachForm(f => ({ ...f, pricePerHour: e.target.value }))} error={coachErrors.pricePerHour} />
            </Field>
          </div>
          <Field
            label={isEditingCoach ? "Nouveau mot de passe" : "Mot de passe initial"}
            hint={isEditingCoach ? "Laisse vide pour ne pas changer" : "6 caractères minimum"}
            error={coachErrors.password}
          >
            <Input type="password" value={coachForm.password} onChange={e => setCoachForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" error={coachErrors.password} autoComplete="new-password" />
          </Field>
          <button type="submit" style={{ display: "none" }} />
        </form>
      </Modal>

      <Modal
        open={seanceOpen}
        onClose={() => !savingSeance && setSeanceOpen(false)}
        title={isEditingSeance ? `Éditer · ${seanceForm.name}` : "Nouvelle séance"}
        width={560}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSeanceOpen(false)} disabled={savingSeance}>Annuler</Button>
            <Button variant="accent" loading={savingSeance} onClick={submitSeance}>
              {isEditingSeance ? "Enregistrer" : "Créer"}
            </Button>
          </>
        }
      >
        <form onSubmit={submitSeance} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Nom de la séance" error={seanceErrors.name}>
            <Input value={seanceForm.name} onChange={e => setSeanceForm(f => ({ ...f, name: e.target.value }))} placeholder="Vinyasa Flow matinal" error={seanceErrors.name} />
          </Field>
          <Field label="Coach" error={seanceErrors.coachId}>
            <select className={`field-input ${seanceErrors.coachId ? "error" : ""}`} value={seanceForm.coachId} onChange={e => setSeanceForm(f => ({ ...f, coachId: e.target.value }))}>
              <option value="">— Sélectionner —</option>
              {coaches.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
            </select>
          </Field>
          <div className="form-row-2">
            <Field label="Participants max" error={seanceErrors.maxUser}>
              <Input type="number" min={1} max={30} value={seanceForm.maxUser} onChange={e => setSeanceForm(f => ({ ...f, maxUser: e.target.value }))} error={seanceErrors.maxUser} />
            </Field>
            <Field label="Date" error={seanceErrors.date}>
              <Input type="date" value={seanceForm.date} onChange={e => setSeanceForm(f => ({ ...f, date: e.target.value }))} error={seanceErrors.date} />
            </Field>
          </div>
          <div className="form-row-2">
            <Field label="Heure de début">
              <Input type="time" value={seanceForm.startTime} onChange={e => setSeanceForm(f => ({ ...f, startTime: e.target.value }))} />
            </Field>
            <Field label="Heure de fin" error={seanceErrors.endTime}>
              <Input type="time" value={seanceForm.endTime} onChange={e => setSeanceForm(f => ({ ...f, endTime: e.target.value }))} error={seanceErrors.endTime} />
            </Field>
          </div>
          <button type="submit" style={{ display: "none" }} />
        </form>
      </Modal>
    </main>
  );
};
