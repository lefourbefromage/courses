"use client";

import { useState } from "react";
import Illustration from "@/components/Illustration";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        window.location.replace("/");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Code incorrect.");
    } catch {
      setError("Connexion impossible. Vérifie ta connexion internet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form onSubmit={submit}>
        <Illustration name="marmite" size={110} />
        <h1>Courses</h1>
        <p>Entre le code d’accès. Il ne te sera demandé qu’une fois sur cet appareil.</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="code"
          autoComplete="current-password"
          type="password"
          inputMode="text"
          autoFocus
          aria-label="Code d’accès"
        />
        {error && <div className="error">{error}</div>}
        <button className="btn primary" type="submit" disabled={busy || !code.trim()}>
          {busy ? "Vérification…" : "Entrer"}
        </button>
      </form>
    </div>
  );
}
