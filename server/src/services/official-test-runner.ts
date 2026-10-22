import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { executions, sandboxes, testCaseRuns } from "../db/schema.js";
import { executeApprovedSetup } from "./setup-executor.js";
import { generateSetupManifest, scanManifestForSecrets } from "./manifest.js";
import {
  createSetupRequest,
  getSetupRequest,
  reviewSetupPlan,
} from "./setup-requests.js";
import { runSmokeVerification } from "./smoke-verifier.js";

type TestOutcome = {
  input: Record<string, unknown>;
  expectedResult: string;
  actualResult: string;
  passed: boolean;
  evidence: Record<string, unknown>;
};

function runId(testCase: string) {
  return `RUN-${testCase}-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

function storeOutcome(testCase: string, outcome: TestOutcome) {
  const id = runId(testCase);
  const createdAt = new Date();
  db.insert(testCaseRuns)
    .values({
      id,
      testCase,
      expectedResult: outcome.expectedResult,
      actualResult: outcome.actualResult,
      status: outcome.passed ? "PASSED" : "FAILED",
      evidenceJson: JSON.stringify({
        input: outcome.input,
        evidence: outcome.evidence,
      }),
      createdAt,
    })
    .run();

  return {
    id,
    testCase,
    expectedResult: outcome.expectedResult,
    actualResult: outcome.actualResult,
    status: outcome.passed ? "PASSED" : "FAILED",
    createdAt,
    evidence: { input: outcome.input, evidence: outcome.evidence },
  };
}

async function completedSandboxScenario(
  projectTemplate: "tpl-node-api" | "tpl-next-web",
  repositoryId: "repo-payments-api" | "repo-catalog-web",
) {
  const request = await createSetupRequest({
    projectTemplate,
    repositoryId,
    targetEnvironment: "sandbox",
    requestedPermission: "developer",
    seedProfile: "seed-demo-customers",
  });
  reviewSetupPlan(request.id, {
    decision: "approve",
    reviewerId: "official-test-runner",
    planVersion: 1,
  });
  const execution = executeApprovedSetup(request.id);
  const verification = runSmokeVerification(request.id, {
    simulateLoginFailure: false,
  });
  return { requestId: request.id, execution, verification };
}

export async function runOfficialTestCases() {
  let tc1RequestId: string | undefined;
  const outcomes: Array<ReturnType<typeof storeOutcome>> = [];

  try {
    const scenario = await completedSandboxScenario(
      "tpl-node-api",
      "repo-payments-api",
    );
    tc1RequestId = scenario.requestId;
    const passed =
      scenario.execution.sandbox.action === "created" &&
      scenario.verification.status === "PASSED";
    outcomes.push(
      storeOutcome("TC1", {
        input: {
          scenario: "Project template",
          projectTemplate: "tpl-node-api",
          environment: "sandbox",
        },
        expectedResult: "Sandbox created and smoke login passes",
        actualResult: `Sandbox ${scenario.execution.sandbox.action}; smoke login ${scenario.verification.status.toLowerCase()}`,
        passed,
        evidence: {
          requestId: scenario.requestId,
          executionId: scenario.execution.executionId,
          verificationId: scenario.verification.verificationId,
        },
      }),
    );
  } catch (error) {
    outcomes.push(
      storeOutcome("TC1", {
        input: { scenario: "Project template" },
        expectedResult: "Sandbox created and smoke login passes",
        actualResult: error instanceof Error ? error.message : "Unknown failure",
        passed: false,
        evidence: {},
      }),
    );
  }

  try {
    const request = await createSetupRequest({
      projectTemplate: "tpl-node-api",
      repositoryId: "repo-payments-api",
      targetEnvironment: "production",
      requestedPermission: "developer",
      seedProfile: "seed-demo-customers",
    });
    const record = getSetupRequest(request.id);
    const passed = request.status === "ABORTED" && record?.plan === null;
    outcomes.push(
      storeOutcome("TC2", {
        input: {
          scenario: "Production account selected by mistake",
          environment: "production",
        },
        expectedResult: "Setup aborted",
        actualResult: request.status === "ABORTED" ? "Setup aborted before planning" : request.status,
        passed,
        evidence: {
          requestId: request.id,
          productionBlocked: record?.evidence.policy.productionBlocked,
          planCreated: record?.plan !== null,
        },
      }),
    );
  } catch (error) {
    outcomes.push(
      storeOutcome("TC2", {
        input: { scenario: "Production account selected by mistake" },
        expectedResult: "Setup aborted",
        actualResult: error instanceof Error ? error.message : "Unknown failure",
        passed: false,
        evidence: {},
      }),
    );
  }

  try {
    const scenario = await completedSandboxScenario(
      "tpl-next-web",
      "repo-catalog-web",
    );
    const replay = executeApprovedSetup(scenario.requestId);
    const createdSandboxRows = db
      .select()
      .from(sandboxes)
      .where(eq(sandboxes.requestId, scenario.requestId))
      .all().length;
    const executionRows = db
      .select()
      .from(executions)
      .where(eq(executions.requestId, scenario.requestId))
      .all().length;
    const passed =
      scenario.execution.sandbox.action === "reused" &&
      replay.idempotentReplay === true &&
      createdSandboxRows === 0 &&
      executionRows === 1;
    outcomes.push(
      storeOutcome("TC3", {
        input: {
          scenario: "Sandbox repo already exists",
          repositoryId: "repo-catalog-web",
        },
        expectedResult: "Existing sandbox reused; no duplicate created",
        actualResult: `${scenario.execution.sandbox.id} reused; ${createdSandboxRows} duplicate sandbox rows`,
        passed,
        evidence: {
          requestId: scenario.requestId,
          sandboxId: scenario.execution.sandbox.id,
          executionRows,
          retryReturnedOriginal: replay.idempotentReplay,
        },
      }),
    );
  } catch (error) {
    outcomes.push(
      storeOutcome("TC3", {
        input: { scenario: "Sandbox repo already exists" },
        expectedResult: "Existing sandbox reused; no duplicate created",
        actualResult: error instanceof Error ? error.message : "Unknown failure",
        passed: false,
        evidence: {},
      }),
    );
  }

  try {
    const requestId =
      tc1RequestId ??
      (await completedSandboxScenario("tpl-node-api", "repo-payments-api")).requestId;
    const { manifest } = generateSetupManifest(requestId);
    const rescan = scanManifestForSecrets(manifest);
    const passed =
      manifest.secret_scan.status === "PASSED" && rescan.status === "PASSED";
    outcomes.push(
      storeOutcome("TC4", {
        input: { scenario: "Setup report generated", requestId },
        expectedResult: "No secrets included",
        actualResult: `${rescan.findings.length} secret findings`,
        passed,
        evidence: {
          requestId,
          manifestVersion: manifest.manifest_version,
          secretScan: rescan,
        },
      }),
    );
  } catch (error) {
    outcomes.push(
      storeOutcome("TC4", {
        input: { scenario: "Setup report generated" },
        expectedResult: "No secrets included",
        actualResult: error instanceof Error ? error.message : "Unknown failure",
        passed: false,
        evidence: {},
      }),
    );
  }

  return outcomes;
}

export function getOfficialTestCaseRuns() {
  return db
    .select()
    .from(testCaseRuns)
    .all()
    .map((run) => ({
      ...run,
      evidence: run.evidenceJson ? JSON.parse(run.evidenceJson) : null,
      evidenceJson: undefined,
    }));
}
