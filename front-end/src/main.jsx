import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./auth/AuthContext.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import { App } from "./App.jsx";
import "./tokens.css";

ReactDOM.createRoot(document.getElementById("app")).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
