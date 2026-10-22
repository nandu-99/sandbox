import { z } from "zod";
export const verificationSchema = z.object({
    simulateLoginFailure: z.boolean().optional().default(false),
});
//# sourceMappingURL=verification.js.map