import Link from "next/link";

import { getMaintenancePreviewResponse } from "../lib/maintenance-adapter";
import { formatTokenCount } from "../lib/normalizers";
import { getHealthResponse, listSessions } from "../lib/session-adapter";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [health, sessions, maintenance] = await Promise.all([
    getHealthResponse(),
    listSessions(),
    getMaintenancePreviewResponse(),
  ]);

  const totalSessions = sessions.length;
  const abortedCount = sessions.filter((session) => session.status.abortedLastRun).length;
  const compactedCount = sessions.filter((session) => session.status.hasCompaction).length;
  const subagentCount = sessions.filter((session) => session.status.hasSubagent).length;
  const attentionSessions = sessions.filter(
    (session) =>
      session.status.abortedLastRun ||
      session.status.hasCompaction ||
      session.status.hasSubagent,
  );
  const distinctAgents = new Set(sessions.map((session) => session.agentId ?? "unknown")).size;
  const distinctChannels = new Set(sessions.map((session) => session.channel)).size;
  const highContextSessions = sessions.filter((session) => session.tokens.context >= 200_000).length;
  const staleTokenSessions = sessions.filter((session) => !session.tokens.fresh).length;

  const topContextSessions = [...sessions]
    .sort((left, right) => right.tokens.context - left.tokens.context)
    .slice(0, 4);

  const recentAttentionSessions = [...attentionSessions]
    .sort((left, right) => (right.updatedAtMs ?? 0) - (left.updatedAtMs ?? 0))
    .slice(0, 4);

  const kindCounts = Array.from(
    sessions.reduce((map, session) => {
      map.set(session.kind, (map.get(session.kind) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));

  const channelCounts = Array.from(
    sessions.reduce((map, session) => {
      map.set(session.channel, (map.get(session.channel) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));

  return (
    <div className="stack dashboard-shell">
      <section className="hero-card hero-card-minimal hero-card-horizontal">
        <div className="hero-main stack">
          <p className="eyebrow">OpenClaw Inspector</p>
          <h2 className="hero-title">
            A cleaner control plane for sessions, traces, and maintenance.
          </h2>
          <p className="hero-subtitle muted">
            Live local OpenClaw data, shaped into a calmer dashboard you can
            actually scan in seconds.
          </p>
        </div>

        <div className="hero-side stack">
          <div className="hero-inline-stats hero-inline-stats-grid">
            <div className="hero-inline-stat">
              <strong>{totalSessions}</strong>
              <span className="muted">sessions</span>
            </div>
            <div className="hero-inline-stat">
              <strong>{distinctAgents}</strong>
              <span className="muted">agents</span>
            </div>
            <div className="hero-inline-stat">
              <strong>{distinctChannels}</strong>
              <span className="muted">channels</span>
            </div>
            <div className="hero-inline-stat">
              <strong>{attentionSessions.length}</strong>
              <span className="muted">need attention</span>
            </div>
          </div>

          <div className="hero-actions badge-row">
            <Link href="/sessions" className="primary-action">
              Explore sessions
            </Link>
            <Link href="/maintenance" className="secondary-action">
              Maintenance preview
            </Link>
          </div>
        </div>
      </section>

      <section className="card glass-panel stack">
        <div className="badge-row">
          <span className="badge">Adapter: {health.adapter.label}</span>
          <span className="badge">Mode: {health.adapter.mode}</span>
          {health.adapter.stubbed ? (
            <span className="badge warn">Stubbed fallback</span>
          ) : (
            <span className="badge good">Live local data</span>
          )}
          <span className="badge">Read-only</span>
        </div>
        <p className="muted dashboard-note">
          {health.warnings.length > 0
            ? "Inspector is available, but some sources fell back."
            : "Inspector is healthy and reading live local OpenClaw data."}
        </p>
      </section>

      <section className="dashboard-section stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Operational pulse</p>
            <h3>What needs your attention right now</h3>
          </div>
        </div>

        <div className="grid cols-3">
          <Link href="/sessions?state=attention" className="metric-card attention interactive-card">
            <p className="eyebrow">Needs attention</p>
            <div className="metric large">{attentionSessions.length}</div>
            <p className="muted">
              Click to see all aborted, compacted, or subagent-heavy sessions.
            </p>
          </Link>
          <section className="metric-card calm">
            <p className="eyebrow">High context</p>
            <div className="metric large">{highContextSessions}</div>
            <p className="muted">
              Sessions at or above 200k context tokens.
            </p>
          </section>
          <Link href="/maintenance" className="metric-card warm interactive-card">
            <p className="eyebrow">Maintenance risk</p>
            <div className="metric large">
              {maintenance.data ? maintenance.data.totals.wouldMutateStores : "n/a"}
            </div>
            <p className="muted">
              Click to inspect stores that would change if cleanup were enforced.
            </p>
          </Link>
        </div>
      </section>

      <section className="dashboard-section stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Quick actions</p>
            <h3>Jump straight into the interesting slices</h3>
          </div>
        </div>

        <div className="grid cols-2">
          <section className="card stack surface-soft">
            <div className="badge-row">
              <Link href="/sessions?state=aborted" className="export-link">
                Aborted ({abortedCount})
              </Link>
              <Link href="/sessions?state=compacted" className="export-link">
                Compacted ({compactedCount})
              </Link>
              <Link href="/sessions?state=subagent" className="export-link">
                Subagent ({subagentCount})
              </Link>
              <Link href="/sessions?q=discord" className="export-link">
                Discord sessions
              </Link>
            </div>
            <p className="muted">
              Use the dashboard as a launchpad, not just a wall of numbers.
            </p>
          </section>

          <section className="card stack surface-soft">
            <div className="grid cols-2">
              <div className="stats-tile soft-contrast">
                <span className="muted">Aborted</span>
                <strong>{abortedCount}</strong>
              </div>
              <div className="stats-tile soft-contrast">
                <span className="muted">Compacted</span>
                <strong>{compactedCount}</strong>
              </div>
              <div className="stats-tile soft-contrast">
                <span className="muted">Subagent</span>
                <strong>{subagentCount}</strong>
              </div>
              <div className="stats-tile soft-contrast">
                <span className="muted">Stale tokens</span>
                <strong>{staleTokenSessions}</strong>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="dashboard-section stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Session pressure</p>
            <h3>Largest context sessions</h3>
          </div>
        </div>

        <div className="grid cols-2">
          <section className="card stack surface-soft">
            {topContextSessions.length === 0 ? (
              <p className="muted">No session data available.</p>
            ) : (
              <div className="list">
                {topContextSessions.map((session, index) => (
                  <Link key={session.key} href={session.href} className="stats-row elevated-row">
                    <span>
                      <strong>{index + 1}. {session.displayName}</strong>
                      <br />
                      <span className="muted mono">{session.key}</span>
                    </span>
                    <strong>{formatTokenCount(session.tokens.context)}</strong>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="card stack surface-soft">
            {recentAttentionSessions.length === 0 ? (
              <p className="muted">No notable sessions right now.</p>
            ) : (
              <div className="list">
                {recentAttentionSessions.map((session) => (
                  <Link key={session.key} href={session.href} className="stats-row elevated-row">
                    <span>
                      <strong>{session.displayName}</strong>
                      <br />
                      <span className="muted">{session.updatedAt}</span>
                    </span>
                    <span className="badge-row">
                      {session.status.abortedLastRun ? <span className="badge bad">aborted</span> : null}
                      {session.status.hasCompaction ? <span className="badge warn">compacted</span> : null}
                      {session.status.hasSubagent ? <span className="badge good">subagent</span> : null}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="dashboard-section stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Distribution</p>
            <h3>Channel and session mix</h3>
          </div>
        </div>

        <div className="grid cols-2">
          <section className="card stack surface-soft">
            <p className="eyebrow">Channel mix</p>
            {channelCounts.length === 0 ? (
              <p className="muted">No channel data available.</p>
            ) : (
              <div className="list">
                {channelCounts.slice(0, 6).map(([channel, count]) => (
                  <Link
                    key={channel}
                    href={`/sessions?channel=${encodeURIComponent(channel)}`}
                    className="stats-row elevated-row"
                  >
                    <span>{channel}</span>
                    <strong>{count}</strong>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="card stack surface-soft">
            <p className="eyebrow">Kind mix</p>
            {kindCounts.length === 0 ? (
              <p className="muted">No kind data available.</p>
            ) : (
              <div className="list">
                {kindCounts.map(([kind, count]) => (
                  <Link
                    key={kind}
                    href={`/sessions?kind=${encodeURIComponent(kind)}`}
                    className="stats-row elevated-row"
                  >
                    <span>{kind}</span>
                    <strong>{count}</strong>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="dashboard-section stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Maintenance pulse</p>
            <h3>Dry-run snapshot</h3>
          </div>
        </div>

        <section className="card surface-soft stack">
          {maintenance.data ? (
            <div className="grid cols-4 responsive-grid">
              <div className="stats-tile soft-contrast">
                <span className="muted">Stores</span>
                <strong>{maintenance.data.totals.stores}</strong>
              </div>
              <div className="stats-tile soft-contrast">
                <span className="muted">Before → after</span>
                <strong>
                  {maintenance.data.totals.beforeCount} → {maintenance.data.totals.afterCount}
                </strong>
              </div>
              <div className="stats-tile soft-contrast">
                <span className="muted">Pruned</span>
                <strong>{maintenance.data.totals.pruned}</strong>
              </div>
              <div className="stats-tile soft-contrast">
                <span className="muted">Capped</span>
                <strong>{maintenance.data.totals.capped}</strong>
              </div>
            </div>
          ) : (
            <p className="muted">Maintenance dry-run is unavailable right now.</p>
          )}
        </section>
      </section>
    </div>
  );
}
