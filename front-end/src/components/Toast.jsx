import React, { createContext, useCallback, useContext, useState } from "react";
import { Icon } from "./Icon.jsx";

const ToastCtx = createContext({ push: () => {} });

export const ToastProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    const item = { id, msg, kind: opts.kind || "default", duration: opts.duration ?? 4200 };
    setItems((s) => [...s, item]);
    setTimeout(() => setItems((s) => s.filter(i => i.id !== id)), item.duration);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="toast-wrap">
        {items.map(t => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <Icon name={t.kind === "danger" ? "alert" : t.kind === "success" ? "check" : "info"} size={18} />
            <div>{t.msg}</div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};

export const useToast = () => useContext(ToastCtx);
