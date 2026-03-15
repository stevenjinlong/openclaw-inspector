"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { SessionSummaryRecord } from "../lib/normalizers";
import { ActivityIcon, AlertTriangleIcon, MonitorIcon, PauseCircleIcon } from "./ui-icons";

type LiveStatusCode = "idle" | "llm-running" | "tools-running" | "possibly-stuck";

type LiveStatusPayload = {
  statusCode: LiveStatusCode;
  label: string;
  reason: string;
};

export function LiveMonitorBoard({ sessions }: { sessions: SessionSummaryRecord[] }) {
  const trackedSessions = useMemo(() => sessions.slice(0, 24), [sessions]);
  const [statusMap, setStatusMap] = useState<Record<string, LiveStatusPayload>>({});
  const [mode, setMode] = useState<"all" | "running" | "stuck">("all");

  useEffect(() => {
    let cancelled = false;

    async function pollStatuses() {
      const updates = await Promise.all(
        trackedSessions.map(async (session) => {
          try {
            const response = await fetch(`${session.apiPath}/status`);
            if (!response.ok) return null;
            const payload = (await response.json()) as LiveStatusPayload & { ok?: boolean };
            return [session.key, payload] as const;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) {
        return;
      }

      setStatusMap((current) => {
        const next = { ...current };
        for (const entry of updates) {
          if (!entry) continue;
          next[entry[0]] = {
            statusCode: entry[1].statusCode,
            label: entry[1].label,
            reason: entry[1].reason,
          };
        }
        return next;
      });
    }

    void pollStatuses();
    const intervalId = window.setInterval(() => void pollStatuses(), 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [trackedSessions]);

  const liveRows = trackedSessions.map((session) => ({
    session,
    status: statusMap[session.key] ?? { statusCode: "idle", label: "IDLE", reason: "No recent in-flight work detected." },
  }));

  const filteredRows = liveRows.filter(({ status }) => {
    if (mode === "running") {
      return status.statusCode === "llm-running" || status.statusCode === "tools-running";
    }
    if (mode === "stuck") {
      return status.statusCode === "possibly-stuck";
    }
    return true;
  });

  const runningCount = liveRows.filter(({ status }) => status.statusCode === "llm-running" || status.statusCode === "tools-running").length;
  const stuckCount = liveRows.filter(({ status }) => status.statusCode === "possibly-stuck").length;

  return (
    <div className="stack dashboard-shell">
      <section className="card stack glass-panel">
        <div className="badge-row">
          <span className="badge">Tracked sessions: {trackedSessions.length}</span>
          <span className="badge good">Running: {runningCount}</span>
          <span className="badge warn">Possibly stuck: {stuckCount}</span>
          <span className="badge">Polling every 3s</span>
        </div>
        <div className="badge-row detail-tab-row">
          {(["all", "running", "stuck"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`detail-tab-pill ${mode === value ? "active" : ""}`}
            >
              {value === "all" ? "All" : value === "running" ? "Running" : "Possibly stuck"}
            </button>
          ))}
        </div>
      </section>

      <section className="card stack surface-soft">
        {filteredRows.length === 0 ? (
          <div className="empty-state detail-empty-state">
            <h3>No sessions match the current live filter</h3>
            <p className="muted">Try switching from Running or Possibly stuck back to All.</p>
          </div>
        ) : (
          <div className="list">
            {filteredRows.map(({ session, status }) => {
              const meta = getLiveMeta(status.statusCode);
              const Icon = meta.icon;
              return (
                <Link key={session.key} href={session.href} className="session-row aligned-session-row">
                  <div className="session-main">
                    <div className="session-main-head">
                      <p className="session-channel-label channel-tone-default">
                        <span>{session.channel}</span>
                        <span className={`session-status-pill summary-status-${meta.summaryTone}`} title={status.reason}>
                          <Icon className="icon icon-sm" />
                          {status.label}
                        </span>
                      </p>
                      <h3 className="session-name">{session.displayName}</h3>
                      <p className="muted mono session-key">{session.key}</p>
                    </div>
                    <div className="badge-row">
                      <span className="badge meta-badge meta-badge-kind">{session.kind}</span>
                      <span className="badge meta-badge meta-badge-model">{session.model}</span>
                      <span className="badge">{session.updatedAt}</span>
                    </div>
                  </div>
                  <div className="session-side">
                    <div className="session-stats-grid">
                      <span className="muted">Reason</span>
                      <span>{status.reason}</span>
                      <span className="muted">Context</span>
                      <span>{session.tokens.context.toLocaleString()} tok</span>
                      <span className="muted">Agent</span>
                      <span>{session.agentId ?? "unknown"}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function getLiveMeta(status: LiveStatusCode): {
  icon: typeof PauseCircleIcon;
  summaryTone: "active" | "recent" | "idle";
} {
  if (status === "llm-running" || status === "tools-running") {
    return { icon: ActivityIcon, summaryTone: "active" };
  }
  if (status === "possibly-stuck") {
    return { icon: AlertTriangleIcon, summaryTone: "recent" };
  }
  return { icon: PauseCircleIcon, summaryTone: "idle" };
}
