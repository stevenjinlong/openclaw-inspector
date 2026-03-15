import type { SessionSummary as MockSessionSummary } from "./mock-data";

export type AdapterMode = "mock" | "cli" | "gateway";
export type TranscriptSource = AdapterMode | "local-file";
export type SessionKind = "direct" | "group" | "cron" | "hook" | "node" | "other";
export type TranscriptRole = "user" | "assistant" | "toolResult" | "system";
export type TranscriptMessageType =
  | "user"
  | "assistant"
  | "toolCall"
  | "toolResult"
  | "system";

export interface AdapterDescriptor {
  mode: AdapterMode;
  label: string;
  source: string;
  readOnly: boolean;
  stubbed: boolean;
  localOnly: boolean;
  nextModes: Exclude<AdapterMode, "mock">[];
  notes: string[];
}

export interface TokenUsageSnapshot {
  context: number;
  total: number | null;
  input: number | null;
  output: number | null;
  fresh: boolean;
}

export interface SessionStatusFlags {
  abortedLastRun: boolean;
  hasCompaction: boolean;
  hasSubagent: boolean;
}

export interface TranscriptEntry {
  index: number;
  role: TranscriptRole;
  title: string;
  content: string;
  messageType: TranscriptMessageType;
  isCollapsedDefault: boolean;
  timestamp: string | null;
  toolName?: string;
}

export interface ToolTraceEntry {
  index: number;
  toolName: string;
  callEntryIndex: number | null;
  resultEntryIndex: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  status: "completed" | "pending" | "orphan-result";
  input: string | null;
  output: string | null;
  inputPreview: string | null;
  outputPreview: string | null;
  outputChars: number | null;
}

export interface SessionSummaryRecord {
  key: string;
  slug: string;
  href: string;
  apiPath: string;
  displayName: string;
  kind: SessionKind;
  channel: string;
  updatedAt: string;
  updatedAtMs: number | null;
  model: string;
  modelProvider: string | null;
  agentId: string | null;
  tokens: TokenUsageSnapshot;
  status: SessionStatusFlags;
  transcriptPath: string | null;
  dataSource: AdapterMode;
}

export interface SessionModelInsights {
  latestSnapshotModel: string | null;
  latestSnapshotProvider: string | null;
  latestSnapshotAt: string | null;
  snapshotCount: number;
  mixedSnapshots: boolean;
  differsFromSummary: boolean;
}

export interface SessionDetailRecord extends SessionSummaryRecord {
  transcript: {
    source: TranscriptSource;
    path: string | null;
    messages: TranscriptEntry[];
  };
  toolTrace: ToolTraceEntry[];
  modelInsights: SessionModelInsights | null;
}

export interface ResponseMeta {
  generatedAt: string;
  adapter: AdapterDescriptor;
  note: string;
  count?: number;
  found?: boolean;
  warnings?: string[];
}

export interface RuntimeSessionLike {
  key: string;
  displayName?: string;
  label?: string;
  kind?: string;
  chatType?: string;
  channel?: string;
  updatedAt?: number | string;
  sessionId?: string;
  model?: string;
  modelProvider?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  totalTokensFresh?: boolean;
  contextTokens?: number | null;
  abortedLastRun?: boolean;
  agentId?: string;
  transcriptPath?: string;
  deliveryContext?: {
    channel?: string;
    to?: string;
    accountId?: string;
  };
  lastChannel?: string;
  origin?: {
    provider?: string;
    label?: string;
  };
}

export interface RuntimeTranscriptMessage {
  role?: string;
  toolName?: string;
  timestamp?: number | string;
  content?: Array<{
    type?: string;
    text?: string;
    thinking?: string;
    name?: string;
    id?: string;
    arguments?: unknown;
    partialJson?: string;
  }>;
}

export function createAdapterDescriptor(options?: {
  mode?: AdapterMode;
  label?: string;
  source?: string;
  stubbed?: boolean;
  localOnly?: boolean;
  notes?: string[];
}): AdapterDescriptor {
  const mode = options?.mode ?? "mock";

  const defaults: Record<AdapterMode, Omit<AdapterDescriptor, "mode" | "notes">> = {
    mock: {
      label: "Local mock adapter",
      source: "In-memory session samples normalized through route handlers",
      readOnly: true,
      stubbed: true,
      localOnly: true,
      nextModes: ["cli", "gateway"],
    },
    cli: {
      label: "Local OpenClaw CLI adapter",
      source: "Normalized output from local `openclaw ... --json` commands",
      readOnly: true,
      stubbed: false,
      localOnly: true,
      nextModes: ["gateway"],
    },
    gateway: {
      label: "Local Gateway adapter",
      source: "Normalized output from `openclaw gateway call ...`",
      readOnly: true,
      stubbed: false,
      localOnly: true,
      nextModes: ["cli"],
    },
  };

  const base = defaults[mode];
  const notes =
    options?.notes ??
    (mode === "mock"
      ? [
          "Current responses are normalized from mock data for local development.",
          "Replace the source layer later with OpenClaw CLI JSON output or Gateway-backed fetches.",
        ]
      : mode === "gateway"
        ? [
            "Primary source is a running local OpenClaw Gateway.",
            "If Gateway history is unavailable, transcript fallback can use local transcript files when present.",
          ]
        : [
            "Primary source is local OpenClaw CLI JSON output.",
            "CLI mode is a solid local fallback when Gateway calls are unavailable.",
          ]);

  return {
    mode,
    label: options?.label ?? base.label,
    source: options?.source ?? base.source,
    readOnly: true,
    stubbed: options?.stubbed ?? base.stubbed,
    localOnly: options?.localOnly ?? base.localOnly,
    nextModes: base.nextModes,
    notes,
  };
}

export function buildResponseMeta(
  adapter: AdapterDescriptor,
  overrides: Partial<ResponseMeta> = {},
): ResponseMeta {
  const note =
    adapter.mode === "mock"
      ? "This endpoint is powered by a local adapter stub. The response contract is meant to stay stable when the backing source moves to OpenClaw CLI or Gateway data."
      : adapter.mode === "gateway"
        ? adapter.localOnly
          ? "This endpoint is backed by a live local OpenClaw Gateway call, normalized into Inspector-friendly shapes."
          : "This endpoint is backed by a remote OpenClaw Gateway call, normalized into Inspector-friendly shapes."
        : "This endpoint is backed by live local OpenClaw CLI JSON output, normalized into Inspector-friendly shapes.";

  return {
    generatedAt: new Date().toISOString(),
    adapter,
    note,
    warnings: [],
    ...overrides,
  };
}

export function normalizeRuntimeSessionSummary(
  session: RuntimeSessionLike,
  source: AdapterMode,
): SessionSummaryRecord {
  const encodedKey = encodeURIComponent(session.key);
  const updatedAtMs = toTimestampMs(session.updatedAt);
  const agentId = inferAgentId(session);

  return {
    key: session.key,
    slug: encodedKey,
    href: `/sessions/${encodedKey}`,
    apiPath: `/api/sessions/${encodedKey}`,
    displayName: inferDisplayName(session),
    kind: inferSessionKind(session),
    channel: inferChannel(session),
    updatedAt: formatTimestamp(updatedAtMs),
    updatedAtMs,
    model: session.model ?? "unknown",
    modelProvider: session.modelProvider ?? null,
    agentId,
    tokens: {
      context: session.contextTokens ?? 0,
      total: session.totalTokens ?? null,
      input: session.inputTokens ?? null,
      output: session.outputTokens ?? null,
      fresh: session.totalTokensFresh ?? false,
    },
    status: {
      abortedLastRun: session.abortedLastRun ?? false,
      hasCompaction: false,
      hasSubagent: session.key.includes(":subagent:"),
    },
    transcriptPath: inferTranscriptPath(session),
    dataSource: source,
  };
}

export function normalizeRuntimeSessionDetail(options: {
  session: RuntimeSessionLike;
  source: AdapterMode;
  transcriptSource: TranscriptSource;
  transcriptMessages: RuntimeTranscriptMessage[];
  transcriptPath?: string | null;
  hasCompaction?: boolean;
  modelInsights?: SessionModelInsights | null;
}): SessionDetailRecord {
  const summary = normalizeRuntimeSessionSummary(options.session, options.source);
  const transcriptMessages = normalizeTranscriptMessages(options.transcriptMessages);

  return {
    ...summary,
    status: {
      ...summary.status,
      hasCompaction: options.hasCompaction ?? summary.status.hasCompaction,
    },
    transcript: {
      source: options.transcriptSource,
      path: options.transcriptPath ?? summary.transcriptPath,
      messages: transcriptMessages,
    },
    toolTrace: buildToolTrace(transcriptMessages),
    modelInsights: options.modelInsights ?? null,
  };
}

export function normalizeMockSessionSummary(
  session: MockSessionSummary,
): SessionSummaryRecord {
  const encodedKey = encodeURIComponent(session.key);

  return {
    key: session.key,
    slug: encodedKey,
    href: `/sessions/${encodedKey}`,
    apiPath: `/api/sessions/${encodedKey}`,
    displayName: session.displayName,
    kind: session.kind === "main" ? "direct" : session.kind,
    channel: session.channel,
    updatedAt: session.updatedAt,
    updatedAtMs: Date.parse(session.updatedAt.replace(" ", "T")),
    model: session.model,
    modelProvider: null,
    agentId: inferAgentId({ key: session.key }),
    tokens: {
      context: session.contextTokens,
      total: session.totalTokens,
      input: null,
      output: null,
      fresh: true,
    },
    status: {
      abortedLastRun: session.abortedLastRun,
      hasCompaction: session.hasCompaction,
      hasSubagent: session.hasSubagent,
    },
    transcriptPath: session.transcriptPath,
    dataSource: "mock",
  };
}

export function normalizeMockSessionDetail(
  session: MockSessionSummary,
): SessionDetailRecord {
  const summary = normalizeMockSessionSummary(session);
  const transcriptMessages = session.messages.map((message, index) => ({
    index,
    role: message.role,
    title: message.title,
    content: message.content,
    messageType: message.role,
    isCollapsedDefault: message.role === "toolResult",
    timestamp: null,
    toolName: inferToolNameFromTitle(message.title),
  })) satisfies TranscriptEntry[];

  return {
    ...summary,
    transcript: {
      source: "mock",
      path: session.transcriptPath,
      messages: transcriptMessages,
    },
    toolTrace: buildToolTrace(transcriptMessages),
    modelInsights: null,
  };
}

export function normalizeTranscriptMessages(
  messages: RuntimeTranscriptMessage[],
): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];

  messages.forEach((message) => {
    const role = normalizeRole(message.role);
    const blocks = Array.isArray(message.content) ? message.content : [];
    const timestamp = formatOptionalTimestamp(message.timestamp);

    if (blocks.length === 0) {
      entries.push({
        index: entries.length,
        role,
        title: titleForEmptyMessage(role),
        content: "[empty message]",
        messageType: role === "toolResult" ? "toolResult" : role,
        isCollapsedDefault: role === "toolResult",
        timestamp,
      });
      return;
    }

    blocks.forEach((block) => {
      const blockType = block.type ?? "unknown";

      if (blockType === "thinking") {
        const thinking = block.thinking?.trim();

        if (!thinking) {
          return;
        }

        entries.push({
          index: entries.length,
          role: "system",
          title: "Thinking",
          content: thinking,
          messageType: "system",
          isCollapsedDefault: true,
          timestamp,
        });
        return;
      }

      if (blockType === "toolCall") {
        const toolName = block.name ?? "unknown";
        const payload =
          block.partialJson ??
          prettyJson({
            id: block.id,
            name: block.name,
            arguments: block.arguments,
          });

        entries.push({
          index: entries.length,
          role: "assistant",
          title: `Tool call · ${toolName}`,
          content: payload,
          messageType: "toolCall",
          isCollapsedDefault: true,
          timestamp,
          toolName,
        });
        return;
      }

      if (blockType === "text") {
        const text = block.text?.trim() ?? "";

        if (!text) {
          return;
        }

        entries.push({
          index: entries.length,
          role,
          title: titleForTextMessage(role, message.toolName),
          content: text,
          messageType: role === "toolResult" ? "toolResult" : role,
          isCollapsedDefault: role === "toolResult",
          timestamp,
          toolName: role === "toolResult" ? message.toolName : undefined,
        });
        return;
      }

      entries.push({
        index: entries.length,
        role: "system",
        title: `Block · ${blockType}`,
        content: prettyJson(block),
        messageType: "system",
        isCollapsedDefault: true,
        timestamp,
      });
    });
  });

  return entries;
}

export function buildToolTrace(messages: TranscriptEntry[]): ToolTraceEntry[] {
  const traces: ToolTraceEntry[] = [];
  const openCalls: ToolTraceEntry[] = [];

  messages.forEach((message) => {
    if (message.messageType === "toolCall") {
      const trace: ToolTraceEntry = {
        index: traces.length,
        toolName: message.toolName ?? inferToolNameFromTitle(message.title),
        callEntryIndex: message.index,
        resultEntryIndex: null,
        startedAt: message.timestamp,
        finishedAt: null,
        status: "pending",
        input: message.content,
        output: null,
        inputPreview: createPreview(message.content),
        outputPreview: null,
        outputChars: null,
      };

      traces.push(trace);
      openCalls.push(trace);
      return;
    }

    if (message.messageType !== "toolResult") {
      return;
    }

    const toolName = message.toolName ?? inferToolNameFromTitle(message.title);
    const matchIndex = openCalls.findIndex((candidate) => candidate.toolName === toolName);
    const fallbackIndex = matchIndex === -1 ? 0 : matchIndex;
    const matchedCall = openCalls[fallbackIndex];

    if (!matchedCall) {
      traces.push({
        index: traces.length,
        toolName,
        callEntryIndex: null,
        resultEntryIndex: message.index,
        startedAt: null,
        finishedAt: message.timestamp,
        status: "orphan-result",
        input: null,
        output: message.content,
        inputPreview: null,
        outputPreview: createPreview(message.content),
        outputChars: message.content.length,
      });
      return;
    }

    matchedCall.resultEntryIndex = message.index;
    matchedCall.finishedAt = message.timestamp;
    matchedCall.status = "completed";
    matchedCall.output = message.content;
    matchedCall.outputPreview = createPreview(message.content);
    matchedCall.outputChars = message.content.length;
    openCalls.splice(fallbackIndex, 1);
  });

  return traces.map((trace, index) => ({
    ...trace,
    index,
  }));
}

export function sortSessionRecordsByUpdatedAt(
  sessions: SessionSummaryRecord[],
): SessionSummaryRecord[] {
  return [...sessions].sort(
    (left, right) => (right.updatedAtMs ?? 0) - (left.updatedAtMs ?? 0),
  );
}

export function toTimestampMs(value?: number | string | null): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }

    const dateParsed = Date.parse(value);
    return Number.isFinite(dateParsed) ? dateParsed : null;
  }

  return null;
}

export function formatTimestamp(value?: number | null): string {
  if (!value) {
    return "unknown";
  }

  return new Date(value).toLocaleString("sv-SE", {
    hour12: false,
  });
}

export function formatOptionalTimestamp(value?: number | string): string | null {
  const parsed = toTimestampMs(value);
  return parsed ? formatTimestamp(parsed) : null;
}

export function formatTokenCount(value: number | null): string {
  return value === null ? "n/a" : `${value.toLocaleString()} tok`;
}

export function inferTranscriptPath(session: {
  transcriptPath?: string | null;
  key: string;
  sessionId?: string;
  agentId?: string;
}): string | null {
  if (session.transcriptPath) {
    return session.transcriptPath;
  }

  const agentId = session.agentId ?? inferAgentId(session);

  if (!agentId || !session.sessionId) {
    return null;
  }

  return `/home/parallels/.openclaw/agents/${agentId}/sessions/${session.sessionId}.jsonl`;
}

function inferDisplayName(session: RuntimeSessionLike): string {
  return (
    session.displayName ??
    session.label ??
    session.origin?.label ??
    session.key.split(":").slice(-1)[0] ??
    session.key
  );
}

function inferSessionKind(session: RuntimeSessionLike): SessionKind {
  if (session.kind === "group") {
    return "group";
  }

  if (session.kind === "hook") {
    return "hook";
  }

  if (session.kind === "node") {
    return "node";
  }

  if (session.key.startsWith("cron:") || session.key.includes(":cron:")) {
    return "cron";
  }

  if (session.key.startsWith("hook:") || session.key.includes(":hook:")) {
    return "hook";
  }

  if (session.key.startsWith("node-") || session.key.includes(":node:")) {
    return "node";
  }

  if (
    session.kind === "direct" ||
    session.chatType === "direct" ||
    session.key.includes(":direct:") ||
    session.key.includes(":dm:")
  ) {
    return "direct";
  }

  if (
    session.chatType === "channel" ||
    session.key.includes(":channel:") ||
    session.key.includes(":group:")
  ) {
    return "group";
  }

  return "other";
}

function inferChannel(session: RuntimeSessionLike): string {
  return (
    session.channel ??
    session.deliveryContext?.channel ??
    session.lastChannel ??
    session.origin?.provider ??
    (inferSessionKind(session) === "cron" ||
    inferSessionKind(session) === "hook" ||
    inferSessionKind(session) === "node"
      ? "internal"
      : "unknown")
  );
}

function inferAgentId(session: { key: string; agentId?: string | null }): string | null {
  if (session.agentId) {
    return session.agentId;
  }

  const match = session.key.match(/^agent:([^:]+):/);
  return match?.[1] ?? null;
}

function normalizeRole(role?: string): TranscriptRole {
  if (role === "user" || role === "assistant" || role === "toolResult") {
    return role;
  }

  return "system";
}

function titleForEmptyMessage(role: TranscriptRole): string {
  if (role === "user") return "User message";
  if (role === "assistant") return "Assistant message";
  if (role === "toolResult") return "Tool result";
  return "System message";
}

function titleForTextMessage(
  role: TranscriptRole,
  toolName?: string,
): string {
  if (role === "user") {
    return "User message";
  }

  if (role === "assistant") {
    return "Assistant message";
  }

  if (role === "toolResult") {
    return toolName ? `Tool result · ${toolName}` : "Tool result";
  }

  return "System message";
}

function inferToolNameFromTitle(title: string): string {
  const separatorMatch = title.match(/[·:]\s*(.+)$/);

  if (separatorMatch?.[1]) {
    return separatorMatch[1].trim();
  }

  const parenMatch = title.match(/^([^(]+)\(/);

  if (parenMatch?.[1]) {
    return parenMatch[1].trim();
  }

  return title.trim() || "unknown";
}

function createPreview(value: string | null, maxChars = 220): string | null {
  if (!value) {
    return null;
  }

  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= maxChars) {
    return compact;
  }

  return `${compact.slice(0, maxChars - 1)}…`;
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
