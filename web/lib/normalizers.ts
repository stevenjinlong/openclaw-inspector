import type { SessionKind, SessionSummary } from "./mock-data";

export type AdapterMode = "mock" | "cli" | "gateway";

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
  total: number;
}

export interface SessionStatusFlags {
  abortedLastRun: boolean;
  hasCompaction: boolean;
  hasSubagent: boolean;
}

export interface TranscriptEntry {
  index: number;
  role: SessionSummary["messages"][number]["role"];
  title: string;
  content: string;
  messageType: "user" | "assistant" | "toolResult";
  isCollapsedDefault: boolean;
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
  model: string;
  tokens: TokenUsageSnapshot;
  status: SessionStatusFlags;
  transcriptPath: string;
  dataSource: "mock";
}

export interface SessionDetailRecord extends SessionSummaryRecord {
  transcript: {
    source: "mock";
    path: string;
    messages: TranscriptEntry[];
  };
}

export interface ResponseMeta {
  generatedAt: string;
  adapter: AdapterDescriptor;
  note: string;
  count?: number;
  found?: boolean;
}

export function createAdapterDescriptor(): AdapterDescriptor {
  return {
    mode: "mock",
    label: "Local mock adapter",
    source: "In-memory session samples normalized through route handlers",
    readOnly: true,
    stubbed: true,
    localOnly: true,
    nextModes: ["cli", "gateway"],
    notes: [
      "Current responses are normalized from mock data for local development.",
      "Replace the source layer later with OpenClaw CLI JSON output or Gateway-backed fetches.",
    ],
  };
}

export function buildResponseMeta(overrides: Partial<ResponseMeta> = {}): ResponseMeta {
  return {
    generatedAt: new Date().toISOString(),
    adapter: createAdapterDescriptor(),
    note:
      "This endpoint is powered by a local adapter stub. The response contract is meant to stay stable when the backing source moves to OpenClaw CLI or Gateway data.",
    ...overrides,
  };
}

export function normalizeSessionSummary(session: SessionSummary): SessionSummaryRecord {
  const encodedKey = encodeURIComponent(session.key);

  return {
    key: session.key,
    slug: session.slug,
    href: `/sessions/${encodedKey}`,
    apiPath: `/api/sessions/${encodedKey}`,
    displayName: session.displayName,
    kind: session.kind,
    channel: session.channel,
    updatedAt: session.updatedAt,
    model: session.model,
    tokens: {
      context: session.contextTokens,
      total: session.totalTokens,
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

export function normalizeSessionDetail(session: SessionSummary): SessionDetailRecord {
  const summary = normalizeSessionSummary(session);

  return {
    ...summary,
    transcript: {
      source: "mock",
      path: session.transcriptPath,
      messages: session.messages.map((message, index) => ({
        index,
        role: message.role,
        title: message.title,
        content: message.content,
        messageType: message.role,
        isCollapsedDefault: message.role === "toolResult",
      })),
    },
  };
}

export function sortSessionsByUpdatedAt(sessions: SessionSummary[]): SessionSummary[] {
  return [...sessions].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
