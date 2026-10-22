const defaultApiUrl = "http://localhost:4000";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? defaultApiUrl;

export type ApiHealth = {
  status: "ok";
  service: "sandbox-bootstrapper-api";
  timestamp: string;
};

export type SourceEvidence = {
  sourceId: string;
  sourceType: "repo_dashboard" | "sandbox_dashboard";
  sourceUrl: string;
  retrievedAt: string;
};

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  requiredServices: string[];
  source: SourceEvidence;
};

export type DemoRepository = {
  id: string;
  name: string;
  defaultBranch: string;
  templateId: string;
  visibility: "private";
  source: SourceEvidence;
};

export type DemoSandbox = {
  id: string;
  name: string;
  repositoryId: string;
  environment: "sandbox";
  status: "ready";
  source: SourceEvidence;
};

export type SeedProfile = {
  id: string;
  name: string;
  description: string;
  recordCount: number;
  synthetic: true;
  source: SourceEvidence;
};

export type SetupSources = {
  templates: ProjectTemplate[];
  repositories: DemoRepository[];
  sandboxes: DemoSandbox[];
  seedProfiles: SeedProfile[];
};

export type SetupRequestInput = {
  projectTemplate: string;
  repositoryId: string;
  targetEnvironment: "sandbox" | "production";
  requestedPermission: "viewer" | "developer" | "admin";
  seedProfile: string;
};

export type SetupPlan = {
  version: number;
  requestId: string;
  generatedAt: string;
  status: "READY" | "NEEDS_REVIEW";
  decisions: {
    repository: {
      action: "create" | "reuse";
      destinationId: string | null;
      reason: string;
      evidenceIds: string[];
    };
    permission: {
      requested: "viewer" | "developer" | "admin";
      assigned: "viewer" | "developer";
      reduced: boolean;
      reason: string;
      evidenceIds: string[];
    };
  };
  steps: Array<{
    id: string;
    order: number;
    title: string;
    action: string;
  }>;
  unresolvedItems: string[];
  explanation: string;
  explanationSource: "gemini" | "deterministic";
  orderingSource?: "gemini" | "deterministic";
  riskNotes?: string[];
};

export type ExecutionResult = {
  executionId: string;
  requestId: string;
  idempotencyKey: string;
  planVersion: number;
  intendedAction: "create" | "reuse";
  sandbox: {
    id: string;
    repositoryId: string;
    repositoryName: string;
    action: "created" | "reused";
    status: "READY";
    simulated: true;
  };
  permission: {
    assignedRole: "viewer" | "developer";
    productionAccess: false;
  };
  seedData: {
    profileId: string;
    profileName: string;
    recordsCreated: number;
    status: "SEEDED";
    synthetic: true;
  };
  completedAt: string;
  idempotentReplay: boolean;
};

export type SmokeVerification = {
  verificationId: string;
  requestId: string;
  executionId: string;
  method: "mock-login";
  status: "PASSED" | "FAILED";
  checks: Array<{
    id: string;
    label: string;
    intended: string | number | boolean;
    observed: string | number | boolean;
    passed: boolean;
  }>;
  completedAt: string;
  credentialsUsed: "synthetic-reference-only";
  idempotentReplay: boolean;
};

export type SetupManifest = {
  manifest_version: number;
  request_id: string;
  generated_at: string;
  overall_status: "COMPLETED" | "VERIFICATION_FAILED";
  project: {
    template_id: string;
    template_name: string;
    repository_id: string;
    repository_name: string;
    target_environment: string;
  };
  decisions: {
    sandbox_action: "create" | "reuse";
    requested_role: string;
    assigned_role: string;
  };
  approval: {
    plan_version: number;
    reviewed_by: string;
    approved_at: string;
  };
  execution: {
    execution_id: string;
    sandbox_id: string;
    sandbox_action: "created" | "reused";
    seeded_records: number;
    simulated: true;
  };
  verification: {
    verification_id: string;
    method: "mock-login";
    status: "PASSED" | "FAILED";
  };
  unresolved_items: string[];
  secret_scan: {
    status: "PASSED";
    findings: string[];
    scannedAt: string;
  };
};

export type OfficialTestRun = {
  id: string;
  testCase: "TC1" | "TC2" | "TC3" | "TC4";
  expectedResult: string;
  actualResult: string;
  status: "PASSED" | "FAILED";
  createdAt: string;
  evidence: {
    input: Record<string, unknown>;
    evidence: Record<string, unknown>;
  };
};

export type SetupRequestRecord = SetupRequestInput & {
  id: string;
  status:
    | "CAPTURED"
    | "ABORTED"
    | "NEEDS_APPROVAL"
    | "NEEDS_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "VERIFYING"
    | "COMPLETED"
    | "VERIFICATION_FAILED";
  createdAt: string;
  plan: SetupPlan | null;
  approval: {
    reviewedBy: string;
    approvedPlanVersion: number | null;
    approvedAt: string | null;
    rejectedAt: string | null;
    rejectionReason: string | null;
  } | null;
  execution: ExecutionResult | null;
  verification: SmokeVerification | null;
  manifest: SetupManifest | null;
  evidence: {
    capturedAt: string;
    template: ProjectTemplate;
    repository: DemoRepository;
    seedProfile: SeedProfile;
    linkedSandboxes: DemoSandbox[];
    policy: {
      targetEnvironment: "sandbox" | "production";
      productionBlocked: boolean;
      reason: string;
    };
  };
};

type ApiErrorBody = {
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

type ApiList<T> = { data: T[] };

async function getList<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Source request failed with status ${response.status}.`);
  }

  const result = (await response.json()) as ApiList<T>;
  return result.data;
}

export async function getSetupSources(signal?: AbortSignal): Promise<SetupSources> {
  const [templates, repositories, sandboxes, seedProfiles] = await Promise.all([
    getList<ProjectTemplate>("/api/templates", signal),
    getList<DemoRepository>("/api/repositories", signal),
    getList<DemoSandbox>("/api/sandboxes", signal),
    getList<SeedProfile>("/api/seed-profiles", signal),
  ]);

  return { templates, repositories, sandboxes, seedProfiles };
}

export async function createSetupRequest(
  input: SetupRequestInput,
): Promise<{
  id: string;
  status: "ABORTED" | "NEEDS_APPROVAL" | "NEEDS_REVIEW";
}> {
  const response = await fetch(`${apiBaseUrl}/api/requests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = (await response.json()) as {
    data?: {
      id: string;
      status: "ABORTED" | "NEEDS_APPROVAL" | "NEEDS_REVIEW";
    };
  } & ApiErrorBody;

  if (!response.ok || !result.data) {
    throw new ApiRequestError(
      result.message ?? `Request submission failed with status ${response.status}.`,
      result.fieldErrors,
    );
  }

  return result.data;
}

export async function getSetupRequest(requestId: string): Promise<SetupRequestRecord | null> {
  const response = await fetch(`${apiBaseUrl}/api/requests/${encodeURIComponent(requestId)}`, {
    cache: "no-store",
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Request retrieval failed with status ${response.status}.`);
  }

  const result = (await response.json()) as { data: SetupRequestRecord };
  return result.data;
}

export async function reviewSetupPlan(input: {
  requestId: string;
  decision: "approve" | "reject";
  reviewerId: string;
  planVersion: number;
  rejectionReason?: string;
}) {
  const response = await fetch(
    `${apiBaseUrl}/api/requests/${encodeURIComponent(input.requestId)}/approval`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        decision: input.decision,
        reviewerId: input.reviewerId,
        planVersion: input.planVersion,
        rejectionReason: input.rejectionReason,
      }),
    },
  );
  const result = (await response.json()) as {
    data?: { status: "APPROVED" | "REJECTED" };
  } & ApiErrorBody;

  if (!response.ok || !result.data) {
    throw new ApiRequestError(
      result.message ?? `Approval request failed with status ${response.status}.`,
      result.fieldErrors,
    );
  }

  return result.data;
}

export async function executeSetup(requestId: string): Promise<ExecutionResult> {
  const response = await fetch(
    `${apiBaseUrl}/api/requests/${encodeURIComponent(requestId)}/execute`,
    { method: "POST" },
  );
  const result = (await response.json()) as { data?: ExecutionResult } & ApiErrorBody;

  if (!response.ok || !result.data) {
    throw new ApiRequestError(
      result.message ?? `Execution failed with status ${response.status}.`,
    );
  }

  return result.data;
}

export async function runSmokeVerification(
  requestId: string,
): Promise<SmokeVerification> {
  const response = await fetch(
    `${apiBaseUrl}/api/requests/${encodeURIComponent(requestId)}/verify`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    },
  );
  const result = (await response.json()) as {
    data?: SmokeVerification;
  } & ApiErrorBody;

  if (!response.ok || !result.data) {
    throw new ApiRequestError(
      result.message ?? `Verification failed with status ${response.status}.`,
    );
  }

  return result.data;
}

export async function generateManifest(requestId: string): Promise<SetupManifest> {
  const response = await fetch(
    `${apiBaseUrl}/api/requests/${encodeURIComponent(requestId)}/manifest`,
    { method: "POST" },
  );
  const result = (await response.json()) as {
    data?: { manifest: SetupManifest };
  } & ApiErrorBody;

  if (!response.ok || !result.data) {
    throw new ApiRequestError(
      result.message ?? `Manifest generation failed with status ${response.status}.`,
    );
  }

  return result.data.manifest;
}

export function getManifestDownloadUrl(requestId: string) {
  return `${apiBaseUrl}/api/requests/${encodeURIComponent(requestId)}/manifest/download`;
}

export async function getOfficialTestRuns(
  signal?: AbortSignal,
): Promise<OfficialTestRun[]> {
  return getList<OfficialTestRun>("/api/test-cases", signal);
}

export async function runOfficialTestCases(): Promise<OfficialTestRun[]> {
  const response = await fetch(`${apiBaseUrl}/api/test-cases/run`, {
    method: "POST",
  });
  const result = (await response.json()) as {
    data?: OfficialTestRun[];
  } & ApiErrorBody;

  if (!response.ok || !result.data) {
    throw new ApiRequestError(
      result.message ?? `Official test run failed with status ${response.status}.`,
    );
  }

  return result.data;
}

export async function getApiHealth(): Promise<ApiHealth> {
  const response = await fetch(`${apiBaseUrl}/api/health`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API health check failed with status ${response.status}.`);
  }

  return response.json() as Promise<ApiHealth>;
}
