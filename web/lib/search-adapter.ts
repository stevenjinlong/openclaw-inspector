import "server-only";

import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { createInterface } from "node:readline";

import { getSessionDetail, listSessionsResponse } from "./session-adapter";
import {
  formatOptionalTimestamp,
  type ResponseMeta,
  type SessionSummaryRecord,
  type TranscriptRole,
} from "./normalizers";
import { withRuntimeCache } from "./runtime-cache";

const SEARCH_TTL_MS = 30_000;
const DEFAULT_SESSION_SCAN_LIMIT = 50;
const DEFAULT_RESULT_LIMIT = 200;
const TRANSCRIPT_DEFAULT_PAGE_SIZE = 12;
const SEARCH_CONCURRENCY = 8;

export interface SearchHitRecord {
  id: string;
  sessionKey: string;
  sessionHref: string;
  resultHref: string;
  sessionDisplayName: string;
  channel: string;
  kind: string;
  model: string;
  agentId: string | null;
  messageIndex: number;
  transcriptPage: number;
  role: string;
  messageType: string;
  title: string;
  timestamp: string | null;
  snippet: string;
}

export interface TranscriptSearchResponse {
  query: string;
  data: SearchHitRecord[];
  meta: ResponseMeta & {
    sessionsScanned: number;
    messagesScanned: number;
    resultLimit: number;
    totalMatches: number;
    sessionLimit: number;
    truncated: boolean;
  };
}

type SearchState = {
  hitCount: number;
  limit: number;
  truncated: boolean;
};

type SessionScanResult = {
  hits: SearchHitRecord[];
  messagesScanned: number;
};

type RawTranscriptRecord = {
  type?: string;
  timestamp?: number | string;
  message?: {
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
  };
};

type SearchableEntry = {
  role: TranscriptRole;
  messageType: SearchHitRecord["messageType"];
  title: string;
  content: string;
  timestamp: string | null;
};

export async function searchTranscripts(
  query: string,
  options?: {
    resultLimit?: number;
    sessionLimit?: number;
  },
): Promise<TranscriptSearchResponse> {
  const normalizedQuery = query.trim();
  const queryLower = normalizedQuery.toLowerCase();
  const resultLimit = clampInteger(options?.resultLimit ?? DEFAULT_RESULT_LIMIT, 1, 500);
  const sessionLimit = clampInteger(options?.sessionLimit ?? DEFAULT_SESSION_SCAN_LIMIT, 1, 100);

  const { data: sessions, meta } = await listSessionsResponse();

  if (!normalizedQuery) {
    return {
      query: "",
      data: [],
      meta: {
        ...meta,
        count: 0,
        sessionsScanned: 0,
        messagesScanned: 0,
        resultLimit,
        totalMatches: 0,
        sessionLimit,
        truncated: false,
      },
    };
  }

  const cacheKey = `transcript-search:${queryLower}:${resultLimit}:${sessionLimit}`;

  return withRuntimeCache(cacheKey, SEARCH_TTL_MS, async () => {
    const searchSessions = sessions.slice(0, sessionLimit);
    const sharedState: SearchState = {
      hitCount: 0,
      limit: resultLimit,
      truncated: false,
    };

    const scanResults = await mapWithConcurrency(
      searchSessions,
      SEARCH_CONCURRENCY,
      async (session) => scanSession(session, normalizedQuery, queryLower, sharedState),
    );

    const data = scanResults.flatMap((result) => result.hits).slice(0, resultLimit);
    const messagesScanned = scanResults.reduce((sum, result) => sum + result.messagesScanned, 0);

    return {
      query: normalizedQuery,
      data,
      meta: {
        ...meta,
        count: data.length,
        sessionsScanned: searchSessions.length,
        messagesScanned,
        resultLimit,
        totalMatches: data.length,
        sessionLimit,
        truncated: sharedState.truncated,
      },
    } satisfies TranscriptSearchResponse;
  });
}

async function scanSession(
  session: SessionSummaryRecord,
  query: string,
  queryLower: string,
  sharedState: SearchState,
): Promise<SessionScanResult> {
  if (sharedState.hitCount >= sharedState.limit) {
    sharedState.truncated = true;
    return { hits: [], messagesScanned: 0 };
  }

  if (session.transcriptPath) {
    try {
      await access(session.transcriptPath);
      return scanTranscriptFile(session, session.transcriptPath, query, queryLower, sharedState);
    } catch {
      // Fall through to hydrated fallback.
    }
  }

  return scanHydratedSession(session, query, queryLower, sharedState);
}

async function scanTranscriptFile(
  session: SessionSummaryRecord,
  transcriptPath: string,
  query: string,
  queryLower: string,
  sharedState: SearchState,
): Promise<SessionScanResult> {
  const hits: SearchHitRecord[] = [];
  let messagesScanned = 0;
  let transcriptEntryIndex = 0;

  const input = createReadStream(transcriptPath, { encoding: "utf8" });
  const reader = createInterface({ input, crlfDelay: Infinity });

  try {
    for await (const line of reader) {
      if (sharedState.hitCount >= sharedState.limit) {
        sharedState.truncated = true;
        break;
      }

      if (!line.startsWith('{"type":"message"') || !line.toLowerCase().includes(queryLower)) {
        continue;
      }

      let record: RawTranscriptRecord;
      try {
        record = JSON.parse(line) as RawTranscriptRecord;
      } catch {
        continue;
      }

      if (record.type !== "message" || !record.message) {
        continue;
      }

      const entries = normalizeRawMessage(record);
      messagesScanned += 1;

      for (const entry of entries) {
        const entryIndex = transcriptEntryIndex;
        transcriptEntryIndex += 1;

        if (!matchesQuery(entry.title, entry.content, queryLower)) {
          continue;
        }

        if (sharedState.hitCount >= sharedState.limit) {
          sharedState.truncated = true;
          break;
        }

        hits.push(buildSearchHitFromEntry(session, entryIndex, entry, query, sharedState.hitCount));
        sharedState.hitCount += 1;
      }
    }
  } finally {
    reader.close();
    input.destroy();
  }

  return { hits, messagesScanned };
}

async function scanHydratedSession(
  session: SessionSummaryRecord,
  query: string,
  queryLower: string,
  sharedState: SearchState,
): Promise<SessionScanResult> {
  const detail = await getSessionDetail(session.key);
  if (!detail) {
    return { hits: [], messagesScanned: 0 };
  }

  const hits: SearchHitRecord[] = [];
  let messagesScanned = 0;

  for (const message of detail.transcript.messages) {
    if (sharedState.hitCount >= sharedState.limit) {
      sharedState.truncated = true;
      break;
    }

    messagesScanned += 1;

    if (!matchesQuery(message.title, message.content, queryLower)) {
      continue;
    }

    hits.push({
      id: `${session.key}:${message.index}:${sharedState.hitCount}`,
      sessionKey: session.key,
      sessionHref: session.href,
      resultHref: buildResultHref(session.href, message.index, query),
      sessionDisplayName: session.displayName,
      channel: session.channel,
      kind: session.kind,
      model: session.model,
      agentId: session.agentId,
      messageIndex: message.index,
      transcriptPage: Math.floor(message.index / TRANSCRIPT_DEFAULT_PAGE_SIZE) + 1,
      role: message.role,
      messageType: message.messageType,
      title: message.title,
      timestamp: message.timestamp,
      snippet: createSnippet(message.content, query),
    });
    sharedState.hitCount += 1;
  }

  return { hits, messagesScanned };
}

function normalizeRawMessage(record: RawTranscriptRecord): SearchableEntry[] {
  const message = record.message;
  if (!message) {
    return [];
  }

  const role = normalizeRole(message.role);
  const blocks = Array.isArray(message.content) ? message.content : [];
  const timestamp = formatOptionalTimestamp(message.timestamp ?? record.timestamp);

  if (blocks.length === 0) {
    return [
      {
        role,
        title: titleForEmptyMessage(role),
        content: "[empty message]",
        messageType: role === "toolResult" ? "toolResult" : role,
        timestamp,
      },
    ];
  }

  const entries: SearchableEntry[] = [];

  for (const block of blocks) {
    const blockType = block.type ?? "unknown";

    if (blockType === "thinking") {
      const thinking = block.thinking?.trim();
      if (!thinking) continue;
      entries.push({
        role: "system",
        title: "Thinking",
        content: thinking,
        messageType: "system",
        timestamp,
      });
      continue;
    }

    if (blockType === "toolCall") {
      const toolName = block.name ?? "unknown";
      const payload =
        block.partialJson ??
        JSON.stringify(
          { id: block.id, name: block.name, arguments: block.arguments },
          null,
          2,
        );
      entries.push({
        role: "assistant",
        title: `Tool call · ${toolName}`,
        content: payload,
        messageType: "toolCall",
        timestamp,
      });
      continue;
    }

    if (blockType === "text") {
      const text = block.text?.trim() ?? "";
      if (!text) continue;
      entries.push({
        role,
        title: titleForTextMessage(role, message.toolName),
        content: text,
        messageType: role === "toolResult" ? "toolResult" : role,
        timestamp,
      });
      continue;
    }

    entries.push({
      role: "system",
      title: `Block · ${blockType}`,
      content: JSON.stringify(block, null, 2),
      messageType: "system",
      timestamp,
    });
  }

  return entries;
}

function buildSearchHitFromEntry(
  session: SessionSummaryRecord,
  entryIndex: number,
  entry: SearchableEntry,
  query: string,
  ordinal: number,
): SearchHitRecord {
  return {
    id: `${session.key}:${entryIndex}:${ordinal}`,
    sessionKey: session.key,
    sessionHref: session.href,
    resultHref: buildResultHref(session.href, entryIndex, query),
    sessionDisplayName: session.displayName,
    channel: session.channel,
    kind: session.kind,
    model: session.model,
    agentId: session.agentId,
    messageIndex: entryIndex,
    transcriptPage: Math.floor(entryIndex / TRANSCRIPT_DEFAULT_PAGE_SIZE) + 1,
    role: entry.role,
    messageType: entry.messageType,
    title: entry.title,
    timestamp: entry.timestamp,
    snippet: createSnippet(entry.content, query),
  };
}

function buildResultHref(sessionHref: string, entryIndex: number, query: string): string {
  const transcriptPage = Math.floor(entryIndex / TRANSCRIPT_DEFAULT_PAGE_SIZE) + 1;
  const params = new URLSearchParams({
    tab: "transcript",
    page: String(transcriptPage),
    focus: String(entryIndex),
    q: query,
  });
  return `${sessionHref}?${params.toString()}#message-${entryIndex}`;
}

function matchesQuery(title: string, content: string, queryLower: string): boolean {
  const haystack = `${title}\n${content}`.toLowerCase();
  return haystack.includes(queryLower);
}

function createSnippet(content: string, query: string): string {
  const compact = content.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "[empty content]";
  }

  const lower = compact.toLowerCase();
  const queryLower = query.toLowerCase();
  const matchIndex = lower.indexOf(queryLower);

  if (matchIndex === -1) {
    return compact.length > 180 ? `${compact.slice(0, 179)}…` : compact;
  }

  const start = Math.max(0, matchIndex - 70);
  const end = Math.min(compact.length, matchIndex + query.length + 90);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < compact.length ? "…" : "";
  return `${prefix}${compact.slice(start, end)}${suffix}`;
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

function titleForTextMessage(role: TranscriptRole, toolName?: string): string {
  if (role === "user") return "User message";
  if (role === "assistant") return "Assistant message";
  if (role === "toolResult") return toolName ? `Tool result · ${toolName}` : "Tool result";
  return "System message";
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await worker(items[index]!, index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
  );

  return results;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(Math.floor(value), min), max);
}
