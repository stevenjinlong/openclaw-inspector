import "server-only";

import { getSessionDetailResponse, listSessionsResponse } from "./session-adapter";
import { withRuntimeCache } from "./runtime-cache";

const TOPOLOGY_TTL_MS = 10_000;
const SUBAGENT_KEY_PATTERN = /agent:[^\s"'`]+:subagent:[0-9a-f-]+/gi;

export interface SessionTopologyNode {
  key: string;
  displayName: string;
  href: string | null;
  channel: string | null;
  kind: string | null;
  model: string | null;
  evidenceCount: number;
  exists: boolean;
}

export interface SessionTopologyResponse {
  data: {
    root: SessionTopologyNode;
    children: SessionTopologyNode[];
  };
}

export async function getSessionTopology(keyOrSlug: string): Promise<SessionTopologyResponse | null> {
  return withRuntimeCache(`session-topology:${keyOrSlug}`, TOPOLOGY_TTL_MS, async () => {
    const [detailResponse, sessionsResponse] = await Promise.all([
      getSessionDetailResponse(keyOrSlug),
      listSessionsResponse(),
    ]);

    const session = detailResponse.data;
    if (!session) {
      return null;
    }

    const references = new Map<string, number>();
    const bodies = [
      ...session.transcript.messages.map((message) => message.content),
      ...session.toolTrace.flatMap((trace) => [trace.input ?? "", trace.output ?? ""]),
    ];

    for (const body of bodies) {
      for (const match of body.matchAll(SUBAGENT_KEY_PATTERN)) {
        const subagentKey = match[0];
        if (subagentKey === session.key) {
          continue;
        }
        references.set(subagentKey, (references.get(subagentKey) ?? 0) + 1);
      }
    }

    const sessionIndex = new Map(sessionsResponse.data.map((entry) => [entry.key, entry]));
    const children = Array.from(references.entries())
      .map(([subagentKey, evidenceCount]) => {
        const match = sessionIndex.get(subagentKey);
        return {
          key: subagentKey,
          displayName: match?.displayName ?? subagentKey.split(":").slice(-1)[0] ?? subagentKey,
          href: match?.href ?? null,
          channel: match?.channel ?? null,
          kind: match?.kind ?? null,
          model: match?.model ?? null,
          evidenceCount,
          exists: Boolean(match),
        } satisfies SessionTopologyNode;
      })
      .sort((left, right) => right.evidenceCount - left.evidenceCount || left.key.localeCompare(right.key));

    return {
      data: {
        root: {
          key: session.key,
          displayName: session.displayName,
          href: session.href,
          channel: session.channel,
          kind: session.kind,
          model: session.model,
          evidenceCount: 0,
          exists: true,
        },
        children,
      },
    } satisfies SessionTopologyResponse;
  });
}
