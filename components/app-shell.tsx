import Link from "next/link";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-frame">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Sandbox Bootstrapper home">
          <span className="brand-mark" aria-hidden="true">SB</span>
          <span className="brand-copy">
            <strong>Sandbox Bootstrapper</strong>
            <span>Developer environment setup</span>
          </span>
        </Link>
        <nav className="topnav" aria-label="Primary navigation">
          <Link href="/">Requests</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/test-cases">Test cases</Link>
          <Link className="button button-small" href="/requests/new">
            New request
          </Link>
        </nav>
      </header>
      <main className="page-shell">{children}</main>
    </div>
  );
}
