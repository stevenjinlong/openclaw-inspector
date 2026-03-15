import { SettingsIcon, ShieldIcon } from "../../components/ui-icons";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="stack">
      <div className="page-title">
        <div className="title-with-icon">
          <span className="page-icon-badge">
            <SettingsIcon className="icon icon-lg" />
          </span>
          <div>
            <p className="eyebrow">Settings</p>
            <h2>Connection and safety</h2>
            <p className="muted">
              Settings will manage source preference, Gateway URL/token for remote
              mode later, active agent filtering, and write-action feature flags.
            </p>
          </div>
        </div>
        <span className="badge">Design placeholder</span>
      </div>

      <section className="card stack surface-soft">
        <div className="badge-row">
          <span className="badge good">
            <ShieldIcon className="icon icon-sm" />
            Read-only by default
          </span>
          <span className="badge">No remote writes</span>
        </div>
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
