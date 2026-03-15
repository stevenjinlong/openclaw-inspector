"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { SessionSummaryRecord } from "../lib/normalizers";
import {
  buildSessionsHref,
  loadPinnedSessions,
  loadSavedViews,
  type SavedViewRecord,
} from "../lib/personalization";
import { BookmarkIcon, SearchIcon, SessionsIcon } from "./ui-icons";

export function DashboardLocalPanels({ sessions }: { sessions: SessionSummaryRecord[] }) {
  const [pinnedKeys, setPinnedKeys] = useState<string[]>([]);
  const [savedViews, setSavedViews] = useState<SavedViewRecord[]>([]);

  useEffect(() => {
    setPinnedKeys(loadPinnedSessions());
    setSavedViews(loadSavedViews());
  }, []);

  const pinnedSessions = useMemo(
    () => pinnedKeys
      .map((key) => sessions.find((session) => session.key === key) ?? null)
      .filter((session): session is SessionSummaryRecord => session !== null),
    [pinnedKeys, sessions],
  );

  return (
    <section className="dashboard-section stack">
      <div className="section-heading">
        <div className="section-heading-main">
          <span className="section-icon">
            <BookmarkIcon className="icon icon-lg" />
          </span>
          <div>
            <p className="eyebrow">Personal shortcuts</p>
            <h3>Pinned sessions and saved views</h3>
          </div>
        </div>
      </div>

      <div className="grid cols-2">
        <section className="card stack surface-soft">
          <div className="detail-panel-header">
            <div>
              <p className="eyebrow">Pinned sessions</p>
              <h3>Your shortcuts</h3>
            </div>
            <span className="badge">{pinnedSessions.length}</span>
          </div>
          {pinnedSessions.length === 0 ? (
            <p className="muted">Pin sessions from the Sessions page to keep them close at hand.</p>
          ) : (
            <div className="list pressure-list">
              {pinnedSessions.map((session) => (
                <Link key={session.key} href={session.href} className="stats-row elevated-row">
                  <span>
                    <strong>{session.displayName}</strong>
                    <br />
                    <span className="muted">{session.channel} · {session.kind}</span>
                  </span>
                  <span className="muted mono">{session.updatedAt}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card stack surface-soft">
          <div className="detail-panel-header">
            <div>
              <p className="eyebrow">Saved views</p>
              <h3>Reusable filters</h3>
            </div>
            <span className="badge">{savedViews.length}</span>
          </div>
          {savedViews.length === 0 ? (
            <p className="muted">Save a filter combination from the Sessions page and it will show up here.</p>
          ) : (
            <div className="list pressure-list">
              {savedViews.map((view) => (
                <Link key={view.id} href={buildSessionsHref(view)} className="stats-row elevated-row">
                  <span>
                    <strong>{view.name}</strong>
                    <br />
                    <span className="muted">{view.q || "No query"}</span>
                  </span>
                  <span className="badge-row">
                    <span className="badge meta-badge meta-badge-kind">
                      <SessionsIcon className="icon icon-sm" />
                      {view.kind === "all" ? "any kind" : view.kind}
                    </span>
                    <span className="badge meta-badge meta-badge-channel">
                      <SearchIcon className="icon icon-sm" />
                      {view.channel === "all" ? "any channel" : view.channel}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
