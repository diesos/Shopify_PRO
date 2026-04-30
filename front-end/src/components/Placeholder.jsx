import React from "react";

/* Placeholder visuel rayé. Utilisé là où on n'a pas de vraie image en backend. */
export const Placeholder = ({ tone = "warm", label, height = 200, radius = "var(--r-3)", style = {}, children }) => (
  <div className={`placeholder ${tone}`} style={{ height, borderRadius: radius, ...style }}>
    {children}
    {label && <span className="placeholder-label">{label}</span>}
  </div>
);
