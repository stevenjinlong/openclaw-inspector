import type { ResponseMeta, SessionDetailRecord } from "./normalizers";

export interface SessionExportBundle {
  exportedAt: string;
  session: SessionDetailRecord;
  meta: ResponseMeta;
  summary: {
    transcriptEntries: number;
    toolTraces: number;
    completedToolTraces: number;
    pendingToolTraces: number;
    orphanToolResults: number;
    transcriptSource: string;
    dataSource: string;
    warnings: string[];
  };
}

export function buildSessionExportBundle(
  session: SessionDetailRecord,
  meta: ResponseMeta,
): SessionExportBundle {
  return {
    exportedAt: new Date().toISOString(),
    session,
    meta,
    summary: {
      transcriptEntries: session.transcript.messages.length,
      toolTraces: session.toolTrace.length,
      completedToolTraces: session.toolTrace.filter((trace) => trace.status === "completed").length,
      pendingToolTraces: session.toolTrace.filter((trace) => trace.status === "pending").length,
      orphanToolResults: session.toolTrace.filter((trace) => trace.status === "orphan-result").length,
      transcriptSource: session.transcript.source,
      dataSource: session.dataSource,
      warnings: meta.warnings ?? [],
    },
  };
}

export function renderSessionMarkdown(bundle: SessionExportBundle): string {
  const { session, meta, summary } = bundle;
  const lines: string[] = [];

  lines.push(`# Session Export — ${session.displayName}`);
  lines.push("");
  lines.push(`Exported at: ${bundle.exportedAt}`);
  lines.push(`Session key: ${session.key}`);
  lines.push(`Kind: ${session.kind}`);
  lines.push(`Channel: ${session.channel}`);
  lines.push(`Agent: ${session.agentId ?? "unknown"}`);
  lines.push(`Model: ${session.model}`);
  lines.push(`Provider: ${session.modelProvider ?? "unknown"}`);
  lines.push(`Session source: ${session.dataSource}`);
  lines.push(`Transcript source: ${session.transcript.source}`);
  lines.push(`Updated: ${session.updatedAt}`);
  lines.push("");

  lines.push("## Token usage");
  lines.push("");
  lines.push(`- Input: ${formatNumberOrNA(session.tokens.input)}`);
  lines.push(`- Output: ${formatNumberOrNA(session.tokens.output)}`);
  lines.push(`- Total: ${formatNumberOrNA(session.tokens.total)}`);
  lines.push(`- Context: ${formatNumberOrNA(session.tokens.context)}`);
  lines.push(`- Fresh: ${session.tokens.fresh ? "yes" : "no"}`);
  lines.push("");

  lines.push("## Tool trace summary");
  lines.push("");
  lines.push(`- Tool traces: ${summary.toolTraces}`);
  lines.push(`- Completed: ${summary.completedToolTraces}`);
  lines.push(`- Waiting for result: ${summary.pendingToolTraces}`);
  lines.push(`- Result-only: ${summary.orphanToolResults}`);
  lines.push("");

  lines.push("## Adapter notes");
  lines.push("");
  meta.adapter.notes.forEach((note) => {
    lines.push(`- ${note}`);
  });

  if ((meta.warnings ?? []).length > 0) {
    lines.push("");
    lines.push("## Warnings");
    lines.push("");
    (meta.warnings ?? []).forEach((warning) => {
      lines.push(`- ${warning}`);
    });
  }

  lines.push("");
  lines.push("## Tool traces");
  lines.push("");

  if (session.toolTrace.length === 0) {
    lines.push("No tool traces captured.");
  } else {
    session.toolTrace.forEach((trace, index) => {
      lines.push(`### ${index + 1}. ${trace.toolName}`);
      lines.push("");
      lines.push(`- Status: ${trace.status}`);
      lines.push(`- Call entry: ${trace.callEntryIndex !== null ? `#${trace.callEntryIndex + 1}` : "n/a"}`);
      lines.push(`- Result entry: ${trace.resultEntryIndex !== null ? `#${trace.resultEntryIndex + 1}` : "n/a"}`);
      lines.push(`- Started: ${trace.startedAt ?? "n/a"}`);
      lines.push(`- Finished: ${trace.finishedAt ?? "n/a"}`);
      lines.push(`- Output chars: ${trace.outputChars ?? "n/a"}`);
      lines.push("");

      if (trace.input) {
        lines.push("#### Input");
        lines.push("");
        lines.push("```json");
        lines.push(trace.input);
        lines.push("```");
        lines.push("");
      }

      if (trace.output) {
        lines.push("#### Output");
        lines.push("");
        lines.push("```");
        lines.push(trace.output);
        lines.push("```");
        lines.push("");
      }
    });
  }

  lines.push("## Transcript");
  lines.push("");

  session.transcript.messages.forEach((message) => {
    lines.push(`### #${message.index + 1} — ${message.title}`);
    lines.push("");
    lines.push(`- Role: ${message.role}`);
    lines.push(`- Type: ${message.messageType}`);
    lines.push(`- Tool: ${message.toolName ?? "n/a"}`);
    lines.push(`- Timestamp: ${message.timestamp ?? "n/a"}`);
    lines.push("");
    lines.push("```");
    lines.push(message.content);
    lines.push("```");
    lines.push("");
  });

  return lines.join("\n");
}

export function createExportFilename(
  session: SessionDetailRecord,
  extension: "json" | "md",
): string {
  const base = sanitizeFilename(session.displayName || session.key || "session-export");
  return `${base}.${extension}`;
}

function sanitizeFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "session-export";
}

function formatNumberOrNA(value: number | null): string {
  return value === null ? "n/a" : value.toLocaleString();
}
