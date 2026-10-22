import Link from "next/link";

import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";

const checks = [
  { label: "Production target block", value: "Enforced" },
  { label: "Human approval gate", value: "Enforced" },
  { label: "Smoke login", value: "Independent" },
  { label: "Secret scan", value: "Required" },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeading
        title="Setup requests"
        description="Review developer sandbox requests from evidence collection through verification."
        action={<Link className="button" href="/requests/new">New setup request</Link>}
      />

      <section className="summary-panel" aria-labelledby="readiness-title">
        <div className="summary-copy">
          <span className="section-label">Demo workflow</span>
          <h2 id="readiness-title">Plan, approve, execute, verify, report</h2>
          <p>
            Gemini explains the grounded recommendation, a human approves it, and the deterministic executor performs the mock setup.
          </p>
          <Link className="text-link" href="/how-it-works">First time here? See how it works →</Link>
        </div>
        <dl className="readiness-list">
          {checks.map((check) => (
            <div key={check.label}>
              <dt>{check.label}</dt>
              <dd>{check.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="content-section" aria-labelledby="requests-title">
        <div className="section-heading">
          <div>
            <h2 id="requests-title">Start the demonstration</h2>
            <p>Create an interactive request or run all four official scenarios.</p>
          </div>
          <StatusBadge tone="success">Ready</StatusBadge>
        </div>

        <div className="empty-state">
          <div className="empty-index" aria-hidden="true">08</div>
          <div>
            <h3>Choose a demo path</h3>
            <p>The interactive path shows each approval step. The test runner captures TC1-TC4 automatically.</p>
          </div>
          <div className="demo-links">
            <Link className="text-link" href="/requests/new">New request <span aria-hidden="true">→</span></Link>
            <Link className="text-link" href="/how-it-works">Guided overview <span aria-hidden="true">→</span></Link>
            <Link className="text-link" href="/test-cases">Official tests <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>
    </>
  );
}
