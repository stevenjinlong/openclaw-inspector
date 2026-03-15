"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  formatTokenCount,
  type ResponseMeta,
  type SessionDetailRecord,
  type ToolTraceEntry,
} from "../lib/normalizers";
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  CopyIcon,
  DatabaseIcon,
  MaintenanceIcon,
  NetworkIcon,
  PauseCircleIcon,
  SearchIcon,
  SessionsIcon,
  ShieldIcon,
  SparklesIcon,
} from "./ui-icons";

type DetailTab = "transcript" | "tools" | "topology" | "stats" | "export";
type LiveStatusCode = "idle" | "llm-running" | "tools-running" | "possibly-stuck";
type ToolTraceStatusFilter = "all" | ToolTraceEntry["status"];

export function SessionDetailView({
  session,
  meta,
  initialTab,
  initialStatusFilter,
  initialToolFilter,
  initialTranscriptPage,
  focusMessageIndex,
  focusQuery,
}: {
  session: SessionDetailRecord;
  meta: ResponseMeta;
  initialTab: DetailTab;
  initialStatusFilter: ToolTraceStatusFilter;
  initialToolFilter: string;
  initialTranscriptPage: number;
  focusMessageIndex: number | null;
  focusQuery: string;
}) {
  const [currentTab, setCurrentTab] = useState<DetailTab>(initialTab);
  const [statusFilter, setStatusFilter] = useState<ToolTraceStatusFilter>(initialStatusFilter);
  const [toolFilter, setToolFilter] = useState(initialToolFilter);
  const [liveStatus, setLiveStatus] = useState<{
    statusCode: LiveStatusCode;
    label: string;
    reason: string;
  } | null>(null);
  const [topology, setTopology] = useState<{
    root: {
      key: string;
      displayName: string;
      href: string | null;
      channel: string | null;
      kind: string | null;
      model: string | null;
      evidenceCount: number;
      exists: boolean;
    };
    children: Array<{
      key: string;
      displayName: string;
      href: string | null;
      channel: string | null;
      kind: string | null;
      model: string | null;
      evidenceCount: number;
      exists: boolean;
    }>;
  } | null>(null);
  const [topologyLoading, setTopologyLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

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

  const focusMessage = useMemo(
    () =>
      focusMessageIndex === null
        ? null
        : session.transcript.messages.find((message) => message.index === focusMessageIndex) ?? null,
    [session.transcript.messages, focusMessageIndex],
  );

  const completedToolCalls = session.toolTrace.filter((trace) => trace.status === "completed").length;
  const pendingToolCalls = session.toolTrace.filter((trace) => trace.status === "pending").length;
  const orphanResults = session.toolTrace.filter((trace) => trace.status === "orphan-result").length;
  const [toolTracePageSize, setToolTracePageSize] = useState<number>(6);
  const toolTracePageCount = Math.max(1, Math.ceil(filteredToolTrace.length / toolTracePageSize));
  const [toolTracePage, setToolTracePage] = useState<number>(1);
  const pagedToolTrace = useMemo(() => {
    const startIndex = (toolTracePage - 1) * toolTracePageSize;
    return filteredToolTrace.slice(startIndex, startIndex + toolTracePageSize);
  }, [filteredToolTrace, toolTracePage, toolTracePageSize]);
  const toolTraceStart = filteredToolTrace.length === 0 ? 0 : (toolTracePage - 1) * toolTracePageSize + 1;
  const toolTraceEnd = Math.min(toolTracePage * toolTracePageSize, filteredToolTrace.length);
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
  const issueTitle = useMemo(() => buildIssueTitle(session), [session]);
  const issueBody = useMemo(() => buildIssueBody(session, meta), [session, meta]);

  const [transcriptPageSize, setTranscriptPageSize] = useState<number>(12);
  const transcriptPageCount = Math.max(1, Math.ceil(transcriptMessageCount / transcriptPageSize));
  const [transcriptPage, setTranscriptPage] = useState<number>(initialTranscriptPage);
  const pagedTranscriptMessages = useMemo(() => {
    const startIndex = (transcriptPage - 1) * transcriptPageSize;
    return session.transcript.messages.slice(startIndex, startIndex + transcriptPageSize);
  }, [session.transcript.messages, transcriptPage, transcriptPageSize]);
  const transcriptStart = transcriptMessageCount === 0 ? 0 : (transcriptPage - 1) * transcriptPageSize + 1;
  const transcriptEnd = Math.min(transcriptPage * transcriptPageSize, transcriptMessageCount);

  useEffect(() => {
    let cancelled = false;

    async function fetchStatus() {
      try {
        const response = await fetch(`${session.apiPath}/status`);

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          ok: boolean;
          statusCode: LiveStatusCode;
          label: string;
          reason: string;
        };

        if (!cancelled && payload.ok) {
          setLiveStatus({
            statusCode: payload.statusCode,
            label: payload.label,
            reason: payload.reason,
          });
        }
      } catch {
        // Best-effort only.
      }
    }

    fetchStatus();
    const intervalId = window.setInterval(fetchStatus, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [session.apiPath]);

  useEffect(() => {
    if (currentTab !== "topology" || topology || topologyLoading) {
      return;
    }

    let cancelled = false;
    setTopologyLoading(true);

    fetch(`${session.apiPath}/topology`)
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return response.json();
      })
      .then((payload) => {
        if (!cancelled && payload?.data) {
          setTopology(payload.data);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTopologyLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentTab, topology, topologyLoading, session.apiPath]);

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

  useEffect(() => {
    setToolTracePage((current) => Math.min(Math.max(current, 1), toolTracePageCount));
  }, [toolTracePageCount]);

  useEffect(() => {
    if (!copyFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopyFeedback(null), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [copyFeedback]);

  return (
    <div className="stack detail-shell">
      <div className="page-title">
        <div className="title-with-icon">
          <span className="page-icon-badge">
            <SessionsIcon className="icon icon-lg" />
          </span>
          <div>
            <p className="eyebrow">Session detail</p>
            <h2>{session.displayName}</h2>
            <p className="muted detail-subtitle">
              A read-only inspection surface for one session, with tabs and tool filters kept on the client for instant interaction.
            </p>
          </div>
        </div>
        <Link href="/sessions" className="secondary-action">
          <ArrowLeftIcon className="icon icon-sm" />
          Back to sessions
        </Link>
      </div>

      <section className="card detail-hero surface-soft">
        <div className="detail-hero-copy stack">
          <div className="badge-row">
            {(() => {
              const statusMeta = getLiveStatusMeta(liveStatus?.statusCode ?? "idle");
              const StatusIcon = statusMeta.icon;

              return (
                <span
                  className={`badge status-badge status-${liveStatus?.statusCode ?? "idle"}`}
                  title={liveStatus?.reason ?? statusMeta.description}
                >
                  <StatusIcon className="icon icon-sm" />
                  {liveStatus?.label ?? "IDLE"}
                </span>
              );
            })()}
            <span className="badge meta-badge meta-badge-kind">
              <SessionsIcon className="icon icon-sm" />
              {session.kind}
            </span>
            <span className="badge meta-badge meta-badge-channel">
              <ActivityIcon className="icon icon-sm" />
              {session.channel}
            </span>
            <span className="badge meta-badge meta-badge-model">
              <SparklesIcon className="icon icon-sm" />
              {session.model}
            </span>
            <span className="badge meta-badge meta-badge-provider">
              <DatabaseIcon className="icon icon-sm" />
              {meta.adapter.label}
            </span>
            <span className="badge meta-badge meta-badge-source">
              <ShieldIcon className="icon icon-sm" />
              transcript: {session.transcript.source}
            </span>
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

      {focusMessage ? (
        <section className="card stack surface-soft search-focus-card">
          <div className="detail-panel-header search-focus-header">
            <div>
              <p className="eyebrow">Search match</p>
              <h3>{focusMessage.title}</h3>
              <p className="muted">
                This card highlights the exact transcript message that matched your search query.
              </p>
            </div>
            <div className="badge-row">
              {focusQuery ? (
                <Link href={`/search?q=${encodeURIComponent(focusQuery)}`} className="secondary-action">
                  <SearchIcon className="icon icon-sm" />
                  Back to search
                </Link>
              ) : null}
              <button
                type="button"
                className="primary-action"
                onClick={() => {
                  setCurrentTab("transcript");
                  setTranscriptPage(Math.floor(focusMessage.index / transcriptPageSize) + 1);
                  requestAnimationFrame(() => {
                    document.getElementById(`message-${focusMessage.index}`)?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  });
                }}
              >
                Jump in transcript
              </button>
            </div>
          </div>

          <div className="badge-row">
            <span className="badge">#{focusMessage.index + 1}</span>
            <span className="badge">{focusMessage.role}</span>
            <span className="badge">{focusMessage.messageType}</span>
            {focusMessage.timestamp ? <span className="badge">{focusMessage.timestamp}</span> : null}
            {focusQuery ? <span className="badge meta-badge meta-badge-channel">query: {focusQuery}</span> : null}
          </div>

          <article className={`transcript-item ${focusMessage.messageType} search-focus-message`}>
            <pre>{focusMessage.content}</pre>
          </article>
        </section>
      ) : null}

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
            <p className="eyebrow">Inspection tabs</p>
            <h3>{tabLabel(currentTab)}</h3>
          </div>
          <div className="badge-row detail-tab-row">
            {([
              ["transcript", "Transcript"],
              ["tools", "Tool trace"],
              ["topology", "Topology"],
              ["stats", "Stats"],
              ["export", "Export"],
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setCurrentTab(tab)}
                className={`detail-tab-pill ${currentTab === tab ? "active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {currentTab === "tools" ? (
          <div className="stack">
            <div className="detail-panel-header">
              <div className="stack compact-gap">
                <p className="eyebrow">Tool trace filters</p>
                <h3>Filter tool activity by status or tool name</h3>
              </div>
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
            </div>

            <div className="grid cols-3 responsive-grid">
              <div className="stats-tile soft-contrast">
                <span className="muted">Completed</span>
                <strong>{completedToolCalls}</strong>
              </div>
              <div className="stats-tile soft-contrast">
                <span className="muted">Pending</span>
                <strong>{pendingToolCalls}</strong>
              </div>
              <div className="stats-tile soft-contrast">
                <span className="muted">Result-only</span>
                <strong>{orphanResults}</strong>
              </div>
            </div>

            <div className="transcript-toolbar">
              <div className="badge-row transcript-toolbar-group transcript-toolbar-meta">
                <span className="badge toolbar-page-badge">
                  Showing {toolTraceStart}-{toolTraceEnd} of {filteredToolTrace.length}
                </span>
                <span className="badge toolbar-page-badge">Page {toolTracePage} / {toolTracePageCount}</span>
              </div>

              <div className="badge-row transcript-toolbar-group">
                {[6, 12, 24].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setToolTracePageSize(size)}
                    className={`detail-filter-chip ${toolTracePageSize === size ? "active" : ""}`}
                  >
                    {size} / page
                  </button>
                ))}
              </div>

              <div className="badge-row transcript-toolbar-group transcript-toolbar-pagination">
                <button
                  type="button"
                  onClick={() => setToolTracePage(1)}
                  className="detail-filter-chip"
                  disabled={toolTracePage === 1}
                >
                  « First
                </button>
                <button
                  type="button"
                  onClick={() => setToolTracePage((current) => Math.max(1, current - 1))}
                  className="detail-filter-chip"
                  disabled={toolTracePage === 1}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={() => setToolTracePage((current) => Math.min(toolTracePageCount, current + 1))}
                  className="detail-filter-chip"
                  disabled={toolTracePage === toolTracePageCount}
                >
                  Next →
                </button>
                <button
                  type="button"
                  onClick={() => setToolTracePage(toolTracePageCount)}
                  className="detail-filter-chip"
                  disabled={toolTracePage === toolTracePageCount}
                >
                  Latest »
                </button>
              </div>
            </div>

            <div className="list">
              {filteredToolTrace.length === 0 ? (
                <div className="empty-state detail-empty-state">
                  <h3>No tool traces match the current filters</h3>
                  <p className="muted">Try switching status or tool filters.</p>
                </div>
              ) : (
                pagedToolTrace.map((trace) => (
                  <article key={`${trace.toolName}-${trace.index}`} className="tool-trace-card polished-trace-card">
                    <div className="trace-card-top">
                      <div className="trace-card-title-block">
                        <p className="eyebrow">Trace #{trace.index + 1}</p>
                        <h3>{trace.toolName}</h3>
                      </div>
                      <span className={`badge ${statusTone(trace.status)}`}>{statusLabel(trace.status)}</span>
                    </div>

                    <div className="trace-meta-grid">
                      <div className="stats-tile soft-contrast polished-pane">
                        <span className="muted">Call entry</span>
                        <strong>{trace.callEntryIndex === null ? "n/a" : `#${trace.callEntryIndex + 1}`}</strong>
                      </div>
                      <div className="stats-tile soft-contrast polished-pane">
                        <span className="muted">Result entry</span>
                        <strong>{trace.resultEntryIndex === null ? "n/a" : `#${trace.resultEntryIndex + 1}`}</strong>
                      </div>
                      <div className="stats-tile soft-contrast polished-pane">
                        <span className="muted">Output chars</span>
                        <strong>{trace.outputChars?.toLocaleString() ?? "n/a"}</strong>
                      </div>
                    </div>

                    <div className="grid cols-2">
                      <section className="trace-pane polished-pane stack">
                        <p className="eyebrow">Input</p>
                        <pre>{trace.input ?? "No tool input captured."}</pre>
                      </section>
                      <section className="trace-pane polished-pane stack">
                        <p className="eyebrow">Output</p>
                        <pre>{trace.output ?? "No tool output captured yet."}</pre>
                      </section>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        ) : currentTab === "topology" ? (
          <div className="stack">
            <div className="detail-panel-header">
              <div>
                <p className="eyebrow">Subagent topology</p>
                <h3>Referenced subagent sessions</h3>
                <p className="muted">
                  First-pass topology inferred from subagent session keys mentioned in transcript or tool payloads.
                </p>
              </div>
              {topology ? <span className="badge">children: {topology.children.length}</span> : null}
            </div>

            {topologyLoading ? (
              <div className="card stack surface-soft">
                <p className="muted">Loading topology…</p>
              </div>
            ) : !topology || topology.children.length === 0 ? (
              <div className="empty-state detail-empty-state">
                <h3>No referenced subagent sessions found</h3>
                <p className="muted">
                  This session does not currently expose any subagent session keys in transcript or tool activity.
                </p>
              </div>
            ) : (
              <div className="topology-shell">
                <div className="topology-root-card">
                  <div className="badge-row">
                    <span className="badge meta-badge meta-badge-kind">
                      <NetworkIcon className="icon icon-sm" />
                      root
                    </span>
                    {topology.root.channel ? <span className="badge">{topology.root.channel}</span> : null}
                    {topology.root.kind ? <span className="badge">{topology.root.kind}</span> : null}
                  </div>
                  <h3>{topology.root.displayName}</h3>
                  <p className="muted mono">{topology.root.key}</p>
                </div>

                <div className="topology-children-list">
                  {topology.children.map((child) => {
                    const node = (
                      <div className="topology-node-content">
                        <div className="badge-row">
                          <span className="badge meta-badge meta-badge-channel">
                            <NetworkIcon className="icon icon-sm" />
                            subagent
                          </span>
                          <span className="badge">evidence: {child.evidenceCount}</span>
                          {child.exists ? <span className="badge good">indexed</span> : <span className="badge warn">external</span>}
                        </div>
                        <strong>{child.displayName}</strong>
                        <span className="muted mono">{child.key}</span>
                        <div className="badge-row">
                          {child.channel ? <span className="badge">{child.channel}</span> : null}
                          {child.kind ? <span className="badge">{child.kind}</span> : null}
                          {child.model ? <span className="badge">{child.model}</span> : null}
                        </div>
                      </div>
                    );

                    return child.href ? (
                      <Link key={child.key} href={child.href} className="topology-node elevated-row">
                        {node}
                      </Link>
                    ) : (
                      <div key={child.key} className="topology-node">
                        {node}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : currentTab === "stats" ? (
          <div className="grid cols-2">
            <section className="card stack surface-soft">
              <div>
                <p className="eyebrow">Session stats</p>
                <h3>Token and message composition</h3>
              </div>
              <div className="kv compact-kv">
                <span className="muted">Model</span>
                <span>{session.model}</span>
                <span className="muted">Provider</span>
                <span>{session.modelProvider ?? "unknown"}</span>
                <span className="muted">Context</span>
                <span>{formatTokenCount(session.tokens.context)}</span>
                <span className="muted">Total</span>
                <span>{formatTokenCount(session.tokens.total)}</span>
                <span className="muted">Transcript messages</span>
                <span>{transcriptMessageCount}</span>
                <span className="muted">User blocks</span>
                <span>{userBlocks}</span>
                <span className="muted">Assistant blocks</span>
                <span>{assistantBlocks}</span>
                <span className="muted">System blocks</span>
                <span>{systemBlocks}</span>
                <span className="muted">Tool calls</span>
                <span>{toolCallBlocks}</span>
                <span className="muted">Tool results</span>
                <span>{toolResultBlocks}</span>
              </div>
            </section>

            <section className="card stack surface-soft">
              <div>
                <p className="eyebrow">Tool stats</p>
                <h3>Top tools in this session</h3>
              </div>
              {toolCounts.length === 0 ? (
                <p className="muted">No tool activity recorded.</p>
              ) : (
                <div className="list">
                  {toolCounts.map((entry) => (
                    <div key={entry.toolName} className="stats-row">
                      <span>{entry.toolName}</span>
                      <strong>{entry.count}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : currentTab === "export" ? (
          <div className="grid cols-2">
            <section className="card stack surface-soft export-panel">
              <div className="stack compact-gap">
                <p className="eyebrow">Download</p>
                <h3>Session export bundle</h3>
                <p className="muted">
                  Export this session as JSON or Markdown for documentation, issues, or external analysis.
                </p>
              </div>
              <div className="badge-row">
                <a
                  href={`${session.apiPath}/export?format=json`}
                  className="primary-action export-button"
                  download
                >
                  Export JSON bundle
                </a>
                <a
                  href={`${session.apiPath}/export?format=md`}
                  className="secondary-action export-button"
                  download
                >
                  Export Markdown
                </a>
              </div>
              <div className="badge-row">
                <button
                  type="button"
                  className="secondary-action export-button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(issueTitle);
                    setCopyFeedback("Copied issue title");
                  }}
                >
                  <CopyIcon className="icon icon-sm" />
                  Copy issue title
                </button>
                <button
                  type="button"
                  className="secondary-action export-button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(issueBody);
                    setCopyFeedback("Copied GitHub issue body");
                  }}
                >
                  <CopyIcon className="icon icon-sm" />
                  Copy issue body
                </button>
              </div>
              {copyFeedback ? <p className="muted">{copyFeedback}</p> : null}
            </section>

            <section className="card stack surface-soft">
              <p className="eyebrow">Recommended use</p>
              <ul className="muted">
                <li>Use JSON when you want structure, reprocessing, or future import.</li>
                <li>Use Markdown when you want something presentable immediately.</li>
                <li>Use the issue template buttons when you want a ready-to-paste GitHub issue summary.</li>
                <li>Both formats include transcript, tool traces, and summary metadata.</li>
              </ul>
            </section>
          </div>
        ) : (
          <div className="stack">
            <div className="detail-panel-header">
              <div>
                <p className="eyebrow">Transcript</p>
                <h3>Message flow</h3>
              </div>
              <div className="badge-row">
                <span className="badge">messages: {transcriptMessageCount}</span>
                <span className="badge">source: {session.transcript.source}</span>
              </div>
            </div>

            <div className="transcript-toolbar">
              <div className="badge-row transcript-toolbar-group transcript-toolbar-meta">
                <span className="badge toolbar-page-badge">
                  Showing {transcriptStart}-{transcriptEnd} of {transcriptMessageCount}
                </span>
                <span className="badge toolbar-page-badge">Page {transcriptPage} / {transcriptPageCount}</span>
              </div>

              <div className="badge-row transcript-toolbar-group">
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

              <div className="badge-row transcript-toolbar-group transcript-toolbar-pagination">
                <button
                  type="button"
                  onClick={() => setTranscriptPage(1)}
                  className="detail-filter-chip"
                  disabled={transcriptPage === 1}
                >
                  « First
                </button>
                <button
                  type="button"
                  onClick={() => setTranscriptPage((current) => Math.max(1, current - 1))}
                  className="detail-filter-chip"
                  disabled={transcriptPage === 1}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={() => setTranscriptPage((current) => Math.min(transcriptPageCount, current + 1))}
                  className="detail-filter-chip"
                  disabled={transcriptPage === transcriptPageCount}
                >
                  Next →
                </button>
                <button
                  type="button"
                  onClick={() => setTranscriptPage(transcriptPageCount)}
                  className="detail-filter-chip"
                  disabled={transcriptPage === transcriptPageCount}
                >
                  Latest »
                </button>
              </div>
            </div>

            <div className="list">
              {pagedTranscriptMessages.map((message) => (
                <article
                  key={`${message.messageType}-${message.index}`}
                  id={`message-${message.index}`}
                  className={`transcript-item ${message.messageType}`}
                >
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

function buildIssueTitle(session: SessionDetailRecord): string {
  return `[Inspector] ${session.displayName} · ${session.channel} · ${session.kind}`;
}

function buildIssueBody(session: SessionDetailRecord, meta: ResponseMeta): string {
  const recentTranscript = session.transcript.messages.slice(-5)
    .map((message) => `- [${message.role} / ${message.messageType} / #${message.index + 1}] ${truncateForIssue(message.content)}`)
    .join("\n");
  const recentTools = session.toolTrace.slice(-5)
    .map((trace) => `- ${trace.toolName} · ${trace.status} · call=${trace.callEntryIndex ?? "n/a"} · result=${trace.resultEntryIndex ?? "n/a"}`)
    .join("\n");

  return [
    `## Session summary`,
    `- Name: ${session.displayName}`,
    `- Key: ${session.key}`,
    `- Agent: ${session.agentId ?? "unknown"}`,
    `- Channel: ${session.channel}`,
    `- Kind: ${session.kind}`,
    `- Model: ${session.model}`,
    `- Updated: ${session.updatedAt}`,
    `- Adapter: ${meta.adapter.label}`,
    `- Transcript source: ${session.transcript.source}`,
    ``,
    `## Recent transcript excerpt`,
    recentTranscript || `- No transcript messages recorded.`,
    ``,
    `## Recent tool activity`,
    recentTools || `- No tool activity recorded.`,
    ``,
    `## Inspector export endpoints`,
    `- JSON: ${session.apiPath}/export?format=json`,
    `- Markdown: ${session.apiPath}/export?format=md`,
  ].join("\n");
}

function truncateForIssue(value: string, maxChars = 220): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= maxChars ? compact : `${compact.slice(0, maxChars - 1)}…`;
}

function getLiveStatusMeta(statusCode: LiveStatusCode): {
  icon: typeof PauseCircleIcon;
  description: string;
} {
  if (statusCode === "llm-running") {
    return {
      icon: ActivityIcon,
      description: "Model is likely generating or waiting to emit the assistant response.",
    };
  }

  if (statusCode === "tools-running") {
    return {
      icon: MaintenanceIcon,
      description: "The session appears to have pending tool calls in flight.",
    };
  }

  if (statusCode === "possibly-stuck") {
    return {
      icon: AlertTriangleIcon,
      description: "The session has been waiting unusually long for a response or tool result.",
    };
  }

  return {
    icon: PauseCircleIcon,
    description: "No recent in-flight work detected for this session.",
  };
}

function tabLabel(tab: DetailTab): string {
  if (tab === "tools") return "Tool trace";
  if (tab === "topology") return "Topology";
  if (tab === "stats") return "Stats";
  if (tab === "export") return "Export";
  return "Transcript";
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
