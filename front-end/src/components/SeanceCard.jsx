import React from "react";
import { Icon } from "./Icon.jsx";
import { Avatar } from "./Avatar.jsx";
import { Button } from "./Button.jsx";
import { Placeholder } from "./Placeholder.jsx";
import { fmt } from "../lib/fmt.js";

/* Carte séance : se contente des champs réellement présents en backend.
 *   Seance: name, maxUser, startTime, endTime
 *   Coach (joint en front via coachId): firstName, lastName, pricePerHour
 *   booked = nombre de reservations comptées en amont (prop `booked`)
 */
export const SeanceCard = ({ seance, coach, booked = 0, onOpen, compact = false }) => {
  const remaining = Math.max(0, seance.maxUser - booked);
  const full = remaining === 0;
  const tight = remaining <= 2 && remaining > 0;

  return (
    <article className="card card-hover" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <Placeholder tone="warm" label="séance" height={compact ? 140 : 180} radius="0" />
      <div style={{ padding: compact ? 16 : 20, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <h3 style={{
            fontFamily: "var(--font-display)", fontSize: compact ? 20 : 24, fontWeight: 400,
            letterSpacing: "-0.02em", margin: 0, color: "var(--ink)", lineHeight: 1.25, paddingBottom: "0.12em",
          }}>{seance.name}</h3>
          <span className={`badge ${full ? "danger" : tight ? "warn" : "success"} dot`}>
            {full ? "Complet" : `${remaining}/${seance.maxUser}`}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--slate)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="cal" size={14} />
            <span className="t-mono" style={{ fontSize: 12 }}>{fmt.dateShort(seance.startTime)}</span>
            <span style={{ color: "var(--ash)" }}>·</span>
            <span className="t-mono" style={{ fontSize: 12 }}>{fmt.timeRange(seance.startTime, seance.endTime)}</span>
          </div>
          {coach && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar first={coach.firstName} last={coach.lastName} size={20} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{coach.firstName} {coach.lastName}</span>
              {coach.pricePerHour != null && (
                <>
                  <span style={{ color: "var(--ash)" }}>·</span>
                  <span className="t-mono" style={{ fontSize: 12 }}>{fmt.euro(coach.pricePerHour)}/h</span>
                </>
              )}
            </div>
          )}
        </div>
        <div style={{ marginTop: "auto", paddingTop: 4 }}>
          <Button variant="ghost" size="sm" block onClick={() => onOpen?.(seance)}>Voir la séance</Button>
        </div>
      </div>
    </article>
  );
};
