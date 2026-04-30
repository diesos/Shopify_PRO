import React from "react";

export const KpiCard = ({ label, value, delta, hint, accent, small }) => (
  <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
    <div className="h-eyebrow">{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0, flexWrap: "nowrap" }}>
      <span className="t-mono" style={{
        fontSize: small ? 28 : 36, fontWeight: 500, letterSpacing: "-0.02em",
        color: accent ? "var(--accent)" : "var(--ink)",
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
      }}>{value}</span>
      {delta && (
        <span className="t-mono" style={{ fontSize: 12, color: delta.startsWith("-") ? "var(--danger)" : "var(--success)" }}>{delta}</span>
      )}
    </div>
    {hint && <div style={{ fontSize: 12, color: "var(--ash)" }}>{hint}</div>}
  </div>
);
