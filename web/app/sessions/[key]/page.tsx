import Link from "next/link";
import { getSessionBySlug } from "../../../lib/mock-data";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const session = getSessionBySlug(key);

  if (!session) {
    return (
      <div className="stack">
        <p className="eyebrow">Session detail</p>
        <h2>Session not found</h2>
        <p className="muted">The requested session slug does not exist in the sample dataset.</p>
        <Link href="/sessions" className="badge">
          Back to sessions
        </Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Session detail</p>
          <h2>{session.displayName}</h2>
          <p className="muted">{session.key}</p>
        </div>
        <Link href="/sessions" className="badge">
          Back to sessions
        </Link>
      </div>

      <section className="card stack">
        <div className="badge-row">
          <span className="badge">{session.kind}</span>
          <span className="badge">{session.channel}</span>
          <span className="badge">{session.model}</span>
          {session.hasCompaction ? <span className="badge warn">compacted</span> : null}
          {session.hasSubagent ? <span className="badge good">subagent</span> : null}
          {session.abortedLastRun ? <span className="badge bad">aborted</span> : null}
        </div>
        <div className="kv">
          <span className="muted">Updated</span>
          <span>{session.updatedAt}</span>
          <span className="muted">Context tokens</span>
          <span>{session.contextTokens.toLocaleString()}</span>
          <span className="muted">Total tokens</span>
          <span>{session.totalTokens.toLocaleString()}</span>
          <span className="muted">Transcript</span>
          <span>{session.transcriptPath}</span>
        </div>
      </section>

      <section className="card stack">
        <div>
          <p className="eyebrow">Transcript</p>
          <h3>Prototype viewer</h3>
          <p className="muted">Later this becomes searchable, filterable, and tool-aware. For now it shows the intended visual language.</p>
        </div>
        {session.messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`transcript-item ${message.role}`}>
            <p className="eyebrow">{message.role}</p>
            <h4>{message.title}</h4>
            <pre>{message.content}</pre>
          </article>
        ))}
      </section>
    </div>
  );
}
