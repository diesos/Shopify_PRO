import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { fmt } from "../lib/fmt.js";
import { Button } from "../components/Button.jsx";
import { Field, Input } from "../components/Field.jsx";
import { Icon } from "../components/Icon.jsx";
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

export const CatalogueSeances = ({ go }) => {
  const [coaches, setCoaches] = useState([]);
  const [seances, setSeances] = useState([]);
  const [bookedMap, setBookedMap] = useState(new Map());

  const [coachFilter, setCoachFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("any");
  const [availOnly, setAvailOnly] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/api/coaches").then(setCoaches).catch(() => setCoaches([]));
    api.get("/api/seances").then(setSeances).catch(() => setSeances([]));
    api.get("/api/reservations").then(rs => setBookedMap(countBookedBySeance(rs))).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    return seances
      .filter(s => new Date(s.startTime) > now)
      .filter(s => coachFilter === "all" || s.coachId === Number(coachFilter))
      .filter(s => {
        const d = new Date(s.startTime);
        if (dateFilter === "today") return d.toDateString() === now.toDateString();
        if (dateFilter === "tomorrow") {
          const t = new Date(); t.setDate(t.getDate() + 1);
          return d.toDateString() === t.toDateString();
        }
        if (dateFilter === "week") {
          const w = new Date(); w.setDate(w.getDate() + 7);
          return d <= w;
        }
        return true;
      })
      .filter(s => !availOnly || (s.maxUser - (bookedMap.get(s.id) || 0)) > 0)
      .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }, [seances, coaches, bookedMap, coachFilter, dateFilter, availOnly, search]);

  return (
    <main className="container" style={{ padding: "48px 32px 96px" }}>
      <div style={{ marginBottom: 40, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="h-eyebrow" style={{ marginBottom: 12 }}>Catalogue · {filtered.length} séances</div>
          <h1 className="h-display" style={{ fontSize: 64, margin: 0 }}>Toutes les <em>séances</em>.</h1>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 32, display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr auto", gap: 16, alignItems: "end" }}>
        <Field label="Rechercher">
          <div style={{ position: "relative" }}>
            <Icon name="search" size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ash)" }} />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom de la séance…" style={{ paddingLeft: 38 }} />
          </div>
        </Field>
        <Field label="Coach">
          <select className="field-input" value={coachFilter} onChange={e => setCoachFilter(e.target.value)}>
            <option value="all">Tous les coachs</option>
            {coaches.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
          </select>
        </Field>
        <Field label="Quand">
          <select className="field-input" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
            <option value="any">N'importe quand</option>
            <option value="today">Aujourd'hui</option>
            <option value="tomorrow">Demain</option>
            <option value="week">Cette semaine</option>
          </select>
        </Field>
        <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: availOnly ? "var(--accent-soft)" : "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-2)", cursor: "pointer", fontSize: 13, color: availOnly ? "var(--accent-ink)" : "var(--slate)", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={availOnly} onChange={e => setAvailOnly(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
          Places dispo uniquement
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--ink)", marginBottom: 8 }}>
            Aucune séance ne correspond.
          </div>
          <div style={{ fontSize: 14 }}>Essaie de relâcher un filtre.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {filtered.map(s => {
            const coach = coaches.find(c => c.id === s.coachId);
            return <SeanceCard key={s.id} seance={s} coach={coach} booked={bookedMap.get(s.id) || 0} onOpen={() => go(`/seances/${s.id}`)} />;
          })}
        </div>
      )}
    </main>
  );
};
