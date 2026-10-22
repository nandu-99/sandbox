import { Router } from "express";
import { getProjectTemplates, getRepositories, getSandboxes, getSeedProfiles, } from "../data/demo-sources.js";
export const sourcesRouter = Router();
sourcesRouter.get("/templates", (_request, response) => {
    response.json({ data: getProjectTemplates() });
});
sourcesRouter.get("/repositories", (_request, response) => {
    response.json({ data: getRepositories() });
});
sourcesRouter.get("/repositories/:repositoryId", (request, response) => {
    const repository = getRepositories().find((item) => item.id === request.params.repositoryId);
    if (!repository) {
        response.status(404).json({
            error: "REPOSITORY_NOT_FOUND",
            message: "The requested demo repository does not exist.",
        });
        return;
    }
    response.json({ data: repository });
});
sourcesRouter.get("/sandboxes", (_request, response) => {
    response.json({ data: getSandboxes() });
});
sourcesRouter.get("/sandboxes/by-repository/:repositoryId", (request, response) => {
    const sandboxes = getSandboxes().filter((item) => item.repositoryId === request.params.repositoryId);
    response.json({ data: sandboxes });
});
sourcesRouter.get("/seed-profiles", (_request, response) => {
    response.json({ data: getSeedProfiles() });
});
//# sourceMappingURL=sources.js.map