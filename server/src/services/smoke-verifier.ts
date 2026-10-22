import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { executions, setupRequests, verifications } from "../db/schema.js";

type ExecutionSnapshot = {
  executionId: string;
  sandbox: { id: string; status: "READY" };
  permission: { productionAccess: false };
  seedData: { recordsCreated: number };
};

export class VerificationPolicyError extends Error {
  constructor(
    public readonly code: "REQUEST_NOT_FOUND" | "EXECUTION_REQUIRED",
    message: string,
  ) {
    super(message);
    this.name = "VerificationPolicyError";
  }
}

export function runSmokeVerification(
  requestId: string,
  options: { simulateLoginFailure: boolean },
) {
  const previous = db
    .select()
    .from(verifications)
    .where(eq(verifications.requestId, requestId))
    .get();

  if (previous) {
    return { ...JSON.parse(previous.resultJson), idempotentReplay: true };
  }

  const request = db
    .select()
    .from(setupRequests)
    .where(eq(setupRequests.id, requestId))
    .get();

  if (!request) {
    throw new VerificationPolicyError(
      "REQUEST_NOT_FOUND",
      "The setup request does not exist.",
    );
  }

  const execution = db
    .select()
    .from(executions)
    .where(eq(executions.requestId, requestId))
    .get();

  if (request.status !== "VERIFYING" || !execution) {
    throw new VerificationPolicyError(
      "EXECUTION_REQUIRED",
      "Smoke login can only run after successful setup execution.",
    );
  }

  const executionResult = JSON.parse(execution.resultJson) as ExecutionSnapshot;
  const completedAt = new Date();
  const checks = [
    {
      id: "sandbox-available",
      label: "Sandbox availability",
      intended: "READY",
      observed: executionResult.sandbox.status,
      passed: executionResult.sandbox.status === "READY",
    },
    {
      id: "mock-authentication",
      label: "Mock authentication",
      intended: "accepted",
      observed: options.simulateLoginFailure ? "rejected" : "accepted",
      passed: !options.simulateLoginFailure,
    },
    {
      id: "landing-page",
      label: "Landing page access",
      intended: "/dashboard",
      observed: options.simulateLoginFailure ? "not reached" : "/dashboard",
      passed: !options.simulateLoginFailure,
    },
    {
      id: "seed-data",
      label: "Synthetic seed records",
      intended: executionResult.seedData.recordsCreated,
      observed: executionResult.seedData.recordsCreated,
      passed: true,
    },
    {
      id: "production-isolation",
      label: "Production access",
      intended: false,
      observed: executionResult.permission.productionAccess,
      passed: executionResult.permission.productionAccess === false,
    },
  ];
  const passed = checks.every((check) => check.passed);
  const verificationId = `VER-${requestId.replace("REQ-", "")}`;
  const result = {
    verificationId,
    requestId,
    executionId: executionResult.executionId,
    method: "mock-login",
    status: passed ? ("PASSED" as const) : ("FAILED" as const),
    checks,
    completedAt: completedAt.toISOString(),
    credentialsUsed: "synthetic-reference-only",
    idempotentReplay: false,
  };

  db.transaction((transaction) => {
    transaction
      .insert(verifications)
      .values({
        id: verificationId,
        requestId,
        status: result.status,
        resultJson: JSON.stringify(result),
        createdAt: completedAt,
      })
      .run();

    transaction
      .update(setupRequests)
      .set({ status: passed ? "COMPLETED" : "VERIFICATION_FAILED" })
      .where(eq(setupRequests.id, requestId))
      .run();
  });

  return result;
}
