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
}> = [
  {
    value: "auto-local",
    label: "Auto local",
    description: "Prefer local Gateway, then local CLI, then mock fallback.",
  },
  {
    value: "local-gateway",
    label: "Local Gateway",
    description: "Pin Inspector to the local Gateway only.",
  },
  {
    value: "local-cli",
    label: "Local CLI",
    description: "Read local session data through the CLI adapter.",
  },
  {
    value: "remote-gateway",
    label: "Remote Gateway",
    description: "Use a remote Gateway URL plus explicit credentials.",
  },
  {
    value: "mock",
    label: "Mock",
    description: "Force mock sample data for UI work and demos.",
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
            : "Connection test completed. Review the runtime cards below.",
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
            <p className="muted">
              Control where Inspector reads from: local Gateway, local CLI, mock data, or a remote Gateway.
            </p>
          </div>
        </div>
        <span className={`badge ${snapshot.runtime.effectiveSource.ok ? "good" : "warn"}`}>
          {snapshot.runtime.effectiveSource.label}
        </span>
      </div>

      <section className="card glass-panel stack">
        <div className="grid cols-3">
          <div className="summary-tile accent compact-summary">
            <span className="muted">Effective source</span>
            <strong>{snapshot.runtime.effectiveSource.label}</strong>
            <p className="muted">{snapshot.runtime.effectiveSource.detail}</p>
          </div>
          <div className="summary-tile compact-summary">
            <span className="muted">Selected mode</span>
            <strong>{activeMode.label}</strong>
            <p className="muted">{activeMode.description}</p>
          </div>
          <div className="summary-tile warm compact-summary">
            <span className="muted">Storage</span>
            <strong>Local file</strong>
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
              This controls the adapters behind Sessions, Session Detail, Search, and health reads.
            </p>
          </div>
          <div className="badge-row">
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
              {busyAction === "test" ? "Testing..." : "Test connection"}
            </button>
            <button
              type="button"
              className="primary-action"
              onClick={() => submit("save")}
              disabled={busyAction !== null || !dirty}
            >
              <ShieldIcon className="icon icon-sm" />
              {busyAction === "save" ? "Saving..." : "Save settings"}
            </button>
          </div>
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
              </button>
            );
          })}
        </div>

        <div className="grid cols-2">
          <div className="card stack soft-contrast">
            <div className="metric-card-header">
              <span className="metric-icon-badge tone-blue">
                <MonitorIcon className="icon" />
              </span>
              <div>
                <p className="eyebrow">Remote Gateway target</p>
                <h3>Endpoint and auth</h3>
              </div>
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
              Remote mode needs a URL plus an explicit token or password. If you enter just <span className="mono">ip:port</span>, the server will normalize it to <span className="mono">ws://ip:port</span>.
            </p>
            {!remoteMode ? (
              <span className="badge">Remote config is saved but inactive until you switch to Remote Gateway mode.</span>
            ) : null}
          </div>

          <div className="card stack soft-contrast">
            <div className="metric-card-header">
              <span className="metric-icon-badge tone-amber">
                <DatabaseIcon className="icon" />
              </span>
              <div>
                <p className="eyebrow">Scope notes</p>
                <h3>What this changes</h3>
              </div>
            </div>

            <div className="kv compact-kv">
              <span className="muted">Affected pages</span>
              <span>Sessions, Session Detail, Search, Health</span>
              <span className="muted">Maintenance</span>
              <span>Still local-only (cleanup dry-run runs on the local machine)</span>
              <span className="muted">Writes</span>
              <span>Still disabled — this only changes read paths</span>
              <span className="muted">Remote auth</span>
              <span>Stored locally on this machine inside the Inspector settings file</span>
            </div>
          </div>
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
            ["RPC", snapshot.runtime.remoteGateway.rpcOk === null ? "n/a" : snapshot.runtime.remoteGateway.rpcOk ? "ok" : "down"],
          ]}
          error={snapshot.runtime.remoteGateway.error}
        />
      </section>
    </div>
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
