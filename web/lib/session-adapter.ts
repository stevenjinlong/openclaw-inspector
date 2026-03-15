import "server-only";

import { execFile } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, readFile } from "node:fs/promises";

import { mockSessions } from "./mock-data";
import {
  buildResponseMeta,
  createAdapterDescriptor,
  inferTranscriptPath,
  normalizeMockSessionDetail,
  normalizeMockSessionSummary,
  normalizeRuntimeSessionDetail,
  normalizeRuntimeSessionSummary,
  sortSessionRecordsByUpdatedAt,
  type AdapterDescriptor,
  type AdapterMode,
  type ResponseMeta,
  type RuntimeSessionLike,
  type RuntimeTranscriptMessage,
  type SessionDetailRecord,
  type SessionSummaryRecord,
  type TranscriptSource,
} from "./normalizers";
import { withRuntimeCache } from "./runtime-cache";

const DEFAULT_SESSION_LIMIT = 100;
const DEFAULT_HISTORY_LIMIT = 200;
const MAX_BUFFER_BYTES = 20 * 1024 * 1024;
const SESSION_SOURCE_TTL_MS = 5000;
const TRANSCRIPT_TTL_MS = 5000;

type SourcePreference = "auto" | AdapterMode;

interface HealthResponse {
  ok: true;
  service: string;
  generatedAt: string;
  adapter: AdapterDescriptor;
  checks: Array<{
    name: string;
    status: "ok" | "warn";
    detail: string;
  }>;
  stats: {
    sessionCount: number;
  };
  warnings: string[];
}

export interface SessionsListResponse {
  data: SessionSummaryRecord[];
  meta: ResponseMeta;
}

export interface SessionDetailResponse {
  data: SessionDetailRecord | null;
  meta: ResponseMeta;
}

interface SourceResolution {
  mode: AdapterMode;
  adapter: AdapterDescriptor;
  rawSessions: RuntimeSessionLike[];
  warnings: string[];
}

interface TranscriptResolution {
  source: TranscriptSource;
  messages: RuntimeTranscriptMessage[];
  hasCompaction: boolean;
  warnings: string[];
}

export async function getHealthResponse(): Promise<HealthResponse> {
  const resolved = await resolveSessionSource();

  return {
    ok: true,
    service: "openclaw-inspector-web",
    generatedAt: new Date().toISOString(),
    adapter: resolved.adapter,
    checks: [
      {
        name: "session-source",
        status: "ok",
        detail: `Serving ${resolved.rawSessions.length} normalized sessions from ${resolved.adapter.mode}.`,
      },
      ...(resolved.warnings.length > 0
        ? [
            {
              name: "fallback",
              status: "warn" as const,
              detail: resolved.warnings[0],
            },
          ]
        : []),
    ],
    stats: {
      sessionCount: resolved.rawSessions.length,
    },
    warnings: resolved.warnings,
  };
}

export async function listSessions(): Promise<SessionSummaryRecord[]> {
  const resolved = await resolveSessionSource();

  if (resolved.mode === "mock") {
    return sortSessionRecordsByUpdatedAt(
      mockSessions.map(normalizeMockSessionSummary),
    );
  }

  return sortSessionRecordsByUpdatedAt(
    resolved.rawSessions.map((session) =>
      normalizeRuntimeSessionSummary(session, resolved.mode),
    ),
  );
}

export async function listSessionsResponse(): Promise<SessionsListResponse> {
  const resolved = await resolveSessionSource();
  const data = await listSessions();

  return {
    data,
    meta: buildResponseMeta(resolved.adapter, {
      count: data.length,
      warnings: resolved.warnings,
    }),
  };
}

export async function getSessionDetail(
  keyOrSlug: string,
): Promise<SessionDetailRecord | null> {
  const candidate = maybeDecodeURIComponent(keyOrSlug);
  const resolved = await resolveSessionSource();

  if (resolved.mode === "mock") {
    const mockSession = mockSessions.find((session) => session.key === candidate);
    return mockSession ? normalizeMockSessionDetail(mockSession) : null;
  }

  const runtimeSession = resolved.rawSessions.find(
    (session) => session.key === candidate || session.sessionId === candidate,
  );

  if (!runtimeSession) {
    return null;
  }

  const transcriptPath = inferTranscriptPath(runtimeSession);
  const transcript = await resolveTranscript(runtimeSession.key, transcriptPath);

  return normalizeRuntimeSessionDetail({
    session: runtimeSession,
    source: resolved.mode,
    transcriptSource: transcript.source,
    transcriptMessages: transcript.messages,
    transcriptPath,
    hasCompaction: transcript.hasCompaction,
  });
}

export async function getSessionDetailResponse(
  keyOrSlug: string,
): Promise<SessionDetailResponse> {
  const candidate = maybeDecodeURIComponent(keyOrSlug);
  const resolved = await resolveSessionSource();

  if (resolved.mode === "mock") {
    const mockSession = mockSessions.find((session) => session.key === candidate);
    const data = mockSession ? normalizeMockSessionDetail(mockSession) : null;

    return {
      data,
      meta: buildResponseMeta(resolved.adapter, {
        found: data !== null,
        warnings: resolved.warnings,
      }),
    };
  }

  const runtimeSession = resolved.rawSessions.find(
    (session) => session.key === candidate || session.sessionId === candidate,
  );

  if (!runtimeSession) {
    return {
      data: null,
      meta: buildResponseMeta(resolved.adapter, {
        found: false,
        warnings: resolved.warnings,
      }),
    };
  }

  const transcriptPath = inferTranscriptPath(runtimeSession);
  const transcript = await resolveTranscript(runtimeSession.key, transcriptPath);
  const data = normalizeRuntimeSessionDetail({
    session: runtimeSession,
    source: resolved.mode,
    transcriptSource: transcript.source,
    transcriptMessages: transcript.messages,
    transcriptPath,
    hasCompaction: transcript.hasCompaction,
  });

  return {
    data,
    meta: buildResponseMeta(resolved.adapter, {
      found: true,
      warnings: [...resolved.warnings, ...transcript.warnings],
    }),
  };
}

async function resolveSessionSource(): Promise<SourceResolution> {
  const preference = getSourcePreference();

  return withRuntimeCache(
    `session-source:${preference}`,
    SESSION_SOURCE_TTL_MS,
    async () => {
      const warnings: string[] = [];

      const attemptOrder =
        preference === "mock"
          ? (["mock"] as const)
          : preference === "gateway"
            ? (["gateway", "cli", "mock"] as const)
            : preference === "cli"
              ? (["cli", "gateway", "mock"] as const)
              : (["gateway", "cli", "mock"] as const);

      for (const mode of attemptOrder) {
        if (mode === "gateway") {
          try {
            const payload = await runOpenClawJson([
              "gateway",
              "call",
              "sessions.list",
              "--params",
              JSON.stringify({ limit: DEFAULT_SESSION_LIMIT }),
            ]);

            const rawSessions = ensureArray<RuntimeSessionLike>(payload.sessions);

            return {
              mode: "gateway",
              adapter: createAdapterDescriptor({ mode: "gateway" }),
              rawSessions,
              warnings,
            };
          } catch (error) {
            warnings.push(`Gateway sessions.list unavailable: ${errorMessage(error)}`);
          }

          continue;
        }

        if (mode === "cli") {
          try {
            const payload = await runOpenClawJson(["sessions", "--all-agents", "--json"]);
            const rawSessions = ensureArray<RuntimeSessionLike>(payload.sessions).slice(
              0,
              DEFAULT_SESSION_LIMIT,
            );

            return {
              mode: "cli",
              adapter: createAdapterDescriptor({ mode: "cli" }),
              rawSessions,
              warnings,
            };
          } catch (error) {
            warnings.push(`CLI sessions --all-agents --json unavailable: ${errorMessage(error)}`);
          }

          continue;
        }

        return {
          mode: "mock",
          adapter: createAdapterDescriptor({
            mode: "mock",
            notes: [
              "Fell back to mock sessions because live OpenClaw data could not be loaded.",
              ...warnings,
            ],
          }),
          rawSessions: [],
          warnings,
        };
      }

      return {
        mode: "mock",
        adapter: createAdapterDescriptor({ mode: "mock" }),
        rawSessions: [],
        warnings,
      };
    },
  );
}

async function resolveTranscript(
  sessionKey: string,
  transcriptPath: string | null,
): Promise<TranscriptResolution> {
  return withRuntimeCache(
    `transcript:${sessionKey}:${transcriptPath ?? "none"}`,
    TRANSCRIPT_TTL_MS,
    async () => {
      const warnings: string[] = [];

      try {
        const payload = await runOpenClawJson([
          "gateway",
          "call",
          "chat.history",
          "--params",
          JSON.stringify({ sessionKey, limit: DEFAULT_HISTORY_LIMIT }),
        ]);

        return {
          source: "gateway",
          messages: ensureArray<RuntimeTranscriptMessage>(payload.messages),
          hasCompaction: false,
          warnings,
        };
      } catch (error) {
        warnings.push(`Gateway chat.history unavailable: ${errorMessage(error)}`);
      }

      if (transcriptPath) {
        try {
          const local = await readTranscriptFromFile(transcriptPath);

          return {
            source: "local-file",
            messages: local.messages,
            hasCompaction: local.hasCompaction,
            warnings,
          };
        } catch (error) {
          warnings.push(`Local transcript fallback failed: ${errorMessage(error)}`);
        }
      }

      return {
        source: "mock",
        messages: [
          createSyntheticSystemMessage(
            "Transcript unavailable. Gateway history failed and no readable local transcript file was found.",
          ),
        ],
        hasCompaction: false,
        warnings,
      };
    },
  );
}

async function readTranscriptFromFile(path: string): Promise<{
  messages: RuntimeTranscriptMessage[];
  hasCompaction: boolean;
}> {
  await access(path, fsConstants.R_OK);
  const content = await readFile(path, "utf8");
  const rows = content.split(/\r?\n/).filter(Boolean);

  const messages: RuntimeTranscriptMessage[] = [];
  let hasCompaction = false;

  for (const row of rows) {
    const parsed = JSON.parse(row) as {
      type?: string;
      customType?: string;
      message?: RuntimeTranscriptMessage;
    };

    if (parsed.type === "message" && parsed.message) {
      messages.push(parsed.message);
    }

    if (
      (parsed.type && parsed.type.toLowerCase().includes("compact")) ||
      (parsed.customType && parsed.customType.toLowerCase().includes("compact"))
    ) {
      hasCompaction = true;
    }
  }

  return {
    messages,
    hasCompaction,
  };
}

function getSourcePreference(): SourcePreference {
  const raw = process.env.OPENCLAW_INSPECTOR_SOURCE_MODE?.trim().toLowerCase();

  if (raw === "mock" || raw === "cli" || raw === "gateway") {
    return raw;
  }

  return "auto";
}

function maybeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function runOpenClawJson(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    execFile(
      "openclaw",
      args,
      {
        cwd: process.cwd(),
        encoding: "utf8",
        maxBuffer: MAX_BUFFER_BYTES,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              [error.message, stderr?.trim(), stdout?.trim()]
                .filter(Boolean)
                .join(" | "),
            ),
          );
          return;
        }

        try {
          resolve(parseJsonFromOutput(stdout));
        } catch (parseError) {
          reject(
            new Error(
              `Failed to parse OpenClaw JSON output for args [${args.join(" ")}]: ${errorMessage(parseError)}${stdout ? ` | stdout: ${stdout.slice(0, 400)}` : ""}`,
            ),
          );
        }
      },
    );
  });
}

function parseJsonFromOutput(stdout: string): any {
  const startIndex = findFirstJsonIndex(stdout);

  if (startIndex === -1) {
    throw new Error("No JSON payload found in command output.");
  }

  return JSON.parse(stdout.slice(startIndex));
}

function findFirstJsonIndex(value: string): number {
  const objectIndex = value.indexOf("{");
  const arrayIndex = value.indexOf("[");

  if (objectIndex === -1) {
    return arrayIndex;
  }

  if (arrayIndex === -1) {
    return objectIndex;
  }

  return Math.min(objectIndex, arrayIndex);
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function createSyntheticSystemMessage(text: string): RuntimeTranscriptMessage {
  return {
    role: "system",
    timestamp: Date.now(),
    content: [{ type: "text", text }],
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
