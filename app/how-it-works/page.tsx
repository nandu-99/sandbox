import Link from "next/link";

import { PageHeading } from "@/components/page-heading";

export const metadata = {
  title: "How the sandbox workflow works",
};

const stages = [
  ["01", "Create a request", "Choose a project template, demo repository, sandbox target, requested permission, and synthetic seed profile."],
  ["02", "Review the plan", "The app checks the saved evidence, blocks production, decides whether to create or reuse a sandbox, and reduces access when required."],
  ["03", "Approve the exact plan", "A human sees the destination and changes before anything runs. Approval locks that version of the plan."],
  ["04", "Execute the mock setup", "The demo creates or reuses a simulated sandbox and adds synthetic seed data. It does not create a real cloud resource."],
  ["05", "Verify and report", "An independent smoke-login check compares intended and observed results, then generates a traceable, secret-free setup manifest."],
] as const;

export default function HowItWorksPage() {
  return (
    <>
      <PageHeading
        title="How the workflow works"
        description="A simple guide to the complete demo, from the first request to the final setup manifest."
        action={<Link className="button" href="/requests/new">Start guided request</Link>}
      />

      <section className="guide-intro" aria-labelledby="important-demo-note">
        <span className="guide-kicker">Important demo note</span>
        <div>
          <h2 id="important-demo-note">This app creates a simulated sandbox, not a real cloud environment.</h2>
          <p>That keeps the hackathon demo safe, repeatable, and free. The app still demonstrates evidence collection, human approval, idempotent execution, verification, and reporting.</p>
        </div>
      </section>

      <section className="ai-explainer" aria-labelledby="ai-role-title">
        <div>
          <span className="section-label">Where AI is used</span>
          <h2 id="ai-role-title">Gemini is the planning analyst, not the approver.</h2>
          <p>It reviews the grounded inputs, orders the allowed setup steps, and explains the sandbox choice, least-privilege role, and risks.</p>
        </div>
        <ol>
          <li><strong>Policy engine</strong><span>Creates the safe executable decisions from repository and sandbox evidence.</span></li>
          <li><strong>Gemini</strong><span>Orders allowed steps and generates grounded reasoning. The server validates its output.</span></li>
          <li><strong>Team lead</strong><span>Approves or rejects the exact plan version.</span></li>
          <li><strong>Executor</strong><span>Runs only after approval and prevents duplicate retries.</span></li>
        </ol>
      </section>

      <section className="guide-layout" aria-label="Workflow explanation">
        <div className="guide-flow">
          <div className="section-heading">
            <div>
              <h2>Five things the user does</h2>
              <p>Follow these in order during the demo.</p>
            </div>
          </div>
          <ol>
            {stages.map(([number, title, description]) => (
              <li key={number}>
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="guide-terms" aria-labelledby="roles-title">
          <span className="section-label">The common confusion</span>
          <h2 id="roles-title">Requested role is not assigned role</h2>
          <dl>
            <div>
              <dt>Requested role</dt>
              <dd>What the user asks for in the form. The guided demo requests <strong>admin</strong>.</dd>
            </div>
            <div>
              <dt>Assigned role</dt>
              <dd>What the safety policy allows. The plan reduces admin to <strong>developer</strong>, the least privilege needed.</dd>
            </div>
          </dl>
          <p className="guide-rule">Admin requested → Developer assigned</p>
        </aside>
      </section>

      <section className="content-section" aria-labelledby="first-demo-title">
        <div className="section-heading">
          <div>
            <h2 id="first-demo-title">Recommended first demo</h2>
            <p>The new-request form is preselected for this happy path.</p>
          </div>
        </div>
        <div className="quick-start-grid">
          <div><span>Environment</span><strong>Sandbox</strong></div>
          <div><span>Requested permission</span><strong>Administrator</strong></div>
          <div><span>Expected assigned role</span><strong>Developer</strong></div>
          <div><span>Expected result</span><strong>Smoke login passes</strong></div>
        </div>
        <div className="guide-actions">
          <Link className="button" href="/requests/new">Create the first request</Link>
          <Link className="text-link" href="/test-cases">Or run all official test cases →</Link>
        </div>
      </section>
    </>
  );
}
