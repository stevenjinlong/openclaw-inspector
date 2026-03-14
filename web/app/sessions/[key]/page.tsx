import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionDetailResponse } from "../../../lib/session-adapter";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const { data: session, meta } = await getSessionDetailResponse(key);

  if (!session) {
    notFound();
  }

  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Session detail</p>
          <h2>{session.displayName}</h2>
          <p className="muted">
            Normalized detail view from the local adapter. Transcript entries
            below are still sourced from mock sample data.
          </p>
        </div>
        <Link href="/sessions" className="badge">
          Back to sessions
        </Link>
      </div>

      <section className="card stack">
        <div className="badge-row">
          <span className="badge">{session.kind}</span>
          <span className="badge">{session.channel}</span>
          <span className="badge">{session.model}</span>
          <span className="badge">{meta.adapter.label}</span>
          {session.status.hasCompaction ? (
            <span className="badge warn">compacted</span>
          ) : null}
          {session.status.hasSubagent ? (
            <span className="badge good">subagent</span>
          ) : null}
          {session.status.abortedLastRun ? (
            <span className="badge bad">aborted</span>
          ) : null}
        </div>

        <div className="kv">
          <span className="muted">Session key</span>
          <span className="mono">{session.key}</span>
          <span className="muted">API path</span>
          <span className="mono">{session.apiPath}</span>
          <span className="muted">Updated</span>
          <span>{session.updatedAt}</span>
          <span className="muted">Context tokens</span>
          <span>{session.tokens.context.toLocaleString()} tok</span>
          <span className="muted">Total tokens</span>
          <span>{session.tokens.total.toLocaleString()} tok</span>
          <span className="muted">Transcript path</span>
          <span className="mono">{session.transcript.path}</span>
        </div>
      </section>

      <div className="grid cols-2">
        <section className="card stack">
          <div>
            <p className="eyebrow">Adapter contract</p>
            <h3>Read-only local-first seam</h3>
          </div>
          <p className="muted">{meta.note}</p>
          <ul className="muted">
            {meta.adapter.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>

        <section className="card stack">
          <div>
            <p className="eyebrow">Transcript source</p>
            <h3>Mock for now, swappable later</h3>
          </div>
          <p className="muted">
            The transcript shown here is intentionally honest about its source.
            This milestone normalizes sample data first so the UI and API can
            later swap to OpenClaw CLI or Gateway-backed reads without a page
            rewrite.
          </p>
          <div className="badge-row">
            <span className="badge">Source: {session.transcript.source}</span>
            <span className="badge">Read-only</span>
            <span className="badge warn">Adapter stub</span>
          </div>
        </section>
      </div>

      <section className="card stack">
        <div>
          <p className="eyebrow">Transcript</p>
          <h3>Message flow</h3>
          <p className="muted">
            Tool results are tagged and marked as collapsed-by-default candidates
            for the future transcript UI.
          </p>
        </div>

        <div className="list">
          {session.transcript.messages.map((message) => (
            <article
              key={`${message.messageType}-${message.index}`}
              className={`transcript-item ${message.messageType}`}
            >
              <div className="badge-row">
                <span className="badge">#{message.index + 1}</span>
                <span className="badge">{message.role}</span>
                {message.isCollapsedDefault ? (
                  <span className="badge warn">collapse later</span>
                ) : null}
              </div>
              <h3>{message.title}</h3>
              <pre>{message.content}</pre>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
