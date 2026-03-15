"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Dashboard", description: "Overview" },
  { href: "/sessions", label: "Sessions", description: "Explorer" },
  { href: "/maintenance", label: "Maintenance", description: "Cleanup preview" },
  { href: "/settings", label: "Settings", description: "Connection" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">OC</div>
          <div className="stack compact-gap">
            <p className="eyebrow">OpenClaw</p>
            <h1 className="sidebar-title">Inspector</h1>
            <p className="muted sidebar-copy">
              A calm control plane for sessions, traces, and maintenance.
            </p>
          </div>
        </div>

        <div className="sidebar-section-label">Workspace</div>
        <div className="sidebar-card surface-soft stack">
          <div className="kv compact-kv">
            <span className="muted">Mode</span>
            <span>Local-first</span>
            <span className="muted">Source</span>
            <span>Gateway → CLI</span>
            <span className="muted">Policy</span>
            <span>Read-only</span>
          </div>
        </div>

        <div className="sidebar-section-label">Navigation</div>
        <nav className="nav">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? "active" : ""}`}
              >
                <span className="nav-link-copy">
                  <strong>{item.label}</strong>
                  <span className="muted">{item.description}</span>
                </span>
                <span className="nav-link-dot" />
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer surface-soft">
          <p className="eyebrow">Phase 1</p>
          <p className="muted">
            Light-first visual refresh with cleaner surfaces and calmer spacing.
          </p>
        </div>
      </aside>

      <main className="content">
        <div className="content-inner">{children}</div>
      </main>
    </div>
  );
}
