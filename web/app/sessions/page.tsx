import Link from "next/link";
import { formatTokenCount, type SessionKind } from "../../lib/normalizers";
import { listSessionsResponse } from "../../lib/session-adapter";

export const dynamic = "force-dynamic";

type SessionsSearchParams = {
  q?: string | string[];
  kind?: string | string[];
  channel?: string | string[];
  state?: string | string[];
};

type KindFilter = "all" | SessionKind;
type ChannelFilter = "all" | string;
type StateFilter = "all" | "aborted" | "compacted" | "subagent";

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
  const query = rawQuery.trim().toLowerCase();
  const allKinds = Array.from(new Set(sessions.map((session) => session.kind))).sort();
  const allChannels = Array.from(
    new Set(sessions.map((session) => session.channel)),
  ).sort();

  const kindFilter = normalizeKindFilter(firstString(resolvedSearchParams.kind), allKinds);
  const channelFilter = normalizeChannelFilter(
    firstString(resolvedSearchParams.channel),
    allChannels,
  );
  const stateFilter = normalizeStateFilter(firstString(resolvedSearchParams.state));

  const filteredSessions = sessions.filter((session) => {
    if (kindFilter !== "all" && session.kind !== kindFilter) {
      return false;
    }

    if (channelFilter !== "all" && session.channel !== channelFilter) {
      return false;
    }

    if (stateFilter === "aborted" && !session.status.abortedLastRun) {
      return false;
    }

    if (stateFilter === "compacted" && !session.status.hasCompaction) {
      return false;
    }

    if (stateFilter === "subagent" && !session.status.hasSubagent) {
      return false;
    }

    if (query) {
      const haystack = (
        session.displayName +
        " " +
        session.key +
        " " +
        session.channel +
        " " +
        (session.agentId ?? "") +
        " " +
        session.model
      )
        .toLowerCase()
        .trim();

      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Sessions</p>
          <h2>Explorer</h2>
          <p className="muted">
            Live list view backed by a normalized adapter contract. This page now
            supports real search and filters instead of placeholder badges.
          </p>
        </div>
        <span className="badge">{meta.adapter.label}</span>
      </div>

      <section className="card stack">
        <div className="badge-row">
          <span className="badge">Total: {meta.count ?? sessions.length}</span>
          <span className="badge">Visible: {filteredSessions.length}</span>
          <span className="badge">Mode: {meta.adapter.mode}</span>
          <span className="badge">Read-only</span>
          {meta.adapter.stubbed ? (
            <span className="badge warn">Stubbed fallback</span>
          ) : (
            <span className="badge good">Live local data</span>
          )}
        </div>
        <p className="muted">{meta.note}</p>
        {meta.warnings?.length ? (
          <ul className="muted">
            {meta.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card stack">
        <form className="search-row" action="/sessions" method="get">
          <input
            className="search-input"
            type="text"
            name="q"
            placeholder="Search by name, key, channel, agent, model"
            defaultValue={rawQuery}
          />
          {kindFilter !== "all" ? (
            <input type="hidden" name="kind" value={kindFilter} />
          ) : null}
          {channelFilter !== "all" ? (
            <input type="hidden" name="channel" value={channelFilter} />
          ) : null}
          {stateFilter !== "all" ? (
            <input type="hidden" name="state" value={stateFilter} />
          ) : null}
          <button className="search-button" type="submit">
            Search
          </button>
          {query ? (
            <Link href="/sessions" className="search-button secondary">
              Clear
            </Link>
          ) : null}
        </form>

        <div className="badge-row">
          <span className="badge">Sort: updatedAt</span>
        </div>

        <div className="grid cols-2">
          <section className="card stack">
            <p className="eyebrow">Kind</p>
            <div className="badge-row">
              <Link
                href={buildSessionsHref({ q: query, channel: channelFilter, state: stateFilter })}
                className={`tab-link ${kindFilter === "all" ? "active" : ""}`}
              >
                All kinds
              </Link>
              {allKinds.map((kind) => (
                <Link
                  key={kind}
                  href={buildSessionsHref({
                    q: query,
                    kind,
                    channel: channelFilter,
                    state: stateFilter,
                  })}
                  className={`tab-link ${kindFilter === kind ? "active" : ""}`}
                >
                  {kind}
                </Link>
              ))}
            </div>
          </section>

          <section className="card stack">
            <p className="eyebrow">Channel</p>
            <div className="badge-row">
              <Link
                href={buildSessionsHref({ q: query, kind: kindFilter, state: stateFilter })}
                className={`tab-link ${channelFilter === "all" ? "active" : ""}`}
              >
                All channels
              </Link>
              {allChannels.map((channel) => (
                <Link
                  key={channel}
                  href={buildSessionsHref({
                    q: query,
                    kind: kindFilter,
                    channel,
                    state: stateFilter,
                  })}
                  className={`tab-link ${channelFilter === channel ? "active" : ""}`}
                >
                  {channel}
                </Link>
              ))}
            </div>
          </section>
        </div>

        <section className="card stack">
          <p className="eyebrow">State</p>
          <div className="badge-row">
            <Link
              href={buildSessionsHref({ q: query, kind: kindFilter, channel: channelFilter })}
              className={`tab-link ${stateFilter === "all" ? "active" : ""}`}
            >
              All states
            </Link>
            <Link
              href={buildSessionsHref({
                q: query,
                kind: kindFilter,
                channel: channelFilter,
                state: "aborted",
              })}
              className={`tab-link ${stateFilter === "aborted" ? "active" : ""}`}
            >
              Aborted
            </Link>
            <Link
              href={buildSessionsHref({
                q: query,
                kind: kindFilter,
                channel: channelFilter,
                state: "compacted",
              })}
              className={`tab-link ${stateFilter === "compacted" ? "active" : ""}`}
            >
              Compacted
            </Link>
            <Link
              href={buildSessionsHref({
                q: query,
                kind: kindFilter,
                channel: channelFilter,
                state: "subagent",
              })}
              className={`tab-link ${stateFilter === "subagent" ? "active" : ""}`}
            >
              Subagent
            </Link>
          </div>
        </section>
      </section>

      <section className="card stack">
        {filteredSessions.length === 0 ? (
          <div className="empty-state">
            <h3>No sessions match the current search/filters</h3>
            <p className="muted">
              Try adjusting the text search, kind, channel, or state filters.
            </p>
            <div className="badge-row">
              <Link href="/sessions" className="tab-link active">
                Reset all filters
              </Link>
            </div>
          </div>
        ) : (
          <div className="list">
            {filteredSessions.map((session) => (
              <div key={session.key} className="session-row">
                <div className="stack" style={{ flex: 1 }}>
                  <div>
                    <p className="eyebrow">{session.channel}</p>
                    <h3>{session.displayName}</h3>
                    <p className="muted mono">{session.key}</p>
                  </div>
                  <div className="badge-row">
                    <span className="badge">{session.kind}</span>
                    <span className="badge">{session.model}</span>
                    {session.modelProvider ? (
                      <span className="badge">provider: {session.modelProvider}</span>
                    ) : null}
                    <span className="badge">source: {session.dataSource}</span>
                    {session.status.hasCompaction ? (
                      <span className="badge warn">compacted</span>
                    ) : null}
                    {session.status.hasSubagent ? (
                      <span className="badge good">subagent</span>
                    ) : null}
                    {session.status.abortedLastRun ? (
                      <span className="badge bad">aborted</span>
                    ) : null}
                  </div>
                </div>

                <div className="stack" style={{ minWidth: 260 }}>
                  <div className="kv compact-kv">
                    <span className="muted">Updated</span>
                    <span>{session.updatedAt}</span>
                    <span className="muted">Context</span>
                    <span>{formatTokenCount(session.tokens.context)}</span>
                    <span className="muted">Total</span>
                    <span>{formatTokenCount(session.tokens.total)}</span>
                    <span className="muted">API</span>
                    <span className="mono">{session.apiPath}</span>
                  </div>
                  <Link href={session.href} className="badge">
                    Inspect session
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
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
  if (value === "aborted" || value === "compacted" || value === "subagent") {
    return value;
  }

  return "all";
}

function buildSessionsHref(options: {
  q?: string;
  kind?: KindFilter | SessionKind;
  channel?: ChannelFilter | string;
  state?: StateFilter;
}): string {
  const search = new URLSearchParams();

  if (options.q && options.q.trim()) {
    search.set("q", options.q.trim());
  }

  if (options.kind && options.kind !== "all") {
    search.set("kind", options.kind);
  }

  if (options.channel && options.channel !== "all") {
    search.set("channel", options.channel);
  }

  if (options.state && options.state !== "all") {
    search.set("state", options.state);
  }

  const query = search.toString();
  return query ? `/sessions?${query}` : "/sessions";
}
