import { z } from "zod";
export const setupRequestSchema = z.object({
    projectTemplate: z.string().trim().min(1, "Choose a project template."),
    repositoryId: z.string().trim().min(1, "Choose a demo repository."),
    targetEnvironment: z.enum(["sandbox", "production"]),
    requestedPermission: z.enum(["viewer", "developer", "admin"]),
    seedProfile: z.string().trim().min(1, "Choose a seed-data profile."),
});
//# sourceMappingURL=setup-request.js.map