import { Router } from "express";
import { setupRequestSchema } from "../schemas/setup-request.js";
import { approvalSchema } from "../schemas/approval.js";
import { verificationSchema } from "../schemas/verification.js";
import { ApprovalPolicyError, CatalogueReferenceError, createSetupRequest, getSetupRequest, reviewSetupPlan, } from "../services/setup-requests.js";
import { executeApprovedSetup } from "../services/setup-executor.js";
import { runSmokeVerification, VerificationPolicyError, } from "../services/smoke-verifier.js";
import { generateSetupManifest, getStoredManifest, ManifestPolicyError, } from "../services/manifest.js";
export const setupRequestsRouter = Router();
setupRequestsRouter.post("/requests", async (request, response) => {
    const parsed = setupRequestSchema.safeParse(request.body);
    if (!parsed.success) {
        response.status(400).json({
            error: "INVALID_REQUEST",
            message: "Correct the invalid setup request fields.",
            fieldErrors: parsed.error.flatten().fieldErrors,
        });
        return;
    }
    try {
        const result = await createSetupRequest(parsed.data);
        response.status(201).json({ data: result });
    }
    catch (error) {
        if (error instanceof CatalogueReferenceError) {
            response.status(422).json({
                error: "INVALID_CATALOGUE_REFERENCE",
                message: error.message,
                fieldErrors: { [error.field]: [error.message] },
            });
            return;
        }
        throw error;
    }
});
setupRequestsRouter.get("/requests/:requestId", (request, response) => {
    const setupRequest = getSetupRequest(request.params.requestId);
    if (!setupRequest) {
        response.status(404).json({
            error: "REQUEST_NOT_FOUND",
            message: "The requested setup record does not exist.",
        });
        return;
    }
    response.json({ data: setupRequest });
});
setupRequestsRouter.post("/requests/:requestId/approval", (request, response) => {
    const parsed = approvalSchema.safeParse(request.body);
    if (!parsed.success) {
        response.status(400).json({
            error: "INVALID_APPROVAL",
            message: "Correct the invalid approval fields.",
            fieldErrors: parsed.error.flatten().fieldErrors,
        });
        return;
    }
    try {
        const result = reviewSetupPlan(request.params.requestId, parsed.data);
        response.json({ data: result });
    }
    catch (error) {
        if (error instanceof ApprovalPolicyError) {
            response.status(error.code === "REQUEST_NOT_FOUND" ? 404 : 409).json({
                error: error.code,
                message: error.message,
            });
            return;
        }
        throw error;
    }
});
setupRequestsRouter.post("/requests/:requestId/execute", (request, response) => {
    try {
        const result = executeApprovedSetup(request.params.requestId);
        response.status(result.idempotentReplay ? 200 : 201).json({ data: result });
    }
    catch (error) {
        if (error instanceof ApprovalPolicyError) {
            response.status(error.code === "REQUEST_NOT_FOUND" ? 404 : 409).json({
                error: error.code,
                message: error.message,
            });
            return;
        }
        throw error;
    }
});
setupRequestsRouter.post("/requests/:requestId/verify", (request, response) => {
    const parsed = verificationSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
        response.status(400).json({
            error: "INVALID_VERIFICATION",
            message: "Correct the invalid verification fields.",
            fieldErrors: parsed.error.flatten().fieldErrors,
        });
        return;
    }
    try {
        const result = runSmokeVerification(request.params.requestId, parsed.data);
        response.status(result.idempotentReplay ? 200 : 201).json({ data: result });
    }
    catch (error) {
        if (error instanceof VerificationPolicyError) {
            response.status(error.code === "REQUEST_NOT_FOUND" ? 404 : 409).json({
                error: error.code,
                message: error.message,
            });
            return;
        }
        throw error;
    }
});
setupRequestsRouter.post("/requests/:requestId/manifest", (request, response) => {
    try {
        const result = generateSetupManifest(request.params.requestId);
        response.status(result.idempotentReplay ? 200 : 201).json({ data: result });
    }
    catch (error) {
        if (error instanceof ManifestPolicyError) {
            response.status(error.code === "REQUEST_NOT_FOUND" ? 404 : 409).json({
                error: error.code,
                message: error.message,
            });
            return;
        }
        throw error;
    }
});
setupRequestsRouter.get("/requests/:requestId/manifest/download", (request, response) => {
    const manifest = getStoredManifest(request.params.requestId);
    if (!manifest) {
        response.status(404).json({
            error: "MANIFEST_NOT_FOUND",
            message: "Generate the setup manifest before downloading it.",
        });
        return;
    }
    const safeRequestId = request.params.requestId.replace(/[^A-Za-z0-9-]/g, "");
    response.setHeader("Content-Disposition", `attachment; filename="${safeRequestId}-setup-manifest.json"`);
    response.type("application/json").send(JSON.stringify(manifest, null, 2));
});
//# sourceMappingURL=setup-requests.js.map