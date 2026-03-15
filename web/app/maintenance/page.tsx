export const dynamic = "force-dynamic";

export default function MaintenancePage() {
  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Maintenance</p>
          <h2>Cleanup preview and store health</h2>
          <p className="muted">
            This page is reserved for session-store counts, stale session
            surfacing, transcript footprint, and cleanup dry-run previews.
          </p>
        </div>
        <span className="badge">Planned for v0.2+</span>
      </div>

      <section className="grid cols-2">
        <article className="card stack">
          <p className="eyebrow">Planned signals</p>
          <ul className="muted">
            <li>Total sessions / stale sessions</li>
            <li>sessions.json size and archive footprint</li>
            <li>Cleanup dry-run before/after counts</li>
            <li>Candidate sessions that would be pruned or capped</li>
          </ul>
        </article>
        <article className="card stack">
          <p className="eyebrow">Current milestone</p>
          <ul className="muted">
            <li>Real session list is wired first</li>
            <li>Transcript fallback uses local transcript files when needed</li>
            <li>Maintenance actions remain read-only and future-gated</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
