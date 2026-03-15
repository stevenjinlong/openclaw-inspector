import Link from "next/link";
import { formatTokenCount } from "../../lib/normalizers";
import { listSessionsResponse } from "../../lib/session-adapter";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const { data: sessions, meta } = await listSessionsResponse();

  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Sessions</p>
          <h2>Explorer</h2>
          <p className="muted">
            MVP-first list view backed by a normalized adapter contract. This
            milestone prefers live local OpenClaw data and falls back only when
            needed.
          </p>
        </div>
        <span className="badge">{meta.adapter.label}</span>
      </div>

      <section className="card stack">
        <div className="badge-row">
          <span className="badge">Count: {meta.count ?? sessions.length}</span>
          <span className="badge">Mode: {meta.adapter.mode}</span>
          <span className="badge">Read-only</span>
          {meta.adapter.stubbed ? (
            <span className="badge warn">Stubbed fallback</span>
          ) : (
            <span className="badge good">Live local data</span>
          )}
        </div>
        <p className="muted">{meta.note}</p>
        {meta.warnings?.length ? (
          <ul className="muted">
            {meta.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card stack">
        <div className="badge-row">
          <span className="badge">Filter: all kinds</span>
          <span className="badge">Filter: all channels</span>
          <span className="badge">Sort: updatedAt</span>
        </div>
        <div className="list">
          {sessions.map((session) => (
            <div key={session.key} className="session-row">
              <div className="stack" style={{ flex: 1 }}>
                <div>
                  <p className="eyebrow">{session.channel}</p>
                  <h3>{session.displayName}</h3>
                  <p className="muted mono">{session.key}</p>
                </div>
                <div className="badge-row">
                  <span className="badge">{session.kind}</span>
                  <span className="badge">{session.model}</span>
                  {session.modelProvider ? (
                    <span className="badge">provider: {session.modelProvider}</span>
                  ) : null}
                  <span className="badge">source: {session.dataSource}</span>
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
              </div>

              <div className="stack" style={{ minWidth: 260 }}>
                <div className="kv compact-kv">
                  <span className="muted">Updated</span>
                  <span>{session.updatedAt}</span>
                  <span className="muted">Context</span>
                  <span>{formatTokenCount(session.tokens.context)}</span>
                  <span className="muted">Total</span>
                  <span>{formatTokenCount(session.tokens.total)}</span>
                  <span className="muted">API</span>
                  <span className="mono">{session.apiPath}</span>
                </div>
                <Link href={session.href} className="badge">
                  Inspect session
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
