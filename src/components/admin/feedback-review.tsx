"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Overview = {
  count: number;
  byPhase: Array<{ curriculumPhaseId: string; phaseName: string; count: number }>;
  byLocation: Array<{ location: string; count: number }>;
  byYear: Array<{ year: number; count: number }>;
  breakdown: Array<{
    year: number;
    curriculumPhaseId: string;
    curriculumPhaseName: string;
    submissionCount: number;
  }>;
  filters: {
    faculty: Array<{ id: string; name: string; primaryEmail: string }>;
    curriculumPhases: Array<{ id: string; name: string }>;
    years: number[];
  };
  recentSubmissions: Array<{
    id: string;
    submittedAt: string;
    year: number;
    faculty: { firstName: string; lastName: string; primaryEmail: string };
    curriculumPhase: { name: string };
    answers: Array<{ questionTypeSnapshot: string; answerJson: unknown }>;
  }>;
};

export function FeedbackReviewPanel() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [facultyId, setFacultyId] = useState("");
  const [facultySearch, setFacultySearch] = useState("");
  const [curriculumPhaseId, setCurriculumPhaseId] = useState("");
  const [year, setYear] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (facultyId) params.set("facultyId", facultyId);
    if (curriculumPhaseId) params.set("curriculumPhaseId", curriculumPhaseId);
    if (year) params.set("year", year);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    return params.toString();
  }, [facultyId, curriculumPhaseId, year, fromDate, toDate]);

  const facultyOptions = useMemo(() => {
    const q = facultySearch.trim().toLowerCase();
    const source = data?.filters.faculty ?? [];
    if (!q) {
      return source;
    }

    return source.filter((faculty) => {
      const name = faculty.name.toLowerCase();
      const email = faculty.primaryEmail.toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [data?.filters.faculty, facultySearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    const response = await fetch(`/api/admin/feedback/overview?${queryString}`);
    const body = (await response.json()) as Overview | { message?: string };

    if (!response.ok) {
      setMessage((body as { message?: string }).message ?? "Failed to load feedback report");
      setLoading(false);
      return;
    }

    setData(body as Overview);
    setLoading(false);
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="card">
        <h2>Feedback Report Filters</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.8rem" }}>
          <div>
            <label className="label">Quick faculty search</label>
            <input
              className="input"
              value={facultySearch}
              onChange={(event) => setFacultySearch(event.target.value)}
              placeholder="Last name or email"
            />
          </div>
          <div>
            <label className="label">Faculty</label>
            <select className="select" value={facultyId} onChange={(event) => setFacultyId(event.target.value)}>
              <option value="">All faculty</option>
              {facultyOptions.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name} ({faculty.primaryEmail})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Curriculum phase</label>
            <select
              className="select"
              value={curriculumPhaseId}
              onChange={(event) => setCurriculumPhaseId(event.target.value)}
            >
              <option value="">All phases</option>
              {(data?.filters.curriculumPhases ?? []).map((phase) => (
                <option key={phase.id} value={phase.id}>
                  {phase.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Year received</label>
            <select className="select" value={year} onChange={(event) => setYear(event.target.value)}>
              <option value="">All years</option>
              {(data?.filters.years ?? []).map((entry) => (
                <option key={entry} value={entry.toString()}>
                  {entry}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">From date</label>
            <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="label">To date</label>
            <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: "0.8rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button className="btn primary" type="button" onClick={load}>
            Apply Filters
          </button>
          <a className="btn ghost" href={`/api/admin/feedback/export?${queryString}`}>
            Download CSV Report
          </a>
        </div>
      </div>

      {message ? <div className="alert error">{message}</div> : null}

      <div className="card">
        <h2>Overview</h2>
        {loading || !data ? <p>Loading...</p> : <p>Total submissions in filter: {data.count}</p>}
        {!loading && data ? (
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: "0.8rem", gap: "0.8rem" }}>
            <div>
              <strong>By phase</strong>
              <ul>
                {data.byPhase.map((entry) => (
                  <li key={entry.curriculumPhaseId}>
                    {entry.phaseName}: {entry.count}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <strong>By year</strong>
              <ul>
                {data.byYear.map((entry) => (
                  <li key={entry.year}>
                    {entry.year}: {entry.count}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>

      <div className="card">
        <h2>Report Breakdown (Curriculum Phase/Year)</h2>
        {loading || !data ? (
          <p>Loading...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Phase</th>
                <th>Calendar Year</th>
                <th>Total Evaluations</th>
              </tr>
            </thead>
            <tbody>
              {data.breakdown.map((row) => (
                <tr key={`${row.year}-${row.curriculumPhaseId}`}>
                  <td>{row.curriculumPhaseName}</td>
                  <td>{row.year}</td>
                  <td>{row.submissionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Recent submissions</h2>
        {loading || !data ? (
          <p>Loading...</p>
        ) : data.recentSubmissions.length === 0 ? (
          <p>No submissions found for the current filters.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {data.recentSubmissions.map((submission) => (
              <li key={submission.id} style={{ marginBottom: "0.7rem" }}>
                <strong>{new Date(submission.submittedAt).toLocaleString()}</strong>:{" "}
                {submission.faculty.firstName} {submission.faculty.lastName} | {submission.curriculumPhase.name} |{" "}
                {submission.answers.length} answers
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
