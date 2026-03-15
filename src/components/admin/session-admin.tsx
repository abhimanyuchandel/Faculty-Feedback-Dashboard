"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [facultyLookup, setFacultyLookup] = useState<Record<string, Faculty>>({});

  const [title, setTitle] = useState("");
  const [curriculumPhaseId, setCurriculumPhaseId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState<string[]>([]);
  const [facultySearch, setFacultySearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadSessionsAndPhases = useCallback(async () => {
    const [sessionsRes, phasesRes] = await Promise.all([
      fetch(`/api/admin/sessions?includeArchived=${includeArchived ? "true" : "false"}`),
      fetch("/api/admin/curriculum-phases")
    ]);

    const sessionsJson = (await sessionsRes.json()) as { sessions: SessionRow[] };
    const phasesJson = (await phasesRes.json()) as { curriculumPhases: Phase[] };

    setSessions(sessionsJson.sessions ?? []);
    setPhases(phasesJson.curriculumPhases ?? []);
  }, [includeArchived]);

  const loadFacultyOptions = useCallback(async () => {
    const params = new URLSearchParams({
      activeOnly: "true",
      take: "10",
      sortBy: "sessionFrequency"
    });

    if (facultySearch.trim()) {
      params.set("q", facultySearch.trim());
    }

    const facultyRes = await fetch(`/api/admin/faculty?${params.toString()}`);
    const facultyJson = (await facultyRes.json()) as { faculty: Faculty[] };
    const nextFaculty = (facultyJson.faculty ?? []).map((member) => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName
    }));

    setFaculty(nextFaculty);
    setFacultyLookup((current) => {
      const nextLookup = { ...current };

      for (const member of nextFaculty) {
        nextLookup[member.id] = member;
      }

      return nextLookup;
    });
  }, [facultySearch]);

  useEffect(() => {
    void loadSessionsAndPhases();
  }, [loadSessionsAndPhases]);

  useEffect(() => {
    void loadFacultyOptions();
  }, [loadFacultyOptions]);

  function toggleFaculty(facultyId: string) {
    setSelectedFaculty((prev) =>
      prev.includes(facultyId) ? prev.filter((id) => id !== facultyId) : [...prev, facultyId]
    );
  }

  const displayedFaculty = useMemo(() => {
    return [...faculty].sort((a, b) => {
      const lastCompare = a.lastName.localeCompare(b.lastName);
      if (lastCompare !== 0) {
        return lastCompare;
      }

      return a.firstName.localeCompare(b.firstName);
    });
  }, [faculty]);

  const selectedFacultyEntries = useMemo(() => {
    return selectedFaculty
      .map((facultyId) => facultyLookup[facultyId])
      .filter((member): member is Faculty => Boolean(member))
      .sort((a, b) => {
        const lastCompare = a.lastName.localeCompare(b.lastName);
        if (lastCompare !== 0) {
          return lastCompare;
        }

        return a.firstName.localeCompare(b.firstName);
      });
  }, [facultyLookup, selectedFaculty]);

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
    await Promise.all([loadSessionsAndPhases(), loadFacultyOptions()]);
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
    await loadSessionsAndPhases();
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
    await loadSessionsAndPhases();
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
    await loadSessionsAndPhases();
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
          {selectedFacultyEntries.length > 0 ? (
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
              {selectedFacultyEntries.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="btn ghost"
                  onClick={() => toggleFaculty(member.id)}
                >
                  {member.firstName} {member.lastName} x
                </button>
              ))}
            </div>
          ) : null}
          <p className="muted" style={{ marginTop: 0 }}>
            {facultySearch.trim()
              ? `Showing ${displayedFaculty.length} matching faculty from the top historical picks`
              : `Showing ${displayedFaculty.length} most frequently selected faculty`}
          </p>
          <div className="grid two" style={{ maxHeight: 220, overflow: "auto", border: "1px solid var(--line)", padding: "0.6rem", borderRadius: "10px" }}>
            {displayedFaculty.map((member) => (
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
