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
  const abortedCount = sessions.filter(
    (session) => session.status.abortedLastRun,
  ).length;
  const compactedCount = sessions.filter(
    (session) => session.status.hasCompaction,
  ).length;
  const subagentCount = sessions.filter(
    (session) => session.status.hasSubagent,
  ).length;
  const attentionSessions = sessions.filter(
    (session) =>
      session.status.abortedLastRun ||
      session.status.hasCompaction ||
      session.status.hasSubagent,
  );
  const distinctAgents = new Set(sessions.map((session) => session.agentId ?? "unknown")).size;
  const distinctChannels = new Set(sessions.map((session) => session.channel)).size;
  const highContextSessions = sessions.filter(
    (session) => session.tokens.context >= 200_000,
  ).length;
  const staleTokenSessions = sessions.filter(
    (session) => !session.tokens.fresh,
  ).length;

  const topContextSessions = [...sessions]
    .sort((left, right) => right.tokens.context - left.tokens.context)
    .slice(0, 5);

  const recentAttentionSessions = [...attentionSessions]
    .sort((left, right) => (right.updatedAtMs ?? 0) - (left.updatedAtMs ?? 0))
    .slice(0, 5);

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
    <div className="stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>OpenClaw Inspector</h2>
          <p className="muted">
            Live operational overview for sessions, pressure points, and
            maintenance posture.
          </p>
        </div>
        <div className="badge-row">
          <Link href="/sessions" className="export-link">
            Open sessions explorer
          </Link>
          <Link href="/maintenance" className="export-link">
            Open maintenance preview
          </Link>
        </div>
      </div>

      <section className="card stack">
        <div className="badge-row">
          <span className="badge">Adapter: {health.adapter.label}</span>
          <span className="badge">Sessions: {totalSessions}</span>
          <span className="badge">Agents: {distinctAgents}</span>
          <span className="badge">Channels: {distinctChannels}</span>
          {health.adapter.stubbed ? (
            <span className="badge warn">Stubbed fallback</span>
          ) : (
            <span className="badge good">Live local data</span>
          )}
          <span className="badge">Read-only</span>
        </div>
        <p className="muted">
          Health is {health.checks[0]?.status ?? "unknown"}. This dashboard now
          combines live session data with maintenance dry-run results so the
          first screen already tells you what deserves attention.
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
        <section className="card stack">
          <p className="eyebrow">Needs attention</p>
          <div className="metric">{attentionSessions.length}</div>
          <p className="muted">
            Sessions flagged by aborted / compacted / subagent activity.
          </p>
        </section>
        <section className="card stack">
          <p className="eyebrow">High context</p>
          <div className="metric">{highContextSessions}</div>
          <p className="muted">
            Sessions at or above 200k context tokens.
          </p>
        </section>
        <section className="card stack">
          <p className="eyebrow">Maintenance risk</p>
          <div className="metric">
            {maintenance.data ? maintenance.data.totals.wouldMutateStores : "n/a"}
          </div>
          <p className="muted">
            Stores that would change if cleanup were enforced.
          </p>
        </section>
      </div>

      <div className="grid cols-3">
        <section className="card stack">
          <p className="eyebrow">Aborted</p>
          <div className="metric">{abortedCount}</div>
          <p className="muted">Best first stop for failure forensics.</p>
        </section>
        <section className="card stack">
          <p className="eyebrow">Compacted</p>
          <div className="metric">{compactedCount}</div>
          <p className="muted">Good candidates for context-loss inspection.</p>
        </section>
        <section className="card stack">
          <p className="eyebrow">Stale token stats</p>
          <div className="metric">{staleTokenSessions}</div>
          <p className="muted">Sessions where token totals are not currently fresh.</p>
        </section>
      </div>

      <div className="grid cols-2">
        <section className="card stack">
          <div>
            <p className="eyebrow">Attention radar</p>
            <h3>Jump directly into the problem buckets</h3>
          </div>
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
            These links turn the dashboard into a launchpad instead of just a
            status wall.
          </p>
        </section>

        <section className="card stack">
          <div>
            <p className="eyebrow">Maintenance pulse</p>
            <h3>Dry-run summary</h3>
          </div>
          {maintenance.data ? (
            <div className="grid cols-2">
              <div className="stats-tile">
                <span className="muted">Stores</span>
                <strong>{maintenance.data.totals.stores}</strong>
              </div>
              <div className="stats-tile">
                <span className="muted">Before → after</span>
                <strong>
                  {maintenance.data.totals.beforeCount} → {maintenance.data.totals.afterCount}
                </strong>
              </div>
              <div className="stats-tile">
                <span className="muted">Pruned</span>
                <strong>{maintenance.data.totals.pruned}</strong>
              </div>
              <div className="stats-tile">
                <span className="muted">Capped</span>
                <strong>{maintenance.data.totals.capped}</strong>
              </div>
            </div>
          ) : (
            <p className="muted">
              Maintenance dry-run is unavailable right now.
            </p>
          )}
        </section>
      </div>

      <div className="grid cols-2">
        <section className="card stack">
          <div>
            <p className="eyebrow">Largest context sessions</p>
            <h3>Pressure points</h3>
          </div>
          {topContextSessions.length === 0 ? (
            <p className="muted">No session data available.</p>
          ) : (
            <div className="list">
              {topContextSessions.map((session) => (
                <Link key={session.key} href={session.href} className="stats-row">
                  <span>
                    <strong>{session.displayName}</strong>
                    <br />
                    <span className="muted mono">{session.key}</span>
                  </span>
                  <strong>{formatTokenCount(session.tokens.context)}</strong>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card stack">
          <div>
            <p className="eyebrow">Recent notable sessions</p>
            <h3>What probably deserves a click</h3>
          </div>
          {recentAttentionSessions.length === 0 ? (
            <p className="muted">No notable sessions right now.</p>
          ) : (
            <div className="list">
              {recentAttentionSessions.map((session) => (
                <Link key={session.key} href={session.href} className="stats-row">
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

      <div className="grid cols-2">
        <section className="card stack">
          <div>
            <p className="eyebrow">Channel mix</p>
            <h3>Where the sessions live</h3>
          </div>
          {channelCounts.length === 0 ? (
            <p className="muted">No channel data available.</p>
          ) : (
            <div className="list">
              {channelCounts.slice(0, 6).map(([channel, count]) => (
                <Link key={channel} href={`/sessions?channel=${encodeURIComponent(channel)}`} className="stats-row">
                  <span>{channel}</span>
                  <strong>{count}</strong>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card stack">
          <div>
            <p className="eyebrow">Kind mix</p>
            <h3>What kinds of sessions dominate</h3>
          </div>
          {kindCounts.length === 0 ? (
            <p className="muted">No kind data available.</p>
          ) : (
            <div className="list">
              {kindCounts.map(([kind, count]) => (
                <Link key={kind} href={`/sessions?kind=${encodeURIComponent(kind)}`} className="stats-row">
                  <span>{kind}</span>
                  <strong>{count}</strong>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
