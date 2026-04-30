import React, { useEffect } from "react";
import { Icon } from "./Icon.jsx";

export const Modal = ({ open, onClose, title, children, footer, width = 520 }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-scrim" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth: width }}>
        {title && (
          <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
            <h3 className="h-ui" style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>{title}</h3>
            <button onClick={onClose} className="btn btn-quiet" style={{ padding: 6 }} aria-label="Fermer">
              <Icon name="close" size={18} />
            </button>
          </div>
        )}
        <div style={{ padding: 24 }}>{children}</div>
        {footer && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end", background: "var(--surface-2)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
