import Link from "next/link";
import type { ReactNode } from "react";

import { getMaintenancePreviewResponse } from "../lib/maintenance-adapter";
import { formatTokenCount } from "../lib/normalizers";
import { getHealthResponse, listSessions } from "../lib/session-adapter";
import {
  ActivityIcon,
  ArrowRightIcon,
  ChartBarIcon,
  DashboardIcon,
  DatabaseIcon,
  MaintenanceIcon,
  SessionsIcon,
  SparklesIcon,
} from "../components/ui-icons";

export const dynamic = "force-dynamic";

type ChartTone = "teal" | "violet" | "amber" | "rose" | "blue";
type ChartEntry = {
  label: string;
  value: number;
  href?: string;
  tone?: ChartTone;
  caption?: string;
};

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
  const freshTokenSessions = Math.max(0, totalSessions - staleTokenSessions);

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

  const channelChartEntries: ChartEntry[] = channelCounts.slice(0, 6).map(([channel, count]) => ({
    label: channel,
    value: count,
    href: `/sessions?channel=${encodeURIComponent(channel)}`,
    tone: "blue",
  }));

  const kindChartEntries: ChartEntry[] = kindCounts.slice(0, 6).map(([kind, count]) => ({
    label: kind,
    value: count,
    href: `/sessions?kind=${encodeURIComponent(kind)}`,
    tone: "violet",
  }));

  const attentionChartEntries: ChartEntry[] = [
    { label: "Aborted", value: abortedCount, href: "/sessions?state=aborted", tone: "rose" },
    { label: "Compacted", value: compactedCount, href: "/sessions?state=compacted", tone: "amber" },
    { label: "Subagent", value: subagentCount, href: "/sessions?state=subagent", tone: "teal" },
  ];

  const maintenanceEntries: ChartEntry[] = maintenance.data
    ? [
        {
          label: "Before cleanup",
          value: maintenance.data.totals.beforeCount,
          tone: "violet",
          caption: "Total store entries before dry-run rules.",
        },
        {
          label: "After cleanup",
          value: maintenance.data.totals.afterCount,
          tone: "teal",
          caption: "Projected count after pruning and caps.",
        },
      ]
    : [];

  const maintenanceReduction = maintenance.data
    ? Math.max(
        0,
        Math.round(
          ((maintenance.data.totals.beforeCount - maintenance.data.totals.afterCount) /
            Math.max(maintenance.data.totals.beforeCount, 1)) *
            100,
        ),
      )
    : null;

  return (
    <div className="stack dashboard-shell">
      <section className="hero-card hero-card-minimal hero-card-stacked">
        <div className="hero-main stack">
          <p className="eyebrow">OpenClaw Inspector</p>
          <h2 className="hero-title">
            A cleaner control plane for sessions, traces, maintenance, and live analysis.
          </h2>
          <p className="hero-subtitle muted">
            Live local OpenClaw data, shaped into a calmer dashboard you can
            actually scan in seconds.
          </p>
        </div>

        <div className="hero-footer-row">
          <div className="hero-actions badge-row">
            <Link href="/sessions" className="primary-action">
              <SessionsIcon className="icon icon-sm" />
              Explore sessions
              <ArrowRightIcon className="icon icon-sm" />
            </Link>
            <Link href="/maintenance" className="secondary-action">
              <MaintenanceIcon className="icon icon-sm" />
              Maintenance preview
            </Link>
          </div>

          <div className="hero-inline-stats hero-inline-stats-inline">
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
          <SectionHeadingBlock
            icon={<ActivityIcon className="icon icon-lg" />}
            eyebrow="Operational pulse"
            title="What needs your attention right now"
          />
        </div>

        <div className="grid cols-3">
          <Link href="/sessions?state=attention" className="metric-card attention interactive-card metric-card-with-icon">
            <div className="metric-card-header">
              <span className="metric-icon-badge tone-rose">
                <ActivityIcon className="icon" />
              </span>
              <p className="eyebrow">Needs attention</p>
            </div>
            <div className="metric large">{attentionSessions.length}</div>
            <p className="muted">
              Click to see all aborted, compacted, or subagent-heavy sessions.
            </p>
          </Link>
          <section className="metric-card calm metric-card-with-icon">
            <div className="metric-card-header">
              <span className="metric-icon-badge tone-blue">
                <DatabaseIcon className="icon" />
              </span>
              <p className="eyebrow">High context</p>
            </div>
            <div className="metric large">{highContextSessions}</div>
            <p className="muted">Sessions at or above 200k context tokens.</p>
          </section>
          <Link href="/maintenance" className="metric-card warm interactive-card metric-card-with-icon">
            <div className="metric-card-header">
              <span className="metric-icon-badge tone-amber">
                <MaintenanceIcon className="icon" />
              </span>
              <p className="eyebrow">Maintenance risk</p>
            </div>
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
          <SectionHeadingBlock
            icon={<SparklesIcon className="icon icon-lg" />}
            eyebrow="Quick actions"
            title="Jump straight into the interesting slices"
          />
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
          <SectionHeadingBlock
            icon={<ChartBarIcon className="icon icon-lg" />}
            eyebrow="Analysis snapshots"
            title="Small charts for distribution and pressure"
          />
        </div>

        <div className="grid cols-3">
          <BarChartCard
            eyebrow="Channel mix"
            title="Where sessions are coming from"
            description="Top channels by normalized session count."
            icon={<SessionsIcon className="icon" />}
            entries={channelChartEntries}
            emptyLabel="No channel data available."
          />
          <BarChartCard
            eyebrow="Kind mix"
            title="How work is being scheduled"
            description="Kinds are exclusive, so this chart shows the true mix."
            icon={<DashboardIcon className="icon" />}
            entries={kindChartEntries}
            emptyLabel="No kind data available."
          />
          <BarChartCard
            eyebrow="Attention signals"
            title="What is creating pressure"
            description="Signals can overlap on the same session, so treat this as pressure sources, not a 100% split."
            icon={<ActivityIcon className="icon" />}
            entries={attentionChartEntries}
            emptyLabel="No pressure signals right now."
          />
        </div>
      </section>

      <section className="dashboard-section stack">
        <div className="section-heading">
          <SectionHeadingBlock
            icon={<DatabaseIcon className="icon icon-lg" />}
            eyebrow="Session pressure"
            title="Largest context sessions"
          />
        </div>

        <div className="grid cols-2">
          <section className="card stack surface-soft">
            {topContextSessions.length === 0 ? (
              <p className="muted">No session data available.</p>
            ) : (
              <div className="list pressure-list">
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
              <div className="list pressure-list">
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
          <SectionHeadingBlock
            icon={<MaintenanceIcon className="icon icon-lg" />}
            eyebrow="Maintenance pulse"
            title="Dry-run snapshot"
          />
        </div>

        {maintenance.data ? (
          <div className="grid cols-2">
            <section className="card surface-soft stack">
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
            </section>

            <BarChartCard
              eyebrow="Volume delta"
              title="Before vs projected after"
              description={
                maintenanceReduction === null
                  ? "Maintenance dry-run is unavailable right now."
                  : `${maintenanceReduction}% projected reduction across all stores.`
              }
              icon={<MaintenanceIcon className="icon" />}
              entries={maintenanceEntries}
              emptyLabel="Maintenance dry-run is unavailable right now."
            />
          </div>
        ) : (
          <section className="card surface-soft stack">
            <p className="muted">Maintenance dry-run is unavailable right now.</p>
          </section>
        )}
      </section>

      <section className="dashboard-section stack">
        <div className="section-heading">
          <SectionHeadingBlock
            icon={<SparklesIcon className="icon icon-lg" />}
            eyebrow="Health ratios"
            title="Freshness and reach at a glance"
          />
        </div>

        <div className="grid cols-3">
          <RatioCard
            eyebrow="Fresh tokens"
            title="Sessions with fresh token info"
            value={freshTokenSessions}
            total={totalSessions}
            tone="teal"
          />
          <RatioCard
            eyebrow="Attention share"
            title="Sessions carrying pressure"
            value={attentionSessions.length}
            total={totalSessions}
            tone="rose"
          />
          <RatioCard
            eyebrow="Channel reach"
            title="Distinct channels represented"
            value={distinctChannels}
            total={Math.max(totalSessions, distinctChannels)}
            tone="blue"
          />
        </div>
      </section>
    </div>
  );
}

function SectionHeadingBlock({
  icon,
  eyebrow,
  title,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="section-heading-main">
      <span className="section-icon">{icon}</span>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
      </div>
    </div>
  );
}

function BarChartCard({
  eyebrow,
  title,
  description,
  icon,
  entries,
  emptyLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  entries: ChartEntry[];
  emptyLabel: string;
}) {
  const maxValue = Math.max(1, ...entries.map((entry) => entry.value));

  return (
    <section className="card stack surface-soft chart-card">
      <div className="chart-card-header">
        <span className="chart-icon-badge">{icon}</span>
        <div className="stack compact-gap">
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
          <p className="muted">{description}</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="muted">{emptyLabel}</p>
      ) : (
        <div className="chart-list">
          {entries.map((entry) => {
            const width = `${(entry.value / maxValue) * 100}%`;
            const row = (
              <>
                <div className="chart-row-top">
                  <span className="chart-label">{entry.label}</span>
                  <strong className="chart-value">{entry.value}</strong>
                </div>
                <div className="chart-track">
                  <span
                    className={`chart-fill tone-${entry.tone ?? "teal"}`}
                    style={{ width }}
                  />
                </div>
                {entry.caption ? <span className="chart-caption">{entry.caption}</span> : null}
              </>
            );

            return entry.href ? (
              <Link key={`${entry.label}-${entry.href}`} href={entry.href} className="chart-row chart-row-link">
                {row}
              </Link>
            ) : (
              <div key={entry.label} className="chart-row">
                {row}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RatioCard({
  eyebrow,
  title,
  value,
  total,
  tone,
}: {
  eyebrow: string;
  title: string;
  value: number;
  total: number;
  tone: ChartTone;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <section className="card stack surface-soft ratio-card">
      <div className="stack compact-gap">
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
      </div>

      <div className="ratio-value-row">
        <strong className="ratio-value">{percent}%</strong>
        <span className="muted">
          {value} / {total}
        </span>
      </div>

      <div className="chart-track ratio-track">
        <span className={`chart-fill tone-${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </section>
  );
}
