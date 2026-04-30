import React from "react";
import { Icon } from "./Icon.jsx";

export const Button = ({ variant = "primary", size, block, loading, icon, iconRight, children, disabled, ...rest }) => {
  const cls = ["btn", `btn-${variant}`, size && `btn-${size}`, block && "btn-block"].filter(Boolean).join(" ");
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <span className="spinner" /> : (icon ? <Icon name={icon} size={16} /> : null)}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={16} />}
    </button>
  );
};
