import Link from "next/link";
import { mockSessions } from "../../lib/mock-data";

export default function SessionsPage() {
  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Sessions</p>
          <h2>Explorer</h2>
          <p className="muted">
            Planned MVP surface: search, filters, transcript inspection, tool trace, and export. This page currently uses static sample data.
          </p>
        </div>
        <span className="badge">MVP-first</span>
      </div>

      <section className="card stack">
        <div className="badge-row">
          <span className="badge">Filter: all kinds</span>
          <span className="badge">Filter: all channels</span>
          <span className="badge">Sort: updatedAt</span>
        </div>
        <div className="list">
          {mockSessions.map((session) => (
            <div key={session.slug} className="session-row">
              <div className="stack" style={{ flex: 1 }}>
                <div>
                  <p className="eyebrow">{session.channel}</p>
                  <h3>{session.displayName}</h3>
                  <p className="muted">{session.key}</p>
                </div>
                <div className="badge-row">
                  <span className="badge">{session.kind}</span>
                  <span className="badge">{session.model}</span>
                  {session.hasCompaction ? <span className="badge warn">compacted</span> : null}
                  {session.hasSubagent ? <span className="badge good">subagent</span> : null}
                  {session.abortedLastRun ? <span className="badge bad">aborted</span> : null}
                </div>
              </div>

              <div className="stack" style={{ minWidth: 220 }}>
                <div className="kv">
                  <span className="muted">Updated</span>
                  <span>{session.updatedAt}</span>
                  <span className="muted">Context</span>
                  <span>{session.contextTokens.toLocaleString()} tok</span>
                  <span className="muted">Total</span>
                  <span>{session.totalTokens.toLocaleString()} tok</span>
                </div>
                <Link href={`/sessions/${session.slug}`} className="badge">
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
