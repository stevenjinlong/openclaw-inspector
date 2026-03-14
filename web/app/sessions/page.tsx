import Link from "next/link";
import { listSessionsResponse } from "../../lib/session-adapter";

export default async function SessionsPage() {
  const { data: sessions, meta } = await listSessionsResponse();

  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Sessions</p>
          <h2>Explorer</h2>
          <p className="muted">
            Planned MVP surface: search, filters, transcript inspection, tool
            trace, and export. This page now renders the same normalized
            contract exposed through <span className="mono">GET /api/sessions</span>.
          </p>
        </div>
        <span className="badge">{meta.adapter.label}</span>
      </div>

      <section className="card stack">
        <div className="badge-row">
          <span className="badge">Count: {meta.count ?? sessions.length}</span>
          <span className="badge">Mode: {meta.adapter.mode}</span>
          <span className="badge">Read-only</span>
          <span className="badge warn">Underlying data is mock</span>
        </div>
        <p className="muted">{meta.note}</p>
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
                  <span>{session.tokens.context.toLocaleString()} tok</span>
                  <span className="muted">Total</span>
                  <span>{session.tokens.total.toLocaleString()} tok</span>
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
