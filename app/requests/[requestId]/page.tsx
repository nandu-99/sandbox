import { notFound } from "next/navigation";

import { GuidedRequestWorkspace } from "@/components/guided-request-workspace";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { getSetupRequest } from "@/lib/api-client";

type RequestDetailsPageProps = {
  params: Promise<{ requestId: string }>;
};

export default async function RequestDetailsPage({ params }: RequestDetailsPageProps) {
  const { requestId } = await params;
  const request = await getSetupRequest(requestId);

  if (!request) notFound();

  const label = {
    CAPTURED: "Captured",
    ABORTED: "Safely stopped",
    NEEDS_APPROVAL: "Human approval needed",
    NEEDS_REVIEW: "Agent review needed",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    VERIFYING: "Ready to verify",
    COMPLETED: "Verification passed",
    VERIFICATION_FAILED: "Verification failed",
  }[request.status];
  const warning = ["ABORTED", "NEEDS_APPROVAL", "NEEDS_REVIEW", "REJECTED", "VERIFICATION_FAILED"].includes(request.status);

  return (
    <>
      <PageHeading
        title="Guided setup workflow"
        description={`${request.id}. Follow one stage at a time. Completed stages remain available from the workflow menu.`}
        action={<StatusBadge tone={warning ? "warning" : "success"}>{label}</StatusBadge>}
      />
      <GuidedRequestWorkspace key={`${request.status}:${Boolean(request.manifest)}`} request={request} />
    </>
  );
}
