"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  formatTokenCount,
  type ResponseMeta,
  type SessionKind,
  type SessionSummaryRecord,
} from "../lib/normalizers";

type KindFilter = "all" | SessionKind;
type ChannelFilter = "all" | string;
type StateFilter = "all" | "aborted" | "compacted" | "subagent";

export function SessionsExplorer({
  sessions,
  meta,
  initialQuery,
  initialKind,
  initialChannel,
  initialState,
}: {
  sessions: SessionSummaryRecord[];
  meta: ResponseMeta;
  initialQuery: string;
  initialKind: KindFilter;
  initialChannel: ChannelFilter;
  initialState: StateFilter;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [kindFilter, setKindFilter] = useState<KindFilter>(initialKind);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>(initialChannel);
  const [stateFilter, setStateFilter] = useState<StateFilter>(initialState);

  const allKinds = useMemo(
    () => Array.from(new Set(sessions.map((session) => session.kind))).sort(),
    [sessions],
  );
  const allChannels = useMemo(
    () => Array.from(new Set(sessions.map((session) => session.channel))).sort(),
    [sessions],
  );

  const filteredSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sessions.filter((session) => {
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

      if (normalizedQuery) {
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

        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }

      return true;
    });
  }, [sessions, query, kindFilter, channelFilter, stateFilter]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }

    if (kindFilter !== "all") {
      params.set("kind", kindFilter);
    } else {
      params.delete("kind");
    }

    if (channelFilter !== "all") {
      params.set("channel", channelFilter);
    } else {
      params.delete("channel");
    }

    if (stateFilter !== "all") {
      params.set("state", stateFilter);
    } else {
      params.delete("state");
    }

    const queryString = params.toString();
    const nextUrl = `${url.pathname}${queryString ? `?${queryString}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [query, kindFilter, channelFilter, stateFilter]);

  return (
    <>
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
        <div className="search-row">
          <input
            className="search-input"
            type="text"
            name="q"
            placeholder="Search by name, key, channel, agent, model"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {(query || kindFilter !== "all" || channelFilter !== "all" || stateFilter !== "all") ? (
            <button
              className="search-button secondary"
              type="button"
              onClick={() => {
                setQuery("");
                setKindFilter("all");
                setChannelFilter("all");
                setStateFilter("all");
              }}
            >
              Clear
            </button>
          ) : null}
        </div>

        <div className="badge-row">
          <span className="badge">Sort: updatedAt</span>
          <span className="badge">Client-side filtering</span>
        </div>

        <div className="grid cols-2">
          <section className="card stack">
            <p className="eyebrow">Kind</p>
            <div className="badge-row">
              <button
                type="button"
                onClick={() => setKindFilter("all")}
                className={`tab-link ${kindFilter === "all" ? "active" : ""}`}
              >
                All kinds
              </button>
              {allKinds.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setKindFilter(kind)}
                  className={`tab-link ${kindFilter === kind ? "active" : ""}`}
                >
                  {kind}
                </button>
              ))}
            </div>
          </section>

          <section className="card stack">
            <p className="eyebrow">Channel</p>
            <div className="badge-row">
              <button
                type="button"
                onClick={() => setChannelFilter("all")}
                className={`tab-link ${channelFilter === "all" ? "active" : ""}`}
              >
                All channels
              </button>
              {allChannels.map((channel) => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => setChannelFilter(channel)}
                  className={`tab-link ${channelFilter === channel ? "active" : ""}`}
                >
                  {channel}
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="card stack">
          <p className="eyebrow">State</p>
          <div className="badge-row">
            {([
              ["all", "All states"],
              ["aborted", "Aborted"],
              ["compacted", "Compacted"],
              ["subagent", "Subagent"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStateFilter(value)}
                className={`tab-link ${stateFilter === value ? "active" : ""}`}
              >
                {label}
              </button>
            ))}
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
                  <Link href={session.href} className="badge" prefetch>
                    Inspect session
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
