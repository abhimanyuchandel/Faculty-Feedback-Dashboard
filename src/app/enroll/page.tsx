"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function EnrollFacultyPage() {
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [secondaryEmail, setSecondaryEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const invitedEmail = searchParams.get("primaryEmail");
    if (invitedEmail) {
      setPrimaryEmail(invitedEmail);
    }
  }, [searchParams]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/public/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          primaryEmail,
          secondaryEmail,
          notes
        })
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Enrollment request failed");
      }

      setMessage(data.message ?? "Enrollment request submitted.");
      setFirstName("");
      setLastName("");
      setPrimaryEmail("");
      setSecondaryEmail("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="container" style={{ maxWidth: "760px" }}>
        <div style={{ marginBottom: "1rem" }}>
          <Link href="/" className="btn ghost">
            Back to home
          </Link>
        </div>

        <form className="card" onSubmit={onSubmit}>
          <h1>Enroll A Colleague</h1>
          <p className="muted">
            Submit a request to enroll a faculty member in anonymous student feedback digest emails.
          </p>

          <div className="grid two">
            <div>
              <label className="label">First name</label>
              <input className="input" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
            </div>
            <div>
              <label className="label">Last name</label>
              <input className="input" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
            </div>
            <div>
              <label className="label">Primary email</label>
              <input
                className="input"
                type="email"
                value={primaryEmail}
                onChange={(event) => setPrimaryEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Secondary email (optional)</label>
              <input
                className="input"
                type="email"
                value={secondaryEmail}
                onChange={(event) => setSecondaryEmail(event.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: "0.8rem" }}>
            <label className="label">Notes (optional)</label>
            <textarea className="textarea" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>

          {message ? <div className="alert success" style={{ marginTop: "0.8rem" }}>{message}</div> : null}
          {error ? <div className="alert error" style={{ marginTop: "0.8rem" }}>{error}</div> : null}

          <div style={{ marginTop: "0.8rem" }}>
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit enrollment request"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
