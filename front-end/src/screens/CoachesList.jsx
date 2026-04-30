import React, { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { CoachCard } from "../components/CoachCard.jsx";

export const CoachesList = ({ go }) => {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/coaches")
      .then(c => setCoaches(Array.isArray(c) ? c : []))
      .catch(() => setCoaches([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="container" style={{ padding: "48px 32px 96px" }}>
      <div className="h-eyebrow" style={{ marginBottom: 12 }}>Catalogue · {coaches.length} coachs</div>
      <h1 className="h-display" style={{ fontSize: 64, margin: 0, marginBottom: 40 }}>Tous nos <em>coachs</em>.</h1>

      {loading
        ? <div className="empty">Chargement…</div>
        : coaches.length === 0
          ? <div className="empty">Aucun coach pour l'instant.</div>
          : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
              {coaches.map(c => <CoachCard key={c.id} coach={c} onOpen={() => go(`/coaches/${c.id}`)} />)}
            </div>
          )
      }
    </main>
  );
};
