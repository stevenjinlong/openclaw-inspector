"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SearchIcon, SessionsIcon, SparklesIcon } from "./ui-icons";

type SearchHitRecord = {
  id: string;
  sessionKey: string;
  resultHref: string;
  sessionDisplayName: string;
  channel: string;
  kind: string;
  model: string;
  messageIndex: number;
  role: string;
  messageType: string;
  timestamp: string | null;
  snippet: string;
};

type SearchResponse = {
  query: string;
  data: SearchHitRecord[];
  meta: {
    adapter: { label: string };
    sessionsScanned: number;
    messagesScanned: number;
    totalMatches: number;
    truncated: boolean;
  };
};

const PAGE_SIZE = 20;
const RESULT_LIMIT = 200;
const SESSION_LIMIT = 50;

export function TranscriptSearchView({
  initialQuery,
  initialPage,
  initialResponse,
}: {
  initialQuery: string;
  initialPage: number;
  initialResponse: SearchResponse;
}) {
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [response, setResponse] = useState<SearchResponse>(initialResponse);
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
    setQueryInput(initialQuery);
    setResponse(initialResponse);
    setPage(initialPage);
  }, [initialQuery, initialPage, initialResponse]);

  const pageCount = Math.max(1, Math.ceil(response.data.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const startIndex = response.data.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(safePage * PAGE_SIZE, response.data.length);
  const pagedResults = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return response.data.slice(start, start + PAGE_SIZE);
  }, [response.data, safePage]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }

    if (safePage > 1) {
      params.set("page", String(safePage));
    } else {
      params.delete("page");
    }

    const queryString = params.toString();
    const nextUrl = `${url.pathname}${queryString ? `?${queryString}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [query, safePage]);

  async function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      if (trimmed) {
        params.set("q", trimmed);
      }
      params.set("resultLimit", String(RESULT_LIMIT));
      params.set("sessionLimit", String(SESSION_LIMIT));

      const response = await fetch(`/api/search?${params.toString()}`);
      const payload = (await response.json()) as SearchResponse;
      setQuery(trimmed);
      setResponse(payload);
      setPage(1);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="stack dashboard-shell">
      <div className="page-title">
        <div className="title-with-icon">
          <span className="page-icon-badge">
            <SearchIcon className="icon icon-lg" />
          </span>
          <div>
            <p className="eyebrow">Search</p>
            <h2>Transcript search</h2>
            <p className="muted">
              Search recent session transcripts with plain-text matching and jump directly into a search-focused session view.
            </p>
          </div>
        </div>
        <span className="badge">{response.meta.adapter.label}</span>
      </div>

      <section className="card stack surface-soft">
        <form
          className="search-row"
          onSubmit={(event) => {
            event.preventDefault();
            void runSearch(queryInput);
          }}
        >
          <label className="search-input-shell">
            <SearchIcon className="icon icon-sm search-input-icon" />
            <input
              className="search-input"
              type="text"
              name="q"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Search transcript text, tools, prompts, or replies"
            />
          </label>
          <button type="submit" className="primary-action" disabled={isLoading}>
            <SearchIcon className="icon icon-sm" />
            {isLoading ? "Searching…" : "Search"}
          </button>
          {query ? (
            <button
              type="button"
              className="secondary-action"
              onClick={() => {
                setQueryInput("");
                void runSearch("");
              }}
            >
              Clear
            </button>
          ) : null}
        </form>

        <div className="transcript-toolbar sessions-toolbar search-pagination-toolbar">
          <div className="badge-row transcript-toolbar-group transcript-toolbar-meta">
            <span className="badge toolbar-page-badge">
              Showing {startIndex}-{endIndex} of {response.data.length}
            </span>
            <span className="badge toolbar-page-badge">Page {safePage} / {pageCount}</span>
            <span className="badge toolbar-page-badge">Sessions scanned: {response.meta.sessionsScanned}</span>
            <span className="badge toolbar-page-badge">Messages scanned: {response.meta.messagesScanned}</span>
            {response.meta.truncated ? (
              <span className="badge warn">Showing first {response.meta.totalMatches} matches</span>
            ) : null}
          </div>

          <div className="badge-row transcript-toolbar-group transcript-toolbar-pagination">
            <button type="button" className="detail-filter-chip search-page-chip" onClick={() => setPage(1)} disabled={safePage === 1}>
              « First
            </button>
            <button type="button" className="detail-filter-chip search-page-chip" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1}>
              ← Previous
            </button>
            <button type="button" className="detail-filter-chip search-page-chip" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={safePage === pageCount}>
              Next →
            </button>
            <button type="button" className="detail-filter-chip search-page-chip" onClick={() => setPage(pageCount)} disabled={safePage === pageCount}>
              Latest »
            </button>
          </div>
        </div>

        <p className="muted">
          {query
            ? `Showing one line per match for “${query}”. Page switches are local and should feel instant now.`
            : "Enter a query above to search recent session transcripts."}
        </p>
      </section>

      {!query ? (
        <section className="card stack surface-soft empty-state detail-empty-state">
          <div className="title-with-icon">
            <span className="page-icon-badge">
              <SparklesIcon className="icon icon-lg" />
            </span>
            <div>
              <h3>Search across recent conversations</h3>
              <p className="muted">
                Good for finding old prompts, tool names, replies, or specific debugging traces across sessions.
              </p>
            </div>
          </div>
        </section>
      ) : pagedResults.length === 0 ? (
        <section className="card stack surface-soft empty-state detail-empty-state">
          <h3>No transcript matches found</h3>
          <p className="muted">
            Try a broader keyword, fewer exact terms, or search something that likely appears in the raw transcript text.
          </p>
        </section>
      ) : (
        <section className="card stack surface-soft">
          <div className="list search-results-list">
            {pagedResults.map((result) => (
              <Link key={result.id} href={result.resultHref} className="search-result-row elevated-row">
                <div className="search-result-main">
                  <div className="search-result-topline">
                    <strong>{result.sessionDisplayName}</strong>
                    <span className="muted mono">#{result.messageIndex + 1}</span>
                  </div>
                  <div className="badge-row">
                    <span className="badge meta-badge meta-badge-kind">
                      <SessionsIcon className="icon icon-sm" />
                      {result.kind}
                    </span>
                    <span className="badge meta-badge meta-badge-channel">
                      <SearchIcon className="icon icon-sm" />
                      {result.channel}
                    </span>
                    <span className="badge meta-badge meta-badge-model">{result.model}</span>
                    <span className="badge">{result.role}</span>
                    <span className="badge">{result.messageType}</span>
                    {result.timestamp ? <span className="badge">{result.timestamp}</span> : null}
                  </div>
                  <p className="search-result-snippet">{result.snippet}</p>
                </div>
                <div className="search-result-side">
                  <span className="muted mono search-result-key">{result.sessionKey}</span>
                  <span className="search-result-jump">Open match →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
