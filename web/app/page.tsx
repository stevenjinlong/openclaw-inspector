import Link from "next/link";
import { getHealthResponse, listSessions } from "../lib/session-adapter";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [health, sessions] = await Promise.all([
    getHealthResponse(),
    listSessions(),
  ]);

  const activeSessions = sessions.length;
  const abortedCount = sessions.filter(
    (session) => session.status.abortedLastRun,
  ).length;
  const compactedCount = sessions.filter(
    (session) => session.status.hasCompaction,
  ).length;

  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>OpenClaw Inspector</h2>
          <p className="muted">
            The app now prefers live local OpenClaw session data, normalized
            into a stable contract for the UI.
          </p>
        </div>
        <Link href="/sessions" className="badge">
          Open sessions explorer
        </Link>
      </div>

      <section className="card stack">
        <div className="badge-row">
          <span className="badge">Adapter: {health.adapter.label}</span>
          <span className="badge">Route: GET /api/health</span>
          <span className="badge">Route: GET /api/sessions</span>
          {health.adapter.stubbed ? (
            <span className="badge warn">Stubbed fallback</span>
          ) : (
            <span className="badge good">Live local data</span>
          )}
          <span className="badge">Read-only</span>
        </div>
        <p className="muted">
          Health is {health.checks[0]?.status ?? "unknown"}. This milestone is
          about replacing fake session data with real OpenClaw visibility while
          keeping the product safely read-only.
        </p>
        {health.warnings.length ? (
          <ul className="muted">
            {health.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="grid cols-3">
        <section className="card">
          <p className="eyebrow">Sessions</p>
          <div className="metric">{activeSessions}</div>
          <p className="muted">Visible sessions from the current local adapter source.</p>
        </section>
        <section className="card">
          <p className="eyebrow">Compactions</p>
          <div className="metric">{compactedCount}</div>
          <p className="muted">Detected compaction markers from currently loaded session details.</p>
        </section>
        <section className="card">
          <p className="eyebrow">Aborted</p>
          <div className="metric">{abortedCount}</div>
          <p className="muted">Sessions that deserve forensic attention first.</p>
        </section>
      </div>

      <div className="grid cols-2">
        <section className="card stack">
          <div>
            <p className="eyebrow">Why this product exists</p>
            <h3>Make runs explainable</h3>
          </div>
          <p className="muted">
            OpenClaw already has sessions, maintenance, compaction, and
            subagents. Inspector exists to turn those invisible mechanics into
            something you can inspect and reason about quickly.
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
            <li>Keep the live session list stable</li>
            <li>Expand session detail into transcript, tools, and stats tabs</li>
            <li>Add maintenance preview backed by cleanup dry-run</li>
            <li>Layer in refresh controls and action safety rails</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
