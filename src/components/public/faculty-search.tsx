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
  const [hasSearched, setHasSearched] = useState(false);

  async function runSearch() {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
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

      <div className="grid faculty-search-form">
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

      <div className="faculty-search-results">
        {!hasSearched ? <p className="muted">Search for a faculty member to continue.</p> : null}
        {hasSearched && !loading && results.length === 0 && !error ? <p className="muted">No matches found.</p> : null}
        {results.map((member) => (
          <article key={member.id} className="faculty-result-card">
            <div className="faculty-result-meta">
              <div className="faculty-result-name">
                {member.firstName} {member.lastName}
              </div>
              <div className="faculty-result-email">{member.primaryEmail}</div>
            </div>
            <Link className="btn ghost faculty-result-action" href={`/f/${member.publicToken}`}>
              Give feedback
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
