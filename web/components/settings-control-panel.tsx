"use client";

import type { ReactNode } from "react";
import { Fragment, useMemo, useState } from "react";

import {
  ActivityIcon,
  DatabaseIcon,
  MonitorIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
} from "./ui-icons";

type InspectorSourceMode =
  | "auto-local"
  | "local-gateway"
  | "local-cli"
  | "remote-gateway"
  | "mock";

type InspectorSettings = {
  sourceMode: InspectorSourceMode;
  remoteGateway: {
    url: string;
    token: string;
    password: string;
    timeoutMs: number;
  };
};

type GatewayProbeStatus = {
  configured: boolean;
  ok: boolean;
  label: string;
  detail: string;
  url: string | null;
  bindMode: string | null;
  serviceStatus: string | null;
  rpcOk: boolean | null;
  error: string | null;
};

type CliProbeStatus = {
  ok: boolean;
  label: string;
  detail: string;
  sessionCount: number | null;
  error: string | null;
};

type InspectorSettingsSnapshot = {
  settings: InspectorSettings;
  storage: {
    path: string;
  };
  runtime: {
    effectiveSource: {
      ok: boolean;
      mode: InspectorSourceMode;
      adapterMode: "gateway" | "cli" | "mock";
      label: string;
      detail: string;
      remote: boolean;
    };
    localGateway: GatewayProbeStatus;
    localCli: CliProbeStatus;
    remoteGateway: GatewayProbeStatus;
  };
};

const SOURCE_OPTIONS: Array<{
  value: InspectorSourceMode;
  label: string;
  description: string;
  recommendation: string;
}> = [
  {
    value: "auto-local",
    label: "Auto local",
    description: "Prefer local Gateway, then local CLI, then mock fallback.",
    recommendation: "Best default when Inspector and OpenClaw live on the same machine.",
  },
  {
    value: "local-gateway",
    label: "Local Gateway",
    description: "Pin Inspector to the local Gateway only.",
    recommendation: "Use when you want a strict live Gateway read path and no CLI fallback.",
  },
  {
    value: "local-cli",
    label: "Local CLI",
    description: "Read local session data through the CLI adapter.",
    recommendation: "Useful when the local Gateway is off but the machine still has OpenClaw installed.",
  },
  {
    value: "remote-gateway",
    label: "Remote Gateway",
    description: "Use a remote Gateway URL plus explicit credentials.",
    recommendation: "For a local browser/UI with OpenClaw running on a server or another workstation.",
  },
  {
    value: "mock",
    label: "Mock",
    description: "Force mock sample data for UI work and demos.",
    recommendation: "Good for design passes, screenshots, and developing without live session data.",
  },
];

export function SettingsControlPanel({
  initialSnapshot,
}: {
  initialSnapshot: InspectorSettingsSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [form, setForm] = useState<InspectorSettings>(initialSnapshot.settings);
  const [busyAction, setBusyAction] = useState<"save" | "test" | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "good" | "bad"; text: string } | null>(null);

  const remoteMode = form.sourceMode === "remote-gateway";
  const dirty = JSON.stringify(form) !== JSON.stringify(snapshot.settings);
  const activeMode = useMemo(
    () => SOURCE_OPTIONS.find((option) => option.value === form.sourceMode) ?? SOURCE_OPTIONS[0],
    [form.sourceMode],
  );
  const remoteUrlConfigured = form.remoteGateway.url.trim().length > 0;
  const remoteAuthConfigured =
    form.remoteGateway.token.trim().length > 0 || form.remoteGateway.password.trim().length > 0;
  const remoteReady = remoteUrlConfigured && remoteAuthConfigured;

  async function submit(action: "save" | "test") {
    setBusyAction(action);
    setFeedback(null);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, settings: form }),
      });

      const payload = (await response.json()) as InspectorSettingsSnapshot & {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Request failed.");
      }

      setSnapshot(payload);
      if (action === "save") {
        setForm(payload.settings);
      }
      setFeedback({
        kind: "good",
        text:
          action === "save"
            ? "Settings saved. Inspector will use the new source configuration on the next data read." 
            : "Connection test completed. Use the health cards below to confirm the source you want is actually reachable.",
      });
    } catch (error) {
      setFeedback({
        kind: "bad",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="stack dashboard-shell">
      <div className="page-title">
        <div className="title-with-icon">
          <span className="page-icon-badge">
            <SettingsIcon className="icon icon-lg" />
          </span>
          <div>
            <p className="eyebrow">Settings</p>
            <h2>Data source control panel</h2>
            <p className="muted dashboard-note">
              Choose where Inspector reads from, verify what is actually reachable, and configure a remote Gateway when the UI runs on a different machine than OpenClaw.
            </p>
          </div>
        </div>
        <span className={`badge ${snapshot.runtime.effectiveSource.ok ? "good" : "warn"}`}>
          {snapshot.runtime.effectiveSource.label}
        </span>
      </div>

      <section className="card hero-card hero-card-stacked settings-hero-card">
        <div className="stack hero-copy settings-hero-copy">
          <div className="badge-row">
            <span className="badge">Selected mode: {activeMode.label}</span>
            <span className={`badge ${snapshot.runtime.effectiveSource.remote ? "warn" : "good"}`}>
              {snapshot.runtime.effectiveSource.remote ? "Remote read path" : "Local read path"}
            </span>
            <span className="badge">Read-only</span>
          </div>

          <div className="stack compact-gap">
            <h3 className="hero-title settings-hero-title">Point Inspector at the right source, not the wrong machine.</h3>
            <p className="hero-subtitle">
              Sessions, Session Detail, Search, and Health all follow this setting. Maintenance remains local-only because cleanup dry-runs execute on the machine running Inspector.
            </p>
          </div>

          <div className="badge-row hero-actions">
            <button
              type="button"
              className="secondary-action"
              onClick={() => setForm(snapshot.settings)}
              disabled={busyAction !== null || !dirty}
            >
              Reset changes
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={() => submit("test")}
              disabled={busyAction !== null}
            >
              <SearchIcon className="icon icon-sm" />
              {busyAction === "test" ? "Testing..." : "Run connection test"}
            </button>
            <button
              type="button"
              className="primary-action"
              onClick={() => submit("save")}
              disabled={busyAction !== null || !dirty}
            >
              <ShieldIcon className="icon icon-sm" />
              {busyAction === "save" ? "Saving..." : "Save source settings"}
            </button>
          </div>
        </div>

        <div className="grid cols-3 settings-hero-summary">
          <div className="summary-tile accent compact-summary">
            <span className="muted">Effective source</span>
            <strong>{snapshot.runtime.effectiveSource.label}</strong>
            <p className="muted">{snapshot.runtime.effectiveSource.detail}</p>
          </div>
          <div className="summary-tile compact-summary">
            <span className="muted">Selected mode</span>
            <strong>{activeMode.label}</strong>
            <p className="muted">{activeMode.recommendation}</p>
          </div>
          <div className="summary-tile warm compact-summary">
            <span className="muted">Stored on this machine</span>
            <strong>Inspector settings</strong>
            <p className="muted mono">{snapshot.storage.path}</p>
          </div>
        </div>

        {feedback ? (
          <div className={`settings-feedback ${feedback.kind}`}>
            <span className={`badge ${feedback.kind}`}>{feedback.kind === "good" ? "Updated" : "Error"}</span>
            <p>{feedback.text}</p>
          </div>
        ) : null}
      </section>

      <section className="card stack surface-soft settings-form-card">
        <div className="detail-panel-header">
          <div>
            <p className="eyebrow">Source mode</p>
            <h3>Choose how Inspector resolves session data</h3>
            <p className="muted">
              Think of this as the read-path policy for the product, not just a technical toggle.
            </p>
          </div>
          <span className="badge">Applies to Sessions, Detail, Search, Health</span>
        </div>

        <div className="settings-mode-grid">
          {SOURCE_OPTIONS.map((option) => {
            const active = form.sourceMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`settings-mode-card ${active ? "active" : ""}`}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    sourceMode: option.value,
                  }))
                }
              >
                <span className="badge-row">
                  <span className="badge">{option.label}</span>
                  {active ? <span className="badge good">selected</span> : null}
                </span>
                <strong>{option.label}</strong>
                <p className="muted">{option.description}</p>
                <p className="muted settings-mode-hint">{option.recommendation}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid cols-2 settings-two-up">
        <div className="card stack soft-contrast">
          <div className="metric-card-header">
            <span className="metric-icon-badge tone-blue">
              <MonitorIcon className="icon" />
            </span>
            <div>
              <p className="eyebrow">Remote Gateway target</p>
              <h3>Endpoint, auth, and activation readiness</h3>
            </div>
          </div>

          <div className="badge-row settings-inline-status">
            <span className={`badge ${remoteUrlConfigured ? "good" : "warn"}`}>
              URL {remoteUrlConfigured ? "configured" : "missing"}
            </span>
            <span className={`badge ${remoteAuthConfigured ? "good" : "warn"}`}>
              Auth {remoteAuthConfigured ? "configured" : "missing"}
            </span>
            <span className={`badge ${remoteReady ? "good" : "warn"}`}>
              {remoteReady ? "Ready for remote mode" : "Not ready for remote mode"}
            </span>
            {remoteMode ? <span className="badge good">Active mode</span> : null}
          </div>

          <div className="settings-form-grid">
            <label className="settings-field">
              <span>Gateway URL</span>
              <input
                value={form.remoteGateway.url}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    remoteGateway: {
                      ...current.remoteGateway,
                      url: event.target.value,
                    },
                  }))
                }
                placeholder="ws://127.0.0.1:18789 or wss://gateway.example.com"
              />
            </label>

            <label className="settings-field">
              <span>Timeout (ms)</span>
              <input
                type="number"
                min={1000}
                max={120000}
                step={1000}
                value={form.remoteGateway.timeoutMs}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    remoteGateway: {
                      ...current.remoteGateway,
                      timeoutMs: Number(event.target.value || "10000"),
                    },
                  }))
                }
              />
            </label>

            <label className="settings-field">
              <span>Token</span>
              <input
                type="password"
                value={form.remoteGateway.token}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    remoteGateway: {
                      ...current.remoteGateway,
                      token: event.target.value,
                    },
                  }))
                }
                placeholder="Gateway token"
              />
            </label>

            <label className="settings-field">
              <span>Password</span>
              <input
                type="password"
                value={form.remoteGateway.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    remoteGateway: {
                      ...current.remoteGateway,
                      password: event.target.value,
                    },
                  }))
                }
                placeholder="Gateway password"
              />
            </label>
          </div>

          <p className="muted settings-note">
            Remote mode needs a URL plus an explicit token or password. If you enter just <span className="mono">ip:port</span>, Inspector will normalize it to <span className="mono">ws://ip:port</span> before testing or saving.
          </p>

          {!remoteMode ? (
            <span className="badge">Remote config can be filled in ahead of time. It stays dormant until you switch to Remote Gateway mode.</span>
          ) : null}
        </div>

        <div className="card stack soft-contrast">
          <div className="metric-card-header">
            <span className="metric-icon-badge tone-amber">
              <DatabaseIcon className="icon" />
            </span>
            <div>
              <p className="eyebrow">Scope notes</p>
              <h3>What changes, what stays local</h3>
            </div>
          </div>

          <div className="settings-scope-list">
            <div className="settings-scope-row">
              <strong>Changes immediately</strong>
              <p className="muted">Sessions, Session Detail, Search, and health endpoints use the configured source plan on the next request.</p>
            </div>
            <div className="settings-scope-row">
              <strong>Still local-only</strong>
              <p className="muted">Maintenance remains local because cleanup dry-runs execute through the local machine’s OpenClaw CLI.</p>
            </div>
            <div className="settings-scope-row">
              <strong>No writes enabled</strong>
              <p className="muted">This panel only changes read paths. It does not enable remote mutation or write actions.</p>
            </div>
            <div className="settings-scope-row">
              <strong>Credentials storage</strong>
              <p className="muted">Remote auth values are stored locally on this machine inside the Inspector settings file, not pushed to the Gateway.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card stack surface-soft">
        <div className="detail-panel-header">
          <div>
            <p className="eyebrow">Common setups</p>
            <h3>Quick mental models for the source modes</h3>
          </div>
          <span className="badge">Recommended defaults</span>
        </div>

        <div className="grid cols-3 settings-recipes-grid">
          <RecipeCard
            title="Same machine"
            eyebrow="Most common"
            description="Inspector and OpenClaw run on the same laptop or workstation. Use Auto local unless you want to pin a stricter source."
          />
          <RecipeCard
            title="Local UI + remote server"
            eyebrow="Remote Gateway"
            description="Browser/UI runs locally, but OpenClaw Gateway lives on a server. Use Remote Gateway with ws/wss plus token or password."
          />
          <RecipeCard
            title="Design or demo mode"
            eyebrow="Mock"
            description="Use Mock when you want stable sample data for UI polish, screenshots, or local development without live dependencies."
          />
        </div>
      </section>

      <section className="grid cols-3">
        <StatusCard
          title={snapshot.runtime.localGateway.label}
          eyebrow="Local Gateway"
          icon={<MonitorIcon className="icon icon-lg" />}
          status={snapshot.runtime.localGateway.ok ? "good" : "warn"}
          detail={snapshot.runtime.localGateway.detail}
          lines={[
            ["RPC", snapshot.runtime.localGateway.rpcOk ? "ok" : "down"],
            ["URL", snapshot.runtime.localGateway.url ?? "n/a"],
            ["Bind", snapshot.runtime.localGateway.bindMode ?? "n/a"],
            ["Service", snapshot.runtime.localGateway.serviceStatus ?? "n/a"],
          ]}
          error={snapshot.runtime.localGateway.error}
        />
        <StatusCard
          title={snapshot.runtime.localCli.label}
          eyebrow="Local CLI"
          icon={<ActivityIcon className="icon icon-lg" />}
          status={snapshot.runtime.localCli.ok ? "good" : "warn"}
          detail={snapshot.runtime.localCli.detail}
          lines={[["Visible sessions", String(snapshot.runtime.localCli.sessionCount ?? "n/a")]]}
          error={snapshot.runtime.localCli.error}
        />
        <StatusCard
          title={snapshot.runtime.remoteGateway.label}
          eyebrow="Remote Gateway"
          icon={<ShieldIcon className="icon icon-lg" />}
          status={snapshot.runtime.remoteGateway.ok ? "good" : snapshot.runtime.remoteGateway.configured ? "warn" : "neutral"}
          detail={snapshot.runtime.remoteGateway.detail}
          lines={[
            ["Configured", snapshot.runtime.remoteGateway.configured ? "yes" : "no"],
            ["URL", snapshot.runtime.remoteGateway.url ?? "n/a"],
            [
              "RPC",
              snapshot.runtime.remoteGateway.rpcOk === null
                ? "n/a"
                : snapshot.runtime.remoteGateway.rpcOk
                  ? "ok"
                  : "down",
            ],
          ]}
          error={snapshot.runtime.remoteGateway.error}
        />
      </section>
    </div>
  );
}

function RecipeCard({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <article className="card stack soft-contrast settings-recipe-card">
      <p className="eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
    </article>
  );
}

function StatusCard({
  eyebrow,
  title,
  detail,
  icon,
  status,
  lines,
  error,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  icon: ReactNode;
  status: "good" | "warn" | "neutral";
  lines: Array<[string, string]>;
  error?: string | null;
}) {
  return (
    <section className="card stack surface-soft chart-card">
      <div className="chart-card-header">
        <span className="chart-icon-badge">{icon}</span>
        <div className="stack compact-gap">
          <div className="badge-row">
            <span className="badge">{eyebrow}</span>
            {status === "good" ? <span className="badge good">healthy</span> : null}
            {status === "warn" ? <span className="badge warn">attention</span> : null}
            {status === "neutral" ? <span className="badge">idle</span> : null}
          </div>
          <h3>{title}</h3>
          <p className="muted">{detail}</p>
        </div>
      </div>

      <div className="kv compact-kv">
        {lines.map(([label, value]) => (
          <Fragment key={label}>
            <span className="muted">{label}</span>
            <span className={label === "URL" ? "mono" : undefined}>{value}</span>
          </Fragment>
        ))}
      </div>

      {error ? <p className="muted mono settings-error">{error}</p> : null}
    </section>
  );
}
