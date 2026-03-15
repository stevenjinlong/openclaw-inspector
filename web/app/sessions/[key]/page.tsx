import Link from "next/link";
import { notFound } from "next/navigation";
import { formatTokenCount } from "../../../lib/normalizers";
import { getSessionDetailResponse } from "../../../lib/session-adapter";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ key }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const { data: session, meta } = await getSessionDetailResponse(key);

  if (!session) {
    notFound();
  }

  const currentTab = resolvedSearchParams.tab === "tools" ? "tools" : "transcript";
  const baseHref = session.href;
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
            href={baseHref}
            className={`tab-link ${currentTab === "transcript" ? "active" : ""}`}
          >
            Transcript
          </Link>
          <Link
            href={`${baseHref}?tab=tools`}
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

            <div className="grid cols-3">
              <section className="card stack">
                <p className="eyebrow">Calls</p>
                <div className="metric">{session.toolTrace.length}</div>
                <p className="muted">Derived tool traces in this session.</p>
              </section>
              <section className="card stack">
                <p className="eyebrow">Completed</p>
                <div className="metric">{completedToolCalls}</div>
                <p className="muted">Calls with a matched tool result.</p>
              </section>
              <section className="card stack">
                <p className="eyebrow">Open / orphan</p>
                <div className="metric">{pendingToolCalls + orphanResults}</div>
                <p className="muted">Pending calls or result-only records.</p>
              </section>
            </div>

            <div className="list">
              {session.toolTrace.length === 0 ? (
                <div className="empty-state">
                  <h3>No tool activity detected</h3>
                  <p className="muted">
                    This session detail did not surface any tool calls from the
                    currently loaded transcript source.
                  </p>
                </div>
              ) : (
                session.toolTrace.map((trace) => (
                  <article key={`${trace.toolName}-${trace.index}`} className="tool-trace-card">
                    <div className="badge-row">
                      <span className="badge">#{trace.index + 1}</span>
                      <span className="badge">{trace.toolName}</span>
                      <span
                        className={`badge ${
                          trace.status === "completed"
                            ? "good"
                            : trace.status === "pending"
                              ? "warn"
                              : "bad"
                        }`}
                      >
                        {trace.status}
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
                    {message.toolName ? <span className="badge">{message.toolName}</span> : null}
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
