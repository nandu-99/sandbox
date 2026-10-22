"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { reviewSetupPlan } from "@/lib/api-client";

type ApprovalActionsProps = {
  requestId: string;
  planVersion: number;
};

export function ApprovalActions({ requestId, planVersion }: ApprovalActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
    const decision = submitter.value as "approve" | "reject";
    const formData = new FormData(event.currentTarget);
    const reviewerId = String(formData.get("reviewerId"));
    const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();

    if (decision === "reject" && !rejectionReason) {
      setError("Provide a short rejection reason.");
      return;
    }

    setPending(decision);
    setError(null);

    try {
      await reviewSetupPlan({
        requestId,
        decision,
        reviewerId,
        planVersion,
        rejectionReason: rejectionReason || undefined,
      });
      router.refresh();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "The review decision could not be saved.",
      );
      setPending(null);
    }
  }

  return (
    <form className="approval-panel" onSubmit={handleSubmit}>
      <div>
        <span className="section-label">Human approval required</span>
        <h2>Review plan version {planVersion}</h2>
        <p>Approval locks this exact version. No sandbox action runs in this phase.</p>
      </div>

      <label className="field">
        <span>Reviewer ID</span>
        <input name="reviewerId" defaultValue="demo-team-lead" minLength={2} maxLength={80} required />
      </label>

      <label className="field">
        <span>Rejection reason</span>
        <input name="rejectionReason" placeholder="Required only when rejecting" maxLength={300} />
      </label>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="approval-actions">
        <button className="button button-secondary" type="submit" name="decision" value="reject" disabled={pending !== null}>
          {pending === "reject" ? "Rejecting…" : "Reject plan"}
        </button>
        <button className="button" type="submit" name="decision" value="approve" disabled={pending !== null}>
          {pending === "approve" ? "Approving…" : "Approve plan"}
        </button>
      </div>
    </form>
  );
}
