import React from "react";
import { Icon } from "./Icon.jsx";

export const Field = ({ label, hint, error, children }) => (
  <div className="field">
    {label && <label className="field-label">{label}</label>}
    {children}
    {error && <div className="field-error"><Icon name="alert" size={12} stroke={2} />{error}</div>}
    {!error && hint && <div className="field-hint">{hint}</div>}
  </div>
);

export const Input = ({ error, ...rest }) => (
  <input className={`field-input ${error ? "error" : ""}`} {...rest} />
);
