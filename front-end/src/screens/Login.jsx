import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { Button } from "../components/Button.jsx";
import { Field, Input } from "../components/Field.jsx";
import { Icon } from "../components/Icon.jsx";
import { Placeholder } from "../components/Placeholder.jsx";

export const Login = ({ go }) => {
  const auth = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const submit = async (e) => {
    e?.preventDefault();
    const errs = {};
    if (!email.includes("@")) errs.email = "Email invalide.";
    if (pwd.length < 6) errs.pwd = "Le mot de passe doit faire au moins 6 caractères.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const u = await auth.login(email, pwd);
      toast.push(`Bienvenue, ${u.firstName || ""}.`.trim(), { kind: "success" });
      go(u.roles.includes("ROLE_ADMIN") ? "/admin"
        : u.roles.includes("ROLE_COACH") ? "/coach"
        : "/me/reservations");
    } catch (err) {
      if (err.status === 401) setErrors({ pwd: "Email ou mot de passe incorrect." });
      else toast.push(err.message || "Connexion impossible.", { kind: "danger" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "calc(100vh - 68px)", display: "grid", gridTemplateColumns: "1fr 1.1fr" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "48px 64px" }}>
        <div style={{ maxWidth: 380, width: "100%", margin: "0 auto" }}>
          <div className="h-eyebrow" style={{ marginBottom: 16 }}>Bon retour</div>
          <h1 className="h-display" style={{ fontSize: 56, margin: 0, marginBottom: 12 }}>Se <em>connecter</em>.</h1>
          <p className="t-body" style={{ marginBottom: 36, fontSize: 15 }}>
            Accède à tes réservations, ton planning et tes coachs.
          </p>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Field label="Email" error={errors.email}>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom@email.fr" error={errors.email} autoComplete="email" />
            </Field>
            <Field label="Mot de passe" error={errors.pwd}>
              <div style={{ position: "relative" }}>
                <Input type={show ? "text" : "password"} value={pwd} onChange={e => setPwd(e.target.value)} placeholder="••••••••" error={errors.pwd} autoComplete="current-password" />
                <button type="button" onClick={() => setShow(s => !s)} className="btn btn-quiet btn-sm" style={{ position: "absolute", right: 6, top: 6, padding: "6px 10px", fontSize: 11 }}>
                  {show ? "Masquer" : "Afficher"}
                </button>
              </div>
            </Field>
            <Button type="submit" variant="primary" size="lg" block loading={loading}>Se connecter</Button>
            <div style={{ fontSize: 13, color: "var(--slate)", textAlign: "center" }}>
              Pas encore de compte ?{" "}
              <a onClick={() => go("/register")} style={{ color: "var(--ink)", fontWeight: 500, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>Crée ton compte</a>
            </div>
            <div style={{ marginTop: 8, padding: 12, background: "var(--surface-2)", borderRadius: "var(--r-2)", fontSize: 11, color: "var(--ash)", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Icon name="shield" size={14} stroke={1.5} />
              <div>Connexion sécurisée</div>
            </div>
          </form>
        </div>
      </div>
      <Placeholder tone="warm" label="lifestyle · coach" height="100%" radius="0" />
    </main>
  );
};
