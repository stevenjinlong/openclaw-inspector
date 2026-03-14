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

        <div className="sidebar-card">
          <p className="eyebrow">Mode</p>
          <strong>Planning / Mock data</strong>
          <p className="muted">
            Next step: replace mock sessions with Gateway or CLI-backed adapter data.
          </p>
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
