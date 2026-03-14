export default function SettingsPage() {
  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Connection and safety</h2>
          <p className="muted">
            Settings will manage Gateway URL/token, CLI mode, active agent
            selection, and write-action feature flags.
          </p>
        </div>
        <span className="badge">Design placeholder</span>
      </div>

      <section className="card stack">
        <div className="kv">
          <span className="muted">Connection mode</span>
          <span>Mock / local development</span>
          <span className="muted">Write actions</span>
          <span>Disabled</span>
          <span className="muted">Adapter</span>
          <span>web/lib/session-adapter.ts</span>
          <span className="muted">Current source</span>
          <span>In-memory sample data</span>
          <span className="muted">Planned swap</span>
          <span>OpenClaw CLI JSON or Gateway-backed reads</span>
        </div>
      </section>
    </div>
  );
}
