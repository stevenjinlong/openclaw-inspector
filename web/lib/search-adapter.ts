import "server-only";

import { getSessionDetail, listSessionsResponse } from "./session-adapter";
import { type ResponseMeta, type SessionDetailRecord, type TranscriptEntry } from "./normalizers";
import { withRuntimeCache } from "./runtime-cache";

const SEARCH_TTL_MS = 5000;
const DEFAULT_SESSION_SCAN_LIMIT = 50;
const DEFAULT_RESULT_LIMIT = 80;
const TRANSCRIPT_DEFAULT_PAGE_SIZE = 12;

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
    sessionLimit: number;
  };
}

export async function searchTranscripts(
  query: string,
  options?: {
    resultLimit?: number;
    sessionLimit?: number;
  },
): Promise<TranscriptSearchResponse> {
  const normalizedQuery = query.trim();
  const resultLimit = clamp(options?.resultLimit ?? DEFAULT_RESULT_LIMIT, 1, 200);
  const sessionLimit = clamp(options?.sessionLimit ?? DEFAULT_SESSION_SCAN_LIMIT, 1, 100);

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
        sessionLimit,
      },
    };
  }

  const cacheKey = `transcript-search:${normalizedQuery.toLowerCase()}:${resultLimit}:${sessionLimit}`;

  return withRuntimeCache(cacheKey, SEARCH_TTL_MS, async () => {
    const searchSessions = sessions.slice(0, sessionLimit);
    const hits: SearchHitRecord[] = [];
    let messagesScanned = 0;

    for (const session of searchSessions) {
      if (hits.length >= resultLimit) {
        break;
      }

      const detail = await getSessionDetail(session.key);
      if (!detail) {
        continue;
      }

      for (const message of detail.transcript.messages) {
        messagesScanned += 1;

        if (!matchesQuery(message, normalizedQuery)) {
          continue;
        }

        hits.push(buildSearchHit(detail, message, normalizedQuery, hits.length));

        if (hits.length >= resultLimit) {
          break;
        }
      }
    }

    return {
      query: normalizedQuery,
      data: hits,
      meta: {
        ...meta,
        count: hits.length,
        sessionsScanned: searchSessions.length,
        messagesScanned,
        resultLimit,
        sessionLimit,
      },
    } satisfies TranscriptSearchResponse;
  });
}

function matchesQuery(message: TranscriptEntry, query: string): boolean {
  const haystack = `${message.title}\n${message.content}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function buildSearchHit(
  session: SessionDetailRecord,
  message: TranscriptEntry,
  query: string,
  ordinal: number,
): SearchHitRecord {
  const transcriptPage = Math.floor(message.index / TRANSCRIPT_DEFAULT_PAGE_SIZE) + 1;
  const resultHref = `${session.href}?tab=transcript&page=${transcriptPage}#message-${message.index}`;

  return {
    id: `${session.key}:${message.index}:${ordinal}`,
    sessionKey: session.key,
    sessionHref: session.href,
    resultHref,
    sessionDisplayName: session.displayName,
    channel: session.channel,
    kind: session.kind,
    model: session.model,
    agentId: session.agentId,
    messageIndex: message.index,
    transcriptPage,
    role: message.role,
    messageType: message.messageType,
    title: message.title,
    timestamp: message.timestamp,
    snippet: createSnippet(message.content, query),
  };
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
