"use client";

import { useEffect, useMemo, useState } from "react";

type SessionRow = {
  id: string;
  title: string;
  sessionDate: string;
  location: string;
  activeStatus: boolean;
  archivedAt: string | null;
  curriculumPhase: { name: string };
  facultyAssignments: Array<{ faculty: { firstName: string; lastName: string } }>;
};

type Phase = { id: string; name: string };

type Faculty = { id: string; firstName: string; lastName: string };

export function SessionAdminPanel() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);

  const [title, setTitle] = useState("");
  const [curriculumPhaseId, setCurriculumPhaseId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState<string[]>([]);
  const [facultySearch, setFacultySearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [sessionsRes, phasesRes, facultyRes] = await Promise.all([
      fetch(`/api/admin/sessions?includeArchived=${includeArchived ? "true" : "false"}`),
      fetch("/api/admin/curriculum-phases"),
      fetch("/api/admin/faculty?activeOnly=true&take=2000")
    ]);

    const sessionsJson = (await sessionsRes.json()) as { sessions: SessionRow[] };
    const phasesJson = (await phasesRes.json()) as { curriculumPhases: Phase[] };
    const facultyJson = (await facultyRes.json()) as { faculty: Faculty[] };

    setSessions(sessionsJson.sessions ?? []);
    setPhases(phasesJson.curriculumPhases ?? []);
    setFaculty((facultyJson.faculty ?? []).map((f) => ({ id: f.id, firstName: f.firstName, lastName: f.lastName })));
  }

  useEffect(() => {
    void load();
  }, [includeArchived]);

  function toggleFaculty(facultyId: string) {
    setSelectedFaculty((prev) =>
      prev.includes(facultyId) ? prev.filter((id) => id !== facultyId) : [...prev, facultyId]
    );
  }

  const filteredFaculty = useMemo(() => {
    const query = facultySearch.trim().toLowerCase();
    const sorted = [...faculty].sort((a, b) => {
      const lastCompare = a.lastName.localeCompare(b.lastName);
      if (lastCompare !== 0) {
        return lastCompare;
      }
      return a.firstName.localeCompare(b.firstName);
    });

    if (!query) {
      return sorted;
    }

    return sorted.filter((member) => member.lastName.toLowerCase().includes(query));
  }, [faculty, facultySearch]);

  async function createSession() {
    if (!title || !curriculumPhaseId || !sessionDate || !location) {
      setMessage("Title, phase, date, and location are required");
      return;
    }

    const response = await fetch("/api/admin/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        curriculumPhaseId,
        sessionDate,
        location,
        notes,
        facultyIds: selectedFaculty
      })
    });

    if (!response.ok) {
      setMessage("Failed to create session");
      return;
    }

    setMessage("Session created");
    setTitle("");
    setLocation("");
    setNotes("");
    setSelectedFaculty([]);
    await load();
  }

  async function archiveSession(sessionId: string) {
    const confirmed = window.confirm("Archive this session? It will be hidden from active lists.");
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/admin/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive" })
    });

    if (!response.ok) {
      setMessage("Failed to archive session");
      return;
    }

    setMessage("Session archived");
    await load();
  }

  async function restoreSession(sessionId: string) {
    const response = await fetch(`/api/admin/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" })
    });

    if (!response.ok) {
      setMessage("Failed to restore session");
      return;
    }

    setMessage("Session restored");
    await load();
  }

  async function deleteSession(sessionId: string) {
    const confirmed = window.confirm(
      "Delete this teaching session permanently? Existing feedback keeps its snapshot location."
    );
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/admin/sessions/${sessionId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      setMessage("Failed to delete session");
      return;
    }

    setMessage("Session deleted");
    await load();
  }

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="card">
        <h2>Create Teaching Session</h2>
        <div className="grid two">
          <div>
            <label className="label">Session title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Curriculum phase</label>
            <select className="select" value={curriculumPhaseId} onChange={(e) => setCurriculumPhaseId(e.target.value)}>
              <option value="">Select phase</option>
              {phases.map((phase) => (
                <option key={phase.id} value={phase.id}>
                  {phase.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: "0.8rem" }}>
          <label className="label">Optional notes</label>
          <textarea className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div style={{ marginTop: "0.8rem" }}>
          <label className="label">Assign faculty</label>
          <input
            className="input"
            placeholder="Search by last name"
            value={facultySearch}
            onChange={(event) => setFacultySearch(event.target.value)}
            style={{ marginBottom: "0.6rem" }}
          />
          <p className="muted" style={{ marginTop: 0 }}>
            Showing {filteredFaculty.length} faculty
          </p>
          <div className="grid two" style={{ maxHeight: 220, overflow: "auto", border: "1px solid var(--line)", padding: "0.6rem", borderRadius: "10px" }}>
            {filteredFaculty.map((member) => (
              <label key={member.id} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={selectedFaculty.includes(member.id)}
                  onChange={() => toggleFaculty(member.id)}
                />
                <span>
                  {member.firstName} {member.lastName}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "0.8rem" }}>
          <button className="btn primary" type="button" onClick={createSession}>
            Create session
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Teaching Sessions</h2>
        <div style={{ marginBottom: "0.8rem" }}>
          <label style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
            />
            <span>Show archived sessions</span>
          </label>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Phase</th>
              <th>Status</th>
              <th>Faculty</th>
              <th>Packets</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>
                  <strong>{session.title}</strong>
                  <div className="muted">{session.location}</div>
                </td>
                <td>{new Date(session.sessionDate).toLocaleDateString()}</td>
                <td>{session.curriculumPhase.name}</td>
                <td>
                  {session.activeStatus ? (
                    <span className="badge green">Active</span>
                  ) : (
                    <span className="badge gray">
                      Archived
                      {session.archivedAt ? ` (${new Date(session.archivedAt).toLocaleDateString()})` : ""}
                    </span>
                  )}
                </td>
                <td>{session.facultyAssignments.length}</td>
                <td>
                  {session.activeStatus ? (
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <a className="btn ghost" href={`/api/admin/sessions/${session.id}/packet?format=single`}>
                        One-per-page PDF
                      </a>
                      <a className="btn ghost" href={`/api/admin/sessions/${session.id}/packet?format=grid`}>
                        Grid PDF
                      </a>
                    </div>
                  ) : (
                    <span className="muted">Not shown for archived sessions</span>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {session.activeStatus ? (
                      <button className="btn ghost" type="button" onClick={() => archiveSession(session.id)}>
                        Archive
                      </button>
                    ) : (
                      <button className="btn ghost" type="button" onClick={() => restoreSession(session.id)}>
                        Restore
                      </button>
                    )}
                    <button className="btn danger" type="button" onClick={() => deleteSession(session.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message ? <div className="alert warn">{message}</div> : null}
    </div>
  );
}
