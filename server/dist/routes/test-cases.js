import { Router } from "express";
import { getOfficialTestCaseRuns, runOfficialTestCases, } from "../services/official-test-runner.js";
export const testCasesRouter = Router();
testCasesRouter.get("/test-cases", (_request, response) => {
    response.json({ data: getOfficialTestCaseRuns() });
});
testCasesRouter.post("/test-cases/run", async (_request, response) => {
    const runs = await runOfficialTestCases();
    response.status(201).json({ data: runs });
});
//# sourceMappingURL=test-cases.js.map