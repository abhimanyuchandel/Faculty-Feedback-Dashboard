"use client";

import { useEffect, useMemo, useState } from "react";

type Faculty = {
  id: string;
  firstName: string;
  lastName: string;
  primaryEmail: string;
  secondaryEmail: string | null;
  activeStatus: boolean;
  digestSubscriptionStatus: "SUBSCRIBED" | "UNSUBSCRIBED";
  publicToken: string;
};

type EnrollmentRequestStatus = "PENDING" | "APPROVED" | "DENIED";

type EnrollmentRequest = {
  id: string;
  firstName: string;
  lastName: string;
  primaryEmail: string;
  secondaryEmail: string | null;
  notes: string | null;
  status: EnrollmentRequestStatus;
  requestedAt: string;
  reviewedAt: string | null;
  decisionNotes: string | null;
  reviewedByAdmin: { email: string; name: string | null } | null;
  createdFaculty: { id: string; firstName: string; lastName: string; primaryEmail: string } | null;
};

type NewFacultyForm = {
  firstName: string;
  lastName: string;
  primaryEmail: string;
  secondaryEmail: string;
};

const initialForm: NewFacultyForm = {
  firstName: "",
  lastName: "",
  primaryEmail: "",
  secondaryEmail: ""
};

export function FacultyAdminPanel() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [form, setForm] = useState<NewFacultyForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"directory" | "requests">("directory");
  const [requestFilter, setRequestFilter] = useState<"PENDING" | "APPROVED" | "DENIED" | "ALL">("PENDING");
  const [pendingCount, setPendingCount] = useState(0);
  const [csvText, setCsvText] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function loadFaculty() {
    setLoading(true);
    const response = await fetch("/api/admin/faculty?take=1000");
    const data = (await response.json()) as { faculty: Faculty[] };
    setFaculty(data.faculty ?? []);
    setLoading(false);
  }

  async function loadRequests() {
    const query = requestFilter === "ALL" ? "" : `?status=${requestFilter.toLowerCase()}`;
    const response = await fetch(`/api/admin/faculty/requests${query}`);
    const data = (await response.json()) as { requests: EnrollmentRequest[]; pendingCount: number };
    setRequests(data.requests ?? []);
    setPendingCount(data.pendingCount ?? 0);
  }

  useEffect(() => {
    void loadFaculty();
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [requestFilter]);

  async function createFaculty() {
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/admin/faculty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        secondaryEmail: form.secondaryEmail || undefined
      })
    });

    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      setMessage(body.message ?? "Failed to add faculty");
      setSaving(false);
      return;
    }

    setForm(initialForm);
    setMessage("Faculty added");
    await loadFaculty();
    await loadRequests();
    setSaving(false);
  }

  async function toggleFaculty(member: Faculty) {
    const path = member.activeStatus
      ? `/api/admin/faculty/${member.id}/deactivate`
      : `/api/admin/faculty/${member.id}/reactivate`;

    const response = await fetch(path, { method: "POST" });
    if (!response.ok) {
      setMessage("Failed to update faculty status");
      return;
    }

    await loadFaculty();
  }

  async function approveRequest(requestId: string) {
    const decisionNotes = window.prompt("Optional note for approval (leave blank for none):") ?? "";
    setProcessingRequestId(requestId);

    const response = await fetch(`/api/admin/faculty/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", decisionNotes })
    });

    const body = (await response.json()) as { message?: string; result?: { created?: boolean } };
    if (!response.ok) {
      setMessage(body.message ?? "Failed to approve enrollment request");
      setProcessingRequestId(null);
      return;
    }

    setMessage(body.result?.created ? "Enrollment approved and faculty created." : "Enrollment approved.");
    await loadFaculty();
    await loadRequests();
    setProcessingRequestId(null);
  }

  async function denyRequest(requestId: string) {
    const decisionNotes = window.prompt("Optional reason for denial:") ?? "";
    setProcessingRequestId(requestId);

    const response = await fetch(`/api/admin/faculty/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deny", decisionNotes })
    });

    const body = (await response.json()) as { message?: string };
    if (!response.ok) {
      setMessage(body.message ?? "Failed to deny enrollment request");
      setProcessingRequestId(null);
      return;
    }

    setMessage("Enrollment request denied.");
    await loadRequests();
    setProcessingRequestId(null);
  }

  async function importCsv() {
    if (!csvText.trim()) {
      setMessage("Paste CSV content before importing");
      return;
    }

    const response = await fetch("/api/admin/faculty/import", {
      method: "POST",
      headers: { "Content-Type": "text/csv" },
      body: csvText
    });

    const data = (await response.json()) as {
      created?: number;
      updated?: number;
      errors?: Array<{ row: number; message: string }>;
      message?: string;
    };

    if (!response.ok) {
      setMessage(data.message ?? "Import failed");
      return;
    }

    setMessage(`Import complete: ${data.created} created, ${data.updated} updated, ${data.errors?.length ?? 0} errors`);
    await loadFaculty();
  }

  function exportCsv() {
    window.location.assign("/api/admin/faculty/export");
  }

  const sorted = useMemo(
    () => [...faculty].sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)),
    [faculty]
  );

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="card">
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
          <button
            className={`btn ${activeTab === "directory" ? "primary" : "ghost"}`}
            type="button"
            onClick={() => setActiveTab("directory")}
          >
            Faculty Directory
          </button>
          <button
            className={`btn ${activeTab === "requests" ? "primary" : "ghost"}`}
            type="button"
            onClick={() => setActiveTab("requests")}
          >
            Pending Faculty Requests ({pendingCount})
          </button>
        </div>
      </div>

      {activeTab === "directory" ? (
        <>
          <div className="card">
            <h2>Add Faculty</h2>
            <div className="grid two">
              <div>
                <label className="label">First name</label>
                <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div>
                <label className="label">Last name</label>
                <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <div>
                <label className="label">Primary email</label>
                <input
                  className="input"
                  type="email"
                  value={form.primaryEmail}
                  onChange={(e) => setForm({ ...form, primaryEmail: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Secondary email (optional)</label>
                <input
                  className="input"
                  type="email"
                  value={form.secondaryEmail}
                  onChange={(e) => setForm({ ...form, secondaryEmail: e.target.value })}
                />
              </div>
            </div>
            <div style={{ marginTop: "0.8rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button className="btn primary" type="button" disabled={saving} onClick={createFaculty}>
                {saving ? "Saving..." : "Add faculty"}
              </button>
              <button className="btn ghost" type="button" onClick={exportCsv}>
                Export faculty CSV
              </button>
            </div>
          </div>

          <div className="card">
            <h2>CSV Import</h2>
            <p className="muted">Headers: first_name,last_name,primary_email,secondary_email</p>
            <textarea
              className="textarea"
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="first_name,last_name,primary_email,secondary_email\nJane,Doe,jane.doe@med.org,"
            />
            <div style={{ marginTop: "0.8rem" }}>
              <button className="btn primary" type="button" onClick={importCsv}>
                Import CSV
              </button>
            </div>
          </div>

          <div className="card">
            <h2>Faculty Directory</h2>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Primary email</th>
                    <th>Status</th>
                    <th>Digest</th>
                    <th>QR</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((member) => (
                    <tr key={member.id}>
                      <td>
                        {member.firstName} {member.lastName}
                      </td>
                      <td>{member.primaryEmail}</td>
                      <td>
                        <span className={`badge ${member.activeStatus ? "green" : "gray"}`}>
                          {member.activeStatus ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{member.digestSubscriptionStatus}</td>
                      <td>
                        <a className="btn ghost" href={`/api/admin/qr/faculty/${member.id}`}>
                          Download
                        </a>
                      </td>
                      <td>
                        <button className="btn ghost" type="button" onClick={() => toggleFaculty(member)}>
                          {member.activeStatus ? "Deactivate" : "Reactivate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div className="card">
          <h2>Faculty Enrollment Requests</h2>
          <div style={{ marginBottom: "0.8rem" }}>
            <label className="label">Status filter</label>
            <select
              className="select"
              value={requestFilter}
              onChange={(event) => setRequestFilter(event.target.value as "PENDING" | "APPROVED" | "DENIED" | "ALL")}
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="DENIED">Denied</option>
              <option value="ALL">All</option>
            </select>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Requested Faculty</th>
                <th>Emails</th>
                <th>Requested</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Review</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    {request.firstName} {request.lastName}
                  </td>
                  <td>
                    <div>{request.primaryEmail}</div>
                    {request.secondaryEmail ? <div className="muted">{request.secondaryEmail}</div> : null}
                  </td>
                  <td>{new Date(request.requestedAt).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${request.status === "PENDING" ? "gray" : request.status === "APPROVED" ? "green" : "gray"}`}>
                      {request.status}
                    </span>
                  </td>
                  <td>{request.notes || "—"}</td>
                  <td>
                    {request.reviewedAt ? (
                      <div>
                        <div>{new Date(request.reviewedAt).toLocaleString()}</div>
                        <div className="muted">{request.reviewedByAdmin?.email ?? "admin"}</div>
                        {request.decisionNotes ? <div className="muted">{request.decisionNotes}</div> : null}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {request.status === "PENDING" ? (
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button
                          className="btn primary"
                          type="button"
                          onClick={() => approveRequest(request.id)}
                          disabled={processingRequestId === request.id}
                        >
                          Approve
                        </button>
                        <button
                          className="btn danger"
                          type="button"
                          onClick={() => denyRequest(request.id)}
                          disabled={processingRequestId === request.id}
                        >
                          Deny
                        </button>
                      </div>
                    ) : request.status === "APPROVED" && request.createdFaculty ? (
                      <span className="muted">
                        Added: {request.createdFaculty.firstName} {request.createdFaculty.lastName}
                      </span>
                    ) : (
                      <span className="muted">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7}>No requests found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {message ? <div className="alert warn">{message}</div> : null}
    </div>
  );
}
