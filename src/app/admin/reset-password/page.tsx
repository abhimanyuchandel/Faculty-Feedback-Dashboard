"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Missing reset token");
      return;
    }

    if (newPassword.length < 10) {
      setError("New password must be at least 10 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword
        })
      });

      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? "Failed to reset password");
      }

      setMessage(body.message ?? "Password reset successful. You can now sign in.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="container" style={{ maxWidth: "520px" }}>
        <form className="card" onSubmit={onSubmit}>
          <h1>Reset Password</h1>
          <p className="muted">Set a new password for your admin account.</p>

          {!token ? <div className="alert error">Missing or invalid reset token.</div> : null}

          <div style={{ marginBottom: "0.8rem" }}>
            <label className="label" htmlFor="newPassword">
              New password
            </label>
            <input
              id="newPassword"
              className="input"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: "0.8rem" }}>
            <label className="label" htmlFor="confirmPassword">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>

          {message ? <div className="alert success">{message}</div> : null}
          {error ? <div className="alert error">{error}</div> : null}

          <div style={{ marginTop: "0.8rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button className="btn primary" type="submit" disabled={submitting || !token}>
              {submitting ? "Resetting..." : "Reset password"}
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
