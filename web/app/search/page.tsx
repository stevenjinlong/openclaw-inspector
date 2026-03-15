import Link from "next/link";

import { SearchIcon, SessionsIcon, SparklesIcon } from "../../components/ui-icons";
import { searchTranscripts } from "../../lib/search-adapter";

export const dynamic = "force-dynamic";

type SearchPageSearchParams = {
  q?: string | string[];
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchPageSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const rawQuery = firstString(resolvedSearchParams.q)?.trim() ?? "";
  const response = await searchTranscripts(rawQuery, {
    resultLimit: 80,
    sessionLimit: 50,
  });

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
              Search recent session transcripts with plain-text matching and jump directly into the exact session context.
            </p>
          </div>
        </div>
        <span className="badge">{response.meta.adapter.label}</span>
      </div>

      <section className="card stack surface-soft">
        <form action="/search" method="get" className="search-row">
          <label className="search-input-shell">
            <SearchIcon className="icon icon-sm search-input-icon" />
            <input
              className="search-input"
              type="text"
              name="q"
              defaultValue={rawQuery}
              placeholder="Search transcript text, tools, prompts, or replies"
            />
          </label>
          <button type="submit" className="primary-action">
            <SearchIcon className="icon icon-sm" />
            Search
          </button>
          {rawQuery ? (
            <Link href="/search" className="secondary-action">
              Clear
            </Link>
          ) : null}
        </form>

        <div className="badge-row">
          <span className="badge">Results: {response.data.length}</span>
          <span className="badge">Sessions scanned: {response.meta.sessionsScanned}</span>
          <span className="badge">Messages scanned: {response.meta.messagesScanned}</span>
          <span className="badge">Read-only</span>
        </div>
        <p className="muted">
          {rawQuery
            ? `Showing one line per match for “${rawQuery}”.`
            : "Enter a query above to search recent session transcripts."}
        </p>
      </section>

      {!rawQuery ? (
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
      ) : response.data.length === 0 ? (
        <section className="card stack surface-soft empty-state detail-empty-state">
          <h3>No transcript matches found</h3>
          <p className="muted">
            Try a broader keyword, fewer exact terms, or search something that likely appears in the raw transcript text.
          </p>
        </section>
      ) : (
        <section className="card stack surface-soft">
          <div className="list search-results-list">
            {response.data.map((result) => (
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

function firstString(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
