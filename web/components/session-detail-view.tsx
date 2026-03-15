"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  formatTokenCount,
  type ResponseMeta,
  type SessionDetailRecord,
  type ToolTraceEntry,
} from "../lib/normalizers";

type DetailTab = "transcript" | "tools" | "stats" | "export";
type ToolTraceStatusFilter = "all" | ToolTraceEntry["status"];

export function SessionDetailView({
  session,
  meta,
  initialTab,
  initialStatusFilter,
  initialToolFilter,
}: {
  session: SessionDetailRecord;
  meta: ResponseMeta;
  initialTab: DetailTab;
  initialStatusFilter: ToolTraceStatusFilter;
  initialToolFilter: string;
}) {
  const [currentTab, setCurrentTab] = useState<DetailTab>(initialTab);
  const [statusFilter, setStatusFilter] = useState<ToolTraceStatusFilter>(initialStatusFilter);
  const [toolFilter, setToolFilter] = useState(initialToolFilter);

  const toolOptions = useMemo(
    () => Array.from(new Set(session.toolTrace.map((trace) => trace.toolName))).sort((left, right) => left.localeCompare(right)),
    [session.toolTrace],
  );
  const filteredToolTrace = useMemo(
    () =>
      session.toolTrace.filter((trace) => {
        if (statusFilter !== "all" && trace.status !== statusFilter) {
          return false;
        }

        if (toolFilter !== "all" && trace.toolName !== toolFilter) {
          return false;
        }

        return true;
      }),
    [session.toolTrace, statusFilter, toolFilter],
  );

  const completedToolCalls = session.toolTrace.filter((trace) => trace.status === "completed").length;
  const pendingToolCalls = session.toolTrace.filter((trace) => trace.status === "pending").length;
  const orphanResults = session.toolTrace.filter((trace) => trace.status === "orphan-result").length;
  const transcriptMessageCount = session.transcript.messages.length;
  const userBlocks = session.transcript.messages.filter((message) => message.role === "user").length;
  const assistantBlocks = session.transcript.messages.filter((message) => message.role === "assistant").length;
  const systemBlocks = session.transcript.messages.filter((message) => message.role === "system").length;
  const toolCallBlocks = session.transcript.messages.filter((message) => message.messageType === "toolCall").length;
  const toolResultBlocks = session.transcript.messages.filter((message) => message.messageType === "toolResult").length;
  const toolCounts = toolOptions
    .map((toolName) => ({
      toolName,
      count: session.toolTrace.filter((trace) => trace.toolName === toolName).length,
    }))
    .sort((left, right) => right.count - left.count || left.toolName.localeCompare(right.toolName));

  useEffect(() => {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    if (currentTab !== "transcript") {
      params.set("tab", currentTab);
    } else {
      params.delete("tab");
    }

    if (currentTab === "tools" && statusFilter !== "all") {
      params.set("status", statusFilter);
    } else {
      params.delete("status");
    }

    if (currentTab === "tools" && toolFilter !== "all") {
      params.set("tool", toolFilter);
    } else {
      params.delete("tool");
    }

    const query = params.toString();
    const nextUrl = `${url.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [currentTab, statusFilter, toolFilter]);

  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Session detail</p>
          <h2>{session.displayName}</h2>
          <p className="muted">
            Read-only inspector view for one session. This page now keeps tabs
            and tool filters on the client so switching feels immediate.
          </p>
        </div>
        <Link href="/sessions" className="badge">
          Back to sessions
        </Link>
      </div>

      <section className="card stack">
        <div className="badge-row">
          <span className="badge">{session.kind}</span>
          <span className="badge">{session.channel}</span>
          <span className="badge">{session.model}</span>
          <span className="badge">{meta.adapter.label}</span>
          <span className="badge">transcript: {session.transcript.source}</span>
          {session.status.hasCompaction ? <span className="badge warn">compacted</span> : null}
          {session.status.hasSubagent ? <span className="badge good">subagent</span> : null}
          {session.status.abortedLastRun ? <span className="badge bad">aborted</span> : null}
        </div>

        <div className="kv">
          <span className="muted">Session key</span>
          <span className="mono">{session.key}</span>
          <span className="muted">API path</span>
          <span className="mono">{session.apiPath}</span>
          <span className="muted">Updated</span>
          <span>{session.updatedAt}</span>
          <span className="muted">Agent</span>
          <span>{session.agentId ?? "unknown"}</span>
          <span className="muted">Context tokens</span>
          <span>{formatTokenCount(session.tokens.context)}</span>
          <span className="muted">Total tokens</span>
          <span>{formatTokenCount(session.tokens.total)}</span>
          <span className="muted">Transcript path</span>
          <span className="mono">{session.transcript.path ?? "unavailable"}</span>
        </div>
      </section>

      <div className="grid cols-2">
        <section className="card stack">
          <div>
            <p className="eyebrow">Adapter contract</p>
            <h3>Local-first, read-only</h3>
          </div>
          <p className="muted">{meta.note}</p>
          <ul className="muted">
            {meta.adapter.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>

        <section className="card stack">
          <div>
            <p className="eyebrow">Source health</p>
            <h3>Adapter + transcript visibility</h3>
          </div>
          <div className="badge-row">
            <span className="badge">session source: {session.dataSource}</span>
            <span className="badge">transcript source: {session.transcript.source}</span>
            <span className="badge">read-only</span>
            {meta.adapter.stubbed ? (
              <span className="badge warn">stubbed</span>
            ) : (
              <span className="badge good">live local</span>
            )}
          </div>
          {meta.warnings?.length ? (
            <ul className="muted">
              {meta.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No adapter warnings for this request.</p>
          )}
        </section>
      </div>

      <section className="card stack">
        <div className="tab-row">
          {(["transcript", "tools", "stats", "export"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setCurrentTab(tab)}
              className={`tab-link ${currentTab === tab ? "active" : ""}`}
            >
              {tab === "tools" ? "Tool trace" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {currentTab === "tools" ? (
          <div className="stack">
            <div>
              <p className="eyebrow">Tools</p>
              <h3>Tool trace</h3>
              <p className="muted">
                These controls are now client-side, so filtering and tab
                switching should feel instant.
              </p>
            </div>

            <div className="grid cols-2">
              <section className="card stack">
                <p className="eyebrow">Status filter</p>
                <div className="badge-row">
                  {(["all", "completed", "pending", "orphan-result"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`tab-link ${statusFilter === status ? "active" : ""}`}
                    >
                      {statusLabel(status)}
                    </button>
                  ))}
                </div>
              </section>

              <section className="card stack">
                <p className="eyebrow">Tool filter</p>
                <div className="badge-row">
                  <button
                    type="button"
                    onClick={() => setToolFilter("all")}
                    className={`tab-link ${toolFilter === "all" ? "active" : ""}`}
                  >
                    All tools
                  </button>
                  {toolOptions.map((toolName) => (
                    <button
                      key={toolName}
                      type="button"
                      onClick={() => setToolFilter(toolName)}
                      className={`tab-link ${toolFilter === toolName ? "active" : ""}`}
                    >
                      {toolName}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="grid cols-2">
              <section className="card stack">
                <p className="eyebrow">Completed</p>
                <div className="metric">{completedToolCalls}</div>
                <p className="muted">Calls with a matched tool result.</p>
              </section>
              <section className="card stack">
                <p className="eyebrow">Waiting for result</p>
                <div className="metric">{pendingToolCalls}</div>
                <p className="muted">Tool calls seen without a result yet.</p>
              </section>
              <section className="card stack">
                <p className="eyebrow">Result-only</p>
                <div className="metric">{orphanResults}</div>
                <p className="muted">Tool results that could not be matched to a call.</p>
              </section>
              <section className="card stack">
                <p className="eyebrow">Visible</p>
                <div className="metric">{filteredToolTrace.length}</div>
                <p className="muted">Tool traces matching the current filters.</p>
              </section>
            </div>

            <div className="list">
              {filteredToolTrace.length === 0 ? (
                <div className="empty-state">
                  <h3>No tool traces match the current filters</h3>
                  <p className="muted">Try switching status or tool filters.</p>
                </div>
              ) : (
                filteredToolTrace.map((trace) => (
                  <article key={`${trace.toolName}-${trace.index}`} className="tool-trace-card">
                    <div className="badge-row">
                      <span className="badge">#{trace.index + 1}</span>
                      <span className="badge">{trace.toolName}</span>
                      <span className={`badge ${statusTone(trace.status)}`}>
                        {statusLabel(trace.status)}
                      </span>
                      {trace.startedAt ? <span className="badge">start: {trace.startedAt}</span> : null}
                      {trace.finishedAt ? <span className="badge">finish: {trace.finishedAt}</span> : null}
                    </div>

                    <div className="kv compact-kv">
                      <span className="muted">Call entry</span>
                      <span>{trace.callEntryIndex !== null ? `#${trace.callEntryIndex + 1}` : "n/a"}</span>
                      <span className="muted">Result entry</span>
                      <span>{trace.resultEntryIndex !== null ? `#${trace.resultEntryIndex + 1}` : "n/a"}</span>
                      <span className="muted">Output size</span>
                      <span>{trace.outputChars !== null ? `${trace.outputChars.toLocaleString()} chars` : "n/a"}</span>
                    </div>

                    <div className="grid cols-2">
                      <section className="trace-pane">
                        <p className="eyebrow">Input preview</p>
                        <p className="muted">{trace.inputPreview ?? "No captured tool-call payload."}</p>
                        {trace.input ? (
                          <details>
                            <summary>Show full input</summary>
                            <pre>{trace.input}</pre>
                          </details>
                        ) : null}
                      </section>

                      <section className="trace-pane">
                        <p className="eyebrow">Output preview</p>
                        <p className="muted">{trace.outputPreview ?? "No captured tool-result payload."}</p>
                        {trace.output ? (
                          <details>
                            <summary>Show full output</summary>
                            <pre>{trace.output}</pre>
                          </details>
                        ) : null}
                      </section>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        ) : currentTab === "stats" ? (
          <div className="stack">
            <div>
              <p className="eyebrow">Stats</p>
              <h3>Session diagnostics</h3>
              <p className="muted">High-signal metadata for this session.</p>
            </div>

            <div className="grid cols-2">
              <section className="card stack">
                <p className="eyebrow">Model + source</p>
                <div className="kv compact-kv">
                  <span className="muted">Model</span>
                  <span>{session.model}</span>
                  <span className="muted">Provider</span>
                  <span>{session.modelProvider ?? "unknown"}</span>
                  <span className="muted">Session source</span>
                  <span>{session.dataSource}</span>
                  <span className="muted">Transcript source</span>
                  <span>{session.transcript.source}</span>
                  <span className="muted">Token freshness</span>
                  <span>{session.tokens.fresh ? "fresh" : "stale / partial"}</span>
                </div>
              </section>

              <section className="card stack">
                <p className="eyebrow">Token usage</p>
                <div className="grid cols-2">
                  <div className="stats-tile"><span className="muted">Input</span><strong>{formatTokenCount(session.tokens.input)}</strong></div>
                  <div className="stats-tile"><span className="muted">Output</span><strong>{formatTokenCount(session.tokens.output)}</strong></div>
                  <div className="stats-tile"><span className="muted">Total</span><strong>{formatTokenCount(session.tokens.total)}</strong></div>
                  <div className="stats-tile"><span className="muted">Context</span><strong>{formatTokenCount(session.tokens.context)}</strong></div>
                </div>
              </section>
            </div>

            <div className="grid cols-2">
              <section className="card stack">
                <p className="eyebrow">Transcript composition</p>
                <div className="grid cols-2">
                  <div className="stats-tile"><span className="muted">All entries</span><strong>{transcriptMessageCount}</strong></div>
                  <div className="stats-tile"><span className="muted">User blocks</span><strong>{userBlocks}</strong></div>
                  <div className="stats-tile"><span className="muted">Assistant blocks</span><strong>{assistantBlocks}</strong></div>
                  <div className="stats-tile"><span className="muted">System blocks</span><strong>{systemBlocks}</strong></div>
                  <div className="stats-tile"><span className="muted">Tool calls</span><strong>{toolCallBlocks}</strong></div>
                  <div className="stats-tile"><span className="muted">Tool results</span><strong>{toolResultBlocks}</strong></div>
                </div>
              </section>

              <section className="card stack">
                <p className="eyebrow">Tool activity</p>
                <div className="grid cols-2">
                  <div className="stats-tile"><span className="muted">Distinct tools</span><strong>{toolOptions.length}</strong></div>
                  <div className="stats-tile"><span className="muted">Traces</span><strong>{session.toolTrace.length}</strong></div>
                  <div className="stats-tile"><span className="muted">Completed</span><strong>{completedToolCalls}</strong></div>
                  <div className="stats-tile"><span className="muted">Waiting</span><strong>{pendingToolCalls}</strong></div>
                  <div className="stats-tile"><span className="muted">Result-only</span><strong>{orphanResults}</strong></div>
                  <div className="stats-tile"><span className="muted">Compaction</span><strong>{session.status.hasCompaction ? "yes" : "no"}</strong></div>
                </div>
              </section>
            </div>

            <div className="grid cols-2">
              <section className="card stack">
                <p className="eyebrow">Top tools</p>
                {toolCounts.length === 0 ? (
                  <p className="muted">No tool traces captured for this session.</p>
                ) : (
                  <div className="list">
                    {toolCounts.map((tool) => (
                      <div key={tool.toolName} className="stats-row">
                        <span>{tool.toolName}</span>
                        <strong>{tool.count}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="card stack">
                <p className="eyebrow">Session state</p>
                <div className="kv compact-kv">
                  <span className="muted">Kind</span><span>{session.kind}</span>
                  <span className="muted">Channel</span><span>{session.channel}</span>
                  <span className="muted">Agent</span><span>{session.agentId ?? "unknown"}</span>
                  <span className="muted">Aborted</span><span>{session.status.abortedLastRun ? "yes" : "no"}</span>
                  <span className="muted">Subagent</span><span>{session.status.hasSubagent ? "yes" : "no"}</span>
                  <span className="muted">Warnings</span><span>{meta.warnings?.length ? meta.warnings.length : 0}</span>
                </div>
              </section>
            </div>
          </div>
        ) : currentTab === "export" ? (
          <div className="stack">
            <div>
              <p className="eyebrow">Export</p>
              <h3>Portable debug bundle</h3>
              <p className="muted">Export the current session as JSON or Markdown.</p>
            </div>
            <div className="grid cols-2">
              <section className="card stack">
                <p className="eyebrow">Formats</p>
                <div className="badge-row">
                  <a href={`${session.apiPath}/export?format=json`} className="export-link">Export JSON bundle</a>
                  <a href={`${session.apiPath}/export?format=md`} className="export-link">Export Markdown</a>
                </div>
              </section>
              <section className="card stack">
                <p className="eyebrow">Bundle contents</p>
                <div className="kv compact-kv">
                  <span className="muted">Transcript entries</span><span>{transcriptMessageCount}</span>
                  <span className="muted">Tool traces</span><span>{session.toolTrace.length}</span>
                  <span className="muted">Warnings</span><span>{meta.warnings?.length ? meta.warnings.length : 0}</span>
                  <span className="muted">Session source</span><span>{session.dataSource}</span>
                  <span className="muted">Transcript source</span><span>{session.transcript.source}</span>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="stack">
            <div>
              <p className="eyebrow">Transcript</p>
              <h3>Message flow</h3>
              <p className="muted">Tool calls and tool results are surfaced as separate transcript entries.</p>
            </div>

            <div className="list">
              {session.transcript.messages.map((message) => (
                <article key={`${message.messageType}-${message.index}`} className={`transcript-item ${message.messageType}`}>
                  <div className="badge-row">
                    <span className="badge">#{message.index + 1}</span>
                    <span className="badge">{message.role}</span>
                    <span className="badge">{message.messageType}</span>
                    {message.toolName ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentTab("tools");
                          setToolFilter(message.toolName ?? "all");
                        }}
                        className="tab-link"
                      >
                        {message.toolName}
                      </button>
                    ) : null}
                    {message.timestamp ? <span className="badge">{message.timestamp}</span> : null}
                    {message.isCollapsedDefault ? <span className="badge warn">collapse later</span> : null}
                  </div>
                  <h3>{message.title}</h3>
                  <pre>{message.content}</pre>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function statusLabel(status: ToolTraceStatusFilter): string {
  if (status === "completed") return "Completed";
  if (status === "pending") return "Waiting for result";
  if (status === "orphan-result") return "Result-only";
  return "All statuses";
}

function statusTone(status: ToolTraceEntry["status"]): "good" | "warn" | "bad" {
  if (status === "completed") return "good";
  if (status === "pending") return "warn";
  return "bad";
}
