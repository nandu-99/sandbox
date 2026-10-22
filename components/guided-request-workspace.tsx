"use client";

import Link from "next/link";
import { useState } from "react";

import { ApprovalActions } from "@/components/approval-actions";
import { ExecutionActions } from "@/components/execution-actions";
import { ManifestActions } from "@/components/manifest-actions";
import { StatusBadge } from "@/components/status-badge";
import { VerificationActions } from "@/components/verification-actions";
import { getManifestDownloadUrl, type SetupRequestRecord } from "@/lib/api-client";

type StageId = "request" | "plan" | "approval" | "execution" | "verification" | "manifest";
type StageState = "complete" | "current" | "locked" | "blocked";

const stages: Array<{ id: StageId; label: string; owner: string }> = [
  { id: "request", label: "Request and evidence", owner: "User + agent" },
  { id: "plan", label: "Agent plan", owner: "Policy engine + Gemini" },
  { id: "approval", label: "Human decision", owner: "Team lead" },
  { id: "execution", label: "Sandbox setup", owner: "Deterministic executor" },
  { id: "verification", label: "Smoke login", owner: "Independent verifier" },
  { id: "manifest", label: "Setup manifest", owner: "Report generator" },
];

function getCurrentStage(request: SetupRequestRecord): StageId {
  if (request.status === "ABORTED" || request.status === "NEEDS_REVIEW") return "plan";
  if (request.status === "NEEDS_APPROVAL" || request.status === "REJECTED") return "approval";
  if (request.status === "APPROVED") return "execution";
  if (request.status === "VERIFYING") return "verification";
  return "manifest";
}

function getStageState(request: SetupRequestRecord, stage: StageId, current: StageId): StageState {
  const index = stages.findIndex((item) => item.id === stage);
  const currentIndex = stages.findIndex((item) => item.id === current);
  const stopped = request.status === "ABORTED" || request.status === "NEEDS_REVIEW" || request.status === "REJECTED";
  if (stage === current) return stopped ? "blocked" : "current";
  if (index < currentIndex) return "complete";
  return "locked";
}

function statusLabel(state: StageState) {
  if (state === "complete") return "Complete";
  if (state === "current") return "Current";
  if (state === "blocked") return "Stopped";
  return "Locked";
}

export function GuidedRequestWorkspace({ request }: { request: SetupRequestRecord }) {
  const currentStage = getCurrentStage(request);
  const [selectedStage, setSelectedStage] = useState<StageId>(currentStage);

  return (
    <>
      <section className="responsibility-strip" aria-labelledby="responsibility-title">
        <div className="responsibility-intro">
          <span className="section-label">Who does what?</span>
          <h2 id="responsibility-title">The agent proposes. A human authorizes. The system executes.</h2>
        </div>
        <dl>
          <div><dt>Agent</dt><dd>Reads evidence, applies safety rules, and uses Gemini for grounded reasoning.</dd></div>
          <div><dt>Human reviewer</dt><dd>Approves or rejects the exact plan. AI never self-approves.</dd></div>
          <div><dt>Executor</dt><dd>Runs only the approved version and prevents duplicate execution.</dd></div>
        </dl>
      </section>

      <div className="guided-workspace">
        <aside className="stage-rail" aria-label="Request stages">
          <div className="stage-rail-heading">
            <span>Workflow</span>
            <strong>{stages.findIndex((item) => item.id === currentStage) + 1} / {stages.length}</strong>
          </div>
          <ol>
            {stages.map((stage, index) => {
              const state = getStageState(request, stage.id, currentStage);
              return (
                <li key={stage.id}>
                  <button
                    type="button"
                    className={selectedStage === stage.id ? "stage-button stage-button-selected" : "stage-button"}
                    onClick={() => setSelectedStage(stage.id)}
                    disabled={state === "locked"}
                    aria-current={stage.id === currentStage ? "step" : undefined}
                  >
                    <span className={`stage-index stage-index-${state}`}>{state === "complete" ? "✓" : index + 1}</span>
                    <span className="stage-copy"><strong>{stage.label}</strong><small>{stage.owner}</small></span>
                    <span className={`stage-state stage-state-${state}`}>{statusLabel(state)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <Link className="stage-help" href="/how-it-works">Need the full walkthrough?</Link>
        </aside>

        <main className="stage-panel" aria-live="polite">
          {selectedStage === "request" ? <RequestStage request={request} /> : null}
          {selectedStage === "plan" ? <PlanStage request={request} /> : null}
          {selectedStage === "approval" ? <ApprovalStage request={request} /> : null}
          {selectedStage === "execution" ? <ExecutionStage request={request} /> : null}
          {selectedStage === "verification" ? <VerificationStage request={request} /> : null}
          {selectedStage === "manifest" ? <ManifestStage request={request} /> : null}
        </main>
      </div>

      <div className="page-actions">
        <Link className="button button-secondary" href="/requests/new">Start another request</Link>
        <Link className="text-link" href="/">Return to dashboard</Link>
      </div>
    </>
  );
}

function StageHeader({ label, title, description, status }: { label: string; title: string; description: string; status: string }) {
  return (
    <header className="stage-panel-header">
      <div><span className="section-label">{label}</span><h2>{title}</h2><p>{description}</p></div>
      <StatusBadge tone={status === "Complete" || status === "Ready" ? "success" : "warning"}>{status}</StatusBadge>
    </header>
  );
}

function RequestStage({ request }: { request: SetupRequestRecord }) {
  return (
    <>
      <StageHeader label="Input" title="Request and source evidence" description="The user selected the project. The agent retrieved matching records from the mock dashboards." status="Complete" />
      <dl className="stage-summary-grid">
        <div><dt>Template</dt><dd>{request.evidence.template.name}</dd></div>
        <div><dt>Repository</dt><dd>{request.evidence.repository.name}</dd></div>
        <div><dt>Target</dt><dd>{request.targetEnvironment}</dd></div>
        <div><dt>Requested role</dt><dd>{request.requestedPermission}</dd></div>
        <div><dt>Seed profile</dt><dd>{request.evidence.seedProfile.name}</dd></div>
        <div><dt>Existing sandbox</dt><dd>{request.evidence.linkedSandboxes[0]?.id ?? "None"}</dd></div>
      </dl>
      <div className="evidence-proof"><strong>Traceable evidence</strong><p>Repository source: {request.evidence.repository.source.sourceId}</p><p>Retrieved: {new Date(request.evidence.repository.source.retrievedAt).toLocaleString()}</p></div>
    </>
  );
}

function PlanStage({ request }: { request: SetupRequestRecord }) {
  if (!request.plan) {
    return <><StageHeader label="Agent" title="Planning stopped safely" description={request.evidence.policy.reason} status="Stopped" /><div className="stage-notice stage-notice-warning"><strong>No plan was generated.</strong><p>The production safety rule stopped the workflow before AI analysis or execution.</p></div></>;
  }

  const geminiUsed = request.plan.explanationSource === "gemini";
  return (
    <>
      <StageHeader label="Agent" title="Proposed setup plan" description="Safety decisions are deterministic. Gemini explains the evidence and recommendation but cannot override policy." status={request.plan.status === "READY" ? "Ready" : "Stopped"} />
      <div className={geminiUsed ? "ai-provenance" : "ai-provenance ai-provenance-fallback"}>
        <div><span className="ai-source">{geminiUsed ? "Gemini connected" : "Gemini fallback"}</span><strong>{geminiUsed ? "AI-generated reasoning and ordering" : "Deterministic plan used"}</strong></div>
        <p>{request.plan.explanation}</p>
        {!geminiUsed ? <small>Add a valid GEMINI_API_KEY to the Express server environment to demonstrate live AI reasoning.</small> : null}
      </div>
      <section className="agent-boundary" aria-label="Agent decision boundary">
        <div><span>Policy engine decides</span><strong>Safety and executable changes</strong><p>Production blocking, sandbox reuse, and least privilege cannot be changed by the model.</p></div>
        <div><span>Gemini contributes</span><strong>Grounded plan reasoning</strong><p>Explains the proposed order and risks from saved evidence. It cannot execute or approve.</p></div>
        <div><span>Human decides</span><strong>Approve or reject</strong><p>The next stage records the reviewer and locks the exact plan version.</p></div>
      </section>
      <div className="decision-grid compact-decisions">
        <article><span className="section-label">Sandbox</span><h3>{request.plan.decisions.repository.action === "reuse" ? "Reuse existing sandbox" : "Create mock sandbox"}</h3><p>{request.plan.decisions.repository.reason}</p></article>
        <article><span className="section-label">Access</span><h3>{request.plan.decisions.permission.assigned} role</h3><p>{request.plan.decisions.permission.reason}</p></article>
      </div>
      {request.plan.riskNotes?.length ? <div className="reviewer-checks"><strong>Checks suggested for the human reviewer</strong><ul>{request.plan.riskNotes.map((note) => <li key={note}>{note}</li>)}</ul></div> : null}
      <details className="stage-details"><summary>Inspect the ordered plan and evidence</summary><p className="ordering-source">Order selected by: {request.plan.orderingSource === "gemini" ? "Gemini, then safety-validated by the server" : "deterministic safety fallback"}</p><ol className="plan-steps">{request.plan.steps.map((step) => <li key={step.id}><span>{step.order}</span><div><strong>{step.title}</strong><p>{step.action}</p></div></li>)}</ol></details>
    </>
  );
}

function ApprovalStage({ request }: { request: SetupRequestRecord }) {
  if (!request.plan) return <LockedStage title="No plan is available for review" />;
  return (
    <>
      <StageHeader label="Human control" title="Review the agent's proposal" description="The AI cannot approve its own recommendation. A named team lead must make this decision." status={request.status === "NEEDS_APPROVAL" ? "Action required" : request.status === "REJECTED" ? "Rejected" : "Complete"} />
      <div className="approval-review-summary"><div><span>Plan version</span><strong>{request.plan.version}</strong></div><div><span>Sandbox action</span><strong>{request.plan.decisions.repository.action}</strong></div><div><span>Requested role</span><strong>{request.plan.decisions.permission.requested}</strong></div><div><span>Assigned role</span><strong>{request.plan.decisions.permission.assigned}</strong></div></div>
      {request.status === "NEEDS_APPROVAL" ? <ApprovalActions requestId={request.id} planVersion={request.plan.version} /> : request.approval ? (
        <div className={request.status === "REJECTED" ? "stage-notice stage-notice-warning" : "stage-notice"}><strong>{request.status === "REJECTED" ? "Plan rejected" : "Plan approved and locked"}</strong><p>Reviewer: {request.approval.reviewedBy}</p><p>Decision time: {new Date(request.approval.approvedAt ?? request.approval.rejectedAt ?? "").toLocaleString()}</p>{request.approval.rejectionReason ? <p>Reason: {request.approval.rejectionReason}</p> : null}</div>
      ) : <div className="stage-notice stage-notice-warning"><strong>Human review is unavailable.</strong><p>Resolve the agent review items first.</p></div>}
    </>
  );
}

function ExecutionStage({ request }: { request: SetupRequestRecord }) {
  return (
    <>
      <StageHeader label="Controlled action" title="Create or reuse the mock sandbox" description="The executor rechecks the locked plan and uses an idempotency key so retries cannot create duplicates." status={request.execution ? "Complete" : request.status === "APPROVED" ? "Action required" : "Locked"} />
      {request.status === "APPROVED" && !request.execution ? <ExecutionActions requestId={request.id} /> : null}
      {request.execution ? <><dl className="stage-summary-grid"><div><dt>Sandbox ID</dt><dd>{request.execution.sandbox.id}</dd></div><div><dt>Result</dt><dd>{request.execution.sandbox.action}</dd></div><div><dt>Assigned role</dt><dd>{request.execution.permission.assignedRole}</dd></div><div><dt>Seeded records</dt><dd>{request.execution.seedData.recordsCreated}</dd></div></dl><div className="stage-notice"><strong>Safe to retry</strong><p>{request.execution.idempotencyKey}</p><ExecutionActions requestId={request.id} retry /></div></> : request.status !== "APPROVED" ? <LockedStage title="Human approval is required before execution" /> : null}
    </>
  );
}

function VerificationStage({ request }: { request: SetupRequestRecord }) {
  return (
    <>
      <StageHeader label="Independent check" title="Verify the actual result" description="Smoke login is separate from execution, so a successful action cannot hide a failed verification." status={request.verification ? (request.verification.status === "PASSED" ? "Complete" : "Failed") : request.execution ? "Action required" : "Locked"} />
      {request.status === "VERIFYING" && !request.verification ? <VerificationActions requestId={request.id} /> : null}
      {request.verification ? <div className="check-list">{request.verification.checks.map((check) => <div key={check.id}><span>{check.passed ? "Pass" : "Fail"}</span><strong>{check.label}</strong><small>Expected: {String(check.intended)} | Observed: {String(check.observed)}</small></div>)}</div> : request.status !== "VERIFYING" ? <LockedStage title="Execute the approved plan before verification" /> : null}
    </>
  );
}

function ManifestStage({ request }: { request: SetupRequestRecord }) {
  const canGenerate = request.status === "COMPLETED" || request.status === "VERIFICATION_FAILED";
  return (
    <>
      <StageHeader label="Final output" title="Generate the setup manifest" description="The manifest combines evidence, decisions, approval, execution, and verification without including secrets." status={request.manifest ? "Complete" : canGenerate ? "Action required" : "Locked"} />
      {canGenerate && !request.manifest ? <ManifestActions requestId={request.id} /> : null}
      {request.manifest ? <><dl className="stage-summary-grid"><div><dt>Overall status</dt><dd>{request.manifest.overall_status}</dd></div><div><dt>Sandbox action</dt><dd>{request.manifest.execution.sandbox_action}</dd></div><div><dt>Smoke login</dt><dd>{request.manifest.verification.status}</dd></div><div><dt>Secret scan</dt><dd>{request.manifest.secret_scan.status}</dd></div></dl><div className="manifest-finish"><div><strong>Workflow complete</strong><p>The result is traceable and contains zero secret findings.</p></div><a className="button" href={getManifestDownloadUrl(request.id)}>Download manifest</a></div><details className="stage-details"><summary>Inspect manifest JSON</summary><pre>{JSON.stringify(request.manifest, null, 2)}</pre></details></> : !canGenerate ? <LockedStage title="Verification must finish before reporting" /> : null}
    </>
  );
}

function LockedStage({ title }: { title: string }) {
  return <div className="locked-stage"><strong>{title}</strong><p>Complete the current stage to unlock this part of the workflow.</p></div>;
}
