import { listSessionsResponse } from "../../lib/session-adapter";
import { type SessionKind } from "../../lib/normalizers";
import { SessionsExplorer } from "../../components/sessions-explorer";
import { SessionsIcon } from "../../components/ui-icons";

export const dynamic = "force-dynamic";

type SessionsSearchParams = {
  q?: string | string[];
  kind?: string | string[];
  channel?: string | string[];
  state?: string | string[];
};

type KindFilter = "all" | SessionKind;
type ChannelFilter = "all" | string;
type StateFilter = "all" | "attention" | "aborted" | "compacted" | "subagent";

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<SessionsSearchParams>;
}) {
  const [resolvedSearchParams, { data: sessions, meta }] = await Promise.all([
    searchParams,
    listSessionsResponse(),
  ]);

  const rawQuery = firstString(resolvedSearchParams.q) ?? "";
  const allKinds = Array.from(new Set(sessions.map((session) => session.kind))).sort();
  const allChannels = Array.from(new Set(sessions.map((session) => session.channel))).sort();
  const initialKind = normalizeKindFilter(firstString(resolvedSearchParams.kind), allKinds);
  const initialChannel = normalizeChannelFilter(firstString(resolvedSearchParams.channel), allChannels);
  const initialState = normalizeStateFilter(firstString(resolvedSearchParams.state));

  return (
    <div className="stack">
      <div className="page-title">
        <div className="title-with-icon">
          <span className="page-icon-badge">
            <SessionsIcon className="icon icon-lg" />
          </span>
          <div>
            <p className="eyebrow">Sessions</p>
            <h2>Explorer</h2>
            <p className="muted">
              Live list view backed by a normalized adapter contract. Search and
              filter controls run instantly, and the cards now align more cleanly.
            </p>
          </div>
        </div>
        <span className="badge">{meta.adapter.label}</span>
      </div>

      <SessionsExplorer
        sessions={sessions}
        meta={meta}
        initialQuery={rawQuery}
        initialKind={initialKind}
        initialChannel={initialChannel}
        initialState={initialState}
      />
    </div>
  );
}

function firstString(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeKindFilter(
  value: string | undefined,
  allKinds: SessionKind[],
): KindFilter {
  if (!value || value === "all") return "all";
  return allKinds.includes(value as SessionKind) ? (value as SessionKind) : "all";
}

function normalizeChannelFilter(
  value: string | undefined,
  allChannels: string[],
): ChannelFilter {
  if (!value || value === "all") return "all";
  return allChannels.includes(value) ? value : "all";
}

function normalizeStateFilter(value: string | undefined): StateFilter {
  if (
    value === "attention" ||
    value === "aborted" ||
    value === "compacted" ||
    value === "subagent"
  ) {
    return value;
  }

  return "all";
}
