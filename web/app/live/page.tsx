import { LiveMonitorBoard } from "../../components/live-monitor-board";
import { MonitorIcon } from "../../components/ui-icons";
import { listSessionsResponse } from "../../lib/session-adapter";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const { data: sessions, meta } = await listSessionsResponse();

  return (
    <div className="stack">
      <div className="page-title">
        <div className="title-with-icon">
          <span className="page-icon-badge">
            <MonitorIcon className="icon icon-lg" />
          </span>
          <div>
            <p className="eyebrow">Now</p>
            <h2>Live monitor</h2>
            <p className="muted">
              Watch recent sessions and see which ones are actively running, waiting on tools, or possibly stuck.
            </p>
          </div>
        </div>
        <span className="badge">{meta.adapter.label}</span>
      </div>

      <LiveMonitorBoard sessions={sessions} />
    </div>
  );
}
