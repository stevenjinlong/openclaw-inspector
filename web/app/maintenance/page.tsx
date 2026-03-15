import { getMaintenancePreviewResponse } from "../../lib/maintenance-adapter";
import { MaintenanceIcon } from "../../components/ui-icons";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const { data, meta } = await getMaintenancePreviewResponse();

  return (
    <div className="stack dashboard-shell">
      <div className="page-title">
        <div className="title-with-icon">
          <span className="page-icon-badge">
            <MaintenanceIcon className="icon icon-lg" />
          </span>
          <div>
            <p className="eyebrow">Maintenance</p>
            <h2>Cleanup preview and store health</h2>
            <p className="muted">
              Read-only maintenance preview powered by the local OpenClaw cleanup
              dry-run command.
            </p>
          </div>
        </div>
        <span className="badge">{meta.adapter.label}</span>
      </div>

      <section className="card glass-panel stack">
        <div className="badge-row">
          <span className="badge">Mode: {meta.adapter.mode}</span>
          <span className="badge">Read-only</span>
          <span className="badge">Route: GET /api/maintenance/preview</span>
          {data ? (
            <span className="badge good">Dry-run available</span>
          ) : (
            <span className="badge bad">Preview unavailable</span>
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

      {!data ? (
        <section className="card stack surface-soft">
          <p className="eyebrow">Preview status</p>
          <h3>Maintenance preview is not available right now</h3>
          <p className="muted">
            The app could not load `openclaw sessions cleanup --all-agents --dry-run --json`.
          </p>
        </section>
      ) : (
        <>
          <section className="grid cols-3">
            <article className="metric-card calm">
              <p className="eyebrow">Stores</p>
              <div className="metric large">{data.totals.stores}</div>
              <p className="muted">Agent session stores included in the preview.</p>
            </article>
            <article className="metric-card warm">
              <p className="eyebrow">Before → after</p>
              <div className="metric large">{data.totals.beforeCount} → {data.totals.afterCount}</div>
              <p className="muted">Session entry counts across all stores.</p>
            </article>
            <article className="metric-card attention">
              <p className="eyebrow">Would mutate</p>
              <div className="metric large">{data.totals.wouldMutateStores}</div>
              <p className="muted">Stores that would change if cleanup were enforced.</p>
            </article>
          </section>

          <section className="grid cols-3">
            <article className="card stack surface-soft">
              <p className="eyebrow">Pruned</p>
              <div className="metric">{data.totals.pruned}</div>
              <p className="muted">Entries that would be pruned.</p>
            </article>
            <article className="card stack surface-soft">
              <p className="eyebrow">Capped</p>
              <div className="metric">{data.totals.capped}</div>
              <p className="muted">Entries that would be removed due to max entry limits.</p>
            </article>
            <article className="card stack surface-soft">
              <p className="eyebrow">Missing</p>
              <div className="metric">{data.totals.missing}</div>
              <p className="muted">Missing transcript/store references observed by cleanup.</p>
            </article>
          </section>

          <section className="card stack surface-soft">
            <div>
              <p className="eyebrow">Store preview</p>
              <h3>Per-agent dry-run breakdown</h3>
            </div>
            <div className="list store-preview-list">
              {data.stores.map((store) => (
                <article key={store.agentId} className="tool-trace-card">
                  <div className="badge-row">
                    <span className="badge">{store.agentId}</span>
                    <span className="badge">mode: {store.mode}</span>
                    <span className="badge">dry-run: {store.dryRun ? "yes" : "no"}</span>
                    {store.wouldMutate ? (
                      <span className="badge warn">would mutate</span>
                    ) : (
                      <span className="badge good">no mutation</span>
                    )}
                  </div>

                  <div className="kv compact-kv">
                    <span className="muted">Store path</span>
                    <span className="mono">{store.storePath}</span>
                    <span className="muted">Before</span>
                    <span>{store.beforeCount}</span>
                    <span className="muted">After</span>
                    <span>{store.afterCount}</span>
                    <span className="muted">Pruned</span>
                    <span>{store.pruned}</span>
                    <span className="muted">Capped</span>
                    <span>{store.capped}</span>
                    <span className="muted">Missing</span>
                    <span>{store.missing}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
