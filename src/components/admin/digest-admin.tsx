"use client";

import { useEffect, useMemo, useState } from "react";

type Faculty = {
  id: string;
  firstName: string;
  lastName: string;
  primaryEmail: string;
};

type Preview = {
  payload: {
    totalResponses: number;
    phaseSummaries: Array<{
      phaseName: string;
      responseCount: number;
      responses: Array<{
        surveyLabel: string;
        surveyVersionNumber: number;
        monthYearLabel: string;
        answers: Array<{ prompt: string; value: string }>;
      }>;
    }>;
  };
  html: string;
};

export function DigestAdminPanel() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [facultySearch, setFacultySearch] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/admin/faculty?activeOnly=true&take=2000");
      const data = (await response.json()) as { faculty: Faculty[] };
      setFaculty(data.faculty ?? []);
    })();
  }, []);

  const filteredFaculty = useMemo(() => {
    const query = facultySearch.trim().toLowerCase();
    if (!query) {
      return faculty;
    }

    return faculty.filter((member) => {
      const last = member.lastName.toLowerCase();
      const email = member.primaryEmail.toLowerCase();
      return last.includes(query) || email.includes(query);
    });
  }, [faculty, facultySearch]);

  async function runFullDigestCycle() {
    const response = await fetch("/api/admin/digest/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    const data = (await response.json()) as { sentCount?: number; checkedFaculty?: number; message?: string };

    if (!response.ok) {
      setMessage(data.message ?? "Digest run failed");
      return;
    }

    setMessage(`Digest cycle complete. Sent: ${data.sentCount ?? 0}. Checked: ${data.checkedFaculty ?? 0}.`);
  }

  async function runSingleTestDigest() {
    if (!selectedFacultyId) {
      setMessage("Select a faculty member first");
      return;
    }

    const response = await fetch(`/api/admin/digest/test/${selectedFacultyId}`, {
      method: "POST"
    });

    const data = (await response.json()) as {
      sent?: boolean;
      reason?: string;
      message?: string;
      submissionCount?: number;
      providerMessageId?: string | null;
    };

    if (!response.ok) {
      setMessage(data.message ?? "Failed to send test digest");
      return;
    }

    setMessage(
      data.sent
        ? `Test digest accepted by email provider${
            typeof data.submissionCount === "number" ? ` (${data.submissionCount} responses included)` : ""
          }${data.providerMessageId ? ` Tracking ID: ${data.providerMessageId}.` : "."}`
        : data.reason ?? "No test digest was sent."
    );
  }

  async function loadPreview() {
    if (!selectedFacultyId) {
      setMessage("Select a faculty member first");
      return;
    }

    const response = await fetch(`/api/admin/digest/preview/${selectedFacultyId}`);
    const data = (await response.json()) as Preview & { message?: string };

    if (!response.ok) {
      setPreview(null);
      setMessage(data.message ?? "No preview available");
      return;
    }

    setPreview(data);
    setMessage("Digest preview loaded");
  }

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="card">
        <h2>Digest Engine Controls</h2>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr auto auto auto", alignItems: "end" }}>
          <div>
            <label className="label">Search faculty (last name/email)</label>
            <input
              className="input"
              value={facultySearch}
              onChange={(event) => setFacultySearch(event.target.value)}
              placeholder="e.g., smith"
            />
          </div>
          <div>
            <label className="label">Faculty</label>
            <select className="select" value={selectedFacultyId} onChange={(e) => setSelectedFacultyId(e.target.value)}>
              <option value="">Select faculty</option>
              {filteredFaculty.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.lastName}, {member.firstName} ({member.primaryEmail})
                </option>
              ))}
            </select>
          </div>
          <button className="btn ghost" type="button" onClick={loadPreview}>
            Preview digest
          </button>
          <button className="btn ghost" type="button" onClick={runSingleTestDigest}>
            Send test digest
          </button>
          <button className="btn primary" type="button" onClick={runFullDigestCycle}>
            Run full digest cycle
          </button>
        </div>
      </div>

      {message ? <div className="alert warn">{message}</div> : null}

      {preview ? (
        <div className="card">
          <h2>Digest Preview Summary</h2>
          <p>Total responses in the current six-month window: {preview.payload.totalResponses}</p>
          <ul>
            {preview.payload.phaseSummaries.map((phase) => (
              <li key={phase.phaseName}>
                <div>
                  {phase.phaseName}: {phase.responseCount} responses
                </div>
                <ul>
                  {phase.responses.map((responseSummary, idx) => (
                    <li key={`${phase.phaseName}-${responseSummary.monthYearLabel}-${idx}`}>
                      Response {idx + 1}: {responseSummary.surveyLabel} (v{responseSummary.surveyVersionNumber}) -{" "}
                      {responseSummary.monthYearLabel}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <details>
            <summary>Rendered HTML email preview</summary>
            <iframe
              title="Digest preview"
              srcDoc={preview.html}
              style={{ marginTop: "0.8rem", border: "1px solid var(--line)", width: "100%", minHeight: 400 }}
            />
          </details>
        </div>
      ) : null}
    </div>
  );
}
