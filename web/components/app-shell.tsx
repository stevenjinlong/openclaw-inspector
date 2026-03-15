import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/sessions", label: "Sessions" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">OpenClaw</p>
          <h1>Inspector</h1>
          <p className="muted">
            Visualize, debug, and control your OpenClaw sessions.
          </p>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="nav-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-card stack">
          <div>
            <p className="eyebrow">Mode</p>
            <strong>Local-first adapter</strong>
          </div>
          <p className="muted">
            The app now tries live local OpenClaw data first: Gateway sessions,
            Gateway chat history, then CLI / local transcript fallbacks.
          </p>
          <div className="badge-row">
            <span className="badge">GET /api/health</span>
            <span className="badge">GET /api/sessions</span>
            <span className="badge">GET /api/sessions/[key]</span>
          </div>
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
