import React from "react";
import { Button } from "./Button.jsx";
import { Placeholder } from "./Placeholder.jsx";
import { fmt } from "../lib/fmt.js";

/* Carte coach : champs réels du backend uniquement.
 *   firstName, lastName, email, phone, pricePerHour
 */
export const CoachCard = ({ coach, onOpen }) => (
  <article className="card card-hover" style={{ overflow: "hidden" }}>
    <Placeholder tone="warm" label="portrait coach" height={220} radius="0" />
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{
        fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, letterSpacing: "-0.02em",
        margin: 0, color: "var(--ink)", lineHeight: 1.2, paddingBottom: "0.12em",
      }}>{coach.firstName} {coach.lastName}</h3>
      {coach.email && (
        <div className="t-mono" style={{ fontSize: 12, color: "var(--slate)" }}>{coach.email}</div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
        <div className="t-mono" style={{ fontSize: 13, color: "var(--ink)" }}>
          {fmt.euro(coach.pricePerHour)}<span style={{ color: "var(--ash)" }}> / heure</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onOpen?.(coach)} iconRight="arrow">Profil</Button>
      </div>
    </div>
  </article>
);
