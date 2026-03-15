import type { ReactNode } from "react";

import {
  getMaintenancePreviewResponse,
  type MaintenancePreviewData,
  type MaintenanceStorePreview,
} from "../../lib/maintenance-adapter";
import {
  ActivityIcon,
  AlertTriangleIcon,
  ChartBarIcon,
  DatabaseIcon,
  MaintenanceIcon,
  MonitorIcon,
  ShieldIcon,
} from "../../components/ui-icons";

export const dynamic = "force-dynamic";

type ChartTone = "teal" | "violet" | "amber" | "rose" | "blue";

type ChartEntry = {
  label: string;
  value: number;
  caption?: string;
  tone?: ChartTone;
};

export default async function MaintenancePage() {
  const { data, meta } = await getMaintenancePreviewResponse();

  if (!data) {
    return (
      <div className="stack dashboard-shell">
        <div className="page-title">
          <div className="title-with-icon">
            <span className="page-icon-badge">
              <MaintenanceIcon className="icon icon-lg" />
            </span>
            <div>
              <p className="eyebrow">Maintenance</p>
              <h2>Session store health dashboard</h2>
              <p className="muted">
                Read-only maintenance preview powered by the local OpenClaw cleanup dry-run command.
              </p>
            </div>
          </div>
          <span className="badge bad">Preview unavailable</span>
        </div>

        <section className="card stack surface-soft">
          <div className="badge-row">
            <span className="badge">Mode: {meta.adapter.mode}</span>
            <span className="badge">Read-only</span>
            <span className="badge">Route: GET /api/maintenance/preview</span>
          </div>
          <div className="stack compact-gap">
            <p className="eyebrow">Preview status</p>
            <h3>Maintenance preview is not available right now</h3>
            <p className="muted">
              The app could not load <code>openclaw sessions cleanup --all-agents --dry-run --json</code>.
            </p>
          </div>
          {meta.warnings?.length ? (
            <ul className="muted">
              {meta.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    );
  }

  const status = deriveMaintenanceStatus(data);
  const healthyStores = data.stores.filter((store) => !hasStoreIssues(store)).length;
  const impactedStores = data.stores.filter((store) => store.wouldMutate).length;
  const totalProjectedActions = data.totals.pruned + data.totals.capped + data.totals.missing;
  const retainedEntries = data.totals.afterCount;
  const changedEntries = Math.max(data.totals.beforeCount - data.totals.afterCount, 0);
  const integrityHealthyStores = data.stores.filter((store) => store.missing === 0).length;

  const storeStatusEntries: ChartEntry[] = [
    { label: "Healthy stores", value: healthyStores, tone: "teal" },
    { label: "Would mutate", value: impactedStores, tone: "amber" },
    {
      label: "Integrity issues",
      value: data.stores.filter((store) => store.missing > 0).length,
      tone: "rose",
    },
  ];

  const actionMixEntries: ChartEntry[] = [
    { label: "Retained entries", value: retainedEntries, tone: "teal" },
    { label: "Pruned", value: data.totals.pruned, tone: "amber" },
    { label: "Capped", value: data.totals.capped, tone: "violet" },
    { label: "Missing refs", value: data.totals.missing, tone: "rose" },
  ];

  const footprintEntries = data.stores
    .slice()
    .sort((left, right) => right.beforeCount - left.beforeCount)
    .slice(0, 6)
    .map((store) => ({
      label: store.agentId,
      value: store.beforeCount,
      caption: `${store.afterCount} retained after dry-run`,
      tone: store.wouldMutate ? ("amber" as const) : ("blue" as const),
    }));

  const pressureEntries = data.stores
    .map((store) => {
      const projected = projectedStoreActions(store);
      return {
        label: store.agentId,
        value: projected,
        caption:
          projected > 0
            ? `${store.pruned} pruned · ${store.capped} capped · ${store.missing} missing`
            : "No cleanup action projected",
        tone: store.missing > 0 ? ("rose" as const) : store.wouldMutate ? ("amber" as const) : ("teal" as const),
      };
    })
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
    .slice(0, 6);

  return (
    <div className="stack dashboard-shell">
      <div className="page-title">
        <div className="title-with-icon">
          <span className="page-icon-badge">
            <MaintenanceIcon className="icon icon-lg" />
          </span>
          <div>
            <p className="eyebrow">Maintenance</p>
            <h2>Session store health dashboard</h2>
            <p className="muted">
              Read-only cleanup analytics for local OpenClaw stores, driven by the maintenance dry-run command.
            </p>
          </div>
        </div>
        <span className={`badge ${status.badgeClass}`}>{status.badgeLabel}</span>
      </div>

      <section className="card glass-panel stack">
        <div className="badge-row">
          <span className="badge">Mode: {meta.adapter.mode}</span>
          <span className="badge">Read-only</span>
          <span className="badge">All agents</span>
          <span className="badge">Route: GET /api/maintenance/preview</span>
          <span className="badge good">Dry-run only</span>
        </div>

        <div className="grid cols-3">
          <div className="summary-tile accent compact-summary">
            <span className="muted">Health status</span>
            <strong>{status.title}</strong>
            <p className="muted">{status.summary}</p>
          </div>
          <div className="summary-tile compact-summary">
            <span className="muted">Stores scanned</span>
            <strong>{data.totals.stores}</strong>
            <p className="muted">{healthyStores} stores are clean with no projected cleanup work.</p>
          </div>
          <div className="summary-tile warm compact-summary">
            <span className="muted">Projected actions</span>
            <strong>{totalProjectedActions}</strong>
            <p className="muted">
              {impactedStores} stores would mutate if cleanup were enforced right now.
            </p>
          </div>
        </div>
      </section>

      <section className="grid cols-3">
        <RatioCard
          eyebrow="Mutation coverage"
          title="Stores that would change"
          value={impactedStores}
          total={Math.max(data.totals.stores, 1)}
          tone={impactedStores > 0 ? "amber" : "teal"}
        />
        <RatioCard
          eyebrow="Integrity"
          title="Stores with intact transcript refs"
          value={integrityHealthyStores}
          total={Math.max(data.totals.stores, 1)}
          tone={data.totals.missing > 0 ? "rose" : "teal"}
        />
        <RatioCard
          eyebrow="Retention"
          title="Entries retained after dry-run"
          value={retainedEntries}
          total={Math.max(data.totals.beforeCount, 1)}
          tone={changedEntries > 0 ? "blue" : "teal"}
        />
      </section>

      <section className="grid cols-2 dashboard-section">
        <section className="card stack surface-soft chart-card">
          <div className="chart-card-header">
            <span className="chart-icon-badge">
              <ShieldIcon className="icon icon-lg" />
            </span>
            <div className="stack compact-gap">
              <p className="eyebrow">Store status mix</p>
              <h3>Health split across agent stores</h3>
              <p className="muted">
                A quick read on how many stores are clean, would mutate, or have integrity problems.
              </p>
            </div>
          </div>
          <DonutChartPanel totalValue={data.totals.stores} totalLabel="stores" entries={storeStatusEntries} />
        </section>

        <section className="card stack surface-soft chart-card">
          <div className="chart-card-header">
            <span className="chart-icon-badge">
              <ActivityIcon className="icon icon-lg" />
            </span>
            <div className="stack compact-gap">
              <p className="eyebrow">Entry action mix</p>
              <h3>How the cleanup pass would affect entries</h3>
              <p className="muted">
                Retained entries stay in place; the rest indicate projected cleanup pressure.
              </p>
            </div>
          </div>
          <DonutChartPanel totalValue={data.totals.beforeCount} totalLabel="entries" entries={actionMixEntries} />
        </section>
      </section>

      <section className="grid cols-2 dashboard-section">
        <BarChartCard
          eyebrow="Store footprint"
          title="Largest stores by entry count"
          description="Where the session-store volume currently lives."
          icon={<DatabaseIcon className="icon icon-lg" />}
          entries={footprintEntries}
          emptyLabel="No store rows were returned by the dry-run preview."
        />
        <BarChartCard
          eyebrow="Cleanup pressure"
          title="Projected action hotspots"
          description="Agents that would see the most cleanup activity if enforcement were enabled."
          icon={<ChartBarIcon className="icon icon-lg" />}
          entries={pressureEntries}
          emptyLabel="No projected cleanup activity right now."
        />
      </section>

      <section className="card stack surface-soft">
        <div className="detail-panel-header">
          <div>
            <p className="eyebrow">Per-agent breakdown</p>
            <h3>Store-by-store health cards</h3>
            <p className="muted">
              Detailed dry-run output with projected cleanup actions, integrity signals, and store paths.
            </p>
          </div>
          <span className={`badge ${status.badgeClass}`}>{status.panelLabel}</span>
        </div>

        <div className="list store-preview-list">
          {data.stores.map((store) => {
            const projected = projectedStoreActions(store);
            const clean = !hasStoreIssues(store);

            return (
              <article key={store.agentId} className="tool-trace-card polished-trace-card">
                <div className="trace-card-top">
                  <div className="stack compact-gap">
                    <div className="badge-row">
                      <span className="badge">{store.agentId}</span>
                      <span className="badge">mode: {store.mode}</span>
                      <span className="badge">dry-run: {store.dryRun ? "yes" : "no"}</span>
                      {clean ? <span className="badge good">healthy</span> : null}
                      {store.wouldMutate ? <span className="badge warn">would mutate</span> : null}
                      {store.missing > 0 ? <span className="badge bad">missing refs</span> : null}
                    </div>
                    <h3>{store.agentId}</h3>
                    <p className="muted">
                      {clean
                        ? "No cleanup mutations are projected for this store."
                        : `${projected} projected actions across pruning, caps, or missing-reference cleanup.`}
                    </p>
                  </div>

                  <div className="stats-tile compact-summary">
                    <span className="muted">Projected actions</span>
                    <strong>{projected}</strong>
                  </div>
                </div>

                <div className="trace-meta-grid">
                  <div className="trace-pane polished-pane">
                    <span className="muted">Entries</span>
                    <strong>{store.beforeCount}</strong>
                    <p className="muted">Before dry-run</p>
                  </div>
                  <div className="trace-pane polished-pane">
                    <span className="muted">Retained</span>
                    <strong>{store.afterCount}</strong>
                    <p className="muted">Would remain after cleanup</p>
                  </div>
                  <div className="trace-pane polished-pane">
                    <span className="muted">Delta</span>
                    <strong>{Math.max(store.beforeCount - store.afterCount, 0)}</strong>
                    <p className="muted">Projected removal count</p>
                  </div>
                </div>

                <div className="kv compact-kv">
                  <span className="muted">Store path</span>
                  <span className="mono">{store.storePath}</span>
                  <span className="muted">Pruned</span>
                  <span>{store.pruned}</span>
                  <span className="muted">Capped</span>
                  <span>{store.capped}</span>
                  <span className="muted">Missing</span>
                  <span>{store.missing}</span>
                  <span className="muted">Disk budget</span>
                  <span>{store.diskBudget ?? "n/a"}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card stack surface-soft">
        <div className="detail-panel-header">
          <div>
            <p className="eyebrow">Advanced details</p>
            <h3>Adapter, command, and diagnostics</h3>
          </div>
          <span className="badge">Read-only plumbing</span>
        </div>

        <div className="grid cols-2">
          <article className="card stack soft-contrast">
            <div className="metric-card-header">
              <span className="metric-icon-badge tone-blue">
                <MonitorIcon className="icon" />
              </span>
              <div>
                <p className="eyebrow">Adapter</p>
                <h3>{meta.adapter.label}</h3>
              </div>
            </div>
            <p className="muted">{meta.note}</p>
            <div className="kv compact-kv">
              <span className="muted">Mode</span>
              <span>{meta.adapter.mode}</span>
              <span className="muted">Source</span>
              <span>{meta.adapter.source}</span>
              <span className="muted">Local only</span>
              <span>{meta.adapter.localOnly ? "yes" : "no"}</span>
            </div>
          </article>

          <article className="card stack soft-contrast">
            <div className="metric-card-header">
              <span className="metric-icon-badge tone-amber">
                <AlertTriangleIcon className="icon" />
              </span>
              <div>
                <p className="eyebrow">Command surface</p>
                <h3>Cleanup dry-run only</h3>
              </div>
            </div>
            <div className="kv compact-kv">
              <span className="muted">Command</span>
              <span className="mono">openclaw sessions cleanup --all-agents --dry-run --json</span>
              <span className="muted">API route</span>
              <span className="mono">GET /api/maintenance/preview</span>
              <span className="muted">Writes</span>
              <span>Disabled</span>
            </div>
            {meta.warnings?.length ? (
              <ul className="muted">
                {meta.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No adapter warnings surfaced on this read.</p>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}

function deriveMaintenanceStatus(data: MaintenancePreviewData) {
  const impactedStores = data.stores.filter((store) => store.wouldMutate).length;
  const storesWithMissing = data.stores.filter((store) => store.missing > 0).length;
  const totalProjectedActions = data.totals.pruned + data.totals.capped + data.totals.missing;

  if (storesWithMissing > 0) {
    return {
      title: "Integrity attention",
      summary: `${storesWithMissing} stores have missing transcript references. Dry-run surfaced ${totalProjectedActions} projected cleanup actions.`,
      badgeLabel: "Integrity issues",
      panelLabel: "Attention needed",
      badgeClass: "bad",
    };
  }

  if (impactedStores > 0 || totalProjectedActions > 0) {
    return {
      title: "Cleanup pending",
      summary: `${impactedStores} stores would mutate if cleanup were enforced. Projected actions mainly come from retention or cap pressure.`,
      badgeLabel: "Cleanup pending",
      panelLabel: "Would mutate",
      badgeClass: "warn",
    };
  }

  return {
    title: "Healthy",
    summary: "All scanned stores look clean. Dry-run found no pending mutations, no missing refs, and no retention pressure.",
    badgeLabel: "Healthy",
    panelLabel: "All clear",
    badgeClass: "good",
  };
}

function hasStoreIssues(store: MaintenanceStorePreview) {
  return store.wouldMutate || store.missing > 0 || store.pruned > 0 || store.capped > 0;
}

function projectedStoreActions(store: MaintenanceStorePreview) {
  return store.pruned + store.capped + store.missing;
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

            return (
              <div key={`${entry.label}-${entry.value}`} className="chart-row">
                <div className="chart-row-top">
                  <span className="chart-label">{entry.label}</span>
                  <strong className="chart-value">{entry.value}</strong>
                </div>
                <div className="chart-track">
                  <span className={`chart-fill tone-${entry.tone ?? "teal"}`} style={{ width }} />
                </div>
                {entry.caption ? <span className="chart-caption">{entry.caption}</span> : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DonutChartPanel({
  totalValue,
  totalLabel,
  entries,
}: {
  totalValue: number;
  totalLabel: string;
  entries: ChartEntry[];
}) {
  const positiveEntries = entries.filter((entry) => entry.value > 0);
  const safeEntries =
    positiveEntries.length > 0
      ? positiveEntries
      : [{ label: "No data", value: 1, tone: "blue" as const }];
  const total = Math.max(
    safeEntries.reduce((sum, entry) => sum + entry.value, 0),
    1,
  );
  const gradient = buildDonutGradient(safeEntries, total);

  return (
    <div className="stack donut-panel">
      <div className="donut-layout">
        <div className="donut-visual-shell">
          <div className="donut-ring" style={{ backgroundImage: gradient }}>
            <div className="donut-hole">
              <strong>{totalValue.toLocaleString()}</strong>
              <span className="muted">{totalLabel}</span>
            </div>
          </div>
        </div>

        <div className="donut-legend">
          {safeEntries.map((entry) => {
            const percent = Math.round((entry.value / total) * 100);

            return (
              <div key={`${entry.label}-${entry.value}`} className="donut-legend-row">
                <span className="donut-legend-main">
                  <span className={`legend-dot tone-${entry.tone ?? "teal"}`} />
                  <span>{entry.label}</span>
                </span>
                <span className="donut-legend-metric">
                  <strong>{entry.value}</strong>
                  <span className="muted">{percent}%</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function buildDonutGradient(entries: ChartEntry[], total: number): string {
  const stops: string[] = [];
  let currentPercent = 0;

  for (const entry of entries) {
    const slicePercent = (entry.value / total) * 100;
    const nextPercent = currentPercent + slicePercent;
    const color = donutColor(entry.tone ?? "teal");
    stops.push(`${color} ${currentPercent}% ${nextPercent}%`);
    currentPercent = nextPercent;
  }

  return `conic-gradient(${stops.join(", ")})`;
}

function donutColor(tone: ChartTone): string {
  if (tone === "violet") return "#8b5cf6";
  if (tone === "amber") return "#f59e0b";
  if (tone === "rose") return "#f43f5e";
  if (tone === "blue") return "#3b82f6";
  return "#14b8a6";
}
