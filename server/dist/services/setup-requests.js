import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getProjectTemplates, getRepositories, getSandboxes, getSeedProfiles, } from "../data/demo-sources.js";
import { db } from "../db/client.js";
import { executions, setupRequests, verifications } from "../db/schema.js";
import { buildSetupPlan } from "./setup-planner.js";
export class CatalogueReferenceError extends Error {
    field;
    constructor(field, message) {
        super(message);
        this.field = field;
        this.name = "CatalogueReferenceError";
    }
}
export class ApprovalPolicyError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "ApprovalPolicyError";
    }
}
function createRequestId() {
    return `REQ-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}
export async function createSetupRequest(input) {
    const template = getProjectTemplates().find((item) => item.id === input.projectTemplate);
    if (!template) {
        throw new CatalogueReferenceError("projectTemplate", "The selected project template does not exist.");
    }
    const repository = getRepositories().find((item) => item.id === input.repositoryId);
    if (!repository) {
        throw new CatalogueReferenceError("repositoryId", "The selected demo repository does not exist.");
    }
    const seedProfile = getSeedProfiles().find((item) => item.id === input.seedProfile);
    if (!seedProfile) {
        throw new CatalogueReferenceError("seedProfile", "The selected seed-data profile does not exist.");
    }
    if (repository.templateId !== template.id) {
        throw new CatalogueReferenceError("repositoryId", "The selected repository does not match the project template.");
    }
    const linkedSandboxes = getSandboxes().filter((item) => item.repositoryId === repository.id);
    const capturedAt = new Date();
    const isProduction = input.targetEnvironment === "production";
    const id = createRequestId();
    const evidence = {
        capturedAt: capturedAt.toISOString(),
        template,
        repository,
        seedProfile,
        linkedSandboxes,
        policy: {
            targetEnvironment: input.targetEnvironment,
            productionBlocked: isProduction,
            reason: isProduction
                ? "Production is outside the permitted sandbox workflow."
                : "The sandbox target is permitted for later planning.",
        },
    };
    db.insert(setupRequests)
        .values({
        id,
        projectTemplate: template.id,
        repositoryId: repository.id,
        targetEnvironment: input.targetEnvironment,
        requestedPermission: input.requestedPermission,
        seedProfile: seedProfile.id,
        status: isProduction ? "ABORTED" : "CAPTURED",
        evidenceJson: JSON.stringify(evidence),
        createdAt: capturedAt,
    })
        .run();
    if (!isProduction) {
        const plan = await buildSetupPlan({
            requestId: id,
            requestedPermission: input.requestedPermission,
            template,
            repository,
            seedProfile,
            linkedSandboxes,
        });
        const nextStatus = plan.status === "NEEDS_REVIEW" ? "NEEDS_REVIEW" : "NEEDS_APPROVAL";
        db.update(setupRequests)
            .set({
            planJson: JSON.stringify(plan),
            status: nextStatus,
        })
            .where(eq(setupRequests.id, id))
            .run();
        return {
            id,
            status: nextStatus,
            policyDecision: evidence.policy,
        };
    }
    return {
        id,
        status: "ABORTED",
        policyDecision: evidence.policy,
    };
}
export function getSetupRequest(requestId) {
    const request = db
        .select()
        .from(setupRequests)
        .where(eq(setupRequests.id, requestId))
        .get();
    if (!request)
        return undefined;
    const execution = db
        .select()
        .from(executions)
        .where(eq(executions.requestId, requestId))
        .get();
    const verification = db
        .select()
        .from(verifications)
        .where(eq(verifications.requestId, requestId))
        .get();
    return {
        ...request,
        evidence: request.evidenceJson ? JSON.parse(request.evidenceJson) : null,
        plan: request.planJson ? JSON.parse(request.planJson) : null,
        approval: request.reviewedBy
            ? {
                reviewedBy: request.reviewedBy,
                approvedPlanVersion: request.approvedPlanVersion,
                approvedAt: request.approvedAt,
                rejectedAt: request.rejectedAt,
                rejectionReason: request.rejectionReason,
            }
            : null,
        execution: execution ? JSON.parse(execution.resultJson) : null,
        verification: verification ? JSON.parse(verification.resultJson) : null,
        manifest: request.manifestJson ? JSON.parse(request.manifestJson) : null,
        evidenceJson: undefined,
        planJson: undefined,
        approvedPlanJson: undefined,
        manifestJson: undefined,
    };
}
export function reviewSetupPlan(requestId, input) {
    const request = db
        .select()
        .from(setupRequests)
        .where(eq(setupRequests.id, requestId))
        .get();
    if (!request) {
        throw new ApprovalPolicyError("REQUEST_NOT_FOUND", "The setup request does not exist.");
    }
    if (request.status !== "NEEDS_APPROVAL" || !request.planJson) {
        throw new ApprovalPolicyError("PLAN_NOT_APPROVABLE", "Only a complete plan awaiting approval can be reviewed.");
    }
    const plan = JSON.parse(request.planJson);
    if (plan.status !== "READY") {
        throw new ApprovalPolicyError("PLAN_NOT_APPROVABLE", "Plans with unresolved evidence cannot be approved or rejected here.");
    }
    if (input.planVersion !== plan.version) {
        throw new ApprovalPolicyError("STALE_PLAN_VERSION", `Plan version ${input.planVersion} is stale; review version ${plan.version}.`);
    }
    const reviewedAt = new Date();
    const approved = input.decision === "approve";
    db.update(setupRequests)
        .set({
        status: approved ? "APPROVED" : "REJECTED",
        reviewedBy: input.reviewerId,
        approvedPlanVersion: approved ? plan.version : null,
        approvedPlanJson: approved ? request.planJson : null,
        approvedAt: approved ? reviewedAt : null,
        rejectedAt: approved ? null : reviewedAt,
        rejectionReason: approved ? null : input.rejectionReason,
    })
        .where(eq(setupRequests.id, requestId))
        .run();
    return {
        id: requestId,
        status: approved ? "APPROVED" : "REJECTED",
        reviewedBy: input.reviewerId,
        reviewedAt: reviewedAt.toISOString(),
        approvedPlanVersion: approved ? plan.version : null,
    };
}
export function getApprovedPlanForExecution(requestId) {
    const request = db
        .select()
        .from(setupRequests)
        .where(eq(setupRequests.id, requestId))
        .get();
    if (!request) {
        throw new ApprovalPolicyError("REQUEST_NOT_FOUND", "The setup request does not exist.");
    }
    if (request.status !== "APPROVED" ||
        !request.planJson ||
        !request.approvedPlanJson ||
        request.approvedPlanVersion === null) {
        throw new ApprovalPolicyError("EXECUTION_NOT_APPROVED", "Execution requires an approved plan.");
    }
    const currentPlan = JSON.parse(request.planJson);
    if (currentPlan.version !== request.approvedPlanVersion ||
        request.planJson !== request.approvedPlanJson) {
        throw new ApprovalPolicyError("APPROVED_PLAN_CHANGED", "The plan changed after approval and must be reviewed again.");
    }
    return JSON.parse(request.approvedPlanJson);
}
//# sourceMappingURL=setup-requests.js.map