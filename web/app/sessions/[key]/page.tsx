import Link from "next/link";
import { notFound } from "next/navigation";
import { formatTokenCount } from "../../../lib/normalizers";
import { getSessionDetailResponse } from "../../../lib/session-adapter";

export const dynamic = "force-dynamic";

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
            Read-only inspector view for one session. Transcript prefers live
            Gateway history and falls back to local transcript files when
            needed.
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
          <span className="badge">transcript: {session.transcript.source}</span>
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
          <span className="muted">Agent</span>
          <span>{session.agentId ?? "unknown"}</span>
          <span className="muted">Context tokens</span>
          <span>{formatTokenCount(session.tokens.context)}</span>
          <span className="muted">Total tokens</span>
          <span>{formatTokenCount(session.tokens.total)}</span>
          <span className="muted">Transcript path</span>
          <span className="mono">{session.transcript.path ?? "unavailable"}</span>
        </div>
      </section>

      <div className="grid cols-2">
        <section className="card stack">
          <div>
            <p className="eyebrow">Adapter contract</p>
            <h3>Local-first, read-only</h3>
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
            <p className="eyebrow">Source health</p>
            <h3>Adapter + transcript visibility</h3>
          </div>
          <div className="badge-row">
            <span className="badge">session source: {session.dataSource}</span>
            <span className="badge">transcript source: {session.transcript.source}</span>
            <span className="badge">read-only</span>
            {meta.adapter.stubbed ? (
              <span className="badge warn">stubbed</span>
            ) : (
              <span className="badge good">live local</span>
            )}
          </div>
          {meta.warnings?.length ? (
            <ul className="muted">
              {meta.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              No adapter warnings for this request.
            </p>
          )}
        </section>
      </div>

      <section className="card stack">
        <div>
          <p className="eyebrow">Transcript</p>
          <h3>Message flow</h3>
          <p className="muted">
            Tool calls and tool results are now surfaced as separate transcript
            entries, which is much closer to the final inspector experience.
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
                <span className="badge">{message.messageType}</span>
                {message.timestamp ? (
                  <span className="badge">{message.timestamp}</span>
                ) : null}
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
