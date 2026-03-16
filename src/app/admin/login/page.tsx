"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      mfaCode,
      redirect: false,
      callbackUrl
    });

    setLoading(false);

    if (!result || result.error) {
      setError("Invalid credentials or missing MFA code.");
      return;
    }

    window.location.assign(callbackUrl);
  }

  return (
    <main className="page">
      <section className="container" style={{ maxWidth: "520px" }}>
        <form className="card" onSubmit={onSubmit}>
          <h1>Admin sign in</h1>
          <p className="muted">Use your authorized administrator account.</p>

          <div style={{ marginBottom: "0.8rem" }}>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: "0.8rem" }}>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label className="label" htmlFor="mfaCode">
              MFA code
            </label>
            <input
              id="mfaCode"
              className="input"
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value)}
              placeholder="Required only after MFA is enabled"
            />
          </div>

          {error ? <div className="alert error">{error}</div> : null}

          <button className="btn primary" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <div style={{ marginTop: "0.8rem" }}>
            <Link href="/admin/forgot-password" className="btn ghost">
              Forgot my password
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
