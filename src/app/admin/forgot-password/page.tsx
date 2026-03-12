"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setDebugResetUrl(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const body = (await response.json()) as { message?: string; debugResetUrl?: string };
      if (!response.ok) {
        throw new Error(body.message ?? "Failed to request password reset");
      }

      setMessage(body.message ?? "If the account exists, a password reset link has been sent.");
      setDebugResetUrl(body.debugResetUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request password reset");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="container" style={{ maxWidth: "520px" }}>
        <form className="card" onSubmit={onSubmit}>
          <h1>Forgot My Password</h1>
          <p className="muted">Enter your admin email to receive a reset link.</p>

          <div style={{ marginBottom: "0.8rem" }}>
            <label className="label" htmlFor="email">
              Admin email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          {message ? <div className="alert success">{message}</div> : null}
          {debugResetUrl ? (
            <div className="alert warn">
              Dev reset URL:
              {" "}
              <a href={debugResetUrl}>{debugResetUrl}</a>
            </div>
          ) : null}
          {error ? <div className="alert error">{error}</div> : null}

          <div style={{ marginTop: "0.8rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Send reset link"}
            </button>
            <Link href="/admin/login" className="btn ghost">
              Back to login
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
