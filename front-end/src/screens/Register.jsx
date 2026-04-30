import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { Button } from "../components/Button.jsx";
import { Field, Input } from "../components/Field.jsx";
import { Placeholder } from "../components/Placeholder.jsx";

export const Register = ({ go }) => {
  const auth = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.firstName) errs.firstName = "Champ requis.";
    if (!form.lastName) errs.lastName = "Champ requis.";
    if (!form.email.includes("@")) errs.email = "Email invalide.";
    if (form.password.length < 6) errs.password = "Le mot de passe doit faire au moins 6 caractères.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await auth.register(form);
      toast.push("Compte créé. Bienvenue !", { kind: "success" });
      go("/me/reservations");
    } catch (err) {
      if (err.status === 422 || err.status === 400) {
        const violation = err.body?.violations?.[0];
        if (violation?.propertyPath) setErrors({ [violation.propertyPath]: violation.message });
        else setErrors({ email: err.message });
      } else {
        toast.push(err.message || "Erreur lors de la création du compte.", { kind: "danger" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "calc(100vh - 68px)", display: "grid", gridTemplateColumns: "1.1fr 1fr" }}>
      <Placeholder tone="warm" label="lifestyle · pratique en duo" height="100%" radius="0" />
      <div style={{ display: "flex", alignItems: "center", padding: "48px 64px" }}>
        <div style={{ maxWidth: 380, width: "100%", margin: "0 auto" }}>
          <div className="h-eyebrow" style={{ marginBottom: 16 }}>Créer un compte</div>
          <h1 className="h-display" style={{ fontSize: 56, margin: 0, marginBottom: 12 }}>Premier <em>pas</em>.</h1>
          <p className="t-body" style={{ marginBottom: 32, fontSize: 15 }}>Trois minutes, gratuit.</p>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Prénom" error={errors.firstName}>
                <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Léa" error={errors.firstName} />
              </Field>
              <Field label="Nom" error={errors.lastName}>
                <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Moreau" error={errors.lastName} />
              </Field>
            </div>
            <Field label="Email" error={errors.email}>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="prenom@email.fr" error={errors.email} />
            </Field>
            <Field label="Mot de passe" hint="6 caractères minimum" error={errors.password}>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" error={errors.password} />
            </Field>
            <Button type="submit" variant="primary" size="lg" block loading={loading}>Créer mon compte</Button>
            <div style={{ fontSize: 13, color: "var(--slate)", textAlign: "center", marginTop: 4 }}>
              Déjà inscrit·e ?{" "}
              <a onClick={() => go("/login")} style={{ color: "var(--ink)", fontWeight: 500, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>Se connecter</a>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};
