import { z } from "zod";
export const approvalSchema = z
    .object({
    decision: z.enum(["approve", "reject"]),
    reviewerId: z.string().trim().min(2).max(80),
    planVersion: z.number().int().positive(),
    rejectionReason: z.string().trim().max(300).optional(),
})
    .superRefine((value, context) => {
    if (value.decision === "reject" && !value.rejectionReason) {
        context.addIssue({
            code: "custom",
            path: ["rejectionReason"],
            message: "Provide a short reason for rejecting the plan.",
        });
    }
});
//# sourceMappingURL=approval.js.map