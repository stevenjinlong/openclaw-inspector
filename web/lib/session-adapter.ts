import { mockSessions } from "./mock-data";
import {
  buildResponseMeta,
  createAdapterDescriptor,
  normalizeSessionDetail,
  normalizeSessionSummary,
  sortSessionsByUpdatedAt,
  type ResponseMeta,
  type SessionDetailRecord,
  type SessionSummaryRecord,
} from "./normalizers";

export interface HealthResponse {
  ok: true;
  service: string;
  generatedAt: string;
  adapter: ReturnType<typeof createAdapterDescriptor>;
  checks: Array<{
    name: string;
    status: "ok";
    detail: string;
  }>;
  stats: {
    sessionCount: number;
  };
}

export interface SessionsListResponse {
  data: SessionSummaryRecord[];
  meta: ResponseMeta;
}

export interface SessionDetailResponse {
  data: SessionDetailRecord | null;
  meta: ResponseMeta;
}

/**
 * Local-first adapter seam for the Inspector web app.
 *
 * Today:
 * - reads in-memory mock data from ./mock-data
 * - normalizes it into stable API contracts for the UI and route handlers
 *
 * Later swap points:
 * - CLI mode: shell out to `openclaw ... --json` and normalize the results here
 * - Gateway mode: fetch Gateway-backed data here and keep the same return shapes
 */
function findSession(keyOrSlug: string) {
  const candidate = maybeDecodeURIComponent(keyOrSlug);

  return mockSessions.find(
    (session) => session.key === candidate || session.slug === candidate,
  );
}

function maybeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function getHealthResponse(): Promise<HealthResponse> {
  return {
    ok: true,
    service: "openclaw-inspector-web",
    generatedAt: new Date().toISOString(),
    adapter: createAdapterDescriptor(),
    checks: [
      {
        name: "session-adapter",
        status: "ok",
        detail: "Serving normalized mock session data through a read-only local adapter.",
      },
    ],
    stats: {
      sessionCount: mockSessions.length,
    },
  };
}

export async function listSessions(): Promise<SessionSummaryRecord[]> {
  return sortSessionsByUpdatedAt(mockSessions).map(normalizeSessionSummary);
}

export async function listSessionsResponse(): Promise<SessionsListResponse> {
  const data = await listSessions();

  return {
    data,
    meta: buildResponseMeta({ count: data.length }),
  };
}

export async function getSessionDetail(keyOrSlug: string): Promise<SessionDetailRecord | null> {
  const session = findSession(keyOrSlug);

  return session ? normalizeSessionDetail(session) : null;
}

export async function getSessionDetailResponse(
  keyOrSlug: string,
): Promise<SessionDetailResponse> {
  const data = await getSessionDetail(keyOrSlug);

  return {
    data,
    meta: buildResponseMeta({ found: data !== null }),
  };
}
