import Link from "next/link";
import { notFound } from "next/navigation";
import { formatTokenCount, type ToolTraceEntry } from "../../../lib/normalizers";
import { getSessionDetailResponse } from "../../../lib/session-adapter";

export const dynamic = "force-dynamic";

type DetailTab = "transcript" | "tools";
type ToolTraceStatusFilter = "all" | ToolTraceEntry["status"];
type DetailSearchParams = {
  tab?: string | string[];
  status?: string | string[];
  tool?: string | string[];
};

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<DetailSearchParams>;
}) {
  const [{ key }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const { data: session, meta } = await getSessionDetailResponse(key);

  if (!session) {
    notFound();
  }

  const currentTab = normalizeTab(firstString(resolvedSearchParams.tab));
  const statusFilter = normalizeStatusFilter(firstString(resolvedSearchParams.status));
  const toolFilter = normalizeToolFilter(firstString(resolvedSearchParams.tool));
  const baseHref = session.href;
  const toolOptions = Array.from(
    new Set(session.toolTrace.map((trace) => trace.toolName)),
  ).sort((left, right) => left.localeCompare(right));
  const filteredToolTrace = session.toolTrace.filter((trace) => {
    if (statusFilter !== "all" && trace.status !== statusFilter) {
      return false;
    }

    if (toolFilter !== "all" && trace.toolName !== toolFilter) {
      return false;
    }

    return true;
  });
  const completedToolCalls = session.toolTrace.filter(
    (trace) => trace.status === "completed",
  ).length;
  const pendingToolCalls = session.toolTrace.filter(
    (trace) => trace.status === "pending",
  ).length;
  const orphanResults = session.toolTrace.filter(
    (trace) => trace.status === "orphan-result",
  ).length;

  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Session detail</p>
          <h2>{session.displayName}</h2>
          <p className="muted">
            Read-only inspector view for one session. Transcript prefers live
            Gateway history and falls back to local transcript files when
            needed.
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
          {session.status.hasCompaction ? (
            <span className="badge warn">compacted</span>
          ) : null}
          {session.status.hasSubagent ? (
            <span className="badge good">subagent</span>
          ) : null}
          {session.status.abortedLastRun ? (
            <span className="badge bad">aborted</span>
          ) : null}
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
          <Link
            href={buildDetailHref(baseHref, { tab: "transcript" })}
            className={`tab-link ${currentTab === "transcript" ? "active" : ""}`}
          >
            Transcript
          </Link>
          <Link
            href={buildDetailHref(baseHref, {
              tab: "tools",
              status: statusFilter,
              tool: toolFilter,
            })}
            className={`tab-link ${currentTab === "tools" ? "active" : ""}`}
          >
            Tool trace
          </Link>
        </div>

        {currentTab === "tools" ? (
          <div className="stack">
            <div>
              <p className="eyebrow">Tools</p>
              <h3>Tool trace</h3>
              <p className="muted">
                This view pairs tool calls with tool results so you can inspect
                the actual shape of a run instead of reading raw transcript
                blocks one by one.
              </p>
            </div>

            <div className="grid cols-2">
              <section className="card stack">
                <p className="eyebrow">Status filter</p>
                <div className="badge-row">
                  {(["all", "completed", "pending", "orphan-result"] as const).map((status) => (
                    <Link
                      key={status}
                      href={buildDetailHref(baseHref, {
                        tab: "tools",
                        status,
                        tool: toolFilter,
                      })}
                      className={`tab-link ${statusFilter === status ? "active" : ""}`}
                    >
                      {statusLabel(status)}
                    </Link>
                  ))}
                </div>
              </section>

              <section className="card stack">
                <p className="eyebrow">Tool filter</p>
                <div className="badge-row">
                  <Link
                    href={buildDetailHref(baseHref, {
                      tab: "tools",
                      status: statusFilter,
                      tool: "all",
                    })}
                    className={`tab-link ${toolFilter === "all" ? "active" : ""}`}
                  >
                    All tools
                  </Link>
                  {toolOptions.map((toolName) => (
                    <Link
                      key={toolName}
                      href={buildDetailHref(baseHref, {
                        tab: "tools",
                        status: statusFilter,
                        tool: toolName,
                      })}
                      className={`tab-link ${toolFilter === toolName ? "active" : ""}`}
                    >
                      {toolName}
                    </Link>
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
                  <p className="muted">
                    Try switching status or tool filters to widen the current
                    view.
                  </p>
                  <div className="badge-row">
                    <Link
                      href={buildDetailHref(baseHref, { tab: "tools" })}
                      className="tab-link active"
                    >
                      Reset filters
                    </Link>
                  </div>
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
        ) : (
          <div className="stack">
            <div>
              <p className="eyebrow">Transcript</p>
              <h3>Message flow</h3>
              <p className="muted">
                Tool calls and tool results are surfaced as separate transcript
                entries, which is much closer to the final inspector
                experience.
              </p>
            </div>

            <div className="list">
              {session.transcript.messages.map((message) => (
                <article
                  key={`${message.messageType}-${message.index}`}
                  className={`transcript-item ${message.messageType}`}
                >
                  <div className="badge-row">
                    <span className="badge">#{message.index + 1}</span>
                    <span className="badge">{message.role}</span>
                    <span className="badge">{message.messageType}</span>
                    {message.toolName ? (
                      <Link
                        href={buildDetailHref(baseHref, {
                          tab: "tools",
                          tool: message.toolName,
                        })}
                        className="tab-link"
                      >
                        {message.toolName}
                      </Link>
                    ) : null}
                    {message.timestamp ? (
                      <span className="badge">{message.timestamp}</span>
                    ) : null}
                    {message.isCollapsedDefault ? (
                      <span className="badge warn">collapse later</span>
                    ) : null}
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

function firstString(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeTab(value?: string): DetailTab {
  return value === "tools" ? "tools" : "transcript";
}

function normalizeStatusFilter(value?: string): ToolTraceStatusFilter {
  return value === "completed" || value === "pending" || value === "orphan-result"
    ? value
    : "all";
}

function normalizeToolFilter(value?: string): string {
  return value?.trim() ? value : "all";
}

function buildDetailHref(
  baseHref: string,
  options: {
    tab?: DetailTab;
    status?: ToolTraceStatusFilter;
    tool?: string;
  },
): string {
  const search = new URLSearchParams();

  if (options.tab && options.tab !== "transcript") {
    search.set("tab", options.tab);
  }

  if (options.status && options.status !== "all") {
    search.set("status", options.status);
  }

  if (options.tool && options.tool !== "all") {
    search.set("tool", options.tool);
  }

  const query = search.toString();
  return query ? `${baseHref}?${query}` : baseHref;
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
