import React from "react";

export const Avatar = ({ first, last, size = 36, accent = false }) => {
  const initials = `${(first || "?")[0]}${(last || "")[0] || ""}`.toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: accent ? "var(--accent-soft)" : "var(--sand)",
      color: accent ? "var(--accent-ink)" : "var(--espresso)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.max(11, size * 0.36), fontWeight: 500,
      flexShrink: 0, border: "1px solid var(--border)",
    }}>{initials}</div>
  );
};
