export default function Loading() {
  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Loading</p>
          <h2>Fetching live OpenClaw data…</h2>
          <p className="muted">
            Inspector is reading local session and maintenance data.
          </p>
        </div>
      </div>

      <section className="grid cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className="stats-tile skeleton-block">
            <div className="skeleton-line short" />
            <div className="skeleton-line medium" />
            <div className="skeleton-line short" />
          </article>
        ))}
      </section>

      <section className="card stack skeleton-block">
        <div className="skeleton-line short" />
        <div className="skeleton-line long" />
        <div className="skeleton-line medium" />
      </section>
    </div>
  );
}
