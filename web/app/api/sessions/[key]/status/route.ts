import { getSessionDetailResponse } from "../../../../../lib/session-adapter";
import { toTimestampMs } from "../../../../../lib/normalizers";

export const dynamic = "force-dynamic";

type LiveStatusCode = "idle" | "llm-running" | "tools-running" | "possibly-stuck";

interface StatusPayload {
  ok: boolean;
  statusCode: LiveStatusCode;
  label: string;
  reason: string;
  updatedAt: string | null;
  updatedAtMs: number | null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  const { data: session } = await getSessionDetailResponse(key);

  if (!session) {
    return Response.json(
      {
        ok: false,
        statusCode: "idle",
        label: "IDLE",
        reason: "Session not found",
        updatedAt: null,
        updatedAtMs: null,
      } satisfies StatusPayload & { ok: false },
      { status: 404 },
    );
  }

  const nowMs = Date.now();
  const updatedAtMs = session.updatedAtMs ?? toTimestampMs(session.updatedAt) ?? null;
  const messages = session.transcript.messages;
  const lastUserIndex = findLastIndex(messages, (message) => message.role === "user");
  const lastAssistantIndex = findLastIndex(
    messages,
    (message) => message.role === "assistant" || message.role === "toolResult",
  );
  const lastUserMessage = lastUserIndex === -1 ? null : messages[lastUserIndex];
  const lastUserTimestampMs = lastUserMessage
    ? toTimestampMs(lastUserMessage.timestamp ?? undefined)
    : updatedAtMs;
  const userDeltaMs =
    lastUserTimestampMs == null ? Number.POSITIVE_INFINITY : nowMs - lastUserTimestampMs;

  const hasPendingTool = session.toolTrace.some((trace) => trace.status === "pending");

  const { statusCode, label, reason } = classifyLiveStatus({
    hasPendingTool,
    lastUserIndex,
    lastAssistantIndex,
    userDeltaMs,
  });

  const payload: StatusPayload = {
    ok: true,
    statusCode,
    label,
    reason,
    updatedAt: session.updatedAt,
    updatedAtMs,
  };

  return Response.json(payload);
}

function classifyLiveStatus(input: {
  hasPendingTool: boolean;
  lastUserIndex: number;
  lastAssistantIndex: number;
  userDeltaMs: number;
}): { statusCode: LiveStatusCode; label: string; reason: string } {
  const { hasPendingTool, lastUserIndex, lastAssistantIndex, userDeltaMs } = input;

  // No recent user messages → treat as idle.
  if (lastUserIndex === -1) {
    return {
      statusCode: "idle",
      label: "IDLE",
      reason: "No user messages observed in transcript.",
    };
  }

  const userAwaitingReply = lastUserIndex > lastAssistantIndex;

  // User is waiting for a reply and we have pending tools.
  if (userAwaitingReply && hasPendingTool) {
    if (userDeltaMs <= 60_000) {
      return {
        statusCode: "tools-running",
        label: "RUNNING (TOOLS)",
        reason: "Last user message has pending tool calls within the last 60s.",
      };
    }

    return {
      statusCode: "possibly-stuck",
      label: "POSSIBLY STUCK",
      reason: "User message has pending tools but has been waiting for more than 60s.",
    };
  }

  // User is waiting for a reply and there are no tools in flight.
  if (userAwaitingReply && !hasPendingTool) {
    if (userDeltaMs <= 20_000) {
      return {
        statusCode: "llm-running",
        label: "RUNNING (LLM)",
        reason: "Last user message has no assistant reply yet and is recent (<20s).",
      };
    }

    if (userDeltaMs <= 60_000) {
      return {
        statusCode: "llm-running",
        label: "RUNNING (LLM)",
        reason: "Last user message is awaiting response and was seen in the last 60s.",
      };
    }

    return {
      statusCode: "possibly-stuck",
      label: "POSSIBLY STUCK",
      reason: "Last user message is awaiting response for more than 60s.",
    };
  }

  // Otherwise treat as idle.
  return {
    statusCode: "idle",
    label: "IDLE",
    reason: "Last user message appears to have been handled.",
  };
}

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index]!)) {
      return index;
    }
  }

  return -1;
}
