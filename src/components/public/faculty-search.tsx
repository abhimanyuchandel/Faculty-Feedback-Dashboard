"use client";

import Link from "next/link";
import { useState } from "react";

type SearchResult = {
  id: string;
  firstName: string;
  lastName: string;
  primaryEmail: string;
  secondaryEmail: string | null;
  publicToken: string;
};

export function FacultySearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/public/faculty/search?q=${encodeURIComponent(query)}`);
      const data = (await response.json()) as { results?: SearchResult[]; message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Search failed");
      }

      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h1>Find Faculty</h1>
      <p className="muted">Search by first name, last name, primary email, or secondary email.</p>

      <div className="grid" style={{ gridTemplateColumns: "1fr auto", alignItems: "end" }}>
        <div>
          <label className="label" htmlFor="faculty-query">
            Search
          </label>
          <input
            id="faculty-query"
            className="input"
            placeholder="Type a name or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                runSearch();
              }
            }}
          />
        </div>
        <button type="button" className="btn primary" onClick={runSearch} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error ? <p className="alert error">{error}</p> : null}

      <div style={{ marginTop: "1rem" }}>
        {results.length === 0 ? (
          <p className="muted">No results yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Faculty</th>
                <th>Email</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map((member) => (
                <tr key={member.id}>
                  <td>
                    {member.firstName} {member.lastName}
                  </td>
                  <td>{member.primaryEmail}</td>
                  <td>
                    <Link className="btn ghost" href={`/f/${member.publicToken}`}>
                      Give feedback
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
