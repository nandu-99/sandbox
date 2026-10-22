import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { executions, sandboxes, setupRequests } from "../db/schema.js";
import { ApprovalPolicyError, getApprovedPlanForExecution, } from "./setup-requests.js";
export function executeApprovedSetup(requestId) {
    const previousExecution = db
        .select()
        .from(executions)
        .where(eq(executions.requestId, requestId))
        .get();
    if (previousExecution) {
        return {
            ...JSON.parse(previousExecution.resultJson),
            idempotentReplay: true,
        };
    }
    const plan = getApprovedPlanForExecution(requestId);
    const request = db
        .select()
        .from(setupRequests)
        .where(eq(setupRequests.id, requestId))
        .get();
    if (!request?.evidenceJson) {
        throw new ApprovalPolicyError("APPROVED_PLAN_CHANGED", "Execution evidence is missing; the request must be reviewed again.");
    }
    const evidence = JSON.parse(request.evidenceJson);
    const idempotencyKey = `${requestId}:PLAN-${plan.version}`;
    const executionId = `EXE-${requestId.replace("REQ-", "")}-V${plan.version}`;
    const completedAt = new Date();
    return db.transaction((transaction) => {
        const repeatedExecution = transaction
            .select()
            .from(executions)
            .where(eq(executions.idempotencyKey, idempotencyKey))
            .get();
        if (repeatedExecution) {
            return {
                ...JSON.parse(repeatedExecution.resultJson),
                idempotentReplay: true,
            };
        }
        const sandboxId = plan.decisions.repository.destinationId ??
            `SBX-${requestId.replace("REQ-", "")}`;
        if (plan.decisions.repository.action === "create") {
            transaction
                .insert(sandboxes)
                .values({
                id: sandboxId,
                requestId,
                repositoryName: evidence.repository.name,
                assignedRole: plan.decisions.permission.assigned,
                status: "READY",
                createdAt: completedAt,
            })
                .run();
        }
        const result = {
            executionId,
            requestId,
            idempotencyKey,
            planVersion: plan.version,
            intendedAction: plan.decisions.repository.action,
            sandbox: {
                id: sandboxId,
                repositoryId: evidence.repository.id,
                repositoryName: evidence.repository.name,
                action: plan.decisions.repository.action === "create" ? "created" : "reused",
                status: "READY",
                simulated: true,
            },
            permission: {
                assignedRole: plan.decisions.permission.assigned,
                productionAccess: false,
            },
            seedData: {
                profileId: evidence.seedProfile.id,
                profileName: evidence.seedProfile.name,
                recordsCreated: evidence.seedProfile.recordCount,
                status: "SEEDED",
                synthetic: true,
            },
            completedAt: completedAt.toISOString(),
            idempotentReplay: false,
        };
        transaction
            .insert(executions)
            .values({
            id: executionId,
            requestId,
            idempotencyKey,
            resultJson: JSON.stringify(result),
            createdAt: completedAt,
        })
            .run();
        transaction
            .update(setupRequests)
            .set({ status: "VERIFYING" })
            .where(eq(setupRequests.id, requestId))
            .run();
        return result;
    });
}
//# sourceMappingURL=setup-executor.js.map