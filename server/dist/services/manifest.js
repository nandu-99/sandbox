import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { executions, setupRequests, verifications } from "../db/schema.js";
const sensitiveKeyPattern = /password|secret|token|api[_-]?key|private[_-]?key|connection[_-]?string/i;
const sensitiveValuePatterns = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
    /\b(?:sk|AIza)[-_A-Za-z0-9]{16,}\b/,
    /\b(?:password|token|secret)\s*[:=]\s*\S+/i,
    /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:]+:[^@\s]+@/i,
];
export class ManifestPolicyError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "ManifestPolicyError";
    }
}
function findSensitiveKeys(value, path = "root") {
    if (!value || typeof value !== "object")
        return [];
    return Object.entries(value).flatMap(([key, item]) => {
        const currentPath = `${path}.${key}`;
        return [
            ...(key !== "secret_scan" && sensitiveKeyPattern.test(key)
                ? [currentPath]
                : []),
            ...findSensitiveKeys(item, currentPath),
        ];
    });
}
export function scanManifestForSecrets(value) {
    const serialized = JSON.stringify(value);
    const findings = [
        ...findSensitiveKeys(value),
        ...sensitiveValuePatterns
            .map((pattern, index) => (pattern.test(serialized) ? `value-pattern-${index + 1}` : null))
            .filter((finding) => Boolean(finding)),
    ];
    return {
        status: findings.length === 0 ? "PASSED" : "FAILED",
        findings,
        scannedAt: new Date().toISOString(),
    };
}
export function generateSetupManifest(requestId) {
    const request = db
        .select()
        .from(setupRequests)
        .where(eq(setupRequests.id, requestId))
        .get();
    if (!request) {
        throw new ManifestPolicyError("REQUEST_NOT_FOUND", "The setup request does not exist.");
    }
    if (request.manifestJson) {
        return { manifest: JSON.parse(request.manifestJson), idempotentReplay: true };
    }
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
    if (!execution ||
        !verification ||
        !["COMPLETED", "VERIFICATION_FAILED"].includes(request.status) ||
        !request.evidenceJson ||
        !request.planJson) {
        throw new ManifestPolicyError("VERIFICATION_REQUIRED", "Generate the manifest only after setup execution and smoke verification.");
    }
    const evidence = JSON.parse(request.evidenceJson);
    const plan = JSON.parse(request.planJson);
    const executionResult = JSON.parse(execution.resultJson);
    const verificationResult = JSON.parse(verification.resultJson);
    const generatedAt = new Date().toISOString();
    const manifestBase = {
        manifest_version: 1,
        request_id: request.id,
        generated_at: generatedAt,
        overall_status: verificationResult.status === "PASSED" ? "COMPLETED" : "VERIFICATION_FAILED",
        project: {
            template_id: evidence.template.id,
            template_name: evidence.template.name,
            repository_id: evidence.repository.id,
            repository_name: evidence.repository.name,
            target_environment: request.targetEnvironment,
        },
        source_evidence: [
            evidence.template.source,
            evidence.repository.source,
            evidence.seedProfile.source,
            ...evidence.linkedSandboxes.map((sandbox) => sandbox.source),
        ].map((source) => ({
            source_id: source.sourceId,
            source_url: source.sourceUrl,
            retrieved_at: source.retrievedAt,
        })),
        decisions: {
            sandbox_action: plan.decisions.repository.action,
            sandbox_reason: plan.decisions.repository.reason,
            requested_role: plan.decisions.permission.requested,
            assigned_role: plan.decisions.permission.assigned,
            permission_reason: plan.decisions.permission.reason,
        },
        approval: {
            plan_version: request.approvedPlanVersion,
            reviewed_by: request.reviewedBy,
            approved_at: request.approvedAt?.toISOString() ?? null,
        },
        execution: {
            execution_id: executionResult.executionId,
            sandbox_id: executionResult.sandbox.id,
            sandbox_action: executionResult.sandbox.action,
            sandbox_status: executionResult.sandbox.status,
            assigned_role: executionResult.permission.assignedRole,
            production_access: executionResult.permission.productionAccess,
            seed_profile: executionResult.seedData.profileName,
            seeded_records: executionResult.seedData.recordsCreated,
            simulated: true,
            completed_at: executionResult.completedAt,
        },
        verification: {
            verification_id: verificationResult.verificationId,
            method: verificationResult.method,
            status: verificationResult.status,
            checks: verificationResult.checks,
            completed_at: verificationResult.completedAt,
        },
        unresolved_items: plan.unresolvedItems,
    };
    const secretScan = scanManifestForSecrets(manifestBase);
    if (secretScan.status !== "PASSED") {
        throw new ManifestPolicyError("SECRET_SCAN_FAILED", "The setup manifest failed its secret scan and was not stored.");
    }
    const manifest = { ...manifestBase, secret_scan: secretScan };
    db.update(setupRequests)
        .set({ manifestJson: JSON.stringify(manifest) })
        .where(eq(setupRequests.id, requestId))
        .run();
    return { manifest, idempotentReplay: false };
}
export function getStoredManifest(requestId) {
    const request = db
        .select({ manifestJson: setupRequests.manifestJson })
        .from(setupRequests)
        .where(eq(setupRequests.id, requestId))
        .get();
    return request?.manifestJson ? JSON.parse(request.manifestJson) : undefined;
}
//# sourceMappingURL=manifest.js.map