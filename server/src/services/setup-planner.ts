import type {
  DemoRepository,
  DemoSandbox,
  ProjectTemplate,
  SeedProfile,
} from "../data/demo-sources.js";
import { analyzeSetupPlan } from "./gemini.js";

type Permission = "viewer" | "developer" | "admin";

type PlannerInput = {
  requestId: string;
  requestedPermission: Permission;
  template?: ProjectTemplate;
  repository?: DemoRepository;
  seedProfile?: SeedProfile;
  linkedSandboxes?: DemoSandbox[];
};

export async function buildSetupPlan(input: PlannerInput) {
  const missingEvidence: string[] = [];
  if (!input.template) missingEvidence.push("project template evidence");
  if (!input.repository) missingEvidence.push("repository evidence");
  if (!input.seedProfile) missingEvidence.push("seed profile evidence");
  if (!input.linkedSandboxes) missingEvidence.push("sandbox lookup evidence");

  const assignedPermission: Exclude<Permission, "admin"> =
    input.requestedPermission === "admin"
      ? "developer"
      : input.requestedPermission;
  const existingSandbox = input.linkedSandboxes?.[0];
  const repositoryAction = existingSandbox ? "reuse" : "create";
  const generatedAt = new Date().toISOString();

  const deterministicSteps = [
    {
      id: "verify-evidence",
      order: 1,
      title: "Verify source evidence",
      action: "Confirm the selected template, repository, sandbox lookup, and seed profile.",
    },
    {
      id: `${repositoryAction}-sandbox`,
      order: 2,
      title: `${repositoryAction === "reuse" ? "Reuse" : "Create"} sandbox`,
      action: existingSandbox
        ? `Reuse ${existingSandbox.id}; do not create a duplicate.`
        : `Create one mock sandbox for ${input.repository?.name ?? "the selected repository"}.`,
    },
    {
      id: "assign-permission",
      order: 3,
      title: "Apply least-privilege access",
      action: `Assign the ${assignedPermission} role with no production access.`,
    },
    {
      id: "seed-data",
      order: 4,
      title: "Seed synthetic data",
      action: `Apply ${input.seedProfile?.name ?? "the selected seed profile"} only after approval.`,
    },
    {
      id: "smoke-login",
      order: 5,
      title: "Run smoke login",
      action: "Verify mock login separately from the setup action.",
    },
    {
      id: "generate-manifest",
      order: 6,
      title: "Generate setup manifest",
      action: "Record the actual result and exclude secrets.",
    },
  ];

  const deterministicPlan = {
    version: 1,
    requestId: input.requestId,
    generatedAt,
    status: missingEvidence.length === 0 ? ("READY" as const) : ("NEEDS_REVIEW" as const),
    decisions: {
      repository: {
        action: repositoryAction as "create" | "reuse",
        destinationId: existingSandbox?.id ?? null,
        reason: existingSandbox
          ? `Sandbox ${existingSandbox.id} is already linked to this repository, so it must be reused.`
          : "No linked sandbox was found, so the approved execution may create one.",
        evidenceIds: [
          input.repository?.source.sourceId,
          existingSandbox?.source.sourceId,
        ].filter((value): value is string => Boolean(value)),
      },
      permission: {
        requested: input.requestedPermission,
        assigned: assignedPermission,
        reduced: input.requestedPermission === "admin",
        reason:
          input.requestedPermission === "admin"
            ? "Administrator access exceeds the demo workflow; developer is the maximum sufficient role."
            : `${assignedPermission} is the least-privileged role requested for this workflow.`,
        evidenceIds: [
          `request:${input.requestId}:requested-permission`,
          ...(input.template ? [input.template.source.sourceId] : []),
        ],
      },
    },
    steps: deterministicSteps,
    unresolvedItems: missingEvidence,
  };

  const analysis = await analyzeSetupPlan(deterministicPlan);
  const safeAiOrder = validateSafeOrder(analysis.orderedStepIds, deterministicSteps.map((step) => step.id));
  const orderedSteps = safeAiOrder
    ? analysis.orderedStepIds.map((id, index) => ({
        ...deterministicSteps.find((step) => step.id === id)!,
        order: index + 1,
      }))
    : deterministicSteps;

  return {
    ...deterministicPlan,
    steps: orderedSteps,
    explanation: analysis.text,
    explanationSource: analysis.source,
    orderingSource: safeAiOrder && analysis.source === "gemini" ? "gemini" : "deterministic",
    riskNotes: analysis.riskNotes,
  };
}

function validateSafeOrder(candidate: string[], expected: string[]) {
  if (candidate.length !== expected.length || new Set(candidate).size !== expected.length) return false;
  if (!expected.every((id) => candidate.includes(id))) return false;

  const position = (id: string) => candidate.indexOf(id);
  const sandboxStep = expected.find((id) => id.endsWith("-sandbox"));
  if (!sandboxStep) return false;

  return position("verify-evidence") === 0
    && position(sandboxStep) < position("assign-permission")
    && position(sandboxStep) < position("seed-data")
    && position("assign-permission") < position("smoke-login")
    && position("seed-data") < position("smoke-login")
    && position("smoke-login") < position("generate-manifest")
    && position("generate-manifest") === candidate.length - 1;
}
