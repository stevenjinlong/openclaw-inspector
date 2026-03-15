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
    () =>
      Array.from(new Set(session.toolTrace.map((trace) => trace.toolName))).sort((left, right) =>
        left.localeCompare(right),
      ),
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

  const [transcriptPageSize, setTranscriptPageSize] = useState<number>(12);
  const transcriptPageCount = Math.max(
    1,
    Math.ceil(transcriptMessageCount / transcriptPageSize),
  );
  const [transcriptPage, setTranscriptPage] = useState<number>(transcriptPageCount);
  const pagedTranscriptMessages = useMemo(() => {
    const startIndex = (transcriptPage - 1) * transcriptPageSize;
    return session.transcript.messages.slice(startIndex, startIndex + transcriptPageSize);
  }, [session.transcript.messages, transcriptPage, transcriptPageSize]);
  const transcriptStart = transcriptMessageCount === 0
    ? 0
    : (transcriptPage - 1) * transcriptPageSize + 1;
  const transcriptEnd = Math.min(transcriptPage * transcriptPageSize, transcriptMessageCount);

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

  useEffect(() => {
    setTranscriptPage((current) => Math.min(Math.max(current, 1), transcriptPageCount));
  }, [transcriptPageCount]);

  return (
    <div className="stack detail-shell">
      <div className="page-title">
        <div>
          <p className="eyebrow">Session detail</p>
          <h2>{session.displayName}</h2>
          <p className="muted detail-subtitle">
            A read-only inspection surface for one session, with tabs and tool filters kept on the client for instant interaction.
          </p>
        </div>
        <Link href="/sessions" className="secondary-action">
          Back to sessions
        </Link>
      </div>

      <section className="card detail-hero surface-soft">
        <div className="detail-hero-copy stack">
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

          <div className="grid cols-3">
            <div className="summary-tile accent compact-summary">
              <span className="muted">Context</span>
              <strong>{formatTokenCount(session.tokens.context)}</strong>
            </div>
            <div className="summary-tile compact-summary">
              <span className="muted">Total tokens</span>
              <strong>{formatTokenCount(session.tokens.total)}</strong>
            </div>
            <div className="summary-tile warm compact-summary">
              <span className="muted">Tool traces</span>
              <strong>{session.toolTrace.length}</strong>
            </div>
          </div>
        </div>

        <div className="detail-facts-card">
          <div className="detail-facts-grid">
            <span className="muted">Session key</span>
            <span className="mono">{session.key}</span>
            <span className="muted">API path</span>
            <span className="mono">{session.apiPath}</span>
            <span className="muted">Updated</span>
            <span>{session.updatedAt}</span>
            <span className="muted">Agent</span>
            <span>{session.agentId ?? "unknown"}</span>
            <span className="muted">Transcript path</span>
            <span className="mono">{session.transcript.path ?? "unavailable"}</span>
          </div>
        </div>
      </section>

      <div className="grid cols-2">
        <section className="card stack surface-soft">
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

        <section className="card stack surface-soft">
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

      <section className="card stack detail-tabs-shell">
        <div className="detail-tab-header">
          <div>
            <p className="eyebrow">View</p>
            <h3>Switch between transcript, traces, diagnostics, and export</h3>
          </div>
          <div className="tab-row detail-tab-row">
            {([
              ["transcript", "Transcript"],
              ["tools", "Tool trace"],
              ["stats", "Stats"],
              ["export", "Export"],
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setCurrentTab(tab)}
                className={`detail-tab-pill ${currentTab === tab ? "active" : ""}`}
              >
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {currentTab === "tools" ? (
          <div className="stack">
            <div className="detail-panel-header">
              <div>
                <p className="eyebrow">Tools</p>
                <h3>Tool trace</h3>
                <p className="muted">
                  Pair tool calls with their results, then filter down to the exact trace you care about.
                </p>
              </div>
            </div>

            <div className="grid cols-2">
              <section className="card stack surface-soft">
                <p className="eyebrow">Status filter</p>
                <div className="badge-row">
                  {(["all", "completed", "pending", "orphan-result"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`detail-filter-chip ${statusFilter === status ? "active" : ""}`}
                    >
                      {statusLabel(status)}
                    </button>
                  ))}
                </div>
              </section>

              <section className="card stack surface-soft">
                <p className="eyebrow">Tool filter</p>
                <div className="badge-row">
                  <button
                    type="button"
                    onClick={() => setToolFilter("all")}
                    className={`detail-filter-chip ${toolFilter === "all" ? "active" : ""}`}
                  >
                    All tools
                  </button>
                  {toolOptions.map((toolName) => (
                    <button
                      key={toolName}
                      type="button"
                      onClick={() => setToolFilter(toolName)}
                      className={`detail-filter-chip ${toolFilter === toolName ? "active" : ""}`}
                    >
                      {toolName}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="grid cols-4 responsive-grid">
              <div className="stats-tile soft-contrast">
                <span className="muted">Completed</span>
                <strong>{completedToolCalls}</strong>
              </div>
              <div className="stats-tile soft-contrast">
                <span className="muted">Waiting</span>
                <strong>{pendingToolCalls}</strong>
              </div>
              <div className="stats-tile soft-contrast">
                <span className="muted">Result-only</span>
                <strong>{orphanResults}</strong>
              </div>
              <div className="stats-tile soft-contrast">
                <span className="muted">Visible</span>
                <strong>{filteredToolTrace.length}</strong>
              </div>
            </div>

            <div className="list">
              {filteredToolTrace.length === 0 ? (
                <div className="empty-state detail-empty-state">
                  <h3>No tool traces match the current filters</h3>
                  <p className="muted">Try switching status or tool filters.</p>
                </div>
              ) : (
                filteredToolTrace.map((trace) => (
                  <article key={`${trace.toolName}-${trace.index}`} className="tool-trace-card polished-trace-card">
                    <div className="trace-card-top">
                      <div className="trace-card-title-block">
                        <p className="eyebrow">Trace #{trace.index + 1}</p>
                        <h3>{trace.toolName}</h3>
                      </div>
                      <div className="badge-row">
                        <span className={`badge ${statusTone(trace.status)}`}>
                          {statusLabel(trace.status)}
                        </span>
                        {trace.startedAt ? <span className="badge">start: {trace.startedAt}</span> : null}
                        {trace.finishedAt ? <span className="badge">finish: {trace.finishedAt}</span> : null}
                      </div>
                    </div>

                    <div className="trace-meta-grid">
                      <div className="stats-tile soft-contrast">
                        <span className="muted">Call entry</span>
                        <strong>{trace.callEntryIndex !== null ? `#${trace.callEntryIndex + 1}` : "n/a"}</strong>
                      </div>
                      <div className="stats-tile soft-contrast">
                        <span className="muted">Result entry</span>
                        <strong>{trace.resultEntryIndex !== null ? `#${trace.resultEntryIndex + 1}` : "n/a"}</strong>
                      </div>
                      <div className="stats-tile soft-contrast">
                        <span className="muted">Output size</span>
                        <strong>{trace.outputChars !== null ? `${trace.outputChars.toLocaleString()} chars` : "n/a"}</strong>
                      </div>
                    </div>

                    <div className="grid cols-2">
                      <section className="trace-pane polished-pane">
                        <p className="eyebrow">Input preview</p>
                        <p className="muted">{trace.inputPreview ?? "No captured tool-call payload."}</p>
                        {trace.input ? (
                          <details>
                            <summary>Show full input</summary>
                            <pre>{trace.input}</pre>
                          </details>
                        ) : null}
                      </section>

                      <section className="trace-pane polished-pane">
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
            <div className="detail-panel-header">
              <div>
                <p className="eyebrow">Stats</p>
                <h3>Session diagnostics</h3>
                <p className="muted">
                  A calmer diagnostic view: model, token profile, transcript composition, and tool distribution.
                </p>
              </div>
            </div>

            <div className="grid cols-2">
              <section className="card stack surface-soft">
                <p className="eyebrow">Model + source</p>
                <div className="grid cols-2">
                  <div className="stats-tile soft-contrast"><span className="muted">Model</span><strong>{session.model}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Provider</span><strong>{session.modelProvider ?? "unknown"}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Session source</span><strong>{session.dataSource}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Transcript source</span><strong>{session.transcript.source}</strong></div>
                </div>
              </section>

              <section className="card stack surface-soft">
                <p className="eyebrow">Token usage</p>
                <div className="grid cols-2">
                  <div className="stats-tile soft-contrast"><span className="muted">Input</span><strong>{formatTokenCount(session.tokens.input)}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Output</span><strong>{formatTokenCount(session.tokens.output)}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Total</span><strong>{formatTokenCount(session.tokens.total)}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Context</span><strong>{formatTokenCount(session.tokens.context)}</strong></div>
                </div>
              </section>
            </div>

            <div className="grid cols-2">
              <section className="card stack surface-soft">
                <p className="eyebrow">Transcript composition</p>
                <div className="grid cols-2">
                  <div className="stats-tile soft-contrast"><span className="muted">All entries</span><strong>{transcriptMessageCount}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">User blocks</span><strong>{userBlocks}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Assistant blocks</span><strong>{assistantBlocks}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">System blocks</span><strong>{systemBlocks}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Tool calls</span><strong>{toolCallBlocks}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Tool results</span><strong>{toolResultBlocks}</strong></div>
                </div>
              </section>

              <section className="card stack surface-soft">
                <p className="eyebrow">Tool activity</p>
                <div className="grid cols-2">
                  <div className="stats-tile soft-contrast"><span className="muted">Distinct tools</span><strong>{toolOptions.length}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Traces</span><strong>{session.toolTrace.length}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Completed</span><strong>{completedToolCalls}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Waiting</span><strong>{pendingToolCalls}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Result-only</span><strong>{orphanResults}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Compaction</span><strong>{session.status.hasCompaction ? "yes" : "no"}</strong></div>
                </div>
              </section>
            </div>

            <div className="grid cols-2">
              <section className="card stack surface-soft">
                <p className="eyebrow">Top tools</p>
                {toolCounts.length === 0 ? (
                  <p className="muted">No tool traces captured for this session.</p>
                ) : (
                  <div className="list">
                    {toolCounts.map((tool) => (
                      <div key={tool.toolName} className="stats-row elevated-row">
                        <span>{tool.toolName}</span>
                        <strong>{tool.count}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="card stack surface-soft">
                <p className="eyebrow">Session state</p>
                <div className="grid cols-2">
                  <div className="stats-tile soft-contrast"><span className="muted">Kind</span><strong>{session.kind}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Channel</span><strong>{session.channel}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Agent</span><strong>{session.agentId ?? "unknown"}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Aborted</span><strong>{session.status.abortedLastRun ? "yes" : "no"}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Subagent</span><strong>{session.status.hasSubagent ? "yes" : "no"}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Warnings</span><strong>{meta.warnings?.length ? meta.warnings.length : 0}</strong></div>
                </div>
              </section>
            </div>
          </div>
        ) : currentTab === "export" ? (
          <div className="stack">
            <div className="detail-panel-header">
              <div>
                <p className="eyebrow">Export</p>
                <h3>Portable debug bundle</h3>
                <p className="muted">
                  Export the current session as structured JSON or clean Markdown, ready for issues, docs, or sharing with other people.
                </p>
              </div>
            </div>

            <div className="grid cols-2">
              <section className="card stack surface-soft export-panel">
                <p className="eyebrow">JSON bundle</p>
                <h3>Structured and machine-friendly</h3>
                <p className="muted">
                  Includes normalized session detail, tool traces, transcript, metadata, and summary counts.
                </p>
                <a href={`${session.apiPath}/export?format=json`} className="primary-action export-button">
                  Export JSON bundle
                </a>
              </section>

              <section className="card stack surface-soft export-panel">
                <p className="eyebrow">Markdown</p>
                <h3>Readable and easy to paste</h3>
                <p className="muted">
                  Best for GitHub issues, chats, notes, and quick sharing with humans.
                </p>
                <a href={`${session.apiPath}/export?format=md`} className="secondary-action export-button">
                  Export Markdown
                </a>
              </section>
            </div>

            <div className="grid cols-2">
              <section className="card stack surface-soft">
                <p className="eyebrow">Bundle contents</p>
                <div className="grid cols-2">
                  <div className="stats-tile soft-contrast"><span className="muted">Transcript entries</span><strong>{transcriptMessageCount}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Tool traces</span><strong>{session.toolTrace.length}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Warnings</span><strong>{meta.warnings?.length ? meta.warnings.length : 0}</strong></div>
                  <div className="stats-tile soft-contrast"><span className="muted">Sources</span><strong>{session.dataSource} / {session.transcript.source}</strong></div>
                </div>
              </section>

              <section className="card stack surface-soft">
                <p className="eyebrow">Recommended use</p>
                <ul className="muted">
                  <li>Use JSON when you want structure, reprocessing, or future import.</li>
                  <li>Use Markdown when you want something presentable immediately.</li>
                  <li>Both formats include transcript, tool traces, and summary metadata.</li>
                </ul>
              </section>
            </div>
          </div>
        ) : (
          <div className="stack">
            <div className="detail-panel-header">
              <div>
                <p className="eyebrow">Transcript</p>
                <h3>Message flow</h3>
                <p className="muted">
                  Inspect the full turn sequence, then jump into tool traces when a block deserves a closer look.
                </p>
              </div>
            </div>

            <div className="transcript-toolbar">
              <div className="badge-row">
                <span className="badge">
                  Showing {transcriptStart}-{transcriptEnd} of {transcriptMessageCount}
                </span>
                <span className="badge">Page {transcriptPage} / {transcriptPageCount}</span>
              </div>

              <div className="badge-row">
                {[12, 24, 48].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setTranscriptPageSize(size)}
                    className={`detail-filter-chip ${transcriptPageSize === size ? "active" : ""}`}
                  >
                    {size} / page
                  </button>
                ))}
              </div>

              <div className="badge-row">
                <button
                  type="button"
                  onClick={() => setTranscriptPage(1)}
                  className="detail-filter-chip"
                  disabled={transcriptPage === 1}
                >
                  First
                </button>
                <button
                  type="button"
                  onClick={() => setTranscriptPage((current) => Math.max(1, current - 1))}
                  className="detail-filter-chip"
                  disabled={transcriptPage === 1}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setTranscriptPage((current) => Math.min(transcriptPageCount, current + 1))}
                  className="detail-filter-chip"
                  disabled={transcriptPage === transcriptPageCount}
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={() => setTranscriptPage(transcriptPageCount)}
                  className="detail-filter-chip"
                  disabled={transcriptPage === transcriptPageCount}
                >
                  Latest
                </button>
              </div>
            </div>

            <div className="list">
              {pagedTranscriptMessages.map((message) => (
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
                        className="detail-filter-chip"
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
