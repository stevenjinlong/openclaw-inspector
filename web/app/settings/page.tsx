export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Connection and safety</h2>
          <p className="muted">
            Settings will manage source preference, Gateway URL/token for remote
            mode later, active agent filtering, and write-action feature flags.
          </p>
        </div>
        <span className="badge">Design placeholder</span>
      </div>

      <section className="card stack">
        <div className="kv">
          <span className="muted">Connection mode</span>
          <span>Auto: Gateway → CLI → mock</span>
          <span className="muted">Env override</span>
          <span>OPENCLAW_INSPECTOR_SOURCE_MODE</span>
          <span className="muted">Write actions</span>
          <span>Disabled</span>
          <span className="muted">Remote Gateway</span>
          <span>Planned later</span>
        </div>
      </section>
    </div>
  );
}
