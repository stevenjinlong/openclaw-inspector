import Link from "next/link";
import { mockSessions } from "../lib/mock-data";

export default function DashboardPage() {
  const activeSessions = mockSessions.length;
  const abortedCount = mockSessions.filter((session) => session.abortedLastRun).length;
  const compactedCount = mockSessions.filter((session) => session.hasCompaction).length;

  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>OpenClaw Inspector</h2>
          <p className="muted">
            Early shell for session observability. The UI below is powered by mock data and mirrors the planned product surfaces.
          </p>
        </div>
        <Link href="/sessions" className="badge">
          Open sessions explorer
        </Link>
      </div>

      <div className="grid cols-3">
        <section className="card">
          <p className="eyebrow">Sessions</p>
          <div className="metric">{activeSessions}</div>
          <p className="muted">Visible sessions in the current mock workspace.</p>
        </section>
        <section className="card">
          <p className="eyebrow">Compactions</p>
          <div className="metric">{compactedCount}</div>
          <p className="muted">Sessions with compaction markers in the sample dataset.</p>
        </section>
        <section className="card">
          <p className="eyebrow">Aborted</p>
          <div className="metric">{abortedCount}</div>
          <p className="muted">Sessions that need forensic attention first.</p>
        </section>
      </div>

      <div className="grid cols-2">
        <section className="card stack">
          <div>
            <p className="eyebrow">Why this product exists</p>
            <h3>Make runs explainable</h3>
          </div>
          <p className="muted">
            OpenClaw already has session management, maintenance, compaction, and subagents. Inspector exists to turn those invisible mechanics into something you can inspect and reason about quickly.
          </p>
          <div className="badge-row">
            <span className="badge">Session explorer</span>
            <span className="badge">Tool trace</span>
            <span className="badge">Context breakdown</span>
            <span className="badge">Maintenance preview</span>
          </div>
        </section>

        <section className="card stack">
          <div>
            <p className="eyebrow">Immediate build path</p>
            <h3>First useful slice</h3>
          </div>
          <ol className="muted">
            <li>Replace mock sessions with adapter-backed data</li>
            <li>Build sessions list + transcript view</li>
            <li>Add tool inspector and export</li>
            <li>Layer in context and maintenance</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
